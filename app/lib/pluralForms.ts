/**
 * Utility functions for handling plural/singular word forms.
 *
 * This module extracts common plural form handling logic that was previously
 * duplicated across dictionary.ts for pronunciation and etymology lookups.
 */

/**
 * Get possible singular forms of a word.
 * Returns an array of potential singular forms to try.
 */
export function getSingularForms(word: string): string[] {
  const wordLower = word.toLowerCase().trim();
  const forms: string[] = [];

  // Words ending in -ics (like "diacritics" -> "diacritic")
  if (wordLower.endsWith('ics') && wordLower.length > 3) {
    forms.push(wordLower.slice(0, -1)); // Remove 's'
  }

  // Words ending in -ies (like "babies" -> "baby")
  if (wordLower.endsWith('ies') && wordLower.length > 3) {
    forms.push(wordLower.slice(0, -3) + 'y');
  }

  // Words ending in -es (like "boxes" -> "box", "buses" -> "bus")
  if (wordLower.endsWith('es') && wordLower.length > 2) {
    // Check for -ches, -shes, -xes, -zes, -ses patterns
    if (wordLower.endsWith('ches') || wordLower.endsWith('shes') ||
        wordLower.endsWith('xes') || wordLower.endsWith('zes') ||
        wordLower.endsWith('sses')) {
      forms.push(wordLower.slice(0, -2)); // Remove 'es'
    } else if (wordLower.endsWith('oes')) {
      forms.push(wordLower.slice(0, -2)); // "heroes" -> "hero"
      forms.push(wordLower.slice(0, -1)); // Also try just removing 's'
    }
  }

  // Regular plurals ending in -s (but not -ss like "grass")
  if (wordLower.endsWith('s') && wordLower.length > 2 && !wordLower.endsWith('ss')) {
    forms.push(wordLower.slice(0, -1)); // Remove 's'
  }

  return forms;
}

/**
 * Try fetching data with singular form fallback.
 *
 * This function attempts to fetch data for a word, and if the word appears
 * to be plural, it will also try singular forms.
 *
 * @param word - The word to look up
 * @param fetchFn - A function that takes a word and returns a Promise
 * @returns The result from fetchFn, or null if all attempts fail
 */
export async function tryWithSingularFallback<T>(
  word: string,
  fetchFn: (form: string) => Promise<T | null>
): Promise<T | null> {
  // First, try the original word
  const result = await fetchFn(word);
  if (result !== null) {
    return result;
  }

  // Try singular forms
  const singularForms = getSingularForms(word);
  for (const form of singularForms) {
    const singularResult = await fetchFn(form);
    if (singularResult !== null) {
      return singularResult;
    }
  }

  return null;
}

/**
 * Check if a word is likely a plural form.
 */
export function isLikelyPlural(word: string): boolean {
  const wordLower = word.toLowerCase().trim();

  // Words ending in -s but not -ss
  if (wordLower.endsWith('s') && !wordLower.endsWith('ss')) {
    return true;
  }

  return false;
}
