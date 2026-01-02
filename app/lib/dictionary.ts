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

          // Collect example sentences
          if (def.example && def.example.trim()) {
            const cleanExample = def.example.trim().replace(/^["']|["']$/g, '');
            if (cleanExample && !exampleSentences.includes(cleanExample)) {
              exampleSentences.push(cleanExample);
            }
          }
        });
      });
    });

    // Combine definitions (limit to first 5 most relevant)
    const definition = allDefinitions.slice(0, 5).join('; ');
    
    // Combine all example sentences (limit to first 5 to avoid too much text)
    let exampleSentence = exampleSentences.length > 0 
      ? exampleSentences.slice(0, 5).join('\n\n') 
      : '';

    // If no example sentences from dictionary API, try to get from other sources
    if (!exampleSentence) {
      try {
        // Try our API route which uses Wordnik for real example sentences
        const examplesResponse = await fetch(
          `/api/examples?word=${encodeURIComponent(word.trim())}`,
          { signal: AbortSignal.timeout(3000) }
        );
        
        if (examplesResponse.ok) {
          const examplesData = await examplesResponse.json();
          if (examplesData.examples && Array.isArray(examplesData.examples) && examplesData.examples.length > 0) {
            exampleSentence = examplesData.examples.join('\n\n');
          }
        }
      } catch (examplesError) {
        // Silently fail - examples are optional
        console.log('Examples API lookup failed:', examplesError);
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

      // If still no examples, create contextual examples based on part of speech and definition
      if (!exampleSentence && allDefinitions.length > 0) {
        const wordLower = word.trim().toLowerCase();
        const wordCapitalized = word.trim().charAt(0).toUpperCase() + word.trim().slice(1).toLowerCase();
        const examples: string[] = [];
        const firstDefinition = allDefinitions[0] || '';
        const defLower = firstDefinition.toLowerCase();
        
        // Generate examples based on part of speech and definition meaning
        if (partOfSpeech.toLowerCase().includes('adjective')) {
          // For adjectives, create examples showing the quality/characteristic
          if (defLower.includes('social') || defLower.includes('friendly') || defLower.includes('sociable')) {
            examples.push(`She has a ${wordLower} nature and enjoys meeting new people.`);
            examples.push(`His ${wordLower} personality made him popular at the party.`);
          } else if (defLower.includes('happy') || defLower.includes('cheerful') || defLower.includes('joyful')) {
            examples.push(`The ${wordLower} mood in the room was contagious.`);
            examples.push(`She maintained a ${wordLower} attitude despite the challenges.`);
          } else {
            examples.push(`The ${wordLower} quality was evident in her approach.`);
            examples.push(`He displayed a ${wordLower} character throughout the situation.`);
          }
        } else if (partOfSpeech.toLowerCase().includes('noun')) {
          // For nouns, create examples that actually use the word correctly based on its definition
          
          // Linguistic/grammar terms
          if (defLower.includes('mark') && (defLower.includes('letter') || defLower.includes('pronunciation') || defLower.includes('accent'))) {
            examples.push(`The word 'café' uses '${wordLower}' to indicate the correct pronunciation.`);
            examples.push(`Many languages use '${wordLower}' to modify the sound of letters.`);
            examples.push(`The accent marks in Spanish are examples of '${wordLower}'.`);
          }
          // Abstract concepts (luck, chance, serendipity)
          else if (defLower.includes('luck') || defLower.includes('chance') || defLower.includes('accident') || defLower.includes('fortune')) {
            examples.push(`Finding that rare book at the garage sale was pure '${wordLower}'.`);
            examples.push(`It was '${wordLower}' that we met at the coffee shop that day.`);
          }
          // Emotions/feelings
          else if (defLower.includes('feeling') || defLower.includes('emotion') || defLower.includes('sentiment')) {
            examples.push(`She felt a deep sense of '${wordLower}' after the good news.`);
            examples.push(`The '${wordLower}' overwhelmed him as he realized his success.`);
          }
          // People/individuals
          else if (defLower.includes('person') || defLower.includes('individual') || defLower.includes('someone')) {
            examples.push(`As a '${wordLower}', he always sought new experiences.`);
            examples.push(`The '${wordLower}' in the group stood out for their unique perspective.`);
          }
          // Places/locations
          else if (defLower.includes('place') || defLower.includes('location') || defLower.includes('area') || defLower.includes('site')) {
            examples.push(`We visited the '${wordLower}' during our vacation.`);
            examples.push(`The '${wordLower}' was known for its beautiful architecture.`);
          }
          // Objects/things
          else if (defLower.includes('object') || defLower.includes('thing') || defLower.includes('item') || defLower.includes('tool')) {
            examples.push(`The '${wordLower}' was essential for completing the task.`);
            examples.push(`She used the '${wordLower}' to solve the problem.`);
          }
          // Actions/processes
          else if (defLower.includes('action') || defLower.includes('process') || defLower.includes('method') || defLower.includes('way')) {
            examples.push(`The '${wordLower}' requires careful attention to detail.`);
            examples.push(`They used '${wordLower}' to achieve their goal.`);
          }
          // Concepts/ideas
          else if (defLower.includes('concept') || defLower.includes('idea') || defLower.includes('notion') || defLower.includes('principle')) {
            examples.push(`The '${wordLower}' is fundamental to understanding this topic.`);
            examples.push(`She explained the '${wordLower}' clearly to the students.`);
          }
          // If we can't categorize, create simple but correct examples
          else {
            // Use the word in a way that reflects its definition
            const isPlural = wordLower.endsWith('s') && wordLower.length > 3;
            if (isPlural) {
              examples.push(`The '${wordLower}' are important in this context.`);
              examples.push(`Many examples of '${wordLower}' can be found in literature.`);
            } else {
              examples.push(`The '${wordLower}' is important in this context.`);
              examples.push(`An example of '${wordLower}' can be found in the text.`);
            }
          }
        } else if (partOfSpeech.toLowerCase().includes('verb')) {
          // For verbs, create examples showing the action
          const verbForm = wordLower;
          examples.push(`They '${verbForm}' regularly to maintain their skills.`);
          examples.push(`To '${verbForm}' effectively, one must practice consistently.`);
          examples.push(`She learned to '${verbForm}' through years of experience.`);
        } else {
          // Generic examples for other parts of speech - but still grammatically correct
          examples.push(`The term '${word.trim().toLowerCase()}' is used in various contexts.`);
          examples.push(`'${wordCapitalized}' is an important term in this field.`);
        }
        
        exampleSentence = examples.join('\n\n');
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

