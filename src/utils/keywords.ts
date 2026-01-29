// ============================================
// Keyword Extraction Utilities
// ============================================

import type { ImportanceLevel } from '../types';

/**
 * Common stop words to filter out
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
  'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when', 'where',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'if', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'while',
  'get', 'got', 'getting', 'go', 'going', 'goes', 'went', 'come', 'coming',
  'came', 'let', 'lets', 'like', 'know', 'think', 'want', 'see', 'look',
  'make', 'way', 'well', 'back', 'being', 'because', 'even', 'still',
  'actually', 'really', 'basically', 'literally', 'um', 'uh', 'yeah', 'okay',
]);

/**
 * High importance indicators - words/phrases that signal key content
 */
const HIGH_IMPORTANCE_PATTERNS = [
  /^(introducing|announcing|presenting|launching)/i,
  /^(new|first|only|best|top|leading)/i,
  /\b(revolutionary|groundbreaking|game-?changing|innovative)\b/i,
  /\b(exclusive|limited|special|premium)\b/i,
  /\b(free|save|discount|offer|deal)\b/i,
  /\b(now|today|finally|available)\b/i,
  /\b(secret|key|important|crucial|essential)\b/i,
  /\b(step|tip|trick|hack|strategy)\b/i,
  /\b\d+%|\$\d+|\d+x\b/i, // Numbers with % or $ or x
];

/**
 * CTA (Call-to-Action) patterns
 */
const CTA_PATTERNS = [
  /\b(click|tap|swipe|subscribe|follow|like|share|comment)\b/i,
  /\b(sign up|get started|join|download|try|buy|order)\b/i,
  /\b(link in bio|check out|learn more|find out)\b/i,
  /\b(don't miss|don't wait|act now|hurry)\b/i,
];

/**
 * Clean and normalize a word for comparison
 */
export const normalizeWord = (word: string): string => {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Check if a word is a stop word
 */
export const isStopWord = (word: string): boolean => {
  return STOP_WORDS.has(normalizeWord(word));
};

/**
 * Extract keywords from text
 */
export const extractKeywords = (text: string): string[] => {
  const words = text.split(/\s+/);
  const keywords: string[] = [];

  for (const word of words) {
    const normalized = normalizeWord(word);
    if (normalized.length >= 3 && !isStopWord(word)) {
      // Check if it's a proper noun (capitalized) or significant word
      const isProperNoun = /^[A-Z]/.test(word) && word.length > 1;
      const isNumber = /\d/.test(word);
      const isLongWord = normalized.length >= 5;

      if (isProperNoun || isNumber || isLongWord) {
        keywords.push(normalized);
      }
    }
  }

  // Remove duplicates and return
  return [...new Set(keywords)];
};

/**
 * Check if text contains high-importance indicators
 */
export const hasHighImportanceIndicator = (text: string): boolean => {
  return HIGH_IMPORTANCE_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * Check if text contains a CTA
 */
export const hasCTA = (text: string): boolean => {
  return CTA_PATTERNS.some((pattern) => pattern.test(text));
};

/**
 * Determine importance level of a text segment
 */
export const determineImportance = (text: string): ImportanceLevel => {
  const hasHighIndicator = hasHighImportanceIndicator(text);
  const hasCtaIndicator = hasCTA(text);
  const wordCount = text.split(/\s+/).length;
  const keywords = extractKeywords(text);

  // High importance: has high-importance words, CTAs, or dense keywords
  if (hasHighIndicator || hasCtaIndicator) {
    return 'high';
  }

  // Medium importance: has some keywords relative to word count
  const keywordDensity = keywords.length / wordCount;
  if (keywordDensity > 0.3 || keywords.length >= 3) {
    return 'medium';
  }

  // Low importance: mostly filler/transitional text
  return 'low';
};

/**
 * Check if a word should be highlighted as a keyword in captions
 */
export const isHighlightWord = (word: string, segmentKeywords: string[]): boolean => {
  const normalized = normalizeWord(word);
  return segmentKeywords.includes(normalized) || hasHighImportanceIndicator(word);
};

/**
 * Extract product/brand names (capitalized multi-word phrases)
 */
export const extractBrandNames = (text: string): string[] => {
  const brandPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  const matches = text.match(brandPattern) || [];
  return [...new Set(matches)];
};

/**
 * Extract phrases that would make good text overlays
 */
export const extractKeyPhrases = (text: string): string[] => {
  const phrases: string[] = [];

  // Extract quoted phrases
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    phrases.push(...quoted.map((q) => q.replace(/"/g, '')));
  }

  // Extract brand names
  phrases.push(...extractBrandNames(text));

  // Extract numbered items (e.g., "3 steps", "5 tips")
  const numbered = text.match(/\b(\d+\s+\w+)\b/g);
  if (numbered) {
    phrases.push(...numbered);
  }

  return [...new Set(phrases)];
};

/**
 * Calculate relevance score between keywords and a target
 */
export const calculateRelevanceScore = (
  sourceKeywords: string[],
  targetKeywords: string[]
): number => {
  if (sourceKeywords.length === 0 || targetKeywords.length === 0) {
    return 0;
  }

  const sourceSet = new Set(sourceKeywords.map(normalizeWord));
  const targetSet = new Set(targetKeywords.map(normalizeWord));

  let matches = 0;
  for (const keyword of sourceSet) {
    if (targetSet.has(keyword)) {
      matches++;
    }
    // Partial match for substrings
    for (const target of targetSet) {
      if (keyword.includes(target) || target.includes(keyword)) {
        matches += 0.5;
      }
    }
  }

  // Normalize by the smaller set size
  const maxPossible = Math.min(sourceSet.size, targetSet.size);
  return maxPossible > 0 ? matches / maxPossible : 0;
};
