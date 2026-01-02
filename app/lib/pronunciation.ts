/**
 * Formats IPA (International Phonetic Alphabet) pronunciation for display
 * Keeps the standard IPA symbols and diacritics as used in dictionaries
 * This is more educational and standard than converting to phonetic spelling
 */
export function formatIPA(ipa: string): string {
  if (!ipa) return '';

  // Remove IPA brackets (/) but keep all IPA symbols and diacritics
  let formatted = ipa.replace(/^\/|\/$/g, '').trim();

  // Clean up extra spaces but preserve the IPA content
  formatted = formatted.replace(/\s+/g, ' ');

  return formatted;
}

