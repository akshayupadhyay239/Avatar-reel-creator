import { OffthreadVideo, useVideoConfig } from 'remotion';
import type { AvatarClip } from '../../types';

interface AvatarFullProps {
  clip: AvatarClip;
}

export const AvatarFull: React.FC<AvatarFullProps> = ({ clip }) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'hidden',
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
