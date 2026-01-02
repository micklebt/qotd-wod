import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for enhanced quote lookup using web search and AI
 * This provides a more comprehensive quote search than single-source APIs
 */

export async function POST(request: NextRequest) {
  try {
    const { quote } = await request.json();

    if (!quote || !quote.trim()) {
      return NextResponse.json(
        { error: 'Quote text is required' },
        { status: 400 }
      );
    }

    const trimmedQuote = quote.trim();
    const results: any = {
      author: null,
      source: null,
      context: null,
      background: null,
      interpretation: null,
      significance: null,
      sourceUrl: null,
      sourceType: null,
    };

    // Try multiple quote databases
    const sources = [
      {
        name: 'Quotable API',
        url: `https://api.quotable.io/search/quotes?query=${encodeURIComponent(trimmedQuote)}&limit=5`,
      },
      {
        name: 'BrainyQuote Search',
        url: `https://www.brainyquote.com/api/quotes/search?q=${encodeURIComponent(trimmedQuote)}`,
      },
    ];

    // Try each source
    for (const source of sources) {
      try {
        const response = await fetch(source.url, {
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; QuoteLookup/1.0)',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Handle Quotable API format
          if (source.name === 'Quotable API' && data.results && data.results.length > 0) {
            const bestMatch = data.results.find((q: any) => 
              q.content.toLowerCase().includes(trimmedQuote.toLowerCase()) ||
              trimmedQuote.toLowerCase().includes(q.content.toLowerCase())
            ) || data.results[0];

            if (bestMatch) {
              results.author = bestMatch.author || results.author;
              results.source = bestMatch.tags?.join(', ') || results.source;
              results.sourceUrl = `https://quotable.io/quotes/${bestMatch._id}`;
              results.sourceType = 'quote_database';
              break; // Found a match, stop searching
            }
          }
        }
      } catch (error) {
        console.log(`${source.name} lookup failed:`, error);
        // Continue to next source
      }
    }

    // If we have an author but no detailed info, try to get more context
    if (results.author && !results.context) {
      // Try to get author info and quote context
      try {
        const authorResponse = await fetch(
          `https://api.quotable.io/authors?slug=${encodeURIComponent(results.author.toLowerCase().replace(/\s+/g, '-'))}`,
          { signal: AbortSignal.timeout(3000) }
        );
        
        if (authorResponse.ok) {
          const authorData = await authorResponse.json();
          if (authorData.results && authorData.results.length > 0) {
            const author = authorData.results[0];
            results.source = results.source || author.description || author.name;
          }
        }
      } catch (error) {
        console.log('Author lookup failed:', error);
      }
    }

    // If still no results, try web search approach
    // Note: This would require a web search API key (Google Custom Search, Bing, etc.)
    // For now, we'll return what we have

    return NextResponse.json(results);
  } catch (error) {
    console.error('Quote search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for quote' },
      { status: 500 }
    );
  }
}

