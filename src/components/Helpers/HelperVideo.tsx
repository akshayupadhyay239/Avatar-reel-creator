import { OffthreadVideo, useVideoConfig } from 'remotion';
import type { HelperAsset } from '../../types';

interface HelperVideoProps {
  asset: HelperAsset;
  height: number;
}

export const HelperVideo: React.FC<HelperVideoProps> = ({ asset, height }) => {
  const { width } = useVideoConfig();

  if (asset.type !== 'video') return null;

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
      <OffthreadVideo
        src={asset.src}
        startFrom={asset.startFrame}
        endAt={asset.endFrame}
        volume={0} // Helper videos are muted, avatar audio plays
        style={{
          width: '100%',
          height: '100%',
          objectFit: asset.fit,
        }}
      />
    </div>
  );
};
