import { useVideoConfig } from 'remotion';
import { AvatarBottom } from '../Avatar';
import { HelperVideo, HelperImage } from '../Helpers';
import { Captions } from '../Text';
import { DynamicText } from '../Text';
import type { TimelineItem } from '../../types';
import { LAYOUT_CONFIG } from '../../types';

interface LayoutBProps {
  item: TimelineItem;
}

/**
 * Layout B: Split Screen
 * - Helper content (video/image/text) in top 60%
 * - Avatar in bottom 40%
 * - Captions overlaid on avatar area
 */
export const LayoutB: React.FC<LayoutBProps> = ({ item }) => {
  const { width, height } = useVideoConfig();

  const helperHeight = height * LAYOUT_CONFIG.B.helperHeight;
  const avatarHeight = height * LAYOUT_CONFIG.B.avatarHeight;

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        backgroundColor: '#000',
      }}
    >
      {/* Top section: Helper content */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height: helperHeight,
          overflow: 'hidden',
        }}
      >
        {item.helperAsset?.type === 'video' && (
          <HelperVideo asset={item.helperAsset} height={helperHeight} />
        )}
        {item.helperAsset?.type === 'image' && (
          <HelperImage asset={item.helperAsset} height={helperHeight} />
        )}

        {/* Dynamic text overlay in helper area */}
        {item.textOverlay && !item.helperAsset && (
          <DynamicText overlay={item.textOverlay} />
        )}
      </div>

      {/* Divider line */}
      <div
        style={{
          position: 'absolute',
          top: helperHeight - 2,
          left: 0,
          width,
          height: 4,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }}
      />

      {/* Bottom section: Avatar */}
      <AvatarBottom clip={item.avatarClip} />

      {/* Captions positioned in avatar area */}
      {item.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: avatarHeight * 0.1,
            left: 0,
            right: 0,
          }}
        >
          <Captions data={{
            ...item.caption,
            style: {
              ...item.caption.style,
              position: 'bottom',
            }
          }} />
        </div>
      )}
    </div>
  );
};
