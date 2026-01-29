// ============================================
// Script Parser
// Parses script text into segments with timing and keyword analysis
// ============================================

import type { ScriptSegment, Word } from '../types';
import {
  extractKeywords,
  extractKeyPhrases,
  determineImportance,
  isStopWord,
  normalizeWord,
} from '../utils/keywords';
import {
  distributeFramesAcrossWords,
  estimateWordDuration,
  secondsToFrames,
  SPEAKING_PACE_WPM,
} from '../utils/timing';

export interface ParsedScript {
  segments: ScriptSegment[];
  totalWords: number;
  totalEstimatedFrames: number;
  allKeywords: string[];
  keyPhrases: string[];
}

export interface ParserOptions {
  fps: number;
  totalDurationFrames?: number; // If known (from avatar video)
  minSegmentWords?: number;     // Minimum words per segment
  maxSegmentWords?: number;     // Maximum words per segment
}

const DEFAULT_OPTIONS: Required<Omit<ParserOptions, 'fps' | 'totalDurationFrames'>> = {
  minSegmentWords: 5,
  maxSegmentWords: 25,
};

/**
 * Parse a script file into analyzed segments
 */
export const parseScript = (
  scriptText: string,
  options: ParserOptions
): ParsedScript => {
  const { fps, totalDurationFrames, minSegmentWords, maxSegmentWords } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Clean and normalize the script
  const cleanedText = cleanScriptText(scriptText);

  // Split into sentences
  const sentences = splitIntoSentences(cleanedText);

  // Group sentences into segments based on length constraints
  const rawSegments = groupIntoSegments(sentences, minSegmentWords!, maxSegmentWords!);

  // Calculate total words
  const totalWords = rawSegments.reduce(
    (sum, seg) => sum + seg.split(/\s+/).length,
    0
  );

  // Determine total frames
  const estimatedDuration = estimateWordDuration(totalWords, SPEAKING_PACE_WPM);
  const finalTotalFrames = totalDurationFrames ?? secondsToFrames(estimatedDuration, fps);

  // Extract global keywords and key phrases
  const allKeywords = extractKeywords(cleanedText);
  const keyPhrases = extractKeyPhrases(cleanedText);

  // Calculate frame boundaries for each segment
  const segmentBoundaries = calculateSegmentFrames(rawSegments, finalTotalFrames);

  // Build full segment objects
  const segments: ScriptSegment[] = rawSegments.map((text, index) => {
    const { startFrame, endFrame, durationFrames } = segmentBoundaries[index];
    const segmentKeywords = extractKeywords(text);
    const importance = determineImportance(text);
    const hasKeyPhrase = keyPhrases.some((phrase) =>
      text.toLowerCase().includes(phrase.toLowerCase())
    );

    // Parse words with timing
    const words = parseWordsWithTiming(text, startFrame, durationFrames, fps, segmentKeywords);

    return {
      id: `segment-${index + 1}`,
      text,
      words,
      startFrame,
      endFrame,
      durationFrames,
      keywords: segmentKeywords,
      importance,
      hasKeyPhrase,
    };
  });

  return {
    segments,
    totalWords,
    totalEstimatedFrames: finalTotalFrames,
    allKeywords,
    keyPhrases,
  };
};

/**
 * Clean script text - normalize whitespace, remove artifacts
 */
const cleanScriptText = (text: string): string => {
  return text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\n+/g, ' ')             // Convert newlines to spaces
    .replace(/([.!?])([A-Z])/g, '$1 $2') // Add space after punctuation if missing
    .replace(/[ \t]+/g, ' ')          // Normalize multiple spaces to single
    .trim();
};

/**
 * Split text into sentences
 */
const splitIntoSentences = (text: string): string[] => {
  // Split on sentence-ending punctuation followed by space or newline
  const sentencePattern = /(?<=[.!?])\s+(?=[A-Z])|(?<=\n)\s*(?=\S)/g;
  const sentences = text.split(sentencePattern).filter((s) => s.trim().length > 0);

  return sentences.map((s) => s.trim());
};

