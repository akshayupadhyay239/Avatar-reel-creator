# Talking Head Avatar Reels - System Specification

## Overview

An automated video editing system built with Remotion that creates polished talking-head avatar reels from raw assets. The system intelligently combines avatar footage, helper videos, images, text overlays, and sound effects to produce engaging short-form content.

---

## Input Assets

### Required
| Asset | Format | Description |
|-------|--------|-------------|
| **Avatar Video** | `.mp4`, `.mov` | Uncut footage of avatar speaking the script |
| **Script** | `.txt` | Plain text file with the spoken content |

### Optional
| Asset | Format | Description |
|-------|--------|-------------|
| **Helper Videos** | `.mp4`, `.mov` | Supporting videos with descriptive filenames (e.g., `product-demo.mp4`, `app-walkthrough.mp4`) |
| **Images** | `.png`, `.jpg` | Supporting images with descriptive filenames |
| **SFX** | `.mp3`, `.wav` | 2-4 sound effects (click, swoosh, transition sounds) |
| **Background Music** | `.mp3`, `.wav` | Optional background track |

### Asset Organization
```
/assets
  /avatar
    raw-avatar.mp4
  /script
    script.txt
  /helpers
    product-demo.mp4
    feature-showcase.mp4
    app-walkthrough.mp4
  /images
    product-screenshot.png
    logo.png
    feature-diagram.png
  /sfx
    click.mp3
    swoosh.mp3
    transition.mp3
  /music
    background.mp3 (optional)
```

---

## Output Specification

| Property | Value |
|----------|-------|
| **Resolution** | 1080x1920 (9:16 vertical) |
| **Frame Rate** | 30 fps |
| **Duration** | Determined by processed avatar length |
| **Format** | `.mp4` (H.264) |

---

## Processing Pipeline

### Phase 1: Analysis & Preprocessing

#### 1.1 Script Analysis
- Parse script text into sentences/segments
- Identify key phrases, product names, important terms
- Generate keyword list for asset matching
- Estimate timing based on average speaking pace (~150 words/min)

#### 1.2 Avatar Video Processing
- **Silence Detection**: Identify pauses > 0.5s
- **Cut Point Detection**: Find natural cut points (breath pauses, sentence endings)
- **Auto-trim**: Remove long pauses, mistakes, dead air
- **Generate Timeline**: Create frame-accurate edit list

#### 1.3 Asset Matching
- Match helper videos/images to script segments via:
  - Filename keyword matching
  - Title relevance scoring
- Create asset-to-segment mapping

### Phase 2: Layout Planning

#### 2.1 Layout Types

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│                 │  │   Helper/Text   │  │                 │
│                 │  │     (60%)       │  │  Helper Video   │
│  Full Avatar    │  ├─────────────────┤  │   Full Canvas   │
│                 │  │     Avatar      │  │                 │
│                 │  │     (40%)       │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
    LAYOUT_A             LAYOUT_B             LAYOUT_C
   (Default)          (Split Screen)       (Full Helper)
```

**LAYOUT_A: Full Avatar**
- Avatar takes full canvas
- TikTok-style captions overlaid
- Use when: No relevant helper asset, emotional/personal moments

**LAYOUT_B: Split Screen**
- Avatar in bottom 40% (cropped to face)
- Helper content in top 60%
- Use when: Demonstrating features, showing examples

**LAYOUT_C: Full Helper**
- Helper video/image takes full canvas
- Avatar audio continues (voiceover)
- Small avatar PiP optional
- Use when: Complex visuals need full attention

#### 2.2 Layout Decision Rules

```
FOR each script segment:
  IF matching_helper_video EXISTS:
    IF segment.importance == "high":
      USE LAYOUT_C (full helper)
    ELSE:
      USE LAYOUT_B (split screen)
  ELSE IF segment.has_key_phrase AND no_visual_asset:
    USE LAYOUT_A + dynamic_text_overlay
  ELSE:
    USE LAYOUT_A (full avatar)
