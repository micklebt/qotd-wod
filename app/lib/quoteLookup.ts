/**
 * Quote lookup and enrichment functionality
 * Similar to word lookup, but for quotes
 */

interface QuoteLookupResult {
  author?: string;
  source?: string;
  context?: string;
  background?: string;
  interpretation?: string;
  significance?: string;
  sourceUrl?: string;
  sourceType?: string;
  relatedQuotes?: string[];
  error?: string;
}

/**
 * Lookup quote information from various sources
 */
export async function lookupQuote(quoteText: string): Promise<QuoteLookupResult> {
  if (!quoteText || !quoteText.trim()) {
    return { error: 'Please enter a quote first' };
  }

  const trimmedQuote = quoteText.trim();
  
  try {
    // Try Quotable API first (free, no key required)
    let result: QuoteLookupResult = {};
    
    try {
      // Search for quotes matching the text
      const quotableResponse = await fetch(
        `https://api.quotable.io/search/quotes?query=${encodeURIComponent(trimmedQuote)}&limit=5`,
        {
          signal: AbortSignal.timeout(5000)
        }
      );

      if (quotableResponse.ok) {
        const quotableData = await quotableResponse.json();
        
        if (quotableData.results && quotableData.results.length > 0) {
          // Find the best match (exact or close match)
          const bestMatch = quotableData.results.find((q: any) => 
            q.content.toLowerCase().includes(trimmedQuote.toLowerCase()) ||
            trimmedQuote.toLowerCase().includes(q.content.toLowerCase())
          ) || quotableData.results[0];

          result.author = bestMatch.author || '';
          result.source = bestMatch.tags?.join(', ') || '';
          result.sourceUrl = `https://quotable.io/quotes/${bestMatch._id}`;
          result.sourceType = 'quote_database';
        }
      }
    } catch (quotableError) {
      console.log('Quotable API lookup failed:', quotableError);
    }

    // Try Wikiquote if no result from Quotable
    if (!result.author) {
      try {
        // Extract potential author from quote or search Wikiquote
        // For now, we'll use a simple approach - can be enhanced
        const wikiquoteResponse = await fetch(
          `https://en.wikiquote.org/api/rest_v1/page/html/${encodeURIComponent(trimmedQuote.substring(0, 50))}`,
          {
            signal: AbortSignal.timeout(5000),
            headers: { 'Accept': 'text/html' }
          }
        );

        if (wikiquoteResponse.ok) {
          // Wikiquote returns HTML, would need parsing
          // For now, we'll skip this and use other methods
        }
      } catch (wikiquoteError) {
        console.log('Wikiquote lookup failed:', wikiquoteError);
      }
    }

    // Generate context and interpretation for common expressions/idioms
    // This is especially useful for phrases like "clutching her pearls"
    const enrichedData = enrichQuoteWithContext(trimmedQuote, result);
    
    return enrichedData;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to lookup quote'
    };
  }
}

/**
 * Enrich quote with context, interpretation, and background
 * Especially useful for idioms, expressions, and common phrases
 */
function enrichQuoteWithContext(quoteText: string, existingData: QuoteLookupResult): QuoteLookupResult {
  const quoteLower = quoteText.toLowerCase().trim();
  const result = { ...existingData };

  // Handle common idioms and expressions
  if (quoteLower.includes('clutching') && quoteLower.includes('pearl')) {
    result.interpretation = 'An idiom meaning someone is being overly dramatic, shocked, or feigning offense, often in a performative or sarcastic way. The phrase references the gesture of clutching a pearl necklace, which was historically associated with genteel, upper-class women expressing shock or dismay.';
    
    result.background = 'The phrase "clutching her pearls" (or "pearl-clutching") is a modern idiom that emerged in the late 20th/early 21st century. It\'s often used sarcastically to mock someone who is being overly dramatic about something that isn\'t actually shocking or offensive. The gesture itself comes from Victorian and early 20th-century social norms where women would clutch their pearl necklaces when surprised or scandalized.';
    
    result.context = 'This expression is commonly used in contemporary language, especially in social media and online discourse, to describe performative outrage or exaggerated reactions. It\'s not attributed to a specific person but has become part of common parlance.';
    
    result.significance = 'The phrase has gained popularity as a way to call out performative reactions, particularly in discussions about social issues, politics, or cultural changes. It highlights the difference between genuine concern and theatrical displays of shock.';
    
    result.sourceType = 'idiom';
    result.relatedQuotes = [
      'Pearl-clutching',
      'Feigned outrage',
      'Performative shock'
    ];
  }
  // Add more idiom/expression handlers here as needed
  else if (quoteLower.includes('break the ice')) {
    result.interpretation = 'An idiom meaning to initiate conversation or reduce tension in a social situation.';
    result.background = 'Originates from the practice of breaking ice to allow ships to pass through frozen waters, metaphorically applied to social situations.';
    result.sourceType = 'idiom';
  }
  // Generic interpretation for quotes without specific data
  else if (!result.interpretation) {
    // If we have an author, we can provide generic context
    if (result.author) {
      result.interpretation = `A quote attributed to ${result.author}. Consider adding your own interpretation of its meaning and significance.`;
    } else {
      result.interpretation = 'Consider adding your interpretation of this quote\'s meaning and significance.';
    }
  }

  return result;
}

/**
 * Search for related quotes by author or theme
 */
export async function findRelatedQuotes(author?: string, theme?: string): Promise<string[]> {
  const related: string[] = [];
  
  if (author) {
    try {
      const response = await fetch(
        `https://api.quotable.io/quotes?author=${encodeURIComponent(author)}&limit=5`,
        { signal: AbortSignal.timeout(3000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results) {
          related.push(...data.results.map((q: any) => q.content));
        }
      }
    } catch (error) {
      console.log('Related quotes lookup failed:', error);
    }
  }
  
  return related;
}

