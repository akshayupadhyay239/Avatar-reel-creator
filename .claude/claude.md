# Avatar Reels System - Agent Guide

## System Overview

This is an automated video editing system built with Remotion that creates polished talking-head avatar reels. The system intelligently combines avatar footage, helper videos, images, text overlays, and sound effects to produce engaging short-form content.

**Output**: 1080x1920 (9:16 vertical) @ 30fps MP4

## Quick Start - Creating a New Video

To create a new video, you only need to:

1. **Add assets** to `public/assets/`:
   - `avatar/` - Avatar video file(s)
   - `helpers/` - Supporting videos (use descriptive kebab-case names like `product-demo.mp4`)
   - `images/` - Supporting images
   - `sfx/` - Sound effects (`click.wav`, `swoosh.wav`)
   - `script/script.txt` - The spoken script

2. **Create a pipeline config** in `Root.tsx`:
```typescript
const myVideoResult = runPipeline({
  scriptText: "Your script here...",
  avatarSrc: staticFile('assets/avatar/my-avatar.mp4'),
  avatarDurationSeconds: 10.5, // Get from ffprobe
  helperVideoPaths: [
    staticFile('assets/helpers/demo-video.mp4'),
    // ... more helpers
  ],
  helperImagePaths: [
    staticFile('assets/images/product-shot.png'),
  ],
  sfxPaths: {
    click: staticFile('assets/sfx/click.wav'),
    swoosh: staticFile('assets/sfx/swoosh.wav'),
  },
  config: projectConfig,
});
```

3. **Add a Composition**:
```typescript
<Composition
  id="MyNewVideo"
  component={Video}
  durationInFrames={myVideoResult.timeline.totalDurationFrames}
  fps={30}
  width={1080}
  height={1920}
  schema={videoSchema}
  defaultProps={{
    timeline: myVideoResult.timeline,
    config: projectConfig,
  }}
/>
```

4. **Preview**: `npm run dev` → Select your composition
5. **Render**: `npx remotion render MyNewVideo out/my-video.mp4`

## Asset Naming Convention

Helper asset filenames are parsed for keywords to match with script segments:
- `bitcoin-mining-heat.mp4` → keywords: [bitcoin, mining, heat]
- `product-demo-walkthrough.mp4` → keywords: [product, demo, walkthrough]

**Tips for better matching:**
- Use descriptive, keyword-rich filenames
- Include product names, actions, concepts
- Use kebab-case (dashes between words)

## Architecture

```
src/
├── components/
│   ├── Avatar/          # AvatarFull, AvatarBottom, AvatarPiP
│   ├── Layouts/         # LayoutA (full), LayoutB (split), LayoutC (helper+PiP)
│   ├── Text/            # Captions (TikTok-style), DynamicText (overlays)
│   ├── Transitions/     # Fade, Slide, Zoom transitions
│   └── Helpers/         # HelperVideo, HelperImage
│
├── processing/          # The automated pipeline
│   ├── pipeline.ts      # Main orchestrator - runPipeline()
│   ├── scriptParser.ts  # Splits script → segments with keywords
│   ├── assetMatcher.ts  # Matches assets to segments
│   ├── layoutPlanner.ts # Decides layout per segment
│   ├── silenceDetector.ts # (Optional) Trim silences
│   └── timelineBuilder.ts # Assembles final timeline
│
├── types/index.ts       # All TypeScript interfaces
├── utils/               # Timing, keyword utilities
├── Video.tsx            # Main composition renderer
└── Root.tsx             # Composition definitions
```

## Layout System

| Layout | Use Case | Avatar | Helper |
|--------|----------|--------|--------|
| **A** | Default, emotional moments | 100% full screen | None |
| **B** | Demonstrating features | Bottom 40% | Top 60% |
| **C** | Complex visuals need attention | Small PiP | 100% full screen |

**Automatic layout selection:**
- Has matching asset + high importance → Layout C
- Has matching asset → Layout B
- No asset / key phrase only → Layout A with text overlay

## Processing Pipeline

The pipeline runs automatically when you call `runPipeline()`:

1. **Script Parser**: Splits text into segments (5-15 words each), extracts keywords, determines importance
2. **Silence Detector**: (Optional) Finds pauses in avatar video for auto-trimming
3. **Asset Matcher**: Matches helper videos/images to segments via keyword relevance
4. **Layout Planner**: Decides A/B/C layout per segment, chooses transitions
5. **Timeline Builder**: Assembles everything into a renderable Timeline

## Configuration Options

### Project Config
```typescript
const config: ProjectConfig = {
  fps: 30,
  width: 1080,
  height: 1920,
  assets: { /* paths */ },
  settings: {
    silenceThreshold: 0.5,      // seconds
    minClipDuration: 1.0,       // seconds
    transitionSfxProbability: 0.7,
    musicVolume: -20,           // dB
    captionStyle: { /* fonts, colors */ },
  },
};
```

