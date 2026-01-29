// ============================================
// Silence Detector
// Detects silence regions in avatar video for auto-trimming
// ============================================

import type { SilenceRegion, ProcessedAvatar, AvatarClip } from '../types';
import { secondsToFrames, framesToSeconds } from '../utils/timing';

export interface SilenceDetectorOptions {
  fps: number;
  silenceThresholdSeconds: number;  // Minimum silence duration to detect
  minClipDurationSeconds: number;   // Minimum clip length after cutting
}

const DEFAULT_OPTIONS: Omit<SilenceDetectorOptions, 'fps'> = {
  silenceThresholdSeconds: 0.5,
  minClipDurationSeconds: 1.0,
};

/**
 * Silence detection result from external tool (e.g., ffmpeg)
 * This would typically come from: ffmpeg -i input.mp4 -af silencedetect=n=-30dB:d=0.5 -f null -
 */
export interface SilenceDetectionInput {
  silences: {
    startSeconds: number;
    endSeconds: number;
  }[];
  totalDurationSeconds: number;
}

/**
 * Process avatar video with pre-computed silence regions
 * In production, silence detection would be done via ffmpeg before Remotion rendering
 */
export const processAvatarWithSilences = (
  avatarSrc: string,
  silenceInput: SilenceDetectionInput,
  options: Partial<SilenceDetectorOptions> & { fps: number }
): ProcessedAvatar => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const { fps, silenceThresholdSeconds, minClipDurationSeconds } = opts;

  const totalDurationFrames = secondsToFrames(silenceInput.totalDurationSeconds, fps);

  // Convert silence times to frames and filter by threshold
  const silenceRegions: SilenceRegion[] = silenceInput.silences
    .filter((s) => s.endSeconds - s.startSeconds >= silenceThresholdSeconds)
    .map((s) => ({
      startFrame: secondsToFrames(s.startSeconds, fps),
      endFrame: secondsToFrames(s.endSeconds, fps),
      durationFrames: secondsToFrames(s.endSeconds - s.startSeconds, fps),
    }));

  // Generate clips by removing silences
  const clips = generateClipsFromSilences(
    avatarSrc,
    totalDurationFrames,
    silenceRegions,
    secondsToFrames(minClipDurationSeconds, fps)
  );

  // Calculate processed duration
  const processedDurationFrames = clips.reduce(
    (sum, clip) => sum + (clip.endFrame - clip.startFrame),
    0
  );

  return {
    originalDurationFrames: totalDurationFrames,
    processedDurationFrames,
    silenceRegions,
    clips,
  };
};

/**
 * Generate clips by cutting out silence regions
 */
const generateClipsFromSilences = (
  src: string,
  totalFrames: number,
  silences: SilenceRegion[],
  minClipFrames: number
): AvatarClip[] => {
  const clips: AvatarClip[] = [];

  // Sort silences by start frame
  const sortedSilences = [...silences].sort((a, b) => a.startFrame - b.startFrame);

  let currentFrame = 0;
  let outputFrame = 0;

  for (const silence of sortedSilences) {
    // Clip before this silence
    const clipDuration = silence.startFrame - currentFrame;

    if (clipDuration >= minClipFrames) {
      clips.push({
        src,
        startFrame: outputFrame,
        endFrame: outputFrame + clipDuration,
        originalStartFrame: currentFrame,
        originalEndFrame: silence.startFrame,
        volume: 1,
      });
      outputFrame += clipDuration;
    }

    // Skip past silence
    currentFrame = silence.endFrame;
  }

  // Final clip after last silence
  const remainingFrames = totalFrames - currentFrame;
  if (remainingFrames >= minClipFrames) {
    clips.push({
      src,
      startFrame: outputFrame,
      endFrame: outputFrame + remainingFrames,
      originalStartFrame: currentFrame,
      originalEndFrame: totalFrames,
      volume: 1,
    });
  }

  return clips;
};

/**
 * Create a ProcessedAvatar without any silence removal
 * Use when silence detection is not needed or not available
 */
export const processAvatarWithoutTrimming = (
  avatarSrc: string,
  totalDurationFrames: number
): ProcessedAvatar => {
  return {
    originalDurationFrames: totalDurationFrames,
    processedDurationFrames: totalDurationFrames,
    silenceRegions: [],
    clips: [
      {
        src: avatarSrc,
        startFrame: 0,
        endFrame: totalDurationFrames,
        originalStartFrame: 0,
        originalEndFrame: totalDurationFrames,
        volume: 1,
      },
    ],
  };
};

/**
 * Parse ffmpeg silencedetect output
 * Example output:
 * [silencedetect @ 0x...] silence_start: 1.234
 * [silencedetect @ 0x...] silence_end: 2.567 | silence_duration: 1.333
 */
export const parseFfmpegSilenceOutput = (
  ffmpegOutput: string,
  totalDurationSeconds: number
): SilenceDetectionInput => {
  const silences: { startSeconds: number; endSeconds: number }[] = [];

  const startPattern = /silence_start:\s*([\d.]+)/g;
  const endPattern = /silence_end:\s*([\d.]+)/g;

  const starts: number[] = [];
  const ends: number[] = [];

  let match;
  while ((match = startPattern.exec(ffmpegOutput)) !== null) {
    starts.push(parseFloat(match[1]));
  }
  while ((match = endPattern.exec(ffmpegOutput)) !== null) {
    ends.push(parseFloat(match[1]));
  }

  // Pair starts with ends
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    silences.push({
      startSeconds: starts[i],
      endSeconds: ends[i],
    });
  }

  // Handle case where silence extends to end (no silence_end)
  if (starts.length > ends.length) {
    silences.push({
      startSeconds: starts[starts.length - 1],
      endSeconds: totalDurationSeconds,
    });
  }

  return {
    silences,
    totalDurationSeconds,
  };
};

/**
 * Merge clips that are very close together (avoid choppy edits)
 */
export const mergeCloseClips = (
  clips: AvatarClip[],
  minGapFrames: number = 3
): AvatarClip[] => {
  if (clips.length <= 1) return clips;

  const merged: AvatarClip[] = [{ ...clips[0] }];

  for (let i = 1; i < clips.length; i++) {
    const prev = merged[merged.length - 1];
    const current = clips[i];

    const gap = current.originalStartFrame - prev.originalEndFrame;

    if (gap <= minGapFrames) {
      // Merge: extend previous clip to include current
      prev.endFrame = prev.endFrame + (current.endFrame - current.startFrame) + gap;
      prev.originalEndFrame = current.originalEndFrame;
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
};

/**
 * Get silence statistics for debugging/logging
 */
export const getSilenceStats = (
  processed: ProcessedAvatar,
  fps: number
): {
  originalDuration: string;
  processedDuration: string;
  removedDuration: string;
  silenceCount: number;
  compressionRatio: string;
} => {
  const originalSec = framesToSeconds(processed.originalDurationFrames, fps);
  const processedSec = framesToSeconds(processed.processedDurationFrames, fps);
  const removedSec = originalSec - processedSec;

  return {
    originalDuration: `${originalSec.toFixed(2)}s`,
    processedDuration: `${processedSec.toFixed(2)}s`,
    removedDuration: `${removedSec.toFixed(2)}s`,
    silenceCount: processed.silenceRegions.length,
    compressionRatio: `${((processedSec / originalSec) * 100).toFixed(1)}%`,
  };
};
