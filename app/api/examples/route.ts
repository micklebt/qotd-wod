import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  try {
    // Try to get examples from Wordnik API (free, no key required for basic usage)
    // Note: Wordnik has rate limits but works without API key for basic queries
    const wordnikResponse = await fetch(
      `https://api.wordnik.com/v4/word.json/${encodeURIComponent(word.trim())}/examples?includeDuplicates=false&useCanonical=false&limit=5&api_key=`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    if (wordnikResponse.ok) {
      const wordnikData = await wordnikResponse.json();
      if (wordnikData.examples && Array.isArray(wordnikData.examples) && wordnikData.examples.length > 0) {
        const examples = wordnikData.examples
          .map((ex: any) => ex.text?.trim())
          .filter((text: string) => text && text.length > 0)
          .slice(0, 5);
        
        if (examples.length > 0) {
          return NextResponse.json({ examples });
        }
      }
    }

    // Fallback: Try Tatoeba or other sources if needed
    return NextResponse.json({ examples: [] });
  } catch (error) {
    console.error('Example sentences lookup error:', error);
    return NextResponse.json({ examples: [] });
  }
}

