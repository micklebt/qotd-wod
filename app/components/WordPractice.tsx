'use client';

import { supabase } from '@/lib/supabase';
import type { Entry } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { getCurrentParticipantId } from '@/lib/participants';
import { getProblemWords, recordPracticeAnswer } from '@/lib/wordMastery';
import type { WordMasteryStatus } from '@/lib/supabase';
import Navigation from './Navigation';

interface WordPracticeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WordPractice({ isOpen, onClose }: WordPracticeProps) {
  const [problemWords, setProblemWords] = useState<Entry[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<Entry | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [masteryStatus, setMasteryStatus] = useState<{ correctCount: number; status: WordMasteryStatus; progress: string } | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<{ definition: string; isCorrect: boolean }[]>([]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      loadProblemWords();
      const participantId = getCurrentParticipantId();
      setCurrentParticipantId(participantId);
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentWord) {
      loadMasteryStatus();
      generateMultipleChoiceOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWord, currentParticipantId]);

  const generateMultipleChoiceOptions = async () => {
    if (!currentWord?.word_metadata?.[0]?.definition) return;

    const correctDefinition = currentWord.word_metadata[0].definition;
    
    // Fetch other word definitions to use as distractors
    const { data: otherWords, error } = await supabase
      .from('entries')
      .select('*, word_metadata(*)')
      .eq('type', 'word')
      .neq('id', currentWord.id)
      .not('word_metadata.definition', 'is', null)
      .limit(20);

    if (error) {
      console.error('Error fetching other words:', error);
      // Fallback: create simple distractors
      const distractors = [
        'A state of confusion or uncertainty',
        'A feeling of great happiness',
        'A sudden change or shift'
      ];
      const options = [correctDefinition, ...distractors.slice(0, 2)];
      shuffleArray(options);
      const correctIndex = options.indexOf(correctDefinition);
      setMultipleChoiceOptions(options.map((def, idx) => ({ definition: def, isCorrect: idx === correctIndex })));
      setCorrectAnswerIndex(correctIndex);
      return;
    }

    // Extract definitions from other words
    const otherDefinitions = (otherWords || [])
      .map(entry => entry.word_metadata?.[0]?.definition)
      .filter((def): def is string => Boolean(def) && def !== correctDefinition)
      .slice(0, 2);

    // If we don't have enough, add generic distractors
    while (otherDefinitions.length < 2) {
      const genericDistractors = [
        'A state of confusion or uncertainty',
        'A feeling of great happiness',
        'A sudden change or shift',
        'A complex system or structure',
        'An expression of emotion'
      ];
      const randomDistractor = genericDistractors[Math.floor(Math.random() * genericDistractors.length)];
      if (!otherDefinitions.includes(randomDistractor)) {
        otherDefinitions.push(randomDistractor);
      }
    }

    // Combine correct answer with distractors
    const options = [correctDefinition, ...otherDefinitions.slice(0, 2)];
    
    // Shuffle the array
    shuffleArray(options);
    
    // Find the index of the correct answer after shuffling
    const correctIndex = options.indexOf(correctDefinition);
    
    setMultipleChoiceOptions(options.map((def, idx) => ({ 
      definition: def, 
      isCorrect: idx === correctIndex 
    })));
    setCorrectAnswerIndex(correctIndex);
  };

