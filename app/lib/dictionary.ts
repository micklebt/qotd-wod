import { filterAndRankExamples } from './exampleQuality';

interface DictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  etymology?: string;
  sourceUrls?: string[];
}

export async function lookupWord(word: string): Promise<{
  definition: string;
  pronunciation: string;
  partOfSpeech: string;
  etymology: string;
  audioUrl?: string;
  exampleSentence?: string;
  sourceUrl?: string;
  wordnikSourceUrl?: string;
  error?: string;
  suggestions?: string[];
}> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.trim())}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Try to get spelling suggestions
        const suggestions = await getSpellingSuggestions(word.trim());
        
      return {
        definition: '',
        pronunciation: '',
        partOfSpeech: '',
        etymology: '',
        audioUrl: undefined,
        exampleSentence: undefined,
        sourceUrl: undefined,
        wordnikSourceUrl: undefined,
        error: 'Word not found in dictionary',
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
      }
      throw new Error(`Dictionary API error: ${response.status}`);
    }

    const data: DictionaryResponse[] = await response.json();
    
    if (!data || data.length === 0) {
        return {
          definition: '',
          pronunciation: '',
          partOfSpeech: '',
          etymology: '',
          audioUrl: undefined,
          exampleSentence: undefined,
          sourceUrl: undefined,
          wordnikSourceUrl: undefined,
          error: 'No data returned for this word',
        };
    }

    // Combine data from all entries (some words have multiple dictionary entries)
    let pronunciation = '';
    let audioUrl = '';
    let partOfSpeech = '';
    const allDefinitions: string[] = [];
    const exampleSentences: string[] = [];
    let etymology = '';
    let sourceUrl = '';

    // Process all dictionary entries - first pass for pronunciation
    data.forEach(entry => {
      // Get pronunciation from first entry that has it
      if (!pronunciation) {
        pronunciation = entry.phonetic || 
                       entry.phonetics?.find(p => p.text)?.text || 
                       '';
      }

      // Get audio URL from first entry that has it
      if (!audioUrl) {
        audioUrl = entry.phonetics?.find(p => p.audio)?.audio || '';
      }
    });

    // If no pronunciation found, try singular form for plural words
    if (!pronunciation && !audioUrl) {
      const wordLower = word.trim().toLowerCase();
      // Try singular form if word ends in common plural endings
      if (wordLower.endsWith('ics') && wordLower.length > 3) {
        // For words ending in -ics (like diacritics -> diacritic)
        const singularForm = wordLower.slice(0, -1); // Remove 's'
        try {
          const singularResponse = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(singularForm)}`
          );
          if (singularResponse.ok) {
            const singularData: DictionaryResponse[] = await singularResponse.json();
            if (singularData && singularData.length > 0) {
              const singularEntry = singularData[0];
              pronunciation = singularEntry.phonetic || 
                            singularEntry.phonetics?.find(p => p.text)?.text || 
                            '';
              audioUrl = singularEntry.phonetics?.find(p => p.audio)?.audio || '';
            }
          }
        } catch (e) {
          // Silently fail
        }
      } else if (wordLower.endsWith('s') && wordLower.length > 2 && !wordLower.endsWith('ss')) {
        // Try removing 's' for regular plurals
        const singularForm = wordLower.slice(0, -1);
        try {
          const singularResponse = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(singularForm)}`
          );
          if (singularResponse.ok) {
            const singularData: DictionaryResponse[] = await singularResponse.json();
            if (singularData && singularData.length > 0) {
              const singularEntry = singularData[0];
              if (!pronunciation) {
                pronunciation = singularEntry.phonetic || 
                              singularEntry.phonetics?.find(p => p.text)?.text || 
                              '';
              }
              if (!audioUrl) {
                audioUrl = singularEntry.phonetics?.find(p => p.audio)?.audio || '';
              }
            }
          }
        } catch (e) {
          // Silently fail
        }
      }
    }

    // Process all dictionary entries (second pass for other data)
    data.forEach(entry => {

      // Get etymology from first entry that has it
      if (!etymology && entry.etymology) {
        etymology = entry.etymology;
      }

      // Get source URL from first entry that has it
      if (!sourceUrl && entry.sourceUrls && entry.sourceUrls.length > 0) {
        sourceUrl = entry.sourceUrls[0];
      }

      // Collect all meanings, definitions, and examples from all entries
      entry.meanings?.forEach(meaning => {
        // Get part of speech from first meaning
        if (!partOfSpeech) {
          partOfSpeech = meaning.partOfSpeech || '';
        }

        // Collect definitions
        meaning.definitions?.forEach(def => {
          if (def.definition && !allDefinitions.includes(def.definition)) {
            allDefinitions.push(def.definition);
          }

          // Collect example sentences (with basic quality check)
          if (def.example && def.example.trim()) {
            const cleanExample = def.example.trim().replace(/^["']|["']$/g, '');
            // Basic quality checks: must have reasonable length and contain the word
            if (cleanExample && 
                cleanExample.length >= 15 && 
                cleanExample.length <= 500 &&
                !exampleSentences.includes(cleanExample)) {
              // Check if it contains the word (case-insensitive)
              const wordLower = word.trim().toLowerCase();
              const exampleLower = cleanExample.toLowerCase();
              if (exampleLower.includes(wordLower)) {
                exampleSentences.push(cleanExample);
              }
            }
          }
        });
      });
    });

    // Combine definitions (limit to first 5 most relevant)
    const definition = allDefinitions.slice(0, 5).join('; ');
    
    // Filter and rank example sentences by quality
    const qualityFiltered = filterAndRankExamples(exampleSentences, word.trim(), 5);
    
    // Combine all example sentences (limit to first 5 to avoid too much text)
    let exampleSentence = qualityFiltered.length > 0 
      ? qualityFiltered.slice(0, 5).join('\n\n') 
      : '';

    // Try to get additional examples from other sources (Wordnik, etc.)
    // This enhances the examples we already have from dictionaryapi.dev
    let wordnikSourceUrl: string | undefined = undefined;
    try {
      // Try our API route which uses Wordnik for real example sentences
      // Note: Wordnik requires an API key, but we try anyway and fall back gracefully
      const examplesResponse = await fetch(
        `/api/examples?word=${encodeURIComponent(word.trim())}`,
        { signal: AbortSignal.timeout(3000) }
      );
      
      if (examplesResponse.ok) {
        const examplesData = await examplesResponse.json();
        if (examplesData.examples && Array.isArray(examplesData.examples) && examplesData.examples.length > 0) {
          // If we already have examples from dictionaryapi.dev, combine them
          // Otherwise, use the examples from the API route
          if (exampleSentence) {
            // Merge examples, avoiding duplicates using exact match (case-insensitive, trimmed)
            const existingExamples = exampleSentence.split('\n\n').map(e => e.trim().toLowerCase());
            const newExamples = examplesData.examples
              .map((ex: string) => ex.trim())
              .filter((ex: string) => {
                const exLower = ex.toLowerCase();
                // Check for exact match (case-insensitive)
                return !existingExamples.some(existing => existing === exLower);
              });
            if (newExamples.length > 0) {
              const allExamples = [...exampleSentence.split('\n\n'), ...newExamples];
              // Remove duplicates again (in case of any edge cases)
              const uniqueExamples = Array.from(new Set(allExamples.map(e => e.trim().toLowerCase())))
                .map(lower => allExamples.find(e => e.trim().toLowerCase() === lower) || '')
                .filter(e => e.length > 0);
              exampleSentence = uniqueExamples.slice(0, 5).join('\n\n');
            }
          } else {
            // Remove duplicates from new examples
            const uniqueExamples = Array.from(new Set(examplesData.examples.map((e: string) => e.trim().toLowerCase())))
              .map(lower => examplesData.examples.find((e: string) => e.trim().toLowerCase() === lower) || '')
              .filter(e => e.length > 0);
            exampleSentence = uniqueExamples.slice(0, 5).join('\n\n');
          }
          
          // Track Wordnik source URL for attribution if examples came from Wordnik
          if (examplesData.wordnikSourceUrl) {
            wordnikSourceUrl = examplesData.wordnikSourceUrl;
          }
        }
      }
    } catch (examplesError) {
      // Silently fail - examples are optional
      // This is normal if Wordnik API key is not yet configured
      console.log('Examples API lookup failed (this is normal if Wordnik API key is not configured):', examplesError);
    }

    // Fallback: Try WordsAPI if configured
    if (!exampleSentence) {
      try {
        const wordsApiKey = process.env.NEXT_PUBLIC_WORDS_API_KEY;
        if (wordsApiKey) {
          const wordsApiResponse = await fetch(
            `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(word.trim())}/examples`,
            {
              headers: {
                'X-RapidAPI-Key': wordsApiKey,
                'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com'
              },
              signal: AbortSignal.timeout(3000)
            }
          );
          
          if (wordsApiResponse.ok) {
            const wordsApiData = await wordsApiResponse.json();
            if (wordsApiData.examples && Array.isArray(wordsApiData.examples) && wordsApiData.examples.length > 0) {
              exampleSentence = wordsApiData.examples.slice(0, 5).join('\n\n');
            }
          }
        }
      } catch (wordsApiError) {
        // Silently fail - WordsAPI is optional
        console.log('WordsAPI lookup failed (this is normal if not configured):', wordsApiError);
      }
    }

    // If no etymology from dictionary API, try our API route (which uses Wiktionary)
    if (!etymology) {
      try {
        const etymologyResponse = await fetch(
          `/api/etymology?word=${encodeURIComponent(word.trim())}`,
          { 
            signal: AbortSignal.timeout(5000)
          }
        );
        
        if (etymologyResponse.ok) {
          const etymologyData = await etymologyResponse.json();
          if (etymologyData.etymology && etymologyData.etymology.trim()) {
            etymology = etymologyData.etymology.trim();
            console.log('Etymology found from Wiktionary:', etymology.substring(0, 100));
          }
        } else {
          console.log('Etymology API response not OK:', etymologyResponse.status);
        }
      } catch (etymologyError) {
        // Silently fail - etymology is optional
        console.log('Etymology lookup failed (this is normal if word not found):', etymologyError);
      }
      
      // If still no etymology and word is plural, try singular form
      if (!etymology) {
        const wordLower = word.trim().toLowerCase();
        // Try singular form if word ends in common plural endings
        if (wordLower.endsWith('ics') && wordLower.length > 3) {
          // For words ending in -ics (like diacritics -> diacritic)
          const singularForm = wordLower.slice(0, -1); // Remove 's'
          try {
            const singularEtymologyResponse = await fetch(
              `/api/etymology?word=${encodeURIComponent(singularForm)}`,
              { 
                signal: AbortSignal.timeout(5000)
              }
            );
            
            if (singularEtymologyResponse.ok) {
              const singularEtymologyData = await singularEtymologyResponse.json();
              if (singularEtymologyData.etymology && singularEtymologyData.etymology.trim()) {
                etymology = singularEtymologyData.etymology.trim();
              }
            }
          } catch (e) {
            // Silently fail
          }
        } else if (wordLower.endsWith('s') && wordLower.length > 2 && !wordLower.endsWith('ss')) {
          // Try removing 's' for regular plurals
          const singularForm = wordLower.slice(0, -1);
          try {
            const singularEtymologyResponse = await fetch(
              `/api/etymology?word=${encodeURIComponent(singularForm)}`,
              { 
                signal: AbortSignal.timeout(5000)
              }
            );
            
            if (singularEtymologyResponse.ok) {
              const singularEtymologyData = await singularEtymologyResponse.json();
              if (singularEtymologyData.etymology && singularEtymologyData.etymology.trim()) {
                etymology = singularEtymologyData.etymology.trim();
              }
            }
          } catch (e) {
            // Silently fail
          }
        }
      }
    }

    return {
      definition: definition || '',
      pronunciation: pronunciation || '',
      partOfSpeech: partOfSpeech || '',
      etymology: etymology || '',
      audioUrl: audioUrl || undefined,
      exampleSentence: exampleSentence || undefined,
      sourceUrl: sourceUrl || undefined,
      wordnikSourceUrl: wordnikSourceUrl || undefined,
    };
  } catch (error) {
    return {
      definition: '',
      pronunciation: '',
      partOfSpeech: '',
      etymology: '',
      audioUrl: undefined,
      exampleSentence: undefined,
      sourceUrl: undefined,
      wordnikSourceUrl: undefined,
      error: error instanceof Error ? error.message : 'Failed to lookup word',
      suggestions: undefined,
    };
  }
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len2][len1];
}

