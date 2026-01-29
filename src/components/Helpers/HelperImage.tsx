import { Img, useVideoConfig, interpolate, useCurrentFrame } from 'remotion';
import type { HelperAsset } from '../../types';

interface HelperImageProps {
  asset: HelperAsset;
  height: number;
  animate?: boolean;
}

export const HelperImage: React.FC<HelperImageProps> = ({
  asset,
  height,
  animate = true,
}) => {
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();

  if (asset.type !== 'image') return null;

  // Subtle Ken Burns effect
  const scale = animate
    ? interpolate(frame, [0, 90], [1, 1.05], {
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'hidden',
        backgroundColor: '#000',
      }}
    >
      <Img
        src={asset.src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: asset.fit,
          transform: `scale(${scale})`,
        }}
      />
    </div>
  );
};