### Parser Options
```typescript
parseScript(text, {
  fps: 30,
  totalDurationFrames: 300,
  minSegmentWords: 5,   // Minimum words per segment
  maxSegmentWords: 15,  // Maximum words per segment (smaller = more segments)
});
```

### Asset Matcher Options
```typescript
matchAssetsToSegments(segments, assets, {
  minRelevanceScore: 0.15,  // Lower = more matches (0-1)
  maxAssetsPerSegment: 1,
  allowAssetReuse: true,    // Same asset can match multiple segments
});
```

## Customization Patterns

### Transition Types
Available transitions:
- `cut` - Instant cut (no animation)
- `fade` - Opacity fade
- `slide-left` / `slide-right` - Slide with spring physics
- `zoom` - Scale in/out with fade
- `wipe-left` / `wipe-right` - Reveal wipe effect
- `flash` - White flash between scenes (energetic)
- `none` - No transition

### Add a new transition style
1. Create `src/components/Transitions/MyTransition.tsx`
2. Export from `src/components/Transitions/index.ts`
3. Add type to `TransitionType` in `types/index.ts`
4. Handle in `layoutPlanner.ts` transition selection

### Add a new layout variant
1. Create `src/components/Layouts/LayoutD.tsx`
2. Export from `src/components/Layouts/index.ts`
3. Add to `LayoutType` union in `types/index.ts`
4. Handle in `Video.tsx` renderLayout switch
5. Add decision rules in `layoutPlanner.ts`

### Caption Styles
Available presets in `CAPTION_STYLES`:
- `tiktok` - Classic TikTok gold highlight
- `youtube` - YouTube red accent
- `viral` - Large centered green highlight (for single-word mode)
- `energetic` - Red glow effect
- `minimal` - Clean, no background
- `clean` - Blue accent, transparent

**Single-word viral mode** (shows one word at a time):
```tsx
<Captions data={item.caption} singleWordMode={true} />
```

**Karaoke mode** (highlights words in a sentence):
```tsx
<KaraokeCaptions data={item.caption} />
```

### Custom caption styles
Edit `src/components/Text/TextStyles.ts`:
```typescript
export const CAPTION_STYLES = {
  tiktok: { /* current style */ },
  myStyle: {
    font: { family: 'Inter', size: 48, weight: 700, color: '#FFFFFF', shadow: '...' },
    highlightColor: '#00FF00',
    backgroundColor: 'rgba(0,0,0,0.6)',
    position: 'bottom', // 'top' | 'center' | 'bottom'
    maxWidth: 900,
  },
};
```

### Manual timeline override
Skip the pipeline and build a timeline manually:
```typescript
const manualTimeline: Timeline = {
  totalDurationFrames: 300,
  items: [
    {
      id: 'item-1',
      layout: 'B',
      avatarClip: { src: '...', startFrame: 0, endFrame: 150, ... },
      helperAsset: { type: 'video', src: '...', ... },
      caption: { words: [...], style: CAPTION_STYLES.tiktok },
      transition: { type: 'slide-left', durationFrames: 8, ... },
    },
    // ... more items
  ],
};
```

## Useful Commands

```bash
# Preview in browser
npm run dev

# List all compositions
npx remotion compositions

# Render specific composition
npx remotion render SuperheatReel out/superheat.mp4

# Render with custom settings
npx remotion render SuperheatReel out/superheat.mp4 --codec h264 --crf 18

# Get video duration (for avatarDurationSeconds)
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.mp4
```

## Troubleshooting

**No assets matching segments:**
- Check filename keywords match script content
- Lower `minRelevanceScore` in pipeline options
- Use more descriptive asset filenames

**Segments too long/short:**
- Adjust `minSegmentWords` / `maxSegmentWords` in parser options
- Check script has proper punctuation (periods, question marks)

**Captions out of sync:**
- Ensure `avatarDurationSeconds` matches actual video duration
- Check `totalDurationFrames` calculation: `seconds * fps`

**Layout not what expected:**
- Check segment importance scoring in `layoutPlanner.ts`
- Review asset match relevance scores in pipeline output
- Can manually override layout in timeline

## Key Files to Modify

| Task | File(s) |
|------|---------|
| Add new video | `Root.tsx` |
| Change caption style | `components/Text/TextStyles.ts`, `components/Text/Captions.tsx` |
| Adjust matching logic | `processing/assetMatcher.ts` |
| Change layout rules | `processing/layoutPlanner.ts` |
| Add transitions | `components/Transitions/`, `processing/layoutPlanner.ts` |
| Modify segment parsing | `processing/scriptParser.ts` |
