import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

interface WipeTransitionProps {
  startFrame: number;
  durationFrames: number;
  direction: 'left' | 'right' | 'up' | 'down';
  type: 'in' | 'out';
  children: React.ReactNode;
}

/**
 * Wipe transition - content reveals with a sweeping mask
 */
export const WipeTransition: React.FC<WipeTransitionProps> = ({
  startFrame,
  durationFrames,
  direction,
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
      damping: 25,
      stiffness: 120,
    },
  });

  const isEntering = type === 'in';
  const effectiveProgress = isEntering ? progress : 1 - progress;

  const getClipPath = () => {
    const p = effectiveProgress * 100;
    switch (direction) {
      case 'left':
        return `inset(0 ${100 - p}% 0 0)`;
      case 'right':
        return `inset(0 0 0 ${100 - p}%)`;
      case 'up':
        return `inset(0 0 ${100 - p}% 0)`;
      case 'down':
        return `inset(${100 - p}% 0 0 0)`;
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
        clipPath: getClipPath(),
        width: '100%',
        height: '100%',
      }}
    >
      {children}
    </div>
  );
};
