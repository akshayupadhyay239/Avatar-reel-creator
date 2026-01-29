import { useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';
import type { CaptionData } from '../../types';

interface CaptionsProps {
  data: CaptionData;
  /** Show only active word (true) or window of words (false) */
  singleWordMode?: boolean;
}

export const Captions: React.FC<CaptionsProps> = ({ data, singleWordMode = false }) => {
  const { height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { words, style } = data;

  // Find current word
  const currentWordIndex = words.findIndex(
    (word) => frame >= word.startFrame && frame <= word.endFrame
  );

  // In single word mode, only show the current word (TikTok viral style)
  // Otherwise show a window of words
  const windowSize = singleWordMode ? 1 : 4;
  const startIndex = singleWordMode
    ? Math.max(0, currentWordIndex)
    : Math.max(0, currentWordIndex - 1);
  const endIndex = Math.min(words.length, startIndex + windowSize);
  const visibleWords = words.slice(startIndex, endIndex);

  const getPositionY = () => {
    switch (style.position) {
      case 'top':
        return height * 0.15;
      case 'center':
        return height * 0.45;
      case 'bottom':
      default:
        return height * 0.72;
    }
  };

  if (currentWordIndex === -1 || visibleWords.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: getPositionY(),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: singleWordMode ? '0' : '6px 10px',
          maxWidth: style.maxWidth,
          padding: singleWordMode ? '20px 40px' : '16px 28px',
          borderRadius: 16,
          backgroundColor: style.backgroundColor,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {visibleWords.map((word, index) => {
          const globalIndex = startIndex + index;
          const isActive = globalIndex === currentWordIndex;
          const isPast = globalIndex < currentWordIndex;

          // Spring animation for active word
          const springProgress = spring({
            frame: frame - word.startFrame,
            fps,
            config: {
              damping: 12,
              stiffness: 200,
              mass: 0.5,
            },
          });

          // Scale pop for active word
          const scale = isActive
            ? interpolate(springProgress, [0, 1], [0.8, 1.15], {
                extrapolateRight: 'clamp',
              })
            : isPast
              ? 0.95
              : 1;

          // Glow effect for active word
          const glowOpacity = isActive
            ? interpolate(springProgress, [0, 1], [0, 0.6], {
                extrapolateRight: 'clamp',
              })
            : 0;

          return (
            <span
              key={`${word.text}-${globalIndex}`}
              style={{
                fontFamily: style.font.family,
                fontSize: singleWordMode ? style.font.size * 1.3 : style.font.size,
                fontWeight: isActive ? 900 : style.font.weight,
                color: isActive ? style.highlightColor : style.font.color,
                textShadow: isActive
                  ? `${style.font.shadow}, 0 0 30px ${style.highlightColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}`
                  : style.font.shadow,
                opacity: isPast ? 0.5 : 1,
                transform: `scale(${scale})`,
                transition: 'color 0.1s ease',
                display: 'inline-block',
                textTransform: singleWordMode ? 'uppercase' : 'none',
                letterSpacing: singleWordMode ? '2px' : '0',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Karaoke-style captions that show full sentence with word highlighting
 */
export const KaraokeCaptions: React.FC<CaptionsProps> = ({ data }) => {
  const { height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const { words, style } = data;

  // Group words into lines (roughly 5-6 words per line)
  const wordsPerLine = 5;
  const lines: typeof words[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine));
  }

  // Find current line
  const currentLineIndex = lines.findIndex((line) =>
    line.some((word) => frame >= word.startFrame && frame <= word.endFrame)
  );

  const currentLine = lines[currentLineIndex] || [];

  const getPositionY = () => {
    switch (style.position) {
      case 'top':
        return height * 0.15;
      case 'center':
        return height * 0.45;
      case 'bottom':
      default:
        return height * 0.72;
    }
  };

  if (currentLine.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: getPositionY(),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 40px',
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px 12px',
          maxWidth: style.maxWidth,
          padding: '20px 32px',
          borderRadius: 16,
          backgroundColor: style.backgroundColor,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {currentLine.map((word, index) => {
          const isActive = frame >= word.startFrame && frame <= word.endFrame;
          const isPast = frame > word.endFrame;

          const springProgress = isActive
            ? spring({
                frame: frame - word.startFrame,
                fps,
                config: { damping: 15, stiffness: 180 },
              })
            : 1;

          return (
            <span
              key={`${word.text}-${index}`}
              style={{
                fontFamily: style.font.family,
                fontSize: style.font.size,
                fontWeight: isActive ? 900 : style.font.weight,
                color: isActive || isPast ? style.highlightColor : style.font.color,
                textShadow: style.font.shadow,
                opacity: isPast ? 0.9 : isActive ? 1 : 0.6,
                transform: `scale(${isActive ? springProgress * 1.1 : 1})`,
                display: 'inline-block',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
