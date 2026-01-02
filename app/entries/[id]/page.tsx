'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

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
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for auto-resizing textareas
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const definitionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const etymologyTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textareas when content changes
  useEffect(() => {
    if (contentTextareaRef.current) {
      contentTextareaRef.current.style.height = 'auto';
      contentTextareaRef.current.style.height = `${contentTextareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (definitionTextareaRef.current) {
      definitionTextareaRef.current.style.height = 'auto';
      definitionTextareaRef.current.style.height = `${definitionTextareaRef.current.scrollHeight}px`;
    }
  }, [definition]);

  useEffect(() => {
    if (etymologyTextareaRef.current) {
      etymologyTextareaRef.current.style.height = 'auto';
      etymologyTextareaRef.current.style.height = `${etymologyTextareaRef.current.scrollHeight}px`;
    }
  }, [etymology]);

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
            })
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
            });
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

  if (loading) return <div className="p-4">Loading...</div>;
  if (!entry) return <div className="p-4">Entry not found</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edit Entry</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Type</label>
          <p className="text-sm text-gray-600 capitalize">{entry.type}</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            {entry.type === 'word' ? 'Word' : 'Quote'}
          </label>
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (e.target) {
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${target.scrollHeight}px`;
            }}
            className="w-full border border-gray-300 rounded p-2 min-h-16 resize-none overflow-hidden"
            required
          />
        </div>

        {entry.type === 'word' ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Definition</label>
              <textarea
                ref={definitionTextareaRef}
                value={definition}
                onChange={(e) => {
                  setDefinition(e.target.value);
                  if (e.target) {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="w-full border border-gray-300 rounded p-2 resize-none overflow-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Pronunciation</label>
              <input
                type="text"
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder="e.g., ser-uh n-dip-i-tee"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Part of Speech</label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="e.g., noun, verb, adjective"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Etymology</label>
              <textarea
                ref={etymologyTextareaRef}
                value={etymology}
                onChange={(e) => {
                  setEtymology(e.target.value);
                  if (e.target) {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="w-full border border-gray-300 rounded p-2 min-h-16 resize-none overflow-hidden"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Steve Jobs"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Source</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g., Stanford Commencement Address, 2005"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={updating}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {updating ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <button
        onClick={handleDelete}
        className="w-full mt-3 bg-red-600 text-white font-semibold py-2 rounded hover:bg-red-700"
      >
        Delete Entry
      </button>
    </div>
  );
}