import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for AI-powered quote lookup using OpenAI
 * This provides comprehensive quote information using AI knowledge
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

    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const trimmedQuote = quote.trim();

    // Use OpenAI to search for quote information
    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using mini for cost efficiency, can upgrade to gpt-4o if needed
          messages: [
            {
              role: 'system',
              content: `You are a quote research assistant. When given a quote, provide detailed information about it in JSON format with the following structure:
{
  "author": "Author name if known, or empty string",
  "source": "Book, speech, or source where the quote appears",
  "context": "When and where the quote was originally said or written",
  "background": "Historical background, origin, or what was happening at the time",
  "interpretation": "What the quote means and its significance",
  "significance": "Why this quote is notable, impactful, or important",
  "sourceType": "Type: literary_quote, historical_quote, speech, idiom, or unknown",
  "sourceUrl": "URL to source if available, or empty string"
}

Be thorough and accurate. If you don't know the quote, indicate that in the interpretation field but still try to provide what you can.`
            },
            {
              role: 'user',
              content: `Please provide detailed information about this quote: "${trimmedQuote}"`
            }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3, // Lower temperature for more factual responses
          max_tokens: 1000,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        console.error('OpenAI API error:', errorData);
        return NextResponse.json(
          { error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}` },
          { status: openaiResponse.status }
        );
      }

      const openaiData = await openaiResponse.json();
      const content = openaiData.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: 'No response from OpenAI' },
          { status: 500 }
        );
      }

      // Parse the JSON response
      let quoteInfo;
      try {
        quoteInfo = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }

      // Return the structured quote information
      return NextResponse.json({
        author: quoteInfo.author || null,
        source: quoteInfo.source || null,
        context: quoteInfo.context || null,
        background: quoteInfo.background || null,
        interpretation: quoteInfo.interpretation || null,
        significance: quoteInfo.significance || null,
        sourceType: quoteInfo.sourceType || 'unknown',
        sourceUrl: quoteInfo.sourceUrl || null,
      });

    } catch (openaiError: any) {
      console.error('OpenAI request failed:', openaiError);
      return NextResponse.json(
        { error: `OpenAI request failed: ${openaiError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Quote AI search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for quote using AI' },
      { status: 500 }
    );
  }
}


