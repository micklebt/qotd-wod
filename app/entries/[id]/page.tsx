'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MarkdownTextarea from '@/components/MarkdownTextarea';
import MarkdownContextMenu from '@/components/MarkdownContextMenu';

export default function EntryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [entry, setEntry] = useState<Entry | null>(null);
  const [content, setContent] = useState('');
  const [definition, setDefinition] = useState('');
  const [pronunciation, setPronunciation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [etymology, setEtymology] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for auto-resizing and markdown fields
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const definitionTextareaRef = useRef<HTMLDivElement>(null);
  const exampleSentenceTextareaRef = useRef<HTMLDivElement>(null);
  const etymologyTextareaRef = useRef<HTMLDivElement>(null);
  const quoteContentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    textareaRef: React.RefObject<HTMLDivElement | null>;
    setValue: (value: string) => void;
  } | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      const { data, error: fetchError } = await supabase
        .from('entries')
        .select('*, word_metadata(*), quote_metadata(*)')
        .eq('id', id)
        .single();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEntry(data);
        setContent(data.content);
        if (data.word_metadata?.[0]) {
          setDefinition(data.word_metadata[0].definition || '');
          setPronunciation(data.word_metadata[0].pronunciation || '');
          setPartOfSpeech(data.word_metadata[0].part_of_speech || '');
          setEtymology(data.word_metadata[0].etymology || '');
          // Note: example_sentence may not exist in database yet
          setExampleSentence((data.word_metadata[0] as any).example_sentence || '');
        }
        if (data.quote_metadata?.[0]) {
          setAuthor(data.quote_metadata[0].author || '');
          setSource(data.quote_metadata[0].source || '');
        }
      }
      setLoading(false);
    };

    fetchEntry();
  }, [id]);

  // Auto-resize textareas when content changes - expand to show all content or minimize to one line
  useEffect(() => {
    if (contentTextareaRef.current) {
      const textarea = contentTextareaRef.current;
      textarea.style.height = 'auto';
      if (content.trim()) {
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        textarea.style.height = '2.5rem'; // One line height
      }
    }
  }, [content]);

  useEffect(() => {
    if (quoteContentTextareaRef.current) {
      const textarea = quoteContentTextareaRef.current;
      textarea.style.height = 'auto';
      if (content.trim()) {
        textarea.style.height = `${textarea.scrollHeight}px`;
      } else {
        textarea.style.height = '2.5rem'; // One line height
      }
    }
  }, [content]);

  // Helper function to wrap selected text with markdown
  const wrapSelectedText = (
    textarea: HTMLTextAreaElement | HTMLElement,
    setValue: (value: string) => void,
    prefix: string,
    suffix: string
  ) => {
    if (textarea instanceof HTMLTextAreaElement) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      
      if (selectedText) {
        const newValue = 
          textarea.value.substring(0, start) +
          prefix + selectedText + suffix +
          textarea.value.substring(end);
        setValue(newValue);
        
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, end + prefix.length);
        }, 0);
      }
    } else {
      // Handle contenteditable div
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText && textarea instanceof HTMLElement) {
          let wrapperElement: HTMLElement;
          if (prefix === '**') {
            wrapperElement = document.createElement('strong');
          } else if (prefix === '*') {
            wrapperElement = document.createElement('em');
          } else if (prefix === '<u>') {
            wrapperElement = document.createElement('u');
          } else {
            wrapperElement = document.createElement('span');
          }
          
          try {
            range.surroundContents(wrapperElement);
          } catch (e) {
            range.deleteContents();
            wrapperElement.textContent = selectedText;
            range.insertNode(wrapperElement);
          }
          
          if (textarea instanceof HTMLElement) {
            setTimeout(() => {
              textarea.focus();
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              textarea.dispatchEvent(inputEvent);
            }, 50);
          }
          
          setTimeout(() => {
            selection.removeAllRanges();
          }, 100);
        }
      }
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    textareaRef: React.RefObject<HTMLDivElement | null>,
    setValue: (value: string) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        textareaRef,
        setValue,
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);

    try {
      await supabase
        .from('entries')
        .update({ content })
        .eq('id', id);

      if (entry?.type === 'word') {
        if (entry.word_metadata?.[0]) {
          await supabase
            .from('word_metadata')
            .update({
              definition,
              pronunciation,
              part_of_speech: partOfSpeech,
              etymology,
              // Try to save example_sentence if column exists
              example_sentence: exampleSentence || null,
            } as any)
            .eq('entry_id', id);
        } else {
          await supabase
            .from('word_metadata')
            .insert({
              entry_id: parseInt(id),
              definition,
              pronunciation,
              part_of_speech: partOfSpeech,
              etymology,
              // Try to save example_sentence if column exists
              example_sentence: exampleSentence || null,
            } as any);
        }
      }

      if (entry?.type === 'quote') {
        if (entry.quote_metadata?.[0]) {
          await supabase
            .from('quote_metadata')
            .update({ author, source })
            .eq('entry_id', id);
        } else {
          await supabase
            .from('quote_metadata')
            .insert({
              entry_id: parseInt(id),
              author,
              source,
            });
        }
      }

      router.push('/entries');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update entry');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this entry?')) return;

    try {
      await supabase.from('entries').delete().eq('id', id);
      router.push('/entries');
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="p-4 text-black dark:text-[#ffffff] font-bold">Loading...</div>;
  if (!entry) return <div className="p-4 text-black dark:text-[#ffffff] font-bold">Entry not found</div>;

  return (
    <>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-black dark:text-[#ffffff]">Edit Entry</h1>

        {error && (
          <div className="bg-red-100 dark:bg-[#0a0a0a] border-2 border-red-700 dark:border-[#ef4444] text-red-900 dark:text-[#ef4444] p-3 rounded mb-4 font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Type</label>
            <p className="text-sm text-black dark:text-[#ffffff] capitalize font-semibold">{entry.type}</p>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">
              {entry.type === 'word' ? 'Word' : 'Quote'}
            </label>
            {entry.type === 'word' ? (
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border-2 border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                required
              />
            ) : (
              <textarea
                ref={quoteContentTextareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (e.target) {
                    e.target.style.height = 'auto';
                    if (e.target.value.trim()) {
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    } else {
                      e.target.style.height = '2.5rem';
                    }
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  if (target.value.trim()) {
                    target.style.height = `${target.scrollHeight}px`;
                  } else {
                    target.style.height = '2.5rem';
                  }
                }}
                className="w-full border-2 border-black dark:border-[#333333] rounded p-2 bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] resize-none overflow-hidden"
                style={{ minHeight: '2.5rem' }}
                required
              />
            )}
          </div>

          {entry.type === 'word' ? (
            <>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Definition</label>
                <MarkdownTextarea
                  value={definition}
                  onChange={setDefinition}
                  onContextMenu={(e) => handleContextMenu(e, definitionTextareaRef, setDefinition)}
                  placeholder="Definition (Right-click selected text for formatting: **bold**, *italic*, <u>underline</u>)"
                  className="w-full border-2 border-black dark:border-[#333333] rounded p-2 resize-none overflow-hidden bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff]"
                  style={{ minHeight: '2.5rem' }}
                  required
                  ref={definitionTextareaRef}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Pronunciation</label>
                <input
                  type="text"
                  value={pronunciation}
                  onChange={(e) => setPronunciation(e.target.value)}
                  placeholder="Pronunciation (IPA) - e.g., /dɪsˈkɔː(ɹ)s/"
                  className="w-full border-2 border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-mono"
                  style={{ fontFamily: 'monospace, "Courier New", monospace' }}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Part of Speech</label>
                <input
                  type="text"
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  placeholder="e.g., noun, verb, adjective"
                  className="w-full border-2 border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Use in Sentence</label>
                <MarkdownTextarea
                  value={exampleSentence}
                  onChange={setExampleSentence}
                  onContextMenu={(e) => handleContextMenu(e, exampleSentenceTextareaRef, setExampleSentence)}
                  placeholder="Use in Sentence (Right-click selected text for formatting) - e.g., The word 'example' was used in a sentence..."
                  className="w-full border-2 border-black dark:border-[#333333] rounded p-2 resize-none overflow-hidden bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff]"
                  style={{ minHeight: '2.5rem' }}
                  ref={exampleSentenceTextareaRef}
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Etymology</label>
                <MarkdownTextarea
                  value={etymology}
                  onChange={setEtymology}
                  onContextMenu={(e) => handleContextMenu(e, etymologyTextareaRef, setEtymology)}
                  placeholder="Etymology (Right-click selected text for formatting)"
                  className="w-full border-2 border-black dark:border-[#333333] rounded p-2 resize-none overflow-hidden bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff]"
                  style={{ minHeight: '2.5rem' }}
                  ref={etymologyTextareaRef}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Author</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g., Steve Jobs"
                  className="w-full border-2 border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Stanford Commencement Address, 2005"
                  className="w-full border-2 border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                />
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="submit"
              disabled={updating}
              className="flex-1 bg-black dark:bg-[#0a0a0a] text-white dark:text-[#ffffff] font-bold py-3 sm:py-2.5 rounded hover:bg-gray-800 dark:hover:bg-[#1a1a1a] border-2 border-black dark:border-[#333333] disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm sm:text-base"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 bg-red-700 dark:bg-[#ef4444] text-white dark:text-[#000000] font-bold py-3 sm:py-2.5 rounded hover:bg-red-800 dark:hover:bg-[#dc2626] border-2 border-red-900 dark:border-[#ef4444] text-sm sm:text-base"
            >
              Delete Entry
            </button>
          </div>
        </form>
      </div>

      {contextMenu && (
        <MarkdownContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onBold={() => {
            const textarea = contextMenu.textareaRef.current;
            if (textarea) {
              wrapSelectedText(textarea, contextMenu.setValue, '**', '**');
            }
            setContextMenu(null);
          }}
          onItalic={() => {
            const textarea = contextMenu.textareaRef.current;
            if (textarea) {
              wrapSelectedText(textarea, contextMenu.setValue, '*', '*');
            }
            setContextMenu(null);
          }}
          onUnderline={() => {
            const textarea = contextMenu.textareaRef.current;
            if (textarea) {
              wrapSelectedText(textarea, contextMenu.setValue, '<u>', '</u>');
            }
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
}
