// ============================================
// Layout Planner
// Decides which layout to use for each segment based on content and assets
// ============================================

import type {
  ScriptSegment,
  HelperAsset,
  AssetMatch,
  LayoutType,
  TransitionType,
  TransitionConfig,
  TextOverlay,
  TextOverlayStyle,
  TextAnimation,
} from '../types';

export interface LayoutDecision {
  segmentId: string;
  layout: LayoutType;
  helperAsset?: HelperAsset;
  textOverlay?: TextOverlay;
  transition: TransitionConfig;
  reasoning: string; // For debugging/logging
}

export interface LayoutPlannerOptions {
  fps: number;
  transitionDurationFrames: number;
  transitionSfxProbability: number;
  sfxSources: {
    click?: string;
    swoosh?: string;
    impact?: string;
  };
  defaultTextOverlayStyle: TextOverlayStyle;
}

const DEFAULT_OPTIONS: Omit<LayoutPlannerOptions, 'fps'> = {
  transitionDurationFrames: 8,
  transitionSfxProbability: 0.7,
  sfxSources: {},
  defaultTextOverlayStyle: {
    primaryFont: {
      family: 'Inter',
      size: 72,
      weight: 800,
      color: '#FFFFFF',
      shadow: '0 4px 12px rgba(0,0,0,0.8)',
    },
    secondaryFont: {
      family: 'Inter',
      size: 36,
      weight: 500,
      color: '#CCCCCC',
    },
    padding: 24,
  },
};

/**
 * Plan layouts for all segments
 */
export const planLayouts = (
  segments: ScriptSegment[],
  assetMatches: AssetMatch[],
  options: Partial<LayoutPlannerOptions> & { fps: number }
): LayoutDecision[] => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create a map of segment ID to matched assets
  const segmentAssetMap = new Map<string, AssetMatch>();
  for (const match of assetMatches) {
    // Only keep the best match per segment
    const existing = segmentAssetMap.get(match.segmentId);
    if (!existing || match.relevanceScore > existing.relevanceScore) {
      segmentAssetMap.set(match.segmentId, match);
    }
  }

  const decisions: LayoutDecision[] = [];
  let previousLayout: LayoutType = 'A';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const assetMatch = segmentAssetMap.get(segment.id);
    const isFirstSegment = i === 0;

    // Decide layout
    const { layout, reasoning } = decideLayout(segment, assetMatch);

    // Decide transition from previous
    const transition = decideTransition(
      previousLayout,
      layout,
      isFirstSegment,
      opts
    );

    // Decide if text overlay needed
    const textOverlay = decideTextOverlay(segment, layout, assetMatch, opts);

    decisions.push({
      segmentId: segment.id,
      layout,
      helperAsset: assetMatch?.asset,
      textOverlay,
      transition,
      reasoning,
    });

    previousLayout = layout;
  }

  return decisions;
};

/**
 * Decide which layout to use for a segment
 */
const decideLayout = (
  segment: ScriptSegment,
  assetMatch?: AssetMatch
): { layout: LayoutType; reasoning: string } => {
  // Rule 1: If we have a matching helper video with high importance -> Layout C
  if (assetMatch && segment.importance === 'high') {
    return {
      layout: 'C',
      reasoning: `High importance segment with matched asset (${assetMatch.relevanceScore.toFixed(2)} relevance)`,
    };
  }

  // Rule 2: If we have a matching helper asset -> Layout B
  if (assetMatch) {
    return {
      layout: 'B',
      reasoning: `Matched asset: ${assetMatch.asset.title} (${assetMatch.relevanceScore.toFixed(2)} relevance)`,
    };
  }

  // Rule 3: If segment has key phrase and no visual asset -> Layout A with text overlay
  if (segment.hasKeyPhrase && !assetMatch) {
    return {
      layout: 'A',
      reasoning: 'Key phrase detected, will use text overlay',
    };
  }

  // Default: Layout A (full avatar)
  return {
    layout: 'A',
    reasoning: 'Default full avatar layout',
  };
};

/**
 * Decide transition between layouts
 */
