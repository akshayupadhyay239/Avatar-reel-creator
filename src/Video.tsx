import { useVideoConfig, Audio, Sequence, interpolate } from 'remotion';
import { z } from 'zod';
import { LayoutA, LayoutB, LayoutC } from './components/Layouts';
import type { Timeline, TimelineItem, ProjectConfig } from './types';

// Schema for video props
export const videoSchema = z.object({
  timeline: z.object({
    totalDurationFrames: z.number(),
    items: z.array(z.any()),
  }),
  config: z.any(),
});

type VideoSchemaProps = z.infer<typeof videoSchema>;

/**
 * Main Video Composition
 * Renders timeline items with appropriate layouts and transitions
 */
export const Video: React.FC<VideoSchemaProps> = ({ timeline, config }) => {
  const { width, height } = useVideoConfig();

  // Cast to proper types since we're using z.any() for complex nested objects
  const typedTimeline = timeline as Timeline;
  const typedConfig = config as ProjectConfig;

  const renderLayout = (item: TimelineItem) => {
    switch (item.layout) {
      case 'A':
        return <LayoutA item={item} />;
      case 'B':
        return <LayoutB item={item} />;
      case 'C':
        return <LayoutC item={item} />;
      default:
        return <LayoutA item={item} />;
    }
  };

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Render each timeline item as a sequence */}
      {typedTimeline.items.map((item, index) => (
        <Sequence
          key={item.id}
          from={item.startFrame}
          durationInFrames={item.durationFrames}
          name={`Segment ${index + 1} - Layout ${item.layout}`}
        >
          {renderLayout(item)}

          {/* Transition SFX */}
          {item.transition.sfx && (
            <Audio
              src={item.transition.sfx}
              volume={(f) =>
                interpolate(f, [0, 5], [0, item.transition.sfxVolume], {
                  extrapolateRight: 'clamp',
                })
              }
              startFrom={0}
            />
          )}
        </Sequence>
      ))}

      {/* Background music (if provided) */}
      {typedConfig.assets.music && (
        <Audio
          src={typedConfig.assets.music}
          volume={() => typedConfig.settings.musicVolume}
        />
      )}
    </div>
  );
};
