import { Composition, staticFile } from 'remotion';
import { Video, videoSchema } from './Video';
import { CAPTION_STYLES } from './components/Text/TextStyles';
import { DEFAULT_PROJECT_CONFIG } from './types';
import type { Timeline, ProjectConfig, TimelineItem } from './types';
import { createSuperheatPipeline } from './processing/pipeline';

// Avatar video is 7.88 seconds at 25fps = ~197 frames
// We'll use 30fps for output, so ~236 frames
const AVATAR_DURATION_FRAMES = 236;

// Simple test timeline with actual avatar
const createTestTimeline = (): Timeline => {
  const testItem: TimelineItem = {
    id: 'test-segment-1',
    segmentId: 'seg-1',
    startFrame: 0,
    endFrame: AVATAR_DURATION_FRAMES,
    durationFrames: AVATAR_DURATION_FRAMES,
    layout: 'A', // Full avatar for simple test
    avatarClip: {
      src: staticFile('avatar-part-1.mp4'),
      startFrame: 0,
      endFrame: AVATAR_DURATION_FRAMES,
      originalStartFrame: 0,
      originalEndFrame: AVATAR_DURATION_FRAMES,
      volume: 1,
    },
    caption: {
      words: [
        { text: 'Testing', startFrame: 0, endFrame: 30 },
        { text: 'the', startFrame: 30, endFrame: 45 },
        { text: 'avatar', startFrame: 45, endFrame: 75 },
        { text: 'video', startFrame: 75, endFrame: 105 },
        { text: 'playback', startFrame: 105, endFrame: 150 },
      ],
      style: CAPTION_STYLES.tiktok,
    },
    transition: {
      type: 'none',
      durationFrames: 0,
      sfxVolume: 0.5,
    },
  };

  return {
    totalDurationFrames: AVATAR_DURATION_FRAMES,
    items: [testItem],
  };
};

// Test config matching our output specs
const testConfig: ProjectConfig = {
  ...DEFAULT_PROJECT_CONFIG,
  fps: 30,
  width: 1080,
  height: 1920,
};

// Run the full pipeline to generate a real timeline
const pipelineResult = createSuperheatPipeline(testConfig);
const superheatTimeline = pipelineResult.timeline;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Simple Avatar Test - Layout A */}
      <Composition
        id="SimpleAvatarTest"
        component={Video}
        durationInFrames={AVATAR_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          timeline: createTestTimeline(),
          config: testConfig,
        }}
      />

      {/* Layout B Test - Split Screen */}
      <Composition
        id="SplitScreenTest"
        component={Video}
        durationInFrames={AVATAR_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          timeline: {
            totalDurationFrames: AVATAR_DURATION_FRAMES,
            items: [{
              ...createTestTimeline().items[0],
              layout: 'B' as const,
              helperAsset: {
                type: 'video' as const,
                src: staticFile('superheat-intro.mp4'),
                title: 'Superheat Intro',
                keywords: ['superheat', 'intro', 'product'],
                fit: 'cover' as const,
              },
            }],
          },
          config: testConfig,
        }}
      />

      {/* Layout C Test - Full Helper with PiP */}
      <Composition
        id="FullHelperTest"
        component={Video}
        durationInFrames={AVATAR_DURATION_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          timeline: {
            totalDurationFrames: AVATAR_DURATION_FRAMES,
            items: [{
              ...createTestTimeline().items[0],
              layout: 'C' as const,
              helperAsset: {
                type: 'video' as const,
                src: staticFile('bitcoin-mine.mp4'),
                title: 'Bitcoin Mining',
                keywords: ['bitcoin', 'mining', 'heat'],
                fit: 'cover' as const,
              },
            }],
          },
          config: testConfig,
        }}
      />

      {/* Full Pipeline Test - Superheat Reel */}
      <Composition
        id="SuperheatReel"
        component={Video}
        durationInFrames={superheatTimeline.totalDurationFrames}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          timeline: superheatTimeline,
          config: testConfig,
        }}
      />
    </>
  );
};
