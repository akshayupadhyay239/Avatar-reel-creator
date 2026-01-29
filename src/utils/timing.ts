// ============================================
// Timing Utilities
// ============================================

/**
 * Average speaking pace in words per minute
 * Normal conversational pace: 120-150 wpm
 * Presentation pace: 100-120 wpm
 */
export const SPEAKING_PACE_WPM = 140;

/**
 * Convert seconds to frames
 */
export const secondsToFrames = (seconds: number, fps: number): number => {
  return Math.round(seconds * fps);
};

/**
 * Convert frames to seconds
 */
export const framesToSeconds = (frames: number, fps: number): number => {
  return frames / fps;
};

/**
 * Estimate duration in seconds for a given word count
 */
export const estimateWordDuration = (
  wordCount: number,
  wordsPerMinute: number = SPEAKING_PACE_WPM
): number => {
  return (wordCount / wordsPerMinute) * 60;
};

/**
 * Estimate frame duration for a word based on length
 * Longer words take slightly longer to say
 */
export const estimateWordFrameDuration = (
  word: string,
  fps: number,
  baseWpm: number = SPEAKING_PACE_WPM
): number => {
  const syllableCount = estimateSyllables(word);
  // Average syllable duration: ~200ms
  const baseDuration = syllableCount * 0.2;
  // Add small buffer between words
  const wordDuration = baseDuration + 0.05;
  return Math.max(secondsToFrames(wordDuration, fps), 3); // minimum 3 frames
};

/**
 * Rough syllable estimation for English words
 */
export const estimateSyllables = (word: string): number => {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return 1;

  // Count vowel groups
  const vowels = cleaned.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;

  // Subtract silent e
  if (cleaned.endsWith('e') && count > 1) {
    count--;
  }

  // Handle common suffixes
  if (cleaned.endsWith('le') && cleaned.length > 2 && !/[aeiou]/.test(cleaned[cleaned.length - 3])) {
    count++;
  }

  return Math.max(count, 1);
};

/**
 * Distribute frames evenly across words, accounting for word length
 */
export const distributeFramesAcrossWords = (
  words: string[],
  totalFrames: number,
  fps: number
): { word: string; startFrame: number; endFrame: number }[] => {
  if (words.length === 0) return [];

  // Calculate relative weights based on syllables
  const weights = words.map((w) => estimateSyllables(w));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const result: { word: string; startFrame: number; endFrame: number }[] = [];
  let currentFrame = 0;

  for (let i = 0; i < words.length; i++) {
    const wordFrames = Math.round((weights[i] / totalWeight) * totalFrames);
    const endFrame = i === words.length - 1 ? totalFrames : currentFrame + wordFrames;

    result.push({
      word: words[i],
      startFrame: currentFrame,
      endFrame: endFrame,
    });

    currentFrame = endFrame;
  }

  return result;
};

/**
 * Calculate segment boundaries with frame alignment
 */
export const calculateSegmentBoundaries = (
  segments: { text: string; wordCount: number }[],
  totalFrames: number,
  fps: number
): { startFrame: number; endFrame: number; durationFrames: number }[] => {
  const totalWords = segments.reduce((sum, s) => sum + s.wordCount, 0);

  const result: { startFrame: number; endFrame: number; durationFrames: number }[] = [];
  let currentFrame = 0;

  for (let i = 0; i < segments.length; i++) {
    const segmentFrames = Math.round((segments[i].wordCount / totalWords) * totalFrames);
    const endFrame = i === segments.length - 1 ? totalFrames : currentFrame + segmentFrames;
    const durationFrames = endFrame - currentFrame;

    result.push({
      startFrame: currentFrame,
      endFrame,
      durationFrames,
    });

    currentFrame = endFrame;
  }

  return result;
};
