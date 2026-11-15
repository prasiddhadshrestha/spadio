import { STYLE_THRESHOLDS, StyleId } from './presets';
import { AnalysisSummary } from './analyzer';

/**
 * Pure automatic style selector from backend-js.
 * Rules (first match wins):
 * 1. Two buckets each >= 0.25 and dark background (darkFraction >= 0.5) -> 'duet'
 * 2. Three buckets each >= 0.05 -> 'layers'
 * 3. darkFraction >= 0.55 and brightPointDensity <= 0.1 -> 'sparkle'
 * 4. edgeDensity >= 0.04 and brightPointDensity <= 0.15 -> 'flow'
 * 5. Otherwise -> 'field'
 */
export function selectStyle(
  summary: AnalysisSummary,
  thresholds = STYLE_THRESHOLDS
): Exclude<StyleId, 'auto'> {
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

  if (
    darkFraction >= thresholds.sparkleMinDarkFraction &&
    brightPointDensity <= thresholds.sparkleMaxBrightDensity
  ) {
    return 'sparkle';
  }

  if (
    edgeDensity >= thresholds.flowMinEdgeDensity &&
    brightPointDensity <= thresholds.flowMaxBrightDensity
  ) {
    return 'flow';
  }

  return 'field';
}
