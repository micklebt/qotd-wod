'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MarkdownTextarea from '@/components/MarkdownTextarea';
import MarkdownContextMenu from '@/components/MarkdownContextMenu';
import { markAsProblemWord, getMasteryStatus, removeFromProblemWords, markAsConfident, type WordMasteryStatus } from '@/lib/wordMastery';
import { getParticipantNameAsync, preloadParticipants } from '@/lib/participants';
import { formatDateTimeEST } from '@/lib/dateUtils';
import { lookupWord } from '@/lib/dictionary';

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
  const [masteryStatus, setMasteryStatus] = useState<WordMasteryStatus | null>(null);
  const [masteryLoading, setMasteryLoading] = useState(false);
  const [markingConfident, setMarkingConfident] = useState(false);
  const [participantName, setParticipantName] = useState<string>('');
  const [dateEntered, setDateEntered] = useState<string>('');
  const [filteredWordIds, setFilteredWordIds] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [navigationLoading, setNavigationLoading] = useState(false);
  
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
      // Preload participants for name lookup
      await preloadParticipants();
      
      // Fetch all word entries for navigation (ordered by created_at descending)
      const { data: allWords, error: wordsError } = await supabase
        .from('entries')
        .select('id')
        .eq('type', 'word')
        .order('created_at', { ascending: false });
      
      if (!wordsError && allWords) {
        const wordIds = allWords.map(w => w.id);
        setFilteredWordIds(wordIds);
        const index = wordIds.indexOf(parseInt(id));
        setCurrentIndex(index);
      }
      
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
        
        // Get participant name
        if (data.participant_id) {
          const name = await getParticipantNameAsync(data.participant_id);
          setParticipantName(name);
        }
        
        // Get date and time entered
        if (data.created_at) {
          setDateEntered(formatDateTimeEST(data.created_at));
        }
        
        if (data.word_metadata?.[0]) {
          setDefinition(data.word_metadata[0].definition || '');
          setPronunciation(data.word_metadata[0].pronunciation_respelling || data.word_metadata[0].pronunciation_ipa || data.word_metadata[0].pronunciation || '');
          setPartOfSpeech(data.word_metadata[0].part_of_speech || '');
          setEtymology(data.word_metadata[0].etymology || '');
          // Load example_sentence from database
          setExampleSentence((data.word_metadata[0] as any).example_sentence || '');
        }
        if (data.quote_metadata?.[0]) {
          setAuthor(data.quote_metadata[0].author || '');
          setSource(data.quote_metadata[0].source || '');
        }
        
        // Load mastery status for word entries
        if (data.type === 'word') {
          const tracking = await getMasteryStatus(data.id);
          setMasteryStatus(tracking?.status || null);
        }
      }
      setLoading(false);
      setNavigationLoading(false);
    };

    fetchEntry();
  }, [id]);

  // Auto-populate example sentence and etymology if empty
  useEffect(() => {
    const autoPopulateIfEmpty = async () => {
      if (entry?.type === 'word' && entry.content && (!exampleSentence.trim() || !etymology.trim())) {
        try {
          const result = await lookupWord(entry.content);
          
          // Only update if field is currently empty
          if ((!exampleSentence || !exampleSentence.trim()) && result.exampleSentence) {
            setExampleSentence(result.exampleSentence);
          }
          
          if ((!etymology || !etymology.trim()) && result.etymology) {
            setEtymology(result.etymology);
          }
          
          // If still no etymology, try Wiktionary API directly
          if ((!etymology || !etymology.trim()) && (!result.etymology || !result.etymology.trim())) {
            try {
              const etymResponse = await fetch(`/api/etymology?word=${encodeURIComponent(entry.content)}`);
              if (etymResponse.ok) {
                const etymData = await etymResponse.json();
                if (etymData.etymology && etymData.etymology.trim()) {
                  setEtymology(etymData.etymology);
                }
              }
            } catch (err) {
              // Silently fail
            }
          }
          
          // Generate fallback example if still empty
          if ((!exampleSentence || !exampleSentence.trim()) && (!result.exampleSentence || !result.exampleSentence.trim())) {
            setExampleSentence(`The word "${entry.content}" was used in a sentence to demonstrate its meaning.`);
          }
        } catch (err) {
          console.error('Error auto-populating word fields:', err);
        }
      }
    };
    
    // Only run after entry is loaded and not loading
    if (!loading && entry) {
      autoPopulateIfEmpty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.id, entry?.content, entry?.type, loading]);

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

  // Auto-expand MarkdownTextarea components when content changes
  useEffect(() => {
    if (definitionTextareaRef.current) {
      const element = definitionTextareaRef.current;
      element.style.height = 'auto';
      const scrollHeight = element.scrollHeight;
      if (definition.trim() || element.textContent?.trim()) {
        element.style.height = `${scrollHeight}px`;
      } else {
        element.style.height = '2.5rem';
      }
    }
  }, [definition]);

  useEffect(() => {
    if (exampleSentenceTextareaRef.current) {
      const element = exampleSentenceTextareaRef.current;
      element.style.height = 'auto';
      const scrollHeight = element.scrollHeight;
      if (exampleSentence.trim() || element.textContent?.trim()) {
        element.style.height = `${scrollHeight}px`;
      } else {
        element.style.height = '2.5rem';
      }
    }
  }, [exampleSentence]);

  useEffect(() => {
    if (etymologyTextareaRef.current) {
      const element = etymologyTextareaRef.current;
      element.style.height = 'auto';
      const scrollHeight = element.scrollHeight;
      if (etymology.trim() || element.textContent?.trim()) {
        element.style.height = `${scrollHeight}px`;
      } else {
        element.style.height = '2.5rem';
      }
    }
  }, [etymology]);

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


  const handleMarkAsProblem = async () => {
    if (!entry || entry.type !== 'word') return;
    
    setMasteryLoading(true);
    try {
      if (masteryStatus) {
        // Remove from problem words
        await removeFromProblemWords(entry.id);
        setMasteryStatus(null);
      } else {
        // Mark as problem word
        await markAsProblemWord(entry.id);
        setMasteryStatus('not_known');
      }
    } catch (err) {
      console.error('Error toggling problem word:', err);
      alert('Failed to update problem word status');
    } finally {
      setMasteryLoading(false);
    }
  };

  const handleMarkAsConfident = async () => {
    if (!entry || entry.type !== 'word') return;
    
    setMarkingConfident(true);
    try {
      await markAsConfident(entry.id);
      setMasteryStatus('mastered');
    } catch (err) {
      console.error('Error marking word as confident:', err);
      alert('Failed to mark word as confident');
    } finally {
      setMarkingConfident(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0 && filteredWordIds.length > 0) {
      const prevId = filteredWordIds[currentIndex - 1];
      setNavigationLoading(true);
      router.push(`/entries/${prevId}`);
    }
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredWordIds.length - 1) {
      const nextId = filteredWordIds[currentIndex + 1];
      setNavigationLoading(true);
      router.push(`/entries/${nextId}`);
    }
  };

  if (loading) return <div className="p-4 text-black dark:text-[#ffffff] font-bold">Loading...</div>;
  if (!entry) return <div className="p-4 text-black dark:text-[#ffffff] font-bold">Entry not found</div>;

  return (
    <>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 bg-white dark:bg-[#000000]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-3">
            {entry?.type === 'word' && filteredWordIds.length > 0 && (
              <>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex <= 0 || navigationLoading}
                  className="p-2 rounded border border-black dark:border-[#333333] bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous word"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentIndex < 0 || currentIndex >= filteredWordIds.length - 1 || navigationLoading}
                  className="p-2 rounded border border-black dark:border-[#333333] bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next word"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                {currentIndex >= 0 && (
                  <span className="text-sm text-black dark:text-[#b0b0b0] font-semibold">
                    {currentIndex + 1} / {filteredWordIds.length}
                  </span>
                )}
              </>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-[#ffffff]">
              {entry?.type === 'word' ? entry.content : 'Edit Entry'}
            </h1>
          </div>
          {entry?.type === 'word' && masteryStatus !== 'mastered' && (
            <div className="flex gap-2">
              <button
                onClick={handleMarkAsConfident}
                disabled={markingConfident}
                className="px-3 sm:px-4 py-2 rounded font-bold text-sm sm:text-base border transition-colors bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-700 dark:border-green-300 hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {markingConfident ? 'Updating...' : '✓ I Know This'}
              </button>
              <button
                onClick={handleMarkAsProblem}
                disabled={masteryLoading}
                className={`px-3 sm:px-4 py-2 rounded font-bold text-sm sm:text-base border transition-colors ${
                  masteryStatus
                    ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-700 dark:border-red-300 hover:bg-red-200 dark:hover:bg-red-800'
                    : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-700 dark:border-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {masteryLoading ? 'Updating...' : masteryStatus ? '✓ Problem Word' : 'Mark as Problem Word'}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-[#0a0a0a] border border-red-700 dark:border-[#ef4444] text-red-900 dark:text-[#ef4444] p-3 rounded mb-4 font-bold">
            {error}
          </div>
        )}

        {entry?.type === 'word' && masteryStatus && masteryStatus !== 'mastered' && (
          <div className="bg-card-bg border border-card-border rounded p-3 mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${
                masteryStatus === 'practicing'
                  ? 'text-blue-700 dark:text-[#3b82f6]'
                  : 'text-yellow-700 dark:text-[#eab308]'
              }`}>
                {masteryStatus === 'practicing' ? 'Practicing' : 'Problem Word'}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
          {/* Contributor and Date Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-black dark:text-[#b0b0b0] mb-4">
            {participantName && (
              <div>
                <span className="font-bold">Contributor: </span>
                <span>{participantName}</span>
              </div>
            )}
            {dateEntered && (
              <div>
                <span className="font-bold">Date Entered: </span>
                <span>{dateEntered}</span>
              </div>
            )}
          </div>

          <div>
            {entry.type === 'word' ? (
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
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
                className="w-full border border-black dark:border-[#333333] rounded p-2 bg-white dark:bg-[#0a0a0a] text-black dark:text-[#ffffff] resize-none overflow-y-auto"
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
                  className="w-full rounded p-2 resize-none overflow-y-auto bg-input-bg text-input-text border-input-border"
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
                  placeholder="Pronunciation (e.g., MYND-fuhl or /ˈmaɪnd.fəl/)"
                  className="w-full rounded p-2 bg-input-bg text-input-text border-input-border placeholder:text-input-placeholder"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Part of Speech</label>
                <input
                  type="text"
                  value={partOfSpeech}
                  onChange={(e) => setPartOfSpeech(e.target.value)}
                  placeholder="e.g., noun, verb, adjective"
                  className="w-full rounded p-2 font-semibold bg-input-bg text-input-text border-input-border placeholder:text-input-placeholder"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Use in Sentence</label>
                <MarkdownTextarea
                  value={exampleSentence}
                  onChange={setExampleSentence}
                  onContextMenu={(e) => handleContextMenu(e, exampleSentenceTextareaRef, setExampleSentence)}
                  placeholder="Use in Sentence (Right-click selected text for formatting) - e.g., The word 'example' was used in a sentence..."
                  className="w-full rounded p-2 resize-none overflow-y-auto bg-input-bg text-input-text border-input-border"
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
                  className="w-full rounded p-2 resize-none overflow-y-auto bg-input-bg text-input-text border-input-border"
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
                  className="w-full border border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black dark:text-[#ffffff]">Source</label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Stanford Commencement Address, 2005"
                  className="w-full border border-black dark:border-white rounded p-2 bg-white dark:bg-black text-black dark:text-white font-semibold"
                />
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="submit"
              disabled={updating}
              className="flex-1 bg-black dark:bg-[#0a0a0a] text-white dark:text-[#ffffff] font-bold py-3 sm:py-2.5 rounded hover:bg-gray-800 dark:hover:bg-[#1a1a1a] border border-black dark:border-[#333333] disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm sm:text-base"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 bg-red-700 dark:bg-[#ef4444] text-white dark:text-[#000000] font-bold py-3 sm:py-2.5 rounded hover:bg-red-800 dark:hover:bg-[#dc2626] border border-red-900 dark:border-[#ef4444] text-sm sm:text-base"
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
