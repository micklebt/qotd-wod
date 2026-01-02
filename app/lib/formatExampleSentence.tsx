/**
 * Formats example sentences to highlight quoted words with italics and underline
 * Looks for words wrapped in single quotes and formats them
 */

import React from 'react';

export function formatExampleSentence(sentence: string): React.ReactNode {
  if (!sentence) return sentence;

  // Pattern to match words in single quotes: 'word'
  const quotePattern = /'([^']+)'/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = quotePattern.exec(sentence)) !== null) {
    // Add text before the quoted word
    if (match.index > lastIndex) {
      parts.push(sentence.substring(lastIndex, match.index));
    }
    
    // Add the formatted word with quotes, italic, and underline
    parts.push(
      <span key={key++} className="italic underline font-semibold">
        {'\''}
        {match[1]}
        {'\''}
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last match
  if (lastIndex < sentence.length) {
    parts.push(sentence.substring(lastIndex));
  }
  
  // If no quoted words found, return original sentence
  if (parts.length === 0) {
    return sentence;
  }
  
  return <>{parts}</>;
}

/**
 * Formats multiple example sentences (separated by newlines)
 */
export function formatExampleSentences(sentences: string): React.ReactNode {
  if (!sentences) return sentences;
  
  const lines = sentences.split('\n\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <p key={index} className="text-sm">
          {formatExampleSentence(line)}
        </p>
      ))}
    </div>
  );
}

