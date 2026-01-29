import { useCurrentFrame, interpolate } from 'remotion';

interface FadeTransitionProps {
  startFrame: number;
  durationFrames: number;
  direction: 'in' | 'out';
  children: React.ReactNode;
}

export const FadeTransition: React.FC<FadeTransitionProps> = ({
  startFrame,
  durationFrames,
  direction,
  children,
}) => {
  const frame = useCurrentFrame();

  const opacity =
    direction === 'in'
      ? interpolate(
          frame,
          [startFrame, startFrame + durationFrames],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      : interpolate(
          frame,
          [startFrame, startFrame + durationFrames],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

  return (
    <div
      style={{
        opacity,
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};
