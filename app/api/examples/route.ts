import { NextResponse } from 'next/server';
import { filterAndRankExamples, isDuplicate } from '@/lib/exampleQuality';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  const examples: string[] = [];
  const wordEncoded = encodeURIComponent(word.trim());
  const wordTrimmed = word.trim();
  let wordnikSourceUrl: string | null = null;

  try {
    // Try Wordnik API with API key if available
    // Note: Wordnik requires an API key - there is no unauthenticated access
    // The API key may take 24 hours to 7 days to receive (or 24 hours with $5 donation)
    const wordnikApiKey = process.env.WORDNIK_API_KEY;
    if (wordnikApiKey) {
      try {
        const wordnikResponse = await fetch(
          `https://api.wordnik.com/v4/word.json/${wordEncoded}/examples?includeDuplicates=false&useCanonical=false&limit=5&api_key=${wordnikApiKey}`,
          {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(3000)
          }
        );

        if (wordnikResponse.ok) {
          const wordnikData = await wordnikResponse.json();
          if (wordnikData.examples && Array.isArray(wordnikData.examples) && wordnikData.examples.length > 0) {
            const wordnikExamples = wordnikData.examples
              .map((ex: any) => ex.text?.trim())
              .filter((text: string) => text && text.length > 0 && text.length < 500);
            
            // Filter and rank by quality
            const qualityFiltered = filterAndRankExamples(wordnikExamples, wordTrimmed, 10);
            
            // Add high-quality examples (prioritize Wordnik as it's usually better)
            for (const example of qualityFiltered) {
              if (!isDuplicate(example, examples) && examples.length < 10) {
                examples.push(example);
              }
            }
            
            // Set Wordnik source URL for attribution (required by Wordnik terms)
            if (qualityFiltered.length > 0) {
              wordnikSourceUrl = `https://www.wordnik.com/words/${wordEncoded}`;
            }
          }
        } else if (wordnikResponse.status === 401 || wordnikResponse.status === 403) {
          // API key invalid or missing - this is expected if key not yet received
          console.log('Wordnik API key not yet active (this is normal during the 24-hour wait period)');
        }
      } catch (wordnikError) {
        // Continue to other sources
        console.log('Wordnik API lookup failed:', wordnikError);
      }
    } else {
      // No API key configured yet - this is expected during the wait period
      console.log('Wordnik API key not configured yet (waiting for key approval)');
    }

    // Try Free Dictionary API (dictionaryapi.dev) - it sometimes has examples
    if (examples.length === 0) {
      try {
        const dictResponse = await fetch(
          `https://api.dictionaryapi.dev/api/v2/entries/en/${wordEncoded}`,
          {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(3000)
          }
        );

        if (dictResponse.ok) {
          const dictData = await dictResponse.json();
          if (Array.isArray(dictData) && dictData.length > 0) {
            for (const entry of dictData) {
              if (entry.meanings && Array.isArray(entry.meanings)) {
                for (const meaning of entry.meanings) {
                  if (meaning.definitions && Array.isArray(meaning.definitions)) {
                    for (const def of meaning.definitions) {
                      if (def.example && def.example.trim()) {
                        const cleanExample = def.example.trim().replace(/^["']|["']$/g, '');
                        if (cleanExample.length > 0 && cleanExample.length < 500) {
                          // Only add if not duplicate and we haven't reached limit
                          if (!isDuplicate(cleanExample, examples) && examples.length < 10) {
                            examples.push(cleanExample);
                          }
                        }
                      }
                    }
                  }
                  if (examples.length >= 5) break;
                }
              }
              if (examples.length >= 5) break;
            }
          }
        }
      } catch (dictError) {
        // Continue
        console.log('Dictionary API lookup failed:', dictError);
      }
    }

    // Filter and rank all examples by quality, then return top 5
    const qualityFiltered = filterAndRankExamples(examples, wordTrimmed, 5);
    const finalExamples = qualityFiltered.slice(0, 5);

    // Return only high-quality examples from dictionary sources
    // Include Wordnik source URL if examples came from Wordnik (required for attribution)
    return NextResponse.json({ 
      examples: finalExamples,
      wordnikSourceUrl: wordnikSourceUrl || null
    });
  } catch (error) {
    console.error('Example sentences lookup error:', error);
    return NextResponse.json({ examples: [], wordnikSourceUrl: null });
  }
}

