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
 * Create a test pipeline with the Superheat assets
 */
export const createSuperheatPipeline = (config: ProjectConfig): PipelineResult => {
  const scriptText = `What if your Bitcoin miner could heat your home?

Introducing Superheat - the revolutionary device that turns mining heat into hot water for your shower.

Mine Bitcoin while you save on energy bills. It's the smartest way to heat your home.

Check the link in bio to learn more.`;

  return runPipeline({
    scriptText,
    avatarSrc: staticFile('assets/avatar/avatar part 1.mp4'),
    avatarDurationSeconds: 7.94, // From ffprobe
    helperVideoPaths: [
      staticFile('assets/helpers/bitcoin-mining-heat.mp4'),
      staticFile('assets/helpers/superheat-intro.mp4'),
      staticFile('assets/helpers/phone-earning-bitcoin.mp4'),
      staticFile('assets/helpers/superheat-mining-animation.mp4'),
      staticFile('assets/helpers/superheat-shower-heat.mp4'),
    ],
    helperImagePaths: [
      staticFile('assets/images/bitcoin-mining-rig.png'),
      staticFile('assets/images/bitcoin-mining-rig-2.png'),
    ],
    sfxPaths: {
      click: staticFile('assets/sfx/click.wav'),
      swoosh: staticFile('assets/sfx/swoosh.wav'),
    },
    config,
  });
};
