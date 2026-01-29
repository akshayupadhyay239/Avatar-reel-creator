import { useVideoConfig } from 'remotion';
import { AvatarFull } from '../Avatar';
import { Captions } from '../Text';
import { DynamicText } from '../Text';
import type { TimelineItem } from '../../types';

interface LayoutAProps {
  item: TimelineItem;
  /** Use single-word viral style captions */
  viralCaptions?: boolean;
}

/**
 * Layout A: Full Avatar
 * - Avatar takes the entire canvas
 * - TikTok-style captions overlaid at bottom
 * - Optional dynamic text overlay for key phrases
 */
export const LayoutA: React.FC<LayoutAProps> = ({ item, viralCaptions = false }) => {
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
      {/* Full screen avatar */}
      <AvatarFull clip={item.avatarClip} />

      {/* Gradient overlay for caption readability */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: height * 0.4,
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Captions */}
      {item.caption && <Captions data={item.caption} singleWordMode={viralCaptions} />}

      {/* Dynamic text overlay (for key phrases without visuals) */}
      {item.textOverlay && <DynamicText overlay={item.textOverlay} />}
    </div>
  );
};
