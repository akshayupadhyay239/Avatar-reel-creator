import { OffthreadVideo, useVideoConfig } from 'remotion';
import type { AvatarClip } from '../../types';

interface AvatarPiPProps {
  clip: AvatarClip;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  size?: number; // percentage of width
}

export const AvatarPiP: React.FC<AvatarPiPProps> = ({
  clip,
  position = 'bottom-right',
  size = 0.25,
}) => {
  const { width } = useVideoConfig();

  const pipWidth = width * size;
  const pipHeight = pipWidth * (16 / 9); // Maintain aspect ratio
  const margin = 40;
  const borderRadius = 20;

  const getPosition = () => {
    switch (position) {
      case 'bottom-left':
        return { bottom: margin, left: margin };
      case 'bottom-right':
        return { bottom: margin, right: margin };
      case 'top-left':
        return { top: margin, left: margin };
      case 'top-right':
        return { top: margin, right: margin };
      default:
        return { bottom: margin, right: margin };
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        ...getPosition(),
        width: pipWidth,
        height: pipHeight,
        borderRadius,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        border: '3px solid rgba(255,255,255,0.2)',
      }}
    >
      <OffthreadVideo
        src={clip.src}
        startFrom={clip.originalStartFrame}
        endAt={clip.originalEndFrame}
        volume={clip.volume}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </div>
  );
};
