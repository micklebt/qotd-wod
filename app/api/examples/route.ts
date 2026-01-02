import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  const examples: string[] = [];
  const wordEncoded = encodeURIComponent(word.trim());
  let wordnikSourceUrl: string | null = null;

  try {
    // Try Wordnik API with API key if available
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
              .filter((text: string) => text && text.length > 0 && text.length < 500)
              .slice(0, 5);
            examples.push(...wordnikExamples);
            
            // Set Wordnik source URL for attribution (required by Wordnik terms)
            if (wordnikExamples.length > 0) {
              wordnikSourceUrl = `https://www.wordnik.com/words/${wordEncoded}`;
            }
          }
        }
      } catch (wordnikError) {
        // Continue to other sources
        console.log('Wordnik API lookup failed:', wordnikError);
      }
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
                      if (def.example && def.example.trim() && !examples.includes(def.example.trim())) {
                        const cleanExample = def.example.trim().replace(/^["']|["']$/g, '');
                        if (cleanExample.length > 0 && cleanExample.length < 500) {
                          examples.push(cleanExample);
                          if (examples.length >= 5) break;
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

    // Return only real examples from dictionary sources
    // Include Wordnik source URL if examples came from Wordnik (required for attribution)
    return NextResponse.json({ 
      examples: examples.slice(0, 5),
      wordnikSourceUrl: wordnikSourceUrl || null
    });
  } catch (error) {
    console.error('Example sentences lookup error:', error);
    return NextResponse.json({ examples: [], wordnikSourceUrl: null });
  }
}

