import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface SlideTransitionProps {
  startFrame: number;
  durationFrames: number;
  direction: 'left' | 'right' | 'up' | 'down';
  type: 'in' | 'out';
  children: React.ReactNode;
}

export const SlideTransition: React.FC<SlideTransitionProps> = ({
  startFrame,
  durationFrames,
  direction,
  type,
  children,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const relativeFrame = frame - startFrame;

  const progress = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 80,
    },
  });

  const getTransform = () => {
    const isEntering = type === 'in';
    const invertedProgress = isEntering ? progress : 1 - progress;

    switch (direction) {
      case 'left':
        return `translateX(${interpolate(invertedProgress, [0, 1], [width, 0])}px)`;
      case 'right':
        return `translateX(${interpolate(invertedProgress, [0, 1], [-width, 0])}px)`;
      case 'up':
        return `translateY(${interpolate(invertedProgress, [0, 1], [height, 0])}px)`;
      case 'down':
        return `translateY(${interpolate(invertedProgress, [0, 1], [-height, 0])}px)`;
      default:
        return 'none';
    }
  };

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
        transform: getTransform(),
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};
