import { OffthreadVideo, useVideoConfig } from 'remotion';
import type { AvatarClip } from '../../types';
import { LAYOUT_CONFIG } from '../../types';

interface AvatarBottomProps {
  clip: AvatarClip;
}

export const AvatarBottom: React.FC<AvatarBottomProps> = ({ clip }) => {
  const { width, height } = useVideoConfig();
  const containerHeight = height * LAYOUT_CONFIG.B.avatarHeight; // 40% = 768px

  // Video is 720x1280 (9:16)
  // When scaled to 1080 width -> 1920 height
  // We want to show the TOP of the video (face)

  // Scale video to match full canvas width
  const scaledVideoHeight = height; // Full 1920px when scaled to 1080 width

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width,
        height: containerHeight,
        overflow: 'hidden',
      }}
    >
      {/* Inner container to position video from top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: scaledVideoHeight,
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
    </div>
  );
};
