import type { FontConfig, TextOverlayStyle, CaptionStyle } from '../../types';

// ----- Font Presets -----

export const FONTS = {
  heading: {
    family: 'Inter',
    size: 72,
    weight: 800,
    color: '#FFFFFF',
    shadow: '0 4px 12px rgba(0,0,0,0.5)',
    letterSpacing: -2,
  } as FontConfig,

  subheading: {
    family: 'Inter',
    size: 36,
    weight: 500,
    color: '#CCCCCC',
    shadow: '0 2px 8px rgba(0,0,0,0.3)',
  } as FontConfig,

  caption: {
    family: 'Inter',
    size: 48,
    weight: 700,
    color: '#FFFFFF',
    shadow: '0 2px 8px rgba(0,0,0,0.8)',
  } as FontConfig,

  accent: {
    family: 'Inter',
    size: 64,
    weight: 900,
    color: '#FFD700',
    shadow: '0 4px 16px rgba(255,215,0,0.3)',
    letterSpacing: 2,
  } as FontConfig,

  minimal: {
    family: 'Inter',
    size: 40,
    weight: 400,
    color: '#FFFFFF',
    shadow: 'none',
  } as FontConfig,
};

// ----- Text Overlay Style Presets -----

export const TEXT_OVERLAY_STYLES = {
  default: {
    primaryFont: FONTS.heading,
    secondaryFont: FONTS.subheading,
    background: 'rgba(0,0,0,0.7)',
    padding: 32,
  } as TextOverlayStyle,

  highlight: {
    primaryFont: FONTS.accent,
    secondaryFont: FONTS.subheading,
    background: 'rgba(0,0,0,0.85)',
    padding: 40,
  } as TextOverlayStyle,

  minimal: {
    primaryFont: FONTS.minimal,
    background: 'transparent',
    padding: 16,
  } as TextOverlayStyle,

  product: {
    primaryFont: {
      ...FONTS.heading,
      size: 80,
      color: '#FFFFFF',
    },
    secondaryFont: {
      ...FONTS.subheading,
      size: 32,
      color: '#888888',
    },
    background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(30,30,30,0.9) 100%)',
    padding: 48,
  } as TextOverlayStyle,
};

// ----- Caption Style Presets -----

export const CAPTION_STYLES = {
  tiktok: {
    font: FONTS.caption,
    highlightColor: '#FFD700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'bottom',
    maxWidth: 900,
  } as CaptionStyle,

  youtube: {
    font: {
      ...FONTS.caption,
      size: 42,
      weight: 600,
    },
    highlightColor: '#FF0000',
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'bottom',
    maxWidth: 850,
  } as CaptionStyle,

  clean: {
    font: {
      ...FONTS.minimal,
      size: 44,
    },
    highlightColor: '#00AAFF',
    backgroundColor: 'transparent',
    position: 'bottom',
    maxWidth: 800,
  } as CaptionStyle,

  viral: {
    font: {
      family: 'Inter',
      size: 64,
      weight: 900,
      color: '#FFFFFF',
      shadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.8)',
    },
    highlightColor: '#00FF88',
    backgroundColor: 'rgba(0,0,0,0.75)',
    position: 'center',
    maxWidth: 800,
  } as CaptionStyle,

  energetic: {
    font: {
      family: 'Inter',
      size: 52,
      weight: 800,
      color: '#FFFFFF',
      shadow: '0 0 20px rgba(255,100,100,0.5), 0 4px 12px rgba(0,0,0,0.8)',
    },
    highlightColor: '#FF6B6B',
    backgroundColor: 'rgba(0,0,0,0.65)',
    position: 'bottom',
    maxWidth: 900,
  } as CaptionStyle,

  minimal: {
    font: {
      family: 'Inter',
      size: 40,
      weight: 500,
      color: '#FFFFFF',
      shadow: '0 2px 8px rgba(0,0,0,0.6)',
    },
    highlightColor: '#FFFFFF',
    backgroundColor: 'transparent',
    position: 'bottom',
    maxWidth: 850,
  } as CaptionStyle,
};
