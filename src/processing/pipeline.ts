// ============================================
// Full Processing Pipeline
// Orchestrates all processing steps to generate a timeline
// ============================================

import { staticFile } from 'remotion';
import type { Timeline, ProjectConfig, HelperAsset, ProcessedAvatar } from '../types';
import { parseScript, type ParsedScript } from './scriptParser';
import { processAvatarWithoutTrimming } from './silenceDetector';
import { matchAssetsToSegments, createHelperAssetFromPath } from './assetMatcher';
import { planLayouts, type LayoutDecision } from './layoutPlanner';
import { buildTimeline, getTimelineStats, validateTimeline } from './timelineBuilder';
import { secondsToFrames } from '../utils/timing';
import {
  loadEditingDecisions,
  createHelperAssetFromDecision,
  validateDecisions,
} from './decisionLoader';

export interface PipelineInput {
  scriptText: string;
  avatarSrc: string;
  avatarDurationSeconds: number;
  helperVideoPaths: string[];
  helperImagePaths: string[];
  sfxPaths: {
    click?: string;
    swoosh?: string;
    impact?: string;
  };
  config: ProjectConfig;
}

export interface PipelineResult {
  timeline: Timeline;
  parsedScript: ParsedScript;
  processedAvatar: ProcessedAvatar;
  layoutDecisions: LayoutDecision[];
  stats: ReturnType<typeof getTimelineStats>;
  validation: ReturnType<typeof validateTimeline>;
}

/**
 * Run the full processing pipeline
 */
