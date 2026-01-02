import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');

  if (!word) {
    return NextResponse.json({ error: 'Word parameter is required' }, { status: 400 });
  }

  try {
    // Try Wiktionary REST API for etymology
    const etymologyResponse = await fetch(
      `https://en.wiktionary.org/api/rest_v1/page/etymology/${encodeURIComponent(word.trim())}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 } // Cache for 1 hour
      }
    );

    let etymology = '';
    
    if (etymologyResponse.ok) {
      const etymologyData = await etymologyResponse.json();
      
      // Wiktionary returns etymology in different formats
      if (etymologyData.etymology) {
        if (Array.isArray(etymologyData.etymology)) {
          etymology = etymologyData.etymology.join(' ');
        } else if (typeof etymologyData.etymology === 'string') {
          etymology = etymologyData.etymology;
        }
      }
    }

    // If no etymology from Wiktionary REST API, try to get it from the full page
    if (!etymology) {
      try {
        const pageResponse = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(word.trim())}`,
          {
            headers: { 'Accept': 'text/html' },
            next: { revalidate: 3600 }
          }
        );

        if (pageResponse.ok) {
          const html = await pageResponse.text();
          // Try to extract etymology from HTML (basic regex - could be improved)
          const etymologyMatch = html.match(/<section[^>]*class="[^"]*etymology[^"]*"[^>]*>([\s\S]*?)<\/section>/i);
          if (etymologyMatch && etymologyMatch[1]) {
            // Strip HTML tags and clean up
            const cleanEtymology = etymologyMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (cleanEtymology.length > 10) {
              etymology = cleanEtymology.substring(0, 500); // Limit length
            }
          }
        }
      } catch (pageError) {
        console.log('Wiktionary page lookup failed:', pageError);
      }
    }

    return NextResponse.json({ etymology: etymology || '' });
  } catch (error) {
    console.error('Etymology lookup error:', error);
    return NextResponse.json({ etymology: '' });
  }
}
