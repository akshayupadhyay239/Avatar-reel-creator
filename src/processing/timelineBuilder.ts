// ============================================
// Timeline Builder
// Assembles all processing results into a final timeline
// ============================================

import type {
  Timeline,
  TimelineItem,
  ScriptSegment,
  ProcessedAvatar,
  ProjectConfig,
  CaptionData,
  CaptionWord,
  LayoutType,
} from '../types';
import type { LayoutDecision } from './layoutPlanner';
import type { ParsedScript } from './scriptParser';

export interface TimelineBuilderOptions {
  config: ProjectConfig;
}

export interface TimelineBuildInput {
  parsedScript: ParsedScript;
  processedAvatar: ProcessedAvatar;
  layoutDecisions: LayoutDecision[];
}

/**
 * Build the final timeline from all processed data
 */
export const buildTimeline = (
  input: TimelineBuildInput,
  options: TimelineBuilderOptions
): Timeline => {
  const { parsedScript, processedAvatar, layoutDecisions } = input;
  const { config } = options;

  // Create a map of segment ID to layout decision
  const layoutMap = new Map<string, LayoutDecision>();
  for (const decision of layoutDecisions) {
    layoutMap.set(decision.segmentId, decision);
  }

  // Create a map of segment ID to script segment
  const segmentMap = new Map<string, ScriptSegment>();
  for (const segment of parsedScript.segments) {
    segmentMap.set(segment.id, segment);
  }

  // Build timeline items
  const items: TimelineItem[] = [];
  let currentOutputFrame = 0;

  for (let i = 0; i < parsedScript.segments.length; i++) {
    const segment = parsedScript.segments[i];
    const decision = layoutMap.get(segment.id);

    if (!decision) {
      console.warn(`No layout decision for segment: ${segment.id}`);
      continue;
    }

    // Find the avatar clip that covers this segment's time range
    const avatarClip = findAvatarClipForSegment(
      segment,
      processedAvatar,
      currentOutputFrame
    );

    // Build caption data from segment words
    const caption = buildCaptionData(segment, currentOutputFrame, config);

    // Calculate item duration
    const itemDuration = avatarClip.endFrame - avatarClip.startFrame;

    const item: TimelineItem = {
      id: `item-${i + 1}`,
      segmentId: segment.id,
      startFrame: currentOutputFrame,
      endFrame: currentOutputFrame + itemDuration,
      durationFrames: itemDuration,
      layout: decision.layout,
      avatarClip,
      helperAsset: decision.helperAsset,
      textOverlay: decision.textOverlay
        ? {
            ...decision.textOverlay,
            // Adjust overlay frames relative to item start
            startFrame: decision.textOverlay.startFrame - segment.startFrame + currentOutputFrame,
            endFrame: decision.textOverlay.endFrame - segment.startFrame + currentOutputFrame,
          }
        : undefined,
      caption,
      transition: decision.transition,
    };

    items.push(item);
    currentOutputFrame += itemDuration;
  }

  return {
    totalDurationFrames: currentOutputFrame,
    items,
  };
};

/**
 * Find the avatar clip that corresponds to a script segment
 */
const findAvatarClipForSegment = (
  segment: ScriptSegment,
  processedAvatar: ProcessedAvatar,
  outputStartFrame: number
): TimelineItem['avatarClip'] => {
  // For simple case with single clip, use segment timing directly
  if (processedAvatar.clips.length === 1) {
    const clip = processedAvatar.clips[0];

    return {
      src: clip.src,
      startFrame: outputStartFrame,
      endFrame: outputStartFrame + segment.durationFrames,
      originalStartFrame: segment.startFrame,
      originalEndFrame: segment.endFrame,
      volume: 1,
    };
  }

  // For multiple clips (after silence removal), find overlapping clip
  for (const clip of processedAvatar.clips) {
    if (
      clip.originalStartFrame <= segment.startFrame &&
      clip.originalEndFrame >= segment.endFrame
    ) {
      const offsetInClip = segment.startFrame - clip.originalStartFrame;
      return {
        src: clip.src,
        startFrame: outputStartFrame,
        endFrame: outputStartFrame + segment.durationFrames,
        originalStartFrame: clip.originalStartFrame + offsetInClip,
        originalEndFrame: clip.originalStartFrame + offsetInClip + segment.durationFrames,
        volume: 1,
      };
    }
  }

  // Fallback: use first clip
  const firstClip = processedAvatar.clips[0];
  return {
    src: firstClip.src,
    startFrame: outputStartFrame,
    endFrame: outputStartFrame + segment.durationFrames,
    originalStartFrame: segment.startFrame,
    originalEndFrame: segment.endFrame,
    volume: 1,
  };
};

