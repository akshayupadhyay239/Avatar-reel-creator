import { useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';
import type { TextOverlay } from '../../types';

interface DynamicTextProps {
  overlay: TextOverlay;
}

export const DynamicText: React.FC<DynamicTextProps> = ({ overlay }) => {
  const { height, fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const { primary, secondary, style, animation, startFrame, endFrame } = overlay;

  const relativeFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  // Animation progress
  const enterProgress = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const exitProgress = spring({
    frame: relativeFrame - (duration - 10),
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const isExiting = relativeFrame > duration - 10;

  const getAnimationStyle = (): React.CSSProperties => {
    switch (animation) {
      case 'fade':
        return {
          opacity: isExiting ? 1 - exitProgress : enterProgress,
        };

      case 'scale': {
        const scale = isExiting ? 1 - exitProgress * 0.3 : enterProgress;
        return {
          opacity: isExiting ? 1 - exitProgress : enterProgress,
          transform: `scale(${scale})`,
        };
      }

      case 'slide-up': {
        const yUp = isExiting
          ? interpolate(exitProgress, [0, 1], [0, -50])
          : interpolate(enterProgress, [0, 1], [50, 0]);
        return {
          opacity: isExiting ? 1 - exitProgress : enterProgress,
          transform: `translateY(${yUp}px)`,
        };
      }

      case 'slide-down': {
        const yDown = isExiting
          ? interpolate(exitProgress, [0, 1], [0, 50])
          : interpolate(enterProgress, [0, 1], [-50, 0]);
        return {
          opacity: isExiting ? 1 - exitProgress : enterProgress,
          transform: `translateY(${yDown}px)`,
        };
      }

      case 'pop': {
        const popScale = isExiting
          ? interpolate(exitProgress, [0, 1], [1, 0.8])
          : interpolate(enterProgress, [0, 1], [0.5, 1]);
        return {
          opacity: isExiting ? 1 - exitProgress : enterProgress,
          transform: `scale(${popScale})`,
        };
      }

      default:
        return { opacity: 1 };
    }
  };

  // Don't render outside of overlay timing
  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: height * 0.35,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 60px',
        ...getAnimationStyle(),
      }}
    >
      {/* Background container */}
      <div
        style={{
          backgroundColor: style.background || 'rgba(0,0,0,0.7)',
          padding: style.padding || 32,
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* Primary text */}
        <div
          style={{
            fontFamily: style.primaryFont.family,
            fontSize: style.primaryFont.size,
            fontWeight: style.primaryFont.weight,
            color: style.primaryFont.color,
            textShadow: style.primaryFont.shadow,
            letterSpacing: style.primaryFont.letterSpacing || 0,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {primary}
        </div>

        {/* Secondary text */}
        {secondary && style.secondaryFont && (
          <div
            style={{
              fontFamily: style.secondaryFont.family,
              fontSize: style.secondaryFont.size,
              fontWeight: style.secondaryFont.weight,
              color: style.secondaryFont.color,
              textShadow: style.secondaryFont.shadow,
              textAlign: 'center',
              marginTop: 12,
              lineHeight: 1.3,
            }}
          >
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
};
