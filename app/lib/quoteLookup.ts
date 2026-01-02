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
    // Try AI-powered quote search first (most comprehensive)
    let result: QuoteLookupResult = {};
    
    try {
      const aiResponse = await fetch('/api/quote-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quote: trimmedQuote }),
        signal: AbortSignal.timeout(30000), // 30 second timeout for AI
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        // If AI found information (even if some fields are null, check if we got meaningful data)
        if (aiData.author || aiData.context || aiData.interpretation) {
          result.author = aiData.author || '';
          result.source = aiData.source || '';
          result.context = aiData.context || '';
          result.background = aiData.background || '';
          result.interpretation = aiData.interpretation || '';
          result.significance = aiData.significance || '';
          result.sourceUrl = aiData.sourceUrl || '';
          result.sourceType = aiData.sourceType || 'ai_generated';
          
          // If AI provided good data, use it and skip other searches
          if (result.author || result.interpretation) {
            return result;
          }
        }
      } else {
        // If AI is not configured or fails, continue to other methods
        const errorData = await aiResponse.json().catch(() => ({}));
        if (errorData.error && !errorData.error.includes('not configured')) {
          console.log('AI quote search failed:', errorData.error);
        }
      }
    } catch (aiError) {
      // AI search failed (likely not configured), continue to other methods
      console.log('AI quote search unavailable:', aiError);
    }

    // Fallback: Try enhanced quote search API route (uses multiple databases)
    if (!result.author) {
      try {
        const searchResponse = await fetch('/api/quote-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ quote: trimmedQuote }),
          signal: AbortSignal.timeout(8000),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.author) {
            result.author = searchData.author;
            result.source = searchData.source || '';
            result.sourceUrl = searchData.sourceUrl || '';
            result.sourceType = searchData.sourceType || 'quote_database';
          }
        }
      } catch (searchError) {
        console.log('Enhanced quote search failed:', searchError);
      }
    }

    // Fallback to Quotable API if enhanced search didn't find anything
    if (!result.author) {
      try {
        // Search for quotes matching the text - try full quote first
        let quotableResponse = await fetch(
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
        
        // If no results, try searching by key phrases (first few words)
        if (!result.author && trimmedQuote.length > 20) {
          const keyPhrase = trimmedQuote.split(' ').slice(0, 5).join(' ');
          quotableResponse = await fetch(
            `https://api.quotable.io/search/quotes?query=${encodeURIComponent(keyPhrase)}&limit=5`,
            {
              signal: AbortSignal.timeout(5000)
            }
          );
          
          if (quotableResponse.ok) {
            const quotableData = await quotableResponse.json();
            if (quotableData.results && quotableData.results.length > 0) {
              // Look for quotes by known authors that might match
              const bestMatch = quotableData.results.find((q: any) => 
                q.content.toLowerCase().includes(keyPhrase.toLowerCase()) ||
                keyPhrase.toLowerCase().includes(q.content.toLowerCase().substring(0, 50))
              ) || quotableData.results[0];

              if (bestMatch) {
                result.author = bestMatch.author || '';
                result.source = bestMatch.tags?.join(', ') || '';
                result.sourceUrl = `https://quotable.io/quotes/${bestMatch._id}`;
                result.sourceType = 'quote_database';
              }
            }
          }
        }
      } catch (quotableError) {
        console.log('Quotable API lookup failed:', quotableError);
      }
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
  // Famous historical quotes
  else if (quoteLower.includes("couldn't hit an elephant") || quoteLower.includes("couldn't hit an elephant at this distance")) {
    result.author = 'General John Sedgwick';
    result.source = 'American Civil War, Battle of Spotsylvania Court House, May 9, 1864';
    result.context = 'General Sedgwick made this remark to his troops who were ducking from Confederate sharpshooter fire. He was attempting to reassure his men that the enemy was too far away to be accurate. Tragically, moments after uttering these words, he was struck and killed by a Confederate sharpshooter\'s bullet.';
    result.background = 'This incident occurred during the Battle of Spotsylvania Court House, one of the bloodiest battles of the American Civil War. General Sedgwick was a respected Union commander who had served in the Mexican-American War and was known for his calm demeanor under fire. The irony of his death immediately after dismissing the danger has made this quote one of the most famous "famous last words" in military history.';
    result.interpretation = 'The quote serves as a cautionary tale about overconfidence and the unpredictability of warfare. It highlights how even experienced military leaders can underestimate danger, and how quickly circumstances can change in combat. The quote is often cited as an example of tragic irony.';
    result.significance = 'This quote has become emblematic of the dangers of complacency and the harsh realities of war. It\'s frequently used in military training and historical discussions to illustrate the importance of taking all threats seriously, regardless of perceived distance or safety. The quote also serves as a reminder of the human cost of the Civil War, where even high-ranking officers were not immune to the dangers of the battlefield.';
    result.sourceType = 'historical_quote';
    result.sourceUrl = 'https://www.history.com/topics/american-civil-war/battle-of-spotsylvania-court-house';
  }
  // Mark Twain quotes
  else if (quoteLower.includes('always respect your superiors') && quoteLower.includes('if you have any')) {
    result.author = 'Mark Twain';
    result.source = 'Attributed to Mark Twain (Samuel Clemens), 1835-1910';
    result.context = 'This quote reflects Mark Twain\'s characteristic wit and skepticism toward authority. While the exact source is uncertain, it is widely attributed to Twain and captures his satirical view of social hierarchies and blind obedience.';
    result.background = 'Mark Twain (Samuel Langhorne Clemens) was an American writer, humorist, and social critic known for his sharp wit and satirical observations about American society. He was critical of authority, hypocrisy, and social conventions, often using humor to expose deeper truths. This quote exemplifies his style of using seemingly simple advice to make a more complex point about questioning authority rather than blindly following it.';
    result.interpretation = 'The quote uses irony to suggest that respect should be earned, not automatically granted based on position or title. The conditional phrase "if you have any" implies that true superiors—those worthy of respect—may be rare or non-existent. It encourages critical thinking about who deserves respect and why, rather than deferring to hierarchy automatically.';
    result.significance = 'This quote remains relevant in discussions about leadership, authority, and respect. It challenges the notion that position alone warrants respect and encourages individuals to evaluate the character and actions of those in positions of power. The quote is often cited in discussions about workplace dynamics, political leadership, and social hierarchies.';
    result.sourceType = 'literary_quote';
    result.sourceUrl = 'https://www.cmgww.com/historic/twain/';
  }
  else if (quoteLower.includes('man is the only animal that blushes') || quoteLower.includes('man is the only animal that blushes or needs to')) {
    result.author = 'Mark Twain';
    result.source = 'Following the Equator (1897)';
    result.context = 'This quote appears in Mark Twain\'s travelogue "Following the Equator," published in 1897. The book chronicles his journey around the world and contains many of his most famous observations about human nature.';
    result.background = 'Mark Twain wrote "Following the Equator" after a financially devastating period in his life. The book combines travel narrative with social commentary, and this particular quote reflects Twain\'s cynical yet insightful observations about human nature. The quote suggests that humans are unique in their capacity for shame and moral awareness, but also uniquely capable of wrongdoing that requires such awareness.';
    result.interpretation = 'The quote is a wry observation about human nature. It points out that humans are the only animals that experience shame (blushing), but also the only ones who "need to" - implying that humans are uniquely capable of actions that warrant shame. It\'s both a recognition of human moral consciousness and a critique of human behavior.';
    result.significance = 'This quote is frequently cited in discussions about human nature, morality, and the unique characteristics that distinguish humans from other animals. It captures Twain\'s ability to make profound observations through simple, memorable statements. The quote highlights the paradox of human consciousness: we have moral awareness, yet we are capable of actions that violate that awareness.';
    result.sourceType = 'literary_quote';
    result.sourceUrl = 'https://www.gutenberg.org/files/2895/2895-h/2895-h.htm';
  }
  else if (quoteLower.includes('man is the only animal that blushes') || quoteLower.includes('man is the only animal that blushes or needs to')) {
    result.author = 'Mark Twain';
    result.source = 'Following the Equator (1897)';
    result.context = 'This quote appears in Mark Twain\'s travelogue "Following the Equator," published in 1897. The book chronicles his journey around the world and contains many of his most famous observations about human nature.';
    result.background = 'Mark Twain wrote "Following the Equator" after a financially devastating period in his life. The book combines travel narrative with social commentary, and this particular quote reflects Twain\'s cynical yet insightful observations about human nature. The quote suggests that humans are unique in their capacity for shame and moral awareness, but also uniquely capable of wrongdoing that requires such awareness.';
    result.interpretation = 'The quote is a wry observation about human nature. It points out that humans are the only animals that experience shame (blushing), but also the only ones who "need to" - implying that humans are uniquely capable of actions that warrant shame. It\'s both a recognition of human moral consciousness and a critique of human behavior.';
    result.significance = 'This quote is frequently cited in discussions about human nature, morality, and the unique characteristics that distinguish humans from other animals. It captures Twain\'s ability to make profound observations through simple, memorable statements. The quote highlights the paradox of human consciousness: we have moral awareness, yet we are capable of actions that violate that awareness.';
    result.sourceType = 'literary_quote';
    result.sourceUrl = 'https://www.gutenberg.org/files/2895/2895-h/2895-h.htm';
  }
  // Famous motivational quotes
  else if (quoteLower.includes('never let the fear of striking out') || quoteLower.includes('never let the fear of striking out keep you from playing the game')) {
    result.author = 'Babe Ruth';
    result.source = 'Attributed to Babe Ruth (George Herman Ruth Jr.), 1895-1948';
    result.context = 'This quote is widely attributed to Babe Ruth, one of the greatest baseball players of all time. While the exact source is uncertain, it captures the spirit of Ruth\'s approach to life and baseball - taking risks and not being afraid to fail.';
    result.background = 'Babe Ruth was an American professional baseball player whose career spanned from 1914 to 1935. Known as "The Great Bambino" and "The Sultan of Swat," Ruth revolutionized the game with his power hitting. He held the record for most home runs in a career (714) for decades. Despite his legendary status, Ruth also struck out more than any other player of his era, making this quote particularly meaningful - he understood that failure was part of the process of achieving greatness.';
    result.interpretation = 'The quote is a powerful metaphor about courage and perseverance. "Striking out" represents failure or making mistakes, while "playing the game" represents taking action and pursuing your goals. The message is clear: don\'t let the fear of failure prevent you from trying. Success requires taking risks, and failure is an inevitable part of the journey toward achievement.';
    result.significance = 'This quote has become one of the most famous motivational quotes in American culture, transcending baseball to apply to all areas of life. It\'s frequently cited in discussions about entrepreneurship, personal growth, and overcoming fear. The quote embodies the American spirit of resilience and the understanding that greatness comes from being willing to fail. It\'s particularly powerful coming from someone who both succeeded spectacularly and failed publicly many times.';
    result.sourceType = 'motivational_quote';
    result.sourceUrl = 'https://baseballhall.org/hall-of-famers/ruth-babe';
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