/**
 * Group sentences into segments respecting word count limits
 */
const groupIntoSegments = (
  sentences: string[],
  minWords: number,
  maxWords: number
): string[] => {
  const segments: string[] = [];
  let currentSegment: string[] = [];
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    // If this sentence alone exceeds max, it becomes its own segment
    if (sentenceWords > maxWords) {
      // Flush current segment first
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
        currentSegment = [];
        currentWordCount = 0;
      }
      segments.push(sentence);
      continue;
    }

    // If adding this sentence would exceed max, flush first
    if (currentWordCount + sentenceWords > maxWords && currentWordCount >= minWords) {
      segments.push(currentSegment.join(' '));
      currentSegment = [];
      currentWordCount = 0;
    }

    currentSegment.push(sentence);
    currentWordCount += sentenceWords;
  }

  // Flush remaining
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '));
  }

  return segments;
};

/**
 * Calculate frame boundaries for segments
 */
const calculateSegmentFrames = (
  segments: string[],
  totalFrames: number
): { startFrame: number; endFrame: number; durationFrames: number }[] => {
  const wordCounts = segments.map((s) => s.split(/\s+/).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  const result: { startFrame: number; endFrame: number; durationFrames: number }[] = [];
  let currentFrame = 0;

  for (let i = 0; i < segments.length; i++) {
    const proportion = wordCounts[i] / totalWords;
    const segmentFrames = Math.round(proportion * totalFrames);
    const endFrame = i === segments.length - 1 ? totalFrames : currentFrame + segmentFrames;

    result.push({
      startFrame: currentFrame,
      endFrame,
      durationFrames: endFrame - currentFrame,
    });

    currentFrame = endFrame;
  }

  return result;
};

/**
 * Parse words with frame timing and keyword flags
 */
const parseWordsWithTiming = (
  text: string,
  segmentStartFrame: number,
  segmentDurationFrames: number,
  fps: number,
  segmentKeywords: string[]
): Word[] => {
  const wordStrings = text.split(/\s+/).filter((w) => w.length > 0);

  // Distribute frames across words
  const wordTimings = distributeFramesAcrossWords(
    wordStrings,
    segmentDurationFrames,
    fps
  );

  return wordTimings.map(({ word, startFrame, endFrame }) => ({
    text: word,
    startFrame: segmentStartFrame + startFrame,
    endFrame: segmentStartFrame + endFrame,
    isKeyword: segmentKeywords.includes(normalizeWord(word)) && !isStopWord(word),
  }));
};

/**
 * Parse script from a file path (for use with Remotion's staticFile)
 */
export const parseScriptFromText = (
  scriptContent: string,
  fps: number,
  totalDurationFrames?: number
): ParsedScript => {
  return parseScript(scriptContent, {
    fps,
    totalDurationFrames,
  });
};

/**
 * Update segment timings based on actual avatar duration
 * Call this after silence detection to re-align script to actual video
 */
export const realignSegmentTimings = (
  parsedScript: ParsedScript,
  actualTotalFrames: number,
  fps: number
): ParsedScript => {
  const { segments, totalWords, allKeywords, keyPhrases } = parsedScript;

  // Recalculate frame boundaries
  const segmentTexts = segments.map((s) => s.text);
  const newBoundaries = calculateSegmentFrames(segmentTexts, actualTotalFrames);

  // Update segments with new timings
  const updatedSegments: ScriptSegment[] = segments.map((segment, index) => {
    const { startFrame, endFrame, durationFrames } = newBoundaries[index];

    // Recalculate word timings
    const words = parseWordsWithTiming(
      segment.text,
      startFrame,
      durationFrames,
      fps,
      segment.keywords
    );

    return {
      ...segment,
      startFrame,
      endFrame,
      durationFrames,
      words,
    };
  });

  return {
    segments: updatedSegments,
    totalWords,
    totalEstimatedFrames: actualTotalFrames,
    allKeywords,
    keyPhrases,
  };
};
