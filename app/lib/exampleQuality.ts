/**
 * Quality filters and scoring for example sentences
 */

export interface ExampleQuality {
  score: number;
  reasons: string[];
}

/**
 * Check if an example sentence is of good quality
 */
export function scoreExampleQuality(sentence: string, word: string): ExampleQuality {
  const reasons: string[] = [];
  let score = 0;
  const wordLower = word.trim().toLowerCase();
  const sentenceLower = sentence.toLowerCase();
  const sentenceTrimmed = sentence.trim();

  // Must contain the word (case-insensitive, whole word match preferred)
  const wordRegex = new RegExp(`\\b${wordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const containsWord = wordRegex.test(sentenceLower);
  
  if (!containsWord) {
    // Check if word appears at all (partial match)
    if (!sentenceLower.includes(wordLower)) {
      return { score: 0, reasons: ['Does not contain the word'] };
    }
    score -= 10; // Partial match is less ideal
    reasons.push('Word appears but not as whole word');
  } else {
    score += 20; // Whole word match is good
  }

  // Length checks - good sentences are typically 20-200 characters
  if (sentenceTrimmed.length < 15) {
    score -= 15;
    reasons.push('Too short');
  } else if (sentenceTrimmed.length > 300) {
    score -= 10;
    reasons.push('Too long');
  } else if (sentenceTrimmed.length >= 20 && sentenceTrimmed.length <= 200) {
    score += 10; // Ideal length
  }

  // Should be a complete sentence (starts with capital, ends with punctuation)
  const startsWithCapital = /^[A-Z]/.test(sentenceTrimmed);
  const endsWithPunctuation = /[.!?]$/.test(sentenceTrimmed);
  
  if (startsWithCapital && endsWithPunctuation) {
    score += 15; // Complete sentence
  } else if (!startsWithCapital) {
    score -= 5;
    reasons.push('Does not start with capital letter');
  } else if (!endsWithPunctuation) {
    score -= 5;
    reasons.push('Does not end with punctuation');
  }

  // Should not be just the word itself
  if (sentenceTrimmed.toLowerCase() === wordLower) {
    return { score: 0, reasons: ['Just the word itself'] };
  }

  // Should have some context (other words)
  const words = sentenceTrimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 3) {
    score -= 10;
    reasons.push('Too few words for context');
  } else if (words.length >= 5 && words.length <= 25) {
    score += 5; // Good word count
  }

  // Should not be repetitive or have obvious issues
  if (sentenceTrimmed.split(wordLower).length > 3) {
    score -= 5;
    reasons.push('Word appears too many times');
  }

  // Prefer sentences that show the word in different contexts
  // (This is harder to measure, but we can check for variety in surrounding words)
  const wordIndex = sentenceLower.indexOf(wordLower);
  if (wordIndex > 0 && wordIndex < sentenceTrimmed.length - wordLower.length) {
    score += 5; // Word appears in middle of sentence (better context)
  }

  return { score, reasons };
}

/**
 * Filter and rank examples by quality
 */
export function filterAndRankExamples(
  examples: string[],
  word: string,
  minScore: number = 5
): string[] {
  // Score all examples
  const scored = examples.map(example => ({
    example: example.trim(),
    quality: scoreExampleQuality(example, word)
  }));

  // Filter by minimum score and sort by score (highest first)
  const filtered = scored
    .filter(item => item.quality.score >= minScore)
    .sort((a, b) => b.quality.score - a.quality.score)
    .map(item => item.example);

  return filtered;
}

/**
 * Check if an example is a duplicate (case-insensitive, normalized)
 */
export function isDuplicate(example: string, existing: string[]): boolean {
  const normalized = example.trim().toLowerCase();
  return existing.some(ex => ex.trim().toLowerCase() === normalized);
}