export const runPipeline = (input: PipelineInput): PipelineResult => {
  const {
    scriptText,
    avatarSrc,
    avatarDurationSeconds,
    helperVideoPaths,
    helperImagePaths,
    sfxPaths,
    config,
  } = input;

  const fps = config.fps;
  const avatarDurationFrames = secondsToFrames(avatarDurationSeconds, fps);

  console.log('=== Processing Pipeline ===');
  console.log(`Avatar duration: ${avatarDurationSeconds}s (${avatarDurationFrames} frames)`);

  // Step 1: Parse script
  console.log('\n[1/5] Parsing script...');
  const parsedScript = parseScript(scriptText, {
    fps,
    totalDurationFrames: avatarDurationFrames,
    minSegmentWords: 5,
    maxSegmentWords: 15, // Smaller segments for better asset matching
  });
  console.log(`  - ${parsedScript.segments.length} segments`);
  console.log(`  - ${parsedScript.totalWords} words`);
  console.log(`  - Keywords: ${parsedScript.allKeywords.slice(0, 10).join(', ')}...`);

  // Step 2: Process avatar (no silence removal for now)
  console.log('\n[2/5] Processing avatar...');
  const processedAvatar = processAvatarWithoutTrimming(avatarSrc, avatarDurationFrames);
  console.log(`  - ${processedAvatar.clips.length} clip(s)`);

  // Step 3: Create and match assets
  console.log('\n[3/5] Matching assets to segments...');
  const helperAssets: HelperAsset[] = [
    ...helperVideoPaths.map((p) => createHelperAssetFromPath(p, 'video')),
    ...helperImagePaths.map((p) => createHelperAssetFromPath(p, 'image')),
  ];
  console.log(`  - ${helperAssets.length} helper assets available`);

  const assetMatchResult = matchAssetsToSegments(parsedScript.segments, helperAssets);
  console.log(`  - ${assetMatchResult.matches.length} matches found`);
  for (const match of assetMatchResult.matches) {
    console.log(`    • ${match.segmentId} -> ${match.asset.title} (${match.relevanceScore.toFixed(2)})`);
  }

  // Step 4: Plan layouts
  console.log('\n[4/5] Planning layouts...');
  const layoutDecisions = planLayouts(parsedScript.segments, assetMatchResult.matches, {
    fps,
    sfxSources: sfxPaths,
  });
  for (const decision of layoutDecisions) {
    console.log(`  - ${decision.segmentId}: Layout ${decision.layout} (${decision.reasoning})`);
  }

  // Step 5: Build timeline
  console.log('\n[5/5] Building timeline...');
  const timeline = buildTimeline(
    {
      parsedScript,
      processedAvatar,
      layoutDecisions,
    },
    { config }
  );

  // Validate and get stats
  const validation = validateTimeline(timeline);
  const stats = getTimelineStats(timeline, fps);

  console.log('\n=== Pipeline Complete ===');
  console.log(`Total duration: ${stats.totalDuration}`);
  console.log(`Items: ${stats.itemCount}`);
  console.log(`Layouts: A=${stats.layoutBreakdown.A}, B=${stats.layoutBreakdown.B}, C=${stats.layoutBreakdown.C}`);
  console.log(`Transitions: ${stats.transitionCount}`);
  console.log(`Caption words: ${stats.captionWordCount}`);

  if (!validation.valid) {
    console.error('Validation errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('Warnings:', validation.warnings);
  }

  return {
    timeline,
    parsedScript,
    processedAvatar,
    layoutDecisions,
    stats,
    validation,
  };
};

/**
 * Run pipeline with JSON-based editorial decisions
 * Uses decisions from editingDecisions.json instead of algorithmic matching
 */
export const runPipelineWithDecisions = (input: PipelineInput): PipelineResult => {
  const {
    scriptText,
    avatarSrc,
    avatarDurationSeconds,
    sfxPaths,
    config,
  } = input;

  const fps = config.fps;
  const avatarDurationFrames = secondsToFrames(avatarDurationSeconds, fps);

  console.log('=== Processing Pipeline (AI-Edited) ===');
  console.log(`Avatar duration: ${avatarDurationSeconds}s (${avatarDurationFrames} frames)`);

  // Step 1: Parse script (still needed for timing and captions)
  console.log('\n[1/4] Parsing script...');
  const parsedScript = parseScript(scriptText, {
    fps,
    totalDurationFrames: avatarDurationFrames,
    minSegmentWords: 5,
    maxSegmentWords: 15,
  });
  console.log(`  - ${parsedScript.segments.length} segments`);
  console.log(`  - ${parsedScript.totalWords} words`);

  // Step 2: Process avatar
  console.log('\n[2/4] Processing avatar...');
  const processedAvatar = processAvatarWithoutTrimming(avatarSrc, avatarDurationFrames);
  console.log(`  - ${processedAvatar.clips.length} clip(s)`);

  // Step 3: Load editorial decisions from JSON
  console.log('\n[3/4] Loading editorial decisions from JSON...');
  const decisions = loadEditingDecisions();
  console.log(`  - Loaded ${decisions.segments.length} decisions for "${decisions.videoId}"`);

  // Validate decisions match segments
  const segmentIds = parsedScript.segments.map(s => s.id);
  const validation = validateDecisions(segmentIds);
  if (!validation.valid) {
    console.warn(`  - Warning: Missing decisions for: ${validation.missing.join(', ')}`);
  }
  if (validation.extra.length > 0) {
    console.warn(`  - Warning: Extra decisions not in script: ${validation.extra.join(', ')}`);
  }

  // Convert JSON decisions to LayoutDecisions
  const layoutDecisions: LayoutDecision[] = parsedScript.segments.map(segment => {
    const decision = decisions.segments.find(d => d.id === segment.id);

    if (decision) {
      console.log(`  - ${segment.id}: Layout ${decision.layout} -> ${decision.asset || 'no asset'} (${decision.reasoning})`);

      return {
        segmentId: segment.id,
        layout: decision.layout,
        helperAsset: createHelperAssetFromDecision(decision),
        transition: {
          type: decision.transition,
          durationFrames: decision.transitionDuration,
          sfx: decision.transition !== 'cut' && decision.transition !== 'none'
            ? sfxPaths.swoosh
            : undefined,
          sfxVolume: 0.3,
        },
        reasoning: decision.reasoning,
      };
    } else {
      // Fallback for segments without decisions
      console.log(`  - ${segment.id}: Layout A (no decision found - using default)`);
      return {
        segmentId: segment.id,
        layout: 'A' as const,
        helperAsset: undefined,
        transition: {
          type: 'fade' as const,
          durationFrames: 8,
          sfxVolume: 0.3,
        },
        reasoning: 'Default fallback - no decision in JSON',
      };
    }
  });

  // Step 4: Build timeline
  console.log('\n[4/4] Building timeline...');
  const timeline = buildTimeline(
    {
      parsedScript,
      processedAvatar,
      layoutDecisions,
    },
    { config }
  );

  // Validate and get stats
  const timelineValidation = validateTimeline(timeline);
  const stats = getTimelineStats(timeline, fps);

  console.log('\n=== Pipeline Complete (AI-Edited) ===');
  console.log(`Total duration: ${stats.totalDuration}`);
  console.log(`Items: ${stats.itemCount}`);
  console.log(`Layouts: A=${stats.layoutBreakdown.A}, B=${stats.layoutBreakdown.B}, C=${stats.layoutBreakdown.C}`);
  console.log(`Transitions: ${stats.transitionCount}`);
  console.log(`Caption words: ${stats.captionWordCount}`);

  if (!timelineValidation.valid) {
    console.error('Validation errors:', timelineValidation.errors);
  }

  return {
    timeline,
    parsedScript,
    processedAvatar,
    layoutDecisions,
    stats,
    validation: timelineValidation,
  };
};

/**
 * Create Superheat pipeline using AI editorial decisions from JSON
 */
export const createSuperheatPipeline = (config: ProjectConfig): PipelineResult => {
  const scriptText = `This might be the smartest or dumbest product ever built.
Meet the Superheat H1 , unveiled at CES 2026.

Looks like a totally normal 50-gallon water heater.But inside?

It's secretly a full-on Bitcoin mining machine.

Bitcoin miners pump out insane heat — usually goes wasted.
so this company asked: Why not use that heat to warm your shower instead?

So now you shower and simultaneously print bitcoin with your water heater.

"insane right?"

Same electricity bill as a regular heater. But now your hot water is basically free, powered by Bitcoin.

Is this ridiculous… or kind of genius? you decide.`;

  return runPipelineWithDecisions({
    scriptText,
    avatarSrc: staticFile('assets/avatar/talking avatar.mp4'),
    avatarDurationSeconds: 35.97,
    helperVideoPaths: [], // Not used with JSON decisions
    helperImagePaths: [], // Not used with JSON decisions
    sfxPaths: {
      click: staticFile('assets/sfx/click.wav'),
      swoosh: staticFile('assets/sfx/swoosh.wav'),
    },
    config,
  });
};
