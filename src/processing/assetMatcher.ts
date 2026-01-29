// ============================================
// Asset Matcher
// Matches helper assets to script segments via keyword analysis
// ============================================

import type { ScriptSegment, HelperAsset, AssetMatch } from '../types';
import { normalizeWord } from '../utils/keywords';

export interface AssetMatcherOptions {
  minRelevanceScore: number;  // Minimum score to consider a match (0-1)
  maxAssetsPerSegment: number; // Maximum assets to match per segment
  allowAssetReuse: boolean;   // Allow same asset to match multiple segments
}

const DEFAULT_OPTIONS: AssetMatcherOptions = {
  minRelevanceScore: 0.15,    // Lower threshold for more matches
  maxAssetsPerSegment: 1,
  allowAssetReuse: true,      // Allow reuse by default
};

export interface AssetMatchResult {
  matches: AssetMatch[];
  unmatchedSegments: string[];  // Segment IDs with no matches
  unmatchedAssets: string[];    // Asset sources not used
}

/**
 * Parse keywords from a filename
 * e.g., "product-demo-walkthrough.mp4" -> ["product", "demo", "walkthrough"]
 */
export const extractKeywordsFromFilename = (filename: string): string[] => {
  // Remove extension and path
  const basename = filename.split('/').pop()?.replace(/\.[^.]+$/, '') || '';

  // Split on common separators
  const parts = basename.split(/[-_\s]+/);

  // Filter and normalize
  return parts
    .map((p) => normalizeWord(p))
    .filter((p) => p.length >= 3);
};

/**
 * Create a HelperAsset from a file path
 */
export const createHelperAssetFromPath = (
  filePath: string,
  type: 'video' | 'image'
): HelperAsset => {
  const keywords = extractKeywordsFromFilename(filePath);
  const basename = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || filePath;

  // Convert filename to title (capitalize, replace separators with spaces)
  const title = basename
    .split(/[-_]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return {
    type,
    src: filePath,
    title,
    keywords,
    fit: 'cover',
  };
};

/**
 * Match assets to script segments
 */
export const matchAssetsToSegments = (
  segments: ScriptSegment[],
  assets: HelperAsset[],
  options: Partial<AssetMatcherOptions> = {}
): AssetMatchResult => {
  const { minRelevanceScore, maxAssetsPerSegment, allowAssetReuse } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const matches: AssetMatch[] = [];
  const usedAssets = new Set<string>();
  const matchedSegments = new Set<string>();

  // Score all segment-asset pairs
  const allScores: {
    segmentId: string;
    asset: HelperAsset;
    score: number;
    matchedKeywords: string[];
  }[] = [];

  for (const segment of segments) {
    for (const asset of assets) {
      const { score, matchedKeywords } = calculateAssetRelevance(segment, asset);

      if (score >= minRelevanceScore) {
        allScores.push({
          segmentId: segment.id,
          asset,
          score,
          matchedKeywords,
        });
      }
    }
  }

  // Sort by score descending
  allScores.sort((a, b) => b.score - a.score);

  // Greedy assignment: highest scores first, respecting constraints
  for (const { segmentId, asset, score, matchedKeywords } of allScores) {
    // Count how many assets already matched to this segment
    const segmentMatchCount = matches.filter((m) => m.segmentId === segmentId).length;

    if (segmentMatchCount >= maxAssetsPerSegment) {
      continue;
    }

    // Check if asset already used (skip if reuse not allowed)
    if (!allowAssetReuse && usedAssets.has(asset.src)) {
      continue;
    }

    // Even with reuse, don't match same asset to same segment twice
    const alreadyMatchedToSegment = matches.some(
      (m) => m.segmentId === segmentId && m.asset.src === asset.src
    );
    if (alreadyMatchedToSegment) {
      continue;
    }

    matches.push({
      segmentId,
      asset,
      relevanceScore: score,
      matchedKeywords,
    });

    usedAssets.add(asset.src);
    matchedSegments.add(segmentId);
  }

  // Find unmatched
  const unmatchedSegments = segments
    .filter((s) => !matchedSegments.has(s.id))
    .map((s) => s.id);

  const unmatchedAssets = assets
    .filter((a) => !usedAssets.has(a.src))
    .map((a) => a.src);

  return {
    matches,
    unmatchedSegments,
    unmatchedAssets,
  };
};

/**
 * Calculate relevance between a segment and asset
 */
const calculateAssetRelevance = (
  segment: ScriptSegment,
  asset: HelperAsset
): { score: number; matchedKeywords: string[] } => {
  const segmentKeywords = segment.keywords;
  const assetKeywords = asset.keywords;

  // Direct keyword matches
  const matchedKeywords: string[] = [];
  let directMatches = 0;
  let partialMatches = 0;

  for (const segKw of segmentKeywords) {
    for (const assetKw of assetKeywords) {
      if (segKw === assetKw) {
        directMatches++;
        matchedKeywords.push(segKw);
      } else if (segKw.includes(assetKw) || assetKw.includes(segKw)) {
        partialMatches++;
        if (!matchedKeywords.includes(segKw)) {
          matchedKeywords.push(segKw);
        }
      }
    }
  }

  // Check if asset title words appear in segment text
  const titleWords = asset.title.toLowerCase().split(/\s+/);
  const segmentTextLower = segment.text.toLowerCase();
  let titleMatches = 0;

  for (const word of titleWords) {
    if (word.length >= 4 && segmentTextLower.includes(word)) {
      titleMatches++;
    }
  }

  // Calculate composite score
  const maxPossible = Math.max(segmentKeywords.length, assetKeywords.length, 1);
  const directScore = directMatches / maxPossible;
  const partialScore = (partialMatches * 0.5) / maxPossible;
  const titleScore = titleMatches / Math.max(titleWords.length, 1);

  // Weighted combination
  const score = Math.min(
    directScore * 0.6 + partialScore * 0.25 + titleScore * 0.15,
    1.0
  );

  return { score, matchedKeywords: [...new Set(matchedKeywords)] };
};

/**
 * Get the best matching asset for a segment
 */
export const getBestAssetForSegment = (
  segment: ScriptSegment,
  assets: HelperAsset[],
  minScore: number = 0.2
): HelperAsset | null => {
  let bestAsset: HelperAsset | null = null;
  let bestScore = 0;

  for (const asset of assets) {
    const { score } = calculateAssetRelevance(segment, asset);
    if (score > bestScore && score >= minScore) {
      bestScore = score;
      bestAsset = asset;
    }
  }

  return bestAsset;
};

/**
 * Create HelperAsset array from file paths
 */
export const createAssetsFromPaths = (
  videoPaths: string[],
  imagePaths: string[]
): HelperAsset[] => {
  const videoAssets = videoPaths.map((p) => createHelperAssetFromPath(p, 'video'));
  const imageAssets = imagePaths.map((p) => createHelperAssetFromPath(p, 'image'));
  return [...videoAssets, ...imageAssets];
};
