import { STYLE_THRESHOLDS } from './presets.js';

/**
 * Pure automatic style selector (Section 6.3).
 * Rules (first match wins):
 * 1. Two buckets each > 0.25 and dark background (darkFraction > 0.5) -> 'duet'
 * 2. Three buckets each > 0.15 -> 'layers'
 * 3. darkFraction > 0.7 and brightPointDensity < 0.1 -> 'sparkle'
 * 4. edgeDensity high and smooth gradients (brightPointDensity < 0.15) -> 'flow'
 * 5. Otherwise -> 'field'
 */
export function selectStyle(summary, thresholds = STYLE_THRESHOLDS) {
  const { darkFraction, brightPointDensity, bucketShare, edgeDensity } = summary;
  const shares = [bucketShare.warm, bucketShare.mid, bucketShare.cool];

  const bucketsOverDuet = shares.filter((v) => v >= thresholds.duetMinBucketShare).length;
  if (
    bucketsOverDuet >= 2 &&
    darkFraction >= thresholds.duetMinDarkFraction &&
    brightPointDensity >= (thresholds.duetMinBrightDensity || 0)
  ) {
    return 'duet';
  }

  const bucketsOverLayers = shares.filter((v) => v >= thresholds.layersMinBucketShare).length;
  if (bucketsOverLayers === 3) {
    return 'layers';
  }

  if (darkFraction >= thresholds.sparkleMinDarkFraction && brightPointDensity <= thresholds.sparkleMaxBrightDensity) {
    return 'sparkle';
  }

  if (edgeDensity >= thresholds.flowMinEdgeDensity && brightPointDensity <= thresholds.flowMaxBrightDensity) {
    return 'flow';
  }

  return 'field';
}