/**
 * Generate word variations for spelling suggestions
 */
function generateVariations(word: string): string[] {
  const variations: string[] = [];
  const wordLower = word.toLowerCase();
  
  // Character substitutions (common typos)
  const commonSubstitutions: Record<string, string[]> = {
    'd': ['p', 't', 'b'],
    'p': ['d', 'b', 't'],
    'i': ['y', 'e', 'a'],
    'y': ['i', 'e'],
    'e': ['i', 'a', 'o'],
    'a': ['e', 'o', 'u'],
    'o': ['a', 'u', 'e'],
    'u': ['o', 'a'],
    'c': ['k', 's'],
    'k': ['c'],
    's': ['c', 'z'],
    'z': ['s'],
    'f': ['ph', 'v'],
    'ph': ['f'],
    'v': ['f'],
  };

  // Try character substitutions
  for (let i = 0; i < wordLower.length; i++) {
    const char = wordLower[i];
    if (commonSubstitutions[char]) {
      for (const sub of commonSubstitutions[char]) {
        const variant = wordLower.slice(0, i) + sub + wordLower.slice(i + 1);
        variations.push(variant);
      }
    }
  }

  // Try removing one character
  for (let i = 0; i < wordLower.length; i++) {
    const variant = wordLower.slice(0, i) + wordLower.slice(i + 1);
    if (variant.length >= 3) {
      variations.push(variant);
    }
  }

  // Try adding one character (common vowels and consonants)
  const commonChars = 'aeiouyrdptklmn';
  for (let i = 0; i <= wordLower.length; i++) {
    for (const char of commonChars) {
      const variant = wordLower.slice(0, i) + char + wordLower.slice(i);
      variations.push(variant);
    }
  }

  // Try swapping adjacent characters
  for (let i = 0; i < wordLower.length - 1; i++) {
    const chars = wordLower.split('');
    [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
    variations.push(chars.join(''));
  }

  // Remove duplicates
  return [...new Set(variations)];
}

/**
 * Get spelling suggestions for a misspelled word
 */
async function getSpellingSuggestions(word: string): Promise<string[]> {
  try {
    // Generate variations
    const variations = generateVariations(word);
    
    // Test variations in batches to find valid words
    const validSuggestions: Array<{ word: string; distance: number }> = [];
    const batchSize = 10;
    
    for (let i = 0; i < Math.min(variations.length, 50); i += batchSize) {
      const batch = variations.slice(i, i + batchSize);
      
      const testPromises = batch.map(async (variant) => {
        try {
          const testResponse = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(variant)}`,
            { signal: AbortSignal.timeout(800) }
          );
          if (testResponse.ok) {
            const distance = levenshteinDistance(word.toLowerCase(), variant);
            return { word: variant, distance };
          }
        } catch {
          // Ignore errors
        }
        return null;
      });

      const results = await Promise.all(testPromises);
      const valid = results.filter((r): r is { word: string; distance: number } => r !== null);
      validSuggestions.push(...valid);
      
      // If we have enough good suggestions, stop
      if (validSuggestions.length >= 5) {
        break;
      }
    }

    // Sort by edit distance (closest matches first) and return top 5
    validSuggestions.sort((a, b) => a.distance - b.distance);
    return validSuggestions.slice(0, 5).map(s => s.word);
  } catch (error) {
    console.log('Spelling suggestions failed:', error);
    return [];
  }
}

