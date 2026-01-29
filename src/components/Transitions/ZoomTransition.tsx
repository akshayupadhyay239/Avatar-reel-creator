import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface ZoomTransitionProps {
  startFrame: number;
  durationFrames: number;
  type: 'in' | 'out';
  children: React.ReactNode;
}

export const ZoomTransition: React.FC<ZoomTransitionProps> = ({
  startFrame,
  durationFrames,
  type,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relativeFrame = frame - startFrame;

  const progress = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const isEntering = type === 'in';

  // Scale and opacity based on direction
  const scale = isEntering
    ? interpolate(progress, [0, 1], [0.8, 1])
    : interpolate(progress, [0, 1], [1, 1.2]);

  const opacity = isEntering
    ? interpolate(progress, [0, 1], [0, 1])
    : interpolate(progress, [0, 1], [1, 0]);

  // Don't render if before transition
  if (frame < startFrame) {
    return type === 'in' ? null : <>{children}</>;
  }

  // After transition complete
  if (frame > startFrame + durationFrames) {
    return type === 'in' ? <>{children}</> : null;
  }

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        opacity,
        width: '100%',
        height: '100%',
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
};