```

### Phase 3: Text & Caption System

#### 3.1 TikTok-Style Captions
- Word-by-word highlighting synced to audio
- Position: Center-bottom of avatar area
- Style: Bold, high contrast, subtle animation

#### 3.2 Dynamic Text Overlays
Triggered when:
- Important phrase detected (product names, features, CTAs)
- No visual asset available for the segment

**Text Overlay Styles:**
```
┌─────────────────┐
│   "PRODUCT X"   │  <- Primary (large, bold)
│    Feature Y    │  <- Secondary (smaller, lighter)
└─────────────────┘
```

- Font pairing: Bold sans-serif + Regular sans-serif
- Animation: Scale-in, fade, or slide
- Duration: 1.5-3 seconds per overlay

### Phase 4: Transitions & SFX

#### 4.1 Transition Types
| Type | Use Case | SFX |
|------|----------|-----|
| **Hard Cut** | Quick topic changes | Click sound |
| **Slide Left/Right** | New section intro | Swoosh |
| **Zoom Transition** | Emphasis moments | Impact sound |
| **Fade** | Emotional/soft moments | None or soft |

#### 4.2 Transition Rules
- Between LAYOUT_A segments: Hard cut (60%), Fade (40%)
- LAYOUT_A -> LAYOUT_B: Slide or Zoom
- LAYOUT_B -> LAYOUT_C: Fade or Slide
- Add SFX on 70% of transitions (avoid fatigue)

### Phase 5: Assembly & Rendering

#### 5.1 Timeline Assembly
1. Place processed avatar clips on base track
2. Overlay helper videos/images per layout plan
3. Add text overlays and captions
4. Insert transitions at cut points
5. Layer SFX on transitions
6. Add background music (if provided) at -20dB

#### 5.2 Final Output
- Render at 1080x1920 @ 30fps
- Export as MP4 (H.264, high quality)

---

## Component Architecture

```
src/
├── index.ts                 # Entry point
├── Root.tsx                 # Remotion root
├── Video.tsx                # Main composition
│
├── components/
│   ├── Avatar/
│   │   ├── AvatarFull.tsx       # Full-screen avatar
│   │   ├── AvatarBottom.tsx     # Bottom 40% avatar
│   │   └── AvatarPiP.tsx        # Picture-in-picture
│   │
│   ├── Layouts/
│   │   ├── LayoutA.tsx          # Full avatar layout
│   │   ├── LayoutB.tsx          # Split screen layout
│   │   └── LayoutC.tsx          # Full helper layout
│   │
│   ├── Text/
│   │   ├── Captions.tsx         # TikTok-style captions
│   │   ├── DynamicText.tsx      # Key phrase overlays
│   │   └── TextStyles.ts        # Font configs
│   │
│   ├── Transitions/
│   │   ├── HardCut.tsx
│   │   ├── SlideTransition.tsx
│   │   ├── ZoomTransition.tsx
│   │   └── FadeTransition.tsx
│   │
│   └── Helpers/
│       ├── HelperVideo.tsx      # Helper video component
│       └── HelperImage.tsx      # Helper image component
│
├── processing/
│   ├── scriptParser.ts          # Parse & analyze script
│   ├── silenceDetector.ts       # Detect pauses in avatar
│   ├── assetMatcher.ts          # Match assets to script
│   ├── layoutPlanner.ts         # Decide layouts per segment
│   └── timelineBuilder.ts       # Build final timeline
│
├── types/
│   └── index.ts                 # TypeScript interfaces
│
└── utils/
    ├── audio.ts                 # Audio utilities
    ├── timing.ts                # Frame/time calculations
    └── keywords.ts              # Keyword extraction
```

---

## Data Structures

### Script Segment
```typescript
interface ScriptSegment {
  id: string;
  text: string;
  startFrame: number;
  endFrame: number;
  keywords: string[];
  importance: 'low' | 'medium' | 'high';
  hasKeyPhrase: boolean;
}
```

### Timeline Item
```typescript
interface TimelineItem {
  segmentId: string;
  layout: 'A' | 'B' | 'C';
  avatarClip: {
    src: string;
    startFrame: number;
    endFrame: number;
    crop?: CropConfig;
  };
  helperAsset?: {
    type: 'video' | 'image';
    src: string;
  };
  textOverlay?: {
    primary: string;
    secondary?: string;
    style: TextStyle;
  };
  transition: {
    type: 'cut' | 'slide' | 'zoom' | 'fade';
    sfx?: string;
  };
}
```

### Project Config
```typescript
interface ProjectConfig {
  fps: 30;
  width: 1080;
  height: 1920;
  assets: {
    avatar: string;
    script: string;
    helpers: string[];
    images: string[];
    sfx: string[];
    music?: string;
  };
  settings: {
    silenceThreshold: number;      // Default: 0.5s
    minClipDuration: number;       // Default: 1s
    transitionSfxProbability: number; // Default: 0.7
    musicVolume: number;           // Default: -20dB
  };
}
```

---

## Open Questions / Future Considerations

1. **Transcription**: Should system auto-transcribe avatar audio for precise caption timing, or rely on script text + estimation?

2. **AI Enhancement**: Could integrate AI for:
   - Smarter keyword extraction
   - Better asset-to-script matching
   - Automatic importance scoring

3. **Preview Mode**: Should there be a quick preview with lower quality for faster iteration?

4. **Manual Overrides**: Allow user to specify exact timestamps for layout changes?

5. **Template Variants**: Different visual styles (minimal, energetic, corporate)?

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up project structure
- [ ] Create basic layouts (A, B, C)
- [ ] Implement avatar components
- [ ] Basic rendering pipeline

### Phase 2: Processing
- [ ] Script parser
- [ ] Silence detection
- [ ] Asset matching logic
- [ ] Layout decision engine

### Phase 3: Polish
- [ ] TikTok-style captions
- [ ] Dynamic text overlays
- [ ] Transitions with SFX
- [ ] Background music integration

### Phase 4: Refinement
- [ ] Fine-tune timing
- [ ] Add more transition styles
- [ ] Performance optimization
- [ ] Documentation

---

## Notes

- Keep components modular for easy style customization
- Prioritize smooth playback in Remotion Studio for editing
- Consider memory usage with large video files