/**
 * Build caption data from segment words
 */
const buildCaptionData = (
  segment: ScriptSegment,
  outputStartFrame: number,
  config: ProjectConfig
): CaptionData => {
  // Map word timings to output frame range
  const segmentDuration = segment.durationFrames;
  const originalDuration = segment.endFrame - segment.startFrame;
  const timeScale = segmentDuration / Math.max(originalDuration, 1);

  const words: CaptionWord[] = segment.words.map((word) => {
    const relativeStart = word.startFrame - segment.startFrame;
    const relativeEnd = word.endFrame - segment.startFrame;

    return {
      text: word.text,
      startFrame: outputStartFrame + Math.round(relativeStart * timeScale),
      endFrame: outputStartFrame + Math.round(relativeEnd * timeScale),
    };
  });

  return {
    words,
    style: config.settings.captionStyle,
  };
};

/**
 * Simplified timeline builder for when you have minimal processing
 * Just takes script segments and builds a basic timeline
 */
export const buildSimpleTimeline = (
  segments: ScriptSegment[],
  avatarSrc: string,
  config: ProjectConfig
): Timeline => {
  const items: TimelineItem[] = segments.map((segment, index) => ({
    id: `item-${index + 1}`,
    segmentId: segment.id,
    startFrame: segment.startFrame,
    endFrame: segment.endFrame,
    durationFrames: segment.durationFrames,
    layout: 'A' as LayoutType,
    avatarClip: {
      src: avatarSrc,
      startFrame: segment.startFrame,
      endFrame: segment.endFrame,
      originalStartFrame: segment.startFrame,
      originalEndFrame: segment.endFrame,
      volume: 1,
    },
    caption: {
      words: segment.words.map((w) => ({
        text: w.text,
        startFrame: w.startFrame,
        endFrame: w.endFrame,
      })),
      style: config.settings.captionStyle,
    },
    transition: {
      type: index === 0 ? 'none' : 'cut',
      durationFrames: 0,
      sfxVolume: 0.5,
    },
  }));

  const totalDuration = segments.length > 0
    ? segments[segments.length - 1].endFrame
    : 0;

  return {
    totalDurationFrames: totalDuration,
    items,
  };
};

/**
 * Validate timeline for rendering
 */
export const validateTimeline = (
  timeline: Timeline
): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (timeline.items.length === 0) {
    errors.push('Timeline has no items');
  }

  if (timeline.totalDurationFrames <= 0) {
    errors.push('Timeline has zero or negative duration');
  }

  // Check for gaps or overlaps
  for (let i = 1; i < timeline.items.length; i++) {
    const prev = timeline.items[i - 1];
    const curr = timeline.items[i];

    if (curr.startFrame < prev.endFrame) {
      warnings.push(
        `Overlap between items ${prev.id} and ${curr.id} (${prev.endFrame - curr.startFrame} frames)`
      );
    } else if (curr.startFrame > prev.endFrame) {
      warnings.push(
        `Gap between items ${prev.id} and ${curr.id} (${curr.startFrame - prev.endFrame} frames)`
      );
    }
  }

  // Check each item
  for (const item of timeline.items) {
    if (item.durationFrames <= 0) {
      errors.push(`Item ${item.id} has zero or negative duration`);
    }

    if (!item.avatarClip.src) {
      errors.push(`Item ${item.id} has no avatar source`);
    }

    if ((item.layout === 'B' || item.layout === 'C') && !item.helperAsset) {
      warnings.push(`Item ${item.id} uses layout ${item.layout} but has no helper asset`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Get timeline statistics for debugging
 */
export const getTimelineStats = (
  timeline: Timeline,
  fps: number
): {
  totalDuration: string;
  itemCount: number;
  layoutBreakdown: Record<LayoutType, number>;
  transitionCount: number;
  captionWordCount: number;
} => {
  const layoutBreakdown: Record<LayoutType, number> = { A: 0, B: 0, C: 0 };
  let transitionCount = 0;
  let captionWordCount = 0;

  for (const item of timeline.items) {
    layoutBreakdown[item.layout]++;
    if (item.transition.type !== 'none') {
      transitionCount++;
    }
    captionWordCount += item.caption.words.length;
  }

  return {
    totalDuration: `${(timeline.totalDurationFrames / fps).toFixed(2)}s`,
    itemCount: timeline.items.length,
    layoutBreakdown,
    transitionCount,
    captionWordCount,
  };
};
