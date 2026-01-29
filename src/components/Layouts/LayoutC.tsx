import { useVideoConfig } from 'remotion';
import { AvatarPiP } from '../Avatar';
import { HelperVideo, HelperImage } from '../Helpers';
import { Captions } from '../Text';
import type { TimelineItem } from '../../types';

interface LayoutCProps {
  item: TimelineItem;
  showPiP?: boolean;
  pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize?: number;
}

/**
 * Layout C: Full Helper
 * - Helper content takes entire canvas
 * - Avatar as small picture-in-picture (optional)
 * - Captions overlaid at bottom
 * - Avatar audio continues as voiceover
 */
export const LayoutC: React.FC<LayoutCProps> = ({
  item,
  showPiP = true,
  pipPosition = 'bottom-left',
  pipSize = 0.25,
}) => {
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: '#000',
      }}
    >
      {/* Full screen helper content */}
      {item.helperAsset?.type === 'video' && (
        <HelperVideo asset={item.helperAsset} height={height} />
      )}
      {item.helperAsset?.type === 'image' && (
        <HelperImage asset={item.helperAsset} height={height} />
      )}

      {/* Gradient overlay for better caption readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.35,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Picture-in-Picture avatar (optional) */}
      {showPiP && (
        <AvatarPiP
          clip={item.avatarClip}
          position={pipPosition}
          size={pipSize}
        />
      )}

      {/* Captions at bottom */}
      {item.caption && <Captions data={item.caption} />}
    </div>
  );
};
