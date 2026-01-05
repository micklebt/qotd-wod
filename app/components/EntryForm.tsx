'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
const STORAGE_KEY_SELECTED_PARTICIPANT = 'qotd-wod-selected-participant';
import { lookupWord } from '@/lib/dictionary';
import { lookupQuote } from '@/lib/quoteLookup';
import { getParticipantName, getParticipantsAsync, preloadParticipants, type Participant as DbParticipant } from '@/lib/participants';
import { formatIPA } from '@/lib/pronunciation';
import { formatExampleSentences } from '@/lib/formatExampleSentence';
import { formatDateEST } from '@/lib/dateUtils';
import MarkdownContextMenu from './MarkdownContextMenu';
import MarkdownTextarea from './MarkdownTextarea';

export default function EntryForm() {
  const router = useRouter();
  const definitionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const exampleSentenceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const etymologyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteContentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteContextTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteBackgroundTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteInterpretationTextareaRef = useRef<HTMLTextAreaElement>(null);
  const quoteSignificanceTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [type, setType] = useState<'word' | 'quote'>('word');
  const [content, setContent] = useState('');
  const [definition, setDefinition] = useState('');
  const [pronunciation, setPronunciation] = useState(''); // Legacy - for backward compatibility
  const [pronunciationRespelling, setPronunciationRespelling] = useState(''); // Dictionary-style respelling (e.g., MYND-fuhl)
  const [pronunciationIpa, setPronunciationIpa] = useState(''); // IPA format (e.g., /ˈmaɪnd.fəl/)
  const [pronunciationAudio, setPronunciationAudio] = useState<string>('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [etymology, setEtymology] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [wordnikSourceUrl, setWordnikSourceUrl] = useState<string>('');
  const [author, setAuthor] = useState('');
  const [source, setSource] = useState('');
  const [quoteContext, setQuoteContext] = useState('');
  const [quoteBackground, setQuoteBackground] = useState('');
  const [quoteInterpretation, setQuoteInterpretation] = useState('');
  const [quoteSignificance, setQuoteSignificance] = useState('');
  const [quoteSourceType, setQuoteSourceType] = useState('');
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [quoteLookupLoading, setQuoteLookupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [spellingSuggestions, setSpellingSuggestions] = useState<string[]>([]);
  const [showWordFields, setShowWordFields] = useState(false);
  const [showQuoteFields, setShowQuoteFields] = useState(false);
  const [dbParticipants, setDbParticipants] = useState<DbParticipant[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    setValue: (value: string) => void;
  } | null>(null);

  // Preload participants from database
  useEffect(() => {
    const loadParticipants = async () => {
      await preloadParticipants();
      const participants = await getParticipantsAsync();
      setDbParticipants(participants);
      
      // Set selected participant from localStorage or default to first
      const stored = localStorage.getItem(STORAGE_KEY_SELECTED_PARTICIPANT);
      if (stored && participants.some(p => p.id === stored)) {
        setSelectedParticipant(stored);
      } else if (participants.length > 0) {
        setSelectedParticipant(participants[0].id);
      }
    };
    loadParticipants();
  }, []);

  // Prevent default context menu on textareas when we have our custom menu
  useEffect(() => {
    const handleDocumentContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' && contextMenu) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleDocumentContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleDocumentContextMenu);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (definitionTextareaRef.current) {
      definitionTextareaRef.current.style.height = 'auto';
      definitionTextareaRef.current.style.height = `${definitionTextareaRef.current.scrollHeight}px`;
    }
  }, [definition]);

  useEffect(() => {
    if (exampleSentenceTextareaRef.current) {
      exampleSentenceTextareaRef.current.style.height = 'auto';
      exampleSentenceTextareaRef.current.style.height = `${exampleSentenceTextareaRef.current.scrollHeight}px`;
    }
  }, [exampleSentence]);

  useEffect(() => {
    if (etymologyTextareaRef.current) {
      etymologyTextareaRef.current.style.height = 'auto';
      etymologyTextareaRef.current.style.height = `${etymologyTextareaRef.current.scrollHeight}px`;
    }
  }, [etymology]);

  useEffect(() => {
    if (quoteContentTextareaRef.current) {
      quoteContentTextareaRef.current.style.height = 'auto';
      quoteContentTextareaRef.current.style.height = `${quoteContentTextareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (quoteContextTextareaRef.current) {
      quoteContextTextareaRef.current.style.height = 'auto';
      quoteContextTextareaRef.current.style.height = `${quoteContextTextareaRef.current.scrollHeight}px`;
    }
  }, [quoteContext]);

  useEffect(() => {
    if (quoteBackgroundTextareaRef.current) {
      quoteBackgroundTextareaRef.current.style.height = 'auto';
      quoteBackgroundTextareaRef.current.style.height = `${quoteBackgroundTextareaRef.current.scrollHeight}px`;
    }
  }, [quoteBackground]);

  useEffect(() => {
    if (quoteInterpretationTextareaRef.current) {
      quoteInterpretationTextareaRef.current.style.height = 'auto';
      quoteInterpretationTextareaRef.current.style.height = `${quoteInterpretationTextareaRef.current.scrollHeight}px`;
    }
  }, [quoteInterpretation]);

  useEffect(() => {
    if (quoteSignificanceTextareaRef.current) {
      quoteSignificanceTextareaRef.current.style.height = 'auto';
      quoteSignificanceTextareaRef.current.style.height = `${quoteSignificanceTextareaRef.current.scrollHeight}px`;
    }
  }, [quoteSignificance]);

  const handleParticipantChange = (participantId: string) => {
    setSelectedParticipant(participantId);
    localStorage.setItem(STORAGE_KEY_SELECTED_PARTICIPANT, participantId);
    // Dispatch custom event to notify other components (like WordChallenge)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('participantChanged'));
    }
  };

  const wrapSelectedText = (
    textarea: HTMLTextAreaElement | HTMLElement,
    setValue: (value: string) => void,
    prefix: string,
    suffix: string
  ) => {
    if (textarea instanceof HTMLTextAreaElement) {
      // Handle regular textarea
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      
      if (selectedText) {
        const newText =
          textarea.value.substring(0, start) +
          prefix + selectedText + suffix +
          textarea.value.substring(end);
        setValue(newText);
        
        // Restore cursor position after the formatted text
        setTimeout(() => {
          textarea.focus();
          const newPosition = start + prefix.length + selectedText.length + suffix.length;
          textarea.setSelectionRange(newPosition, newPosition);
        }, 0);
      }
    } else {
      // Handle contenteditable div
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        if (selectedText && textarea instanceof HTMLElement) {
          // Wrap the selected text with HTML tags based on markdown
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
            // Try to surround the contents
            range.surroundContents(wrapperElement);
          } catch (e) {
            // If surroundContents fails (e.g., range spans multiple nodes), delete and insert
            range.deleteContents();
            wrapperElement.textContent = selectedText;
            range.insertNode(wrapperElement);
          }
          
          // Verify the HTML was added and log for debugging
          const htmlAfterFormat = textarea instanceof HTMLElement ? textarea.innerHTML : '';
          console.log('HTML after formatting:', htmlAfterFormat);
          
          // Ensure the element stays focused so formatting is visible
          if (textarea instanceof HTMLElement) {
            textarea.focus();
            
            // Trigger input event to sync markdown, but HTML formatting stays visible
            setTimeout(() => {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              textarea.dispatchEvent(inputEvent);
            }, 10);
          }
          
          // Clear selection after formatting is applied
          setTimeout(() => {
            selection.removeAllRanges();
          }, 50);
        }
      }
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLTextAreaElement | HTMLDivElement>,
    textareaRef: React.RefObject<HTMLTextAreaElement | HTMLElement | null>,
    setValue: (value: string) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = textareaRef.current;
    if (!element) return;
    
    // Check if there's selected text
    let hasSelection = false;
    if (element instanceof HTMLTextAreaElement) {
      const start = element.selectionStart;
      const end = element.selectionEnd;
      hasSelection = start !== end && start < end;
    } else {
      // Contenteditable div
      const selection = window.getSelection();
      hasSelection = selection !== null && selection.toString().length > 0;
    }
    
    if (hasSelection) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        textareaRef: textareaRef as React.RefObject<HTMLTextAreaElement>,
        setValue,
      });
    }
  };

  const handleClearForm = () => {
    setContent('');
    setDefinition('');
    setPronunciation('');
    setPronunciationAudio('');
    setPartOfSpeech('');
    setEtymology('');
    setExampleSentence('');
    setSourceUrl('');
    setWordnikSourceUrl('');
    setAuthor('');
    setSource('');
    setQuoteContext('');
    setQuoteBackground('');
    setQuoteInterpretation('');
    setQuoteSignificance('');
    setQuoteSourceType('');
    setShowWordFields(false);
    setShowQuoteFields(false);
    setError(null);
    setSpellingSuggestions([]);
  };

  const handleLookupWord = async () => {
    if (!content.trim() || type !== 'word') {
      setError('Please enter a word first');
      return;
    }

    setLookupLoading(true);
    setError(null);
    setSpellingSuggestions([]);

    try {
      const result = await lookupWord(content.trim());
      
      if (result.error) {
        setError(result.error);
        if (result.suggestions && result.suggestions.length > 0) {
          setSpellingSuggestions(result.suggestions);
        }
      } else {
        setDefinition(result.definition);
        // Set IPA pronunciation (already formatted in lookupWord)
        setPronunciationIpa(result.pronunciationIpa || result.pronunciation || '');
        setPronunciation(result.pronunciationIpa || result.pronunciation || ''); // Legacy field
        // Respelling not available from API - leave empty for manual entry
        setPronunciationRespelling(result.pronunciationRespelling || '');
        setPartOfSpeech(result.partOfSpeech);
        // Set etymology - ensure it's set even if empty string (to clear previous values)
        setEtymology(result.etymology || '');
        setPronunciationAudio(result.audioUrl || '');
        // Debug: log audio URL
        if (result.audioUrl) {
          console.log('Audio URL found:', result.audioUrl);
        } else {
          console.log('No audio URL returned from lookup');
        }
        setExampleSentence(result.exampleSentence || '');
        setSourceUrl(result.sourceUrl || '');
        setWordnikSourceUrl(result.wordnikSourceUrl || '');
        setShowWordFields(true); // Show fields after lookup
        
        // Debug: log etymology value
        if (result.etymology) {
          console.log('Etymology found:', result.etymology.substring(0, 100));
        } else {
          console.log('No etymology returned from lookup');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup word');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupQuote = async () => {
    if (!content.trim() || type !== 'quote') {
      setError('Please enter a quote first');
      return;
    }

    setQuoteLookupLoading(true);
    setError(null);

    try {
      const result = await lookupQuote(content.trim());
      
      if (result.error) {
        setError(result.error);
      } else {
        // Always show fields after lookup attempt, even if some fields are empty
        setShowQuoteFields(true);
        
        if (result.author) setAuthor(result.author);
        if (result.source) setSource(result.source);
        if (result.context) setQuoteContext(result.context);
        if (result.background) setQuoteBackground(result.background);
        if (result.interpretation) setQuoteInterpretation(result.interpretation);
        if (result.significance) setQuoteSignificance(result.significance);
        if (result.sourceUrl) setSourceUrl(result.sourceUrl);
        if (result.sourceType) setQuoteSourceType(result.sourceType);
        
        // If no data was found, show a helpful message
        if (!result.author && !result.context && !result.interpretation) {
          setError('Quote not found in database. You can manually fill in the details below.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup quote');
    } finally {
      setQuoteLookupLoading(false);
    }
  };

  // Normalize word content: lowercase unless it's a proper noun
  // Proper nouns are detected by: all caps, or capitals in the middle
  const normalizeWordContent = (word: string): string => {
    const trimmed = word.trim();
    if (!trimmed) return trimmed;
    
    // If all uppercase (like "NASA"), keep it
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 1) {
      return trimmed;
    }
    
    // If has capitals beyond the first letter (like "iPhone", "McDonald"), keep it
    const restOfWord = trimmed.slice(1);
    if (restOfWord !== restOfWord.toLowerCase()) {
      return trimmed;
    }
    
    // Otherwise, lowercase it
    return trimmed.toLowerCase();
  };

  const checkForDuplicate = async (): Promise<Entry | null> => {
    if (!content.trim() || type !== 'word') return null;

    try {
      const normalizedContent = normalizeWordContent(content);
      const { data, error } = await supabase
        .from('entries')
        .select('*, word_metadata(*), quote_metadata(*)')
        .eq('type', 'word')
        .ilike('content', normalizedContent)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data || null;
    } catch (err) {
      console.error('Error checking for duplicate:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!selectedParticipant) {
        setError('Please select a participant');
        return;
      }

      // Check for duplicate if it's a word
      if (type === 'word' && content.trim()) {
        const duplicate = await checkForDuplicate();
        if (duplicate) {
          setExistingEntry(duplicate);
          setShowComparison(true);
          return;
        }
      }

      await submitEntry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry');
    }
  };

  const submitEntry = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = selectedParticipant;

      // Normalize word content (lowercase unless proper noun)
      const normalizedContent = type === 'word' ? normalizeWordContent(content) : content;

      // Insert entry
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .insert({
          type,
          content: normalizedContent,
          participant_id: userId,
        })
        .select()
        .single();

      if (entryError) throw entryError;

      // Insert metadata
      if (type === 'word') {
        const metadata: any = {
          entry_id: entryData.id,
          definition: definition || null,
          pronunciation: pronunciationIpa || pronunciation || null, // Legacy field
          part_of_speech: partOfSpeech || null,
          etymology: etymology || null,
        };

        // Only include new pronunciation fields if they have values
        // This allows the code to work even if the migration hasn't been run yet
        if (pronunciationIpa) {
          metadata.pronunciation_ipa = pronunciationIpa;
        }
        if (pronunciationRespelling) {
          metadata.pronunciation_respelling = pronunciationRespelling;
        }

        const { error: metaError } = await supabase
          .from('word_metadata')
          .insert(metadata);
        if (metaError) {
          console.error('Word metadata insert error:', metaError);
          // If error is about missing columns, provide helpful message
          if (metaError.message?.includes('pronunciation') || metaError.message?.includes('column')) {
            throw new Error(`Failed to save word metadata: ${metaError.message}. Please run the migration: add_pronunciation_fields.sql`);
          }
          throw new Error(`Failed to save word metadata: ${metaError.message}`);
        }
      } else {
        const { error: metaError } = await supabase
          .from('quote_metadata')
          .insert({
            entry_id: entryData.id,
            author: author || null,
            source: source || null,
            // Note: These fields may need to be added to the database schema
            // For now, we'll include them but they may be ignored if columns don't exist
            context: quoteContext || null,
            background: quoteBackground || null,
            interpretation: quoteInterpretation || null,
            significance: quoteSignificance || null,
            source_type: quoteSourceType || null,
            source_url: sourceUrl || null,
          });
        if (metaError) {
          console.error('Quote metadata insert error:', metaError);
          // If error is about missing columns, we can still save basic fields
          if (metaError.message.includes('column') || metaError.message.includes('does not exist')) {
            // Try again with just basic fields
            const { error: basicError } = await supabase
              .from('quote_metadata')
              .insert({
                entry_id: entryData.id,
                author: author || null,
                source: source || null,
              });
            if (basicError) throw basicError;
            console.warn('Saved quote with basic fields only. Database schema may need updating.');
          } else {
            throw metaError;
          }
        }
      }

      // Update streak after successful entry creation
      try {
        const response = await fetch('/api/update-streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: userId }),
        });
        if (!response.ok) {
          console.warn('Failed to update streak, but entry was created successfully');
        }
      } catch (streakError) {
        console.warn('Error updating streak:', streakError);
      }

      // Send SMS notifications to all participants
      try {
        const smsResponse = await fetch('/api/notify-entry-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryId: entryData.id,
            entryType: type,
            entryContent: normalizedContent,
            participantId: userId,
          }),
        });
        if (smsResponse.ok) {
          const smsData = await smsResponse.json();
          if (smsData.sent > 0) {
            console.log(`SMS notifications sent: ${smsData.sent}/${smsData.total}`);
          }
        } else {
          console.warn('Failed to send SMS notifications, but entry was created successfully');
        }
      } catch (smsError) {
        console.warn('Error sending SMS notifications:', smsError);
      }

      router.push('/entries');
    } catch (err) {
      console.error('Error creating entry:', err);
      // Provide more detailed error message
      if (err instanceof Error) {
        setError(err.message || 'Failed to create entry');
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(String(err.message));
      } else {
        setError('Failed to create entry. Please check that all required fields are filled.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithNew = () => {
    setShowComparison(false);
    setExistingEntry(null);
    submitEntry();
  };

  const handleCancelDuplicate = () => {
    setShowComparison(false);
    setExistingEntry(null);
  };

  return (
    <>
      {showComparison && existingEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Word Already Exists</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              The word "<strong>{content}</strong>" already exists in the database. Compare the entries below:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Existing Entry */}
              <div className="border border-gray-300 rounded p-4 bg-gray-50">
                <h3 className="font-bold text-lg mb-3 text-gray-700">Existing Entry</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Submitted by:</span> {getParticipantName(existingEntry.participant_id)}</p>
                  <p><span className="font-semibold">Date:</span> {formatDateEST(existingEntry.created_at)}</p>
                  {existingEntry.word_metadata?.[0] && (
                    <>
                      <p><span className="font-semibold">Pronunciation:</span> {existingEntry.word_metadata[0].pronunciation_respelling || existingEntry.word_metadata[0].pronunciation_ipa || existingEntry.word_metadata[0].pronunciation || 'N/A'}</p>
                      <p><span className="font-semibold">Part of Speech:</span> {existingEntry.word_metadata[0].part_of_speech || 'N/A'}</p>
                      <div>
                        <span className="font-semibold">Definition:</span>
                        <p className="mt-1 text-gray-700">{existingEntry.word_metadata[0].definition || 'N/A'}</p>
                      </div>
                      {existingEntry.word_metadata[0].etymology && (
                        <div>
                          <span className="font-semibold">Etymology:</span>
                          <p className="mt-1 text-gray-700">{existingEntry.word_metadata[0].etymology}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Proposed Entry */}
              <div className="border border-blue-300 rounded p-4 bg-blue-50">
                <h3 className="font-bold text-lg mb-3 text-blue-700">Proposed Entry</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Submitted by:</span> {getParticipantName(selectedParticipant)}</p>
                  <p><span className="font-semibold">Date:</span> {formatDateEST(new Date())}</p>
                  <p><span className="font-semibold">Pronunciation:</span> {pronunciation || 'N/A'}</p>
                  <p><span className="font-semibold">Part of Speech:</span> {partOfSpeech || 'N/A'}</p>
                  <div>
                    <span className="font-semibold">Definition:</span>
                    <p className="mt-1 text-gray-700">{definition || 'N/A'}</p>
                  </div>
                  {etymology && (
                    <div>
                      <span className="font-semibold">Etymology:</span>
                      <p className="mt-1 text-gray-700">{etymology}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancelDuplicate}
                className="px-4 sm:px-6 py-2.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedWithNew}
                className="px-4 sm:px-6 py-2.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 text-sm sm:text-base"
              >
                Proceed with New Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-2.5 sm:space-y-3">
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            <p className="font-semibold">{error}</p>
            {spellingSuggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Did you mean:</p>
                <div className="flex flex-wrap gap-2">
                  {spellingSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={async () => {
                        setContent(suggestion);
                        setSpellingSuggestions([]);
                        setError(null);
                        // Auto-lookup the suggested word
                        setLookupLoading(true);
                        try {
                          const result = await lookupWord(suggestion);
                          if (result.error) {
                            setError(result.error);
                            if (result.suggestions && result.suggestions.length > 0) {
                              setSpellingSuggestions(result.suggestions);
                            }
                          } else {
                            setDefinition(result.definition);
                            const formattedPronunciation = result.pronunciation 
                              ? formatIPA(result.pronunciation)
                              : '';
                            setPronunciation(formattedPronunciation);
                            setPartOfSpeech(result.partOfSpeech);
                            setEtymology(result.etymology);
                            setPronunciationAudio(result.audioUrl || '');
                            setExampleSentence(result.exampleSentence || '');
                            setSourceUrl(result.sourceUrl || '');
                            setWordnikSourceUrl(result.wordnikSourceUrl || '');
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to lookup word');
                        } finally {
                          setLookupLoading(false);
                        }
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Type Toggle */}
      <div className="flex items-center justify-center mb-3 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setType('word');
              setShowWordFields(false);
              setShowQuoteFields(false);
            }}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${
              type === 'word'
                ? 'bg-white dark:bg-[#0a0a0a] text-blue-600 dark:text-[#3b82f6] shadow-sm'
                : 'text-gray-600 dark:text-[#b0b0b0] hover:text-gray-900 dark:hover:text-[#ffffff]'
            }`}
          >
            Word
          </button>
          <button
            type="button"
            onClick={() => {
              setType('quote');
              setShowWordFields(false);
              setShowQuoteFields(false);
            }}
            className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all text-sm sm:text-base ${
              type === 'quote'
                ? 'bg-white dark:bg-[#0a0a0a] text-blue-600 dark:text-[#3b82f6] shadow-sm'
                : 'text-gray-600 dark:text-[#b0b0b0] hover:text-gray-900 dark:hover:text-[#ffffff]'
            }`}
          >
            Quote
          </button>
        </div>
      </div>

      <div>
        {type === 'word' ? (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Word"
                className="flex-1 border border-gray-300 dark:border-[#404040] rounded p-2.5 sm:p-2 bg-blue-50 dark:bg-[#1a1a1a] text-black dark:text-[#ffffff] text-base sm:text-sm"
                required
              />
              {pronunciationIpa && (
                <input
                  type="text"
                  value={pronunciationRespelling}
                  onChange={(e) => setPronunciationRespelling(e.target.value)}
                  placeholder="Pronunciation (e.g., pruh-NOUN-see-AY-shuhn)"
                  className="flex-1 border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff] text-sm"
                />
              )}
              {pronunciationAudio && (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const audio = new Audio(pronunciationAudio);
                      
                      // Handle audio loading errors
                      audio.addEventListener('error', (event) => {
                        console.warn('Audio file not available:', pronunciationAudio);
                      });
                      
                      // Handle play errors
                      try {
                        await audio.play();
                      } catch (playError) {
                        // Audio play failed - file may not be available or browser blocked autoplay
                        console.warn('Could not play audio:', playError);
                      }
                    } catch (error) {
                      // Audio creation or loading failed - file may not be available
                      console.warn('Audio file not available:', pronunciationAudio);
                    }
                  }}
                  className="p-2 bg-blue-100 dark:bg-[#1a1a1a] hover:bg-blue-200 dark:hover:bg-[#2a2a2a] rounded border border-blue-300 dark:border-[#404040] flex items-center justify-center"
                  title="Play pronunciation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-blue-600 dark:text-[#3b82f6]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                    />
                  </svg>
                </button>
              )}
            <button
              type="button"
              onClick={handleLookupWord}
              disabled={lookupLoading || !content.trim()}
              className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base"
              title="Auto-fill word details from dictionary"
            >
              {lookupLoading ? 'Looking up...' : 'Lookup'}
            </button>
            </div>
            {sourceUrl && (
              <div className="text-xs">
                <span className="text-gray-600">Source: </span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View dictionary source
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                ref={quoteContentTextareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (e.target) {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }
                }}
                onBlur={() => {
                  if (content.trim()) {
                    setShowQuoteFields(true);
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                placeholder="Quote (1 sentence to 1 paragraph)"
                className="flex-1 border border-gray-300 dark:border-[#404040] rounded p-2.5 sm:p-2 bg-blue-50 dark:bg-[#1a1a1a] dark:text-[#ffffff] resize-none overflow-hidden text-base sm:text-sm"
                style={{ minHeight: '2.5rem' }}
                required
              />
              <button
                type="button"
                onClick={handleLookupQuote}
                disabled={quoteLookupLoading || !content.trim()}
                className="px-3 sm:px-4 py-2.5 sm:py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base self-start sm:self-auto"
                title="Auto-fill quote details from databases"
              >
                {quoteLookupLoading ? 'Looking up...' : 'Lookup Quote'}
              </button>
            </div>
            {sourceUrl && (
              <div className="text-xs">
                <span className="text-gray-600">Source: </span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View source
                </a>
              </div>
            )}
          </div>
        )}
        {type === 'word' && (
          <p className="text-xs text-gray-500 dark:text-[#b0b0b0] mt-1">Click "Lookup" to auto-fill definition, pronunciation, and part of speech</p>
        )}
      </div>

      {type === 'word' ? (
        <>
          {showWordFields && (
            <>
              <div>
                <MarkdownTextarea
                  value={definition}
                  onChange={setDefinition}
                  onContextMenu={(e) => {
                    const target = e.currentTarget;
                    const fakeRef = { current: target } as React.RefObject<HTMLTextAreaElement | HTMLElement>;
                    handleContextMenu(e as any, fakeRef, setDefinition);
                  }}
                  placeholder="Definition (Right-click selected text for formatting: **bold**, *italic*, <u>underline</u>)"
                  style={{ minHeight: '2.5rem' }}
                  required
                />
              </div>
              <div>
                <MarkdownTextarea
                  value={exampleSentence}
                  onChange={setExampleSentence}
                  onContextMenu={(e) => {
                    const target = e.currentTarget;
                    const fakeRef = { current: target } as React.RefObject<HTMLTextAreaElement | HTMLElement>;
                    handleContextMenu(e as any, fakeRef, setExampleSentence);
                  }}
                  placeholder="Use in Sentence (Right-click selected text for formatting) - e.g., The word 'example' was used in a sentence..."
                  style={{ minHeight: '2.5rem' }}
                />
                {wordnikSourceUrl && (
                  <div className="mt-2 text-xs text-gray-500">
                    Examples from{' '}
                    <a
                      href={wordnikSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Wordnik
                    </a>
                  </div>
                )}
          </div>
            </>
          )}
          <div>
            <input
              type="text"
              value={partOfSpeech}
              onChange={(e) => setPartOfSpeech(e.target.value)}
              placeholder="Part of Speech - e.g., noun, verb, adjective"
              className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff]"
            />
          </div>
          <div>
            <MarkdownTextarea
              value={etymology}
              onChange={setEtymology}
              onContextMenu={(e) => {
                const target = e.currentTarget;
                const fakeRef = { current: target } as React.RefObject<HTMLTextAreaElement | HTMLElement>;
                handleContextMenu(e as any, fakeRef, setEtymology);
              }}
              placeholder="Etymology (Right-click selected text for formatting)"
              style={{ minHeight: '2.5rem' }}
            />
          </div>
        </>
      ) : (
        <>
          {showQuoteFields && (
            <>
              <div>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author (leave blank for idioms/expressions)"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff]"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Source - e.g., Stanford Commencement Address, 2005 or 'Common idiom'"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff]"
                />
              </div>
              {quoteSourceType && (
                <div className="text-xs text-gray-500 mb-2">
                  Type: <span className="font-semibold capitalize">{quoteSourceType}</span>
                </div>
              )}
              <div>
                <textarea
                  ref={quoteContextTextareaRef}
                  value={quoteContext}
                  onChange={(e) => {
                    setQuoteContext(e.target.value);
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
                  placeholder="Context - When and where the quote was originally said, or its usage context"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff] resize-none overflow-hidden"
                  style={{ minHeight: '2.5rem' }}
                />
              </div>
              <div>
                <textarea
                  ref={quoteBackgroundTextareaRef}
                  value={quoteBackground}
                  onChange={(e) => {
                    setQuoteBackground(e.target.value);
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
                  placeholder="Background - Historical background, origin, or what was happening at the time"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff] resize-none overflow-hidden"
                  style={{ minHeight: '2.5rem' }}
                />
              </div>
              <div>
                <textarea
                  ref={quoteInterpretationTextareaRef}
                  value={quoteInterpretation}
                  onChange={(e) => {
                    setQuoteInterpretation(e.target.value);
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
                  placeholder="Interpretation - What the quote means and its significance"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff] resize-none overflow-hidden"
                  style={{ minHeight: '2.5rem' }}
                />
              </div>
              <div>
                <textarea
                  ref={quoteSignificanceTextareaRef}
                  value={quoteSignificance}
                  onChange={(e) => {
                    setQuoteSignificance(e.target.value);
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
                  placeholder="Significance - Why this quote is notable, impactful, or important"
                  className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 dark:bg-[#1a1a1a] dark:text-[#ffffff] resize-none overflow-hidden"
                  style={{ minHeight: '2.5rem' }}
                />
              </div>
            </>
          )}
          {!showQuoteFields && (
            <div className="text-sm text-gray-500 italic py-2">
              Enter a quote and click "Lookup Quote" or leave the quote field to see additional fields.
            </div>
          )}
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Submitted by</label>
        <select
          value={selectedParticipant}
          onChange={(e) => handleParticipantChange(e.target.value)}
          className="w-full border border-gray-300 dark:border-[#404040] rounded p-2 text-gray-700 dark:text-[#ffffff] bg-white dark:bg-[#1a1a1a]"
          required
        >
          <option value="">Select participant (your selection will be remembered)</option>
          {dbParticipants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleClearForm}
          className="flex-1 bg-gray-500 text-white font-semibold py-3 sm:py-2.5 rounded hover:bg-gray-600 text-sm sm:text-base"
        >
          Clear Form
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 sm:py-2.5 rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm sm:text-base"
        >
          {loading ? 'Creating...' : 'Create Entry'}
        </button>
      </div>
    </form>
    
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
        }}
        onItalic={() => {
          const textarea = contextMenu.textareaRef.current;
          if (textarea) {
            wrapSelectedText(textarea, contextMenu.setValue, '*', '*');
          }
        }}
        onUnderline={() => {
          const textarea = contextMenu.textareaRef.current;
          if (textarea) {
            wrapSelectedText(textarea, contextMenu.setValue, '<u>', '</u>');
          }
        }}
      />
    )}
    </>
  );
}