const decideTransition = (
  fromLayout: LayoutType,
  toLayout: LayoutType,
  isFirstSegment: boolean,
  options: LayoutPlannerOptions
): TransitionConfig => {
  // No transition for first segment
  if (isFirstSegment) {
    return {
      type: 'none',
      durationFrames: 0,
      sfxVolume: 0,
    };
  }

  const { transitionDurationFrames, transitionSfxProbability, sfxSources } = options;

  // Determine transition type based on layout change
  let type: TransitionType;
  let sfxKey: keyof typeof sfxSources | undefined;

  if (fromLayout === toLayout && toLayout === 'A') {
    // Same layout A to A: hard cut or fade
    type = Math.random() > 0.4 ? 'cut' : 'fade';
    sfxKey = 'click';
  } else if (fromLayout === 'A' && (toLayout === 'B' || toLayout === 'C')) {
    // Avatar to split/helper: slide or zoom
    type = Math.random() > 0.5 ? 'slide-left' : 'zoom';
    sfxKey = 'swoosh';
  } else if ((fromLayout === 'B' || fromLayout === 'C') && toLayout === 'A') {
    // Helper back to avatar: slide or fade
    type = Math.random() > 0.5 ? 'slide-right' : 'fade';
    sfxKey = 'swoosh';
  } else if (fromLayout === 'B' && toLayout === 'C') {
    // Split to full helper: zoom
    type = 'zoom';
    sfxKey = 'impact';
  } else if (fromLayout === 'C' && toLayout === 'B') {
    // Full helper to split: fade
    type = 'fade';
    sfxKey = 'swoosh';
  } else {
    // Default
    type = 'cut';
    sfxKey = 'click';
  }

  // Decide if SFX should play
  const shouldPlaySfx = Math.random() < transitionSfxProbability;
  const sfx = shouldPlaySfx && sfxKey ? sfxSources[sfxKey] : undefined;

  return {
    type,
    durationFrames: type === 'cut' ? 0 : transitionDurationFrames,
    sfx,
    sfxVolume: 0.6,
  };
};

/**
 * Decide if text overlay is needed and create it
 */
const decideTextOverlay = (
  segment: ScriptSegment,
  layout: LayoutType,
  assetMatch: AssetMatch | undefined,
  options: LayoutPlannerOptions
): TextOverlay | undefined => {
  // Only add text overlays for Layout A with key phrases or high importance without assets
  if (layout !== 'A') {
    return undefined;
  }

  if (!segment.hasKeyPhrase && segment.importance !== 'high') {
    return undefined;
  }

  // Extract the key phrase to display
  const primaryText = extractDisplayPhrase(segment);
  if (!primaryText) {
    return undefined;
  }

  // Calculate overlay timing (appear in middle third of segment)
  const segmentDuration = segment.durationFrames;
  const overlayStart = Math.round(segmentDuration * 0.2);
  const overlayEnd = Math.round(segmentDuration * 0.8);

  // Choose animation based on importance
  const animation: TextAnimation = segment.importance === 'high' ? 'pop' : 'scale';

  return {
    primary: primaryText,
    secondary: undefined,
    style: options.defaultTextOverlayStyle,
    animation,
    startFrame: segment.startFrame + overlayStart,
    endFrame: segment.startFrame + overlayEnd,
  };
};

/**
 * Extract a phrase suitable for text overlay display
 */
const extractDisplayPhrase = (segment: ScriptSegment): string | undefined => {
  const text = segment.text;

  // Look for quoted phrases
  const quotedMatch = text.match(/"([^"]+)"/);
  if (quotedMatch) {
    return quotedMatch[1];
  }

  // Look for phrases with numbers
  const numberedMatch = text.match(/\b(\d+\s+\w+(?:\s+\w+)?)\b/);
  if (numberedMatch) {
    return numberedMatch[1];
  }

  // Use first few keywords joined
  if (segment.keywords.length >= 2) {
    return segment.keywords.slice(0, 3).join(' ').toUpperCase();
  }

  // Use highest importance keywords
  const keywordWords = segment.words.filter((w) => w.isKeyword).map((w) => w.text);
  if (keywordWords.length >= 1) {
    return keywordWords.slice(0, 2).join(' ').toUpperCase();
  }

  return undefined;
};

/**
 * Validate layout plan for consistency
 */
export const validateLayoutPlan = (
  decisions: LayoutDecision[],
  segments: ScriptSegment[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check all segments have decisions
  const decisionSegmentIds = new Set(decisions.map((d) => d.segmentId));
  for (const segment of segments) {
    if (!decisionSegmentIds.has(segment.id)) {
      errors.push(`Missing layout decision for segment: ${segment.id}`);
    }
  }

  // Check Layout B and C have helper assets
  for (const decision of decisions) {
    if ((decision.layout === 'B' || decision.layout === 'C') && !decision.helperAsset) {
      errors.push(
        `Layout ${decision.layout} requires helper asset for segment: ${decision.segmentId}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
