/**
 * Normalizes a string to Standard UTF-8 and removes zero-width spaces, 
 * carriage returns, and control characters that might interfere with 
 * database validation or search queries.
 */
export function normalizeUTF8(str: string | null | undefined): string {
  if (!str) return "";
  
  return str
    .normalize('NFC') // Normalize to precomposed characters (accents merged with letters)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters and BOMs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove unprintable control characters
    .trim();
}
