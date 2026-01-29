// ============================================
// Talking Head Avatar Reels - Type Definitions
// ============================================

// ----- Core Config -----

export interface ProjectConfig {
  fps: number;
  width: number;
  height: number;
  assets: AssetConfig;
  settings: ProjectSettings;
}

export interface AssetConfig {
  avatar: string;
  script: string;
  helpers: string[];
  images: string[];
  sfx: SfxConfig;
  music?: string;
}

export interface SfxConfig {
  click?: string;
  swoosh?: string;
  transition?: string;
  impact?: string;
}

export interface ProjectSettings {
  silenceThreshold: number;      // seconds - default: 0.5
  minClipDuration: number;       // seconds - default: 1.0
  transitionSfxProbability: number; // 0-1 - default: 0.7
  musicVolume: number;           // dB - default: -20
  captionStyle: CaptionStyle;
}

// ----- Script & Segments -----

export interface ScriptSegment {
  id: string;
  text: string;
  words: Word[];
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  keywords: string[];
  importance: ImportanceLevel;
  hasKeyPhrase: boolean;
}

export interface Word {
  text: string;
  startFrame: number;
  endFrame: number;
  isKeyword: boolean;
}

export type ImportanceLevel = 'low' | 'medium' | 'high';

// ----- Timeline -----

export interface Timeline {
  totalDurationFrames: number;
  items: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  segmentId: string;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  layout: LayoutType;
  avatarClip: AvatarClip;
  helperAsset?: HelperAsset;
  textOverlay?: TextOverlay;
  caption: CaptionData;
  transition: TransitionConfig;
}

export type LayoutType = 'A' | 'B' | 'C';

// ----- Avatar -----

export interface AvatarClip {
  src: string;
  startFrame: number;
  endFrame: number;
  originalStartFrame: number; // before silence removal
  originalEndFrame: number;
  crop?: CropConfig;
  volume: number;
}

export interface CropConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

// ----- Helper Assets -----

export interface HelperAsset {
  type: 'video' | 'image';
  src: string;
  title: string;
  keywords: string[];
  startFrame?: number;
  endFrame?: number;
  fit: 'cover' | 'contain';
}

// ----- Text & Captions -----

export interface TextOverlay {
  primary: string;
  secondary?: string;
  style: TextOverlayStyle;
  animation: TextAnimation;
  startFrame: number;
  endFrame: number;
}

export interface TextOverlayStyle {
  primaryFont: FontConfig;
  secondaryFont?: FontConfig;
  background?: string;
  padding: number;
}

export interface FontConfig {
  family: string;
  size: number;
  weight: number;
  color: string;
  shadow?: string;
  letterSpacing?: number;
}

export type TextAnimation = 'fade' | 'scale' | 'slide-up' | 'slide-down' | 'pop';

export interface CaptionData {
  words: CaptionWord[];
  style: CaptionStyle;
}

export interface CaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionStyle {
  font: FontConfig;
  highlightColor: string;
  backgroundColor: string;
  position: 'bottom' | 'center' | 'top';
  maxWidth: number;
}

// ----- Transitions -----

export interface TransitionConfig {
  type: TransitionType;
  durationFrames: number;
  sfx?: string;
  sfxVolume: number;
}

export type TransitionType =
  | 'cut'
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'wipe-left'
  | 'wipe-right'
  | 'flash'
  | 'none';

// ----- Silence Detection -----

export interface SilenceRegion {
  startFrame: number;
  endFrame: number;
  durationFrames: number;
}

export interface ProcessedAvatar {
  originalDurationFrames: number;
  processedDurationFrames: number;
  silenceRegions: SilenceRegion[];
  clips: AvatarClip[];
}

// ----- Asset Matching -----

export interface AssetMatch {
  segmentId: string;
  asset: HelperAsset;
  relevanceScore: number;
  matchedKeywords: string[];
}

// ----- Component Props -----

export interface LayoutProps {
  item: TimelineItem;
  frame: number;
}

export interface AvatarProps {
  clip: AvatarClip;
  frame: number;
  style?: React.CSSProperties;
}

export interface CaptionProps {
  data: CaptionData;
  frame: number;
}

export interface TextOverlayProps {
  overlay: TextOverlay;
  frame: number;
}

export interface TransitionProps {
  config: TransitionConfig;
  frame: number;
  children: React.ReactNode;
}

// ----- Default Values -----

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  fps: 30,
  width: 1080,
  height: 1920,
  assets: {
    avatar: '',
    script: '',
    helpers: [],
    images: [],
    sfx: {},
  },
  settings: {
    silenceThreshold: 0.5,
    minClipDuration: 1.0,
    transitionSfxProbability: 0.7,
    musicVolume: -20,
    captionStyle: {
      font: {
        family: 'Inter',
        size: 48,
        weight: 700,
        color: '#FFFFFF',
        shadow: '0 2px 8px rgba(0,0,0,0.8)',
      },
      highlightColor: '#FFD700',
      backgroundColor: 'rgba(0,0,0,0.6)',
      position: 'bottom',
      maxWidth: 900,
    },
  },
};

export const LAYOUT_CONFIG = {
  A: {
    name: 'Full Avatar',
    avatarHeight: 1, // 100%
    helperHeight: 0,
  },
  B: {
    name: 'Split Screen',
    avatarHeight: 0.4, // 40%
    helperHeight: 0.6, // 60%
  },
  C: {
    name: 'Full Helper',
    avatarHeight: 0.2, // 20% PiP
    helperHeight: 1, // 100%
  },
} as const;
