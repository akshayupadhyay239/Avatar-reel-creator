import { useCurrentFrame, interpolate } from 'remotion';
import { AbsoluteFill } from 'remotion';

interface FlashTransitionProps {
  startFrame: number;
  durationFrames: number;
  color?: string;
  children: React.ReactNode;
}

/**
 * Flash transition - quick white/color flash between scenes
 * Popular in energetic short-form content
 */
export const FlashTransition: React.FC<FlashTransitionProps> = ({
  startFrame,
  durationFrames,
  color = '#FFFFFF',
  children,
}) => {
  const frame = useCurrentFrame();

  const relativeFrame = frame - startFrame;

  // Flash peaks at middle of transition
  const flashOpacity = interpolate(
    relativeFrame,
    [0, durationFrames * 0.3, durationFrames * 0.5, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Content fades through flash
  const contentOpacity = interpolate(
    relativeFrame,
    [0, durationFrames * 0.4, durationFrames * 0.6, durationFrames],
    [1, 0, 0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const isInTransition = frame >= startFrame && frame <= startFrame + durationFrames;

  return (
    <>
      <div
        style={{
          opacity: isInTransition ? contentOpacity : 1,
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </div>
      {isInTransition && (
        <AbsoluteFill
          style={{
            backgroundColor: color,
            opacity: flashOpacity,
            zIndex: 1000,
          }}
        />
      )}
    </>
  );
};