  const shuffleArray = <T,>(array: T[]): void => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  const loadProblemWords = async () => {
    setLoading(true);
    try {
      const words = await getProblemWords();
      if (words.length === 0) {
        setProblemWords([]);
        setCurrentWord(null);
        setLoading(false);
        return;
      }

      // Fetch full entry data for each problem word
      const entryIds = words.map(w => w.entry_id);
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*, word_metadata(*)')
        .eq('type', 'word')
        .in('id', entryIds);

      if (error) throw error;

      const sortedEntries = (entries || []).sort((a, b) => {
        const aWord = words.find(w => w.entry_id === a.id);
        const bWord = words.find(w => w.entry_id === b.id);
        // Sort by status: not_known first, then practicing
        if (aWord?.status === 'not_known' && bWord?.status !== 'not_known') return -1;
        if (aWord?.status !== 'not_known' && bWord?.status === 'not_known') return 1;
        return 0;
      });

      setProblemWords(sortedEntries);
      if (sortedEntries.length > 0) {
        setCurrentWordIndex(0);
        setCurrentWord(sortedEntries[0]);
      } else {
        setCurrentWord(null);
      }
    } catch (err) {
      console.error('Error loading problem words:', err);
      setProblemWords([]);
      setCurrentWord(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMasteryStatus = async () => {
    if (!currentWord || !currentParticipantId) return;

    try {
      const { data } = await supabase
        .from('word_mastery_tracking')
        .select('*')
        .eq('entry_id', currentWord.id)
        .eq('participant_id', currentParticipantId)
        .single();

      if (data) {
        const progress = data.status === 'mastered' 
          ? 'Mastered!' 
          : `${data.correct_count}/3 correct`;
        setMasteryStatus({
          correctCount: data.correct_count,
          status: data.status,
          progress,
        });
      } else {
        setMasteryStatus(null);
      }
    } catch {
      setMasteryStatus(null);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentWord || selectedAnswer === null) return;

    const isAnswerCorrect = selectedAnswer === correctAnswerIndex;
    setIsCorrect(isAnswerCorrect);
    setShowFeedback(true);
    setSaving(true);

    try {
      await recordPracticeAnswer(currentWord.id, isAnswerCorrect);
      await loadMasteryStatus();
    } catch (err) {
      console.error('Error recording answer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNextWord = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setIsCorrect(false);
    setMultipleChoiceOptions([]);
    setCorrectAnswerIndex(0);

    if (currentWordIndex < problemWords.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setCurrentWord(problemWords[currentWordIndex + 1]);
    } else {
      // Reload problem words to get updated list (some may be mastered now)
      loadProblemWords();
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-xl max-w-2xl w-full border border-black dark:border-[#333333] p-6">
          <p className="text-black dark:text-[#ffffff] font-bold text-center">Loading problem words...</p>
        </div>
      </div>
    );
  }

  if (problemWords.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black dark:border-[#333333]">
          <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] z-10 border-b border-black dark:border-[#333333]">
            <Navigation />
          </div>
          <div className="p-4 sm:p-6">
            <div className="text-center py-12">
              <p className="text-black dark:text-[#ffffff] font-bold text-lg mb-2">No Problem Words</p>
              <p className="text-sm text-black dark:text-white mb-4">Mark words as problem words to practice them here.</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white dark:bg-black text-black dark:text-white rounded border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-sm font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const correctDefinition = currentWord?.word_metadata?.[0]?.definition || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#0a0a0a] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-black dark:border-[#333333]">
        <div className="sticky top-0 bg-white dark:bg-[#0a0a0a] z-10 border-b border-black dark:border-[#333333]">
          <Navigation />
        </div>
        <div className="p-4 sm:p-6">
          {currentWord && (
            <div className="space-y-4 sm:space-y-6">
              {/* Progress indicator */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-black dark:text-[#ffffff] font-bold">
                  Word {currentWordIndex + 1} of {problemWords.length}
                </span>
                {masteryStatus && (
                  <span className={`font-bold ${
                    masteryStatus.status === 'mastered' 
                      ? 'text-green-700 dark:text-[#22c55e]' 
                      : 'text-blue-700 dark:text-[#3b82f6]'
                  }`}>
                    {masteryStatus.progress}
                  </span>
                )}
              </div>

              {/* Word display */}
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-bold mb-3 sm:mb-4 text-black dark:text-[#ffffff]">
                  {currentWord.content}
                </p>
                {currentWord.word_metadata?.[0]?.pronunciation_respelling && (
                  <p className="text-lg text-black dark:text-[#b0b0b0] mb-4">
                    {currentWord.word_metadata[0].pronunciation_respelling}
                  </p>
                )}
              </div>

              {/* Multiple Choice Options */}
              {!showFeedback ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-3 text-black dark:text-[#ffffff]">
                      Select the correct definition:
                    </label>
                    <div className="space-y-2">
                      {multipleChoiceOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedAnswer(index)}
                          disabled={saving}
                          className={`w-full text-left p-3 sm:p-4 rounded border-2 transition-all ${
                            selectedAnswer === index
                              ? 'bg-accent-blue text-white border-accent-blue dark:border-accent-blue'
                              : 'bg-card-bg text-foreground border-card-border hover:border-accent-blue dark:hover:border-accent-blue'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`font-bold ${selectedAnswer === index ? 'text-white' : 'text-muted-text'}`}>
                              {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="flex-1">{option.definition}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null || saving}
                    className="w-full px-4 py-2 bg-accent-blue text-white font-bold rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Checking...' : 'Submit Answer'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Feedback */}
                  <div className={`p-4 rounded border-2 ${
                    isCorrect
                      ? 'bg-green-50 dark:bg-green-900 border-green-500 dark:border-green-300'
                      : 'bg-red-50 dark:bg-red-900 border-red-500 dark:border-red-300'
                  }`}>
                    <p className={`text-lg font-bold mb-2 ${
                      isCorrect
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    <div className="text-sm">
                      <p className="font-bold text-black dark:text-white mb-2">Your answer:</p>
                      <p className={`mb-3 ${
                        isCorrect 
                          ? 'text-green-900 dark:text-green-100' 
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {selectedAnswer !== null 
                          ? `${String.fromCharCode(65 + selectedAnswer)}. ${multipleChoiceOptions[selectedAnswer]?.definition || ''}`
                          : '(no answer selected)'}
                      </p>
                      {!isCorrect && (
                        <>
                          <p className="font-bold text-black dark:text-white mb-1">Correct answer:</p>
                          <p className="text-black dark:text-white">
                            {String.fromCharCode(65 + correctAnswerIndex)}. {correctDefinition}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress update */}
                  {masteryStatus && (
                    <div className="bg-card-bg border border-card-border rounded p-3">
                      <p className="text-sm font-bold text-foreground mb-1">Progress:</p>
                      <p className={`text-lg font-bold ${
                        masteryStatus.status === 'mastered'
                          ? 'text-green-700 dark:text-[#22c55e]'
                          : 'text-blue-700 dark:text-[#3b82f6]'
                      }`}>
                        {masteryStatus.progress}
                      </p>
                      {masteryStatus.status === 'mastered' && (
                        <p className="text-sm text-muted-text mt-2">🎉 Congratulations! You&apos;ve mastered this word!</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleNextWord}
                    className="w-full px-4 py-2 bg-white dark:bg-black text-black dark:text-white font-bold rounded border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    {currentWordIndex < problemWords.length - 1 ? 'Next Word' : 'Reload List'}
                  </button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2 justify-center pt-4 border-t border-card-border">
                <button
                  onClick={onClose}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-black text-black dark:text-white rounded border border-black dark:border-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-xs sm:text-sm font-bold"
                >
                  Close Practice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

