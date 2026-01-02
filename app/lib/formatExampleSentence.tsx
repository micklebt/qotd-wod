/**
 * Formats example sentences to highlight:
 * 1. The word being looked up (bold and italic)
 * 2. Words wrapped in single quotes (italic and underline)
 */

import React from 'react';

export function formatExampleSentence(sentence: string, word?: string): React.ReactNode {
  if (!sentence) return sentence;

  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let key = 0;

  // Collect all matches (word and quotes) with their positions
  const matches: Array<{ start: number; end: number; type: 'word' | 'quote'; text: string; quotedText?: string }> = [];

  // Find word matches (case-insensitive, whole word only)
  if (word && word.trim()) {
    const wordTrimmed = word.trim();
    const wordRegex = new RegExp(`\\b${wordTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match;
    
    while ((match = wordRegex.exec(sentence)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'word',
        text: match[0]
      });
    }
  }

  // Find quote matches
  const quotePattern = /'([^']+)'/g;
  let quoteMatch;
  
  while ((quoteMatch = quotePattern.exec(sentence)) !== null) {
    matches.push({
      start: quoteMatch.index,
      end: quoteMatch.index + quoteMatch[0].length,
      type: 'quote',
      text: quoteMatch[0],
      quotedText: quoteMatch[1]
    });
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build parts array
  matches.forEach((match) => {
    // Add text before the match
    if (match.start > lastIndex) {
      parts.push(sentence.substring(lastIndex, match.start));
    }
    
    // Add the formatted match
    if (match.type === 'word') {
      parts.push(
        <span key={key++} className="font-bold italic">
          {match.text}
        </span>
      );
    } else if (match.type === 'quote' && match.quotedText) {
      parts.push(
        <span key={key++} className="italic underline font-semibold">
          {'\''}
          {match.quotedText}
          {'\''}
        </span>
      );
    }
    
    lastIndex = match.end;
  });
  
  // Add remaining text after the last match
  if (lastIndex < sentence.length) {
    parts.push(sentence.substring(lastIndex));
  }
  
  // If no matches found, return original sentence
  if (parts.length === 0) {
    return sentence;
  }
  
  return <>{parts}</>;
}

/**
 * Formats multiple example sentences (separated by newlines)
 * @param sentences - Multiple sentences separated by \n\n
 * @param word - The word being looked up (optional, for highlighting)
 */
export function formatExampleSentences(sentences: string, word?: string): React.ReactNode {
  if (!sentences) return sentences;
  
  const lines = sentences.split('\n\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <p key={index} className="text-sm">
          {formatExampleSentence(line, word)}
        </p>
      ))}
    </div>
  );
}

