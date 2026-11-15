import {
  BAND_COUNT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ScanMode,
  EarthFeatureType,
  FEATURE_COLORS,
} from './presets';

export interface Hotspot {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  luma: number;
  frac: number;
  feature?: EarthFeatureType;
}

export interface LineVoiceData {
  sliceIndex: number;
  y: number;
  pitchIndex: number;
  brightness: number;
  peakBrightness: number;
  salience: number;
  coverage: number;
  hue: number;
  warm: number;
  mid: number;
  cool: number;
  feature: EarthFeatureType;
  featureColor: string;
}

export interface BandData {
  index: number;
  brightness: number;
  coverage: number;
  peakBrightness: number;
  peakY: number;
  dominantFeature: EarthFeatureType;
  featureColor: string;
  salience: number;
  hue: number;
  coloredFraction: number;
  warm: number;
  mid: number;
  cool: number;
  warmPeakY: number;
  coolPeakY: number;
  warmPeakB: number;
  coolPeakB: number;
  edge: number;
  hotspots: Hotspot[];
  lineVoices: LineVoiceData[];
  imagePitchShift?: number;
  delta: number;
  deltaBrightness: number;
  deltaCoverage: number;
  oceanPeakY: number;
  vegPeakY: number;
  desertPeakY: number;
  precipPeakY: number;
  cloudPeakY: number;
}

export interface AnalysisSummary {
  darkFraction: number;
  brightPointDensity: number;
  bucketShare: {
    warm: number;
    mid: number;
    cool: number;
  };
  edgeDensity: number;
  keySemitoneOffset?: number;
}

export interface AnalysisResult {
  bands: BandData[];
  maxBrightness: number;
  summary: AnalysisSummary;
}

export function rgbToHue(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

export function classifyColorFamily(r: number, g: number, b: number): 'warm' | 'cool' | 'neutral' {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx ? (mx - mn) / mx : 0;
  if (sat < 0.22) return 'neutral';
  const h = rgbToHue(r, g, b);
  if (h < 68 || h > 315) return 'warm';
  if (h >= 150 && h <= 275) return 'cool';
  return h < 150 ? 'warm' : 'cool';
}

export interface AnalyzeOptions {
  bandCount?: number;
  scanMode?: ScanMode;
  prevFrameBands?: BandData[] | null;
}

/**
 * Pure pixel-to-feature analyzer ported from backend-js.
 * Analyzes an RGBA pixel buffer into N meridian or directional bands.
 */
export function analyzeImageData(
  data: Uint8ClampedArray | Uint8Array,
  width: number = CANVAS_WIDTH,
  height: number = CANVAS_HEIGHT,
  options: AnalyzeOptions = {}
): AnalysisResult {
  const N = options.bandCount || BAND_COUNT;
  const scanMode = options.scanMode || 'lr';
  const prevBands = options.prevFrameBands || null;

  const bands: BandData[] = [];
  let maxBrightness = 0.01;
  let darkPx = 0;
  let brightPx = 0;
  let totalPx = 0;
  let totWarm = 0;
  let totMid = 0;
  let totCool = 0;
  let totColored = 0;

  for (let n = 0; n < N; n++) {
    let sb = 0, cnt = 0, cov = 0, hx = 0, hy = 0, hn = 0;
    let mb = 0, my = 0, w = 0, m = 0, c = 0;
    let wb = 0, cb = 0, wy = 0, cy = 0;
    let bestSpot: Hotspot | null = null;
    let secondSpot: Hotspot | null = null;

    // Feature salience tracking
    let maxSalience = -1;
    let bestFeature: EarthFeatureType = 'ocean';
    let salientY = height * 0.5;

    const featureCounts: Record<EarthFeatureType, number> = {
      ocean: 0,
      vegetation: 0,
      desert: 0,
      precipitation: 0,
      coastal: 0,
      atmosphere: 0,
      cryosphere: 0,
    };
    const featureBestSalience: Record<EarthFeatureType, number> = {
      ocean: -1,
      vegetation: -1,
      desert: -1,
      precipitation: -1,
      coastal: -1,
      atmosphere: -1,
      cryosphere: -1,
    };
    const featureBestY: Record<EarthFeatureType, number> = {
      ocean: height * 0.5,
      vegetation: height * 0.5,
      desert: height * 0.5,
      precipitation: height * 0.5,
      coastal: height * 0.5,
      atmosphere: height * 0.5,
      cryosphere: height * 0.5,
    };

    const LINE_SLICE_COUNT = 10;
    const slices = Array.from({ length: LINE_SLICE_COUNT }, (_, s) => ({
      sb: 0,
      cnt: 0,
      cov: 0,
      maxLuma: 0,
      maxSalience: -1,
      bestY: ((s + 0.5) / LINE_SLICE_COUNT) * height,
      bestFeature: 'ocean' as EarthFeatureType,
      hx: 0,
      hy: 0,
      hn: 0,
      w: 0,
      m: 0,
      c: 0,
    }));

    const x0 = scanMode === 'tb' ? 0 : Math.floor((n * width) / N);
    const x1 = scanMode === 'tb' ? width : Math.floor(((n + 1) * width) / N);
    const y0 = scanMode === 'tb' ? Math.floor((n * height) / N) : 0;
    const y1 = scanMode === 'tb' ? Math.floor(((n + 1) * height) / N) : height;

    const fullScan = scanMode === 'rad' || scanMode === 'radar';
    const xStart = fullScan ? 0 : x0;
    const xEnd = fullScan ? width : x1;
    const yStart = fullScan ? 0 : y0;
    const yEnd = fullScan ? height : y1;

    for (let x = xStart; x < xEnd; x += 2) {
      for (let y = yStart; y < yEnd; y += 3) {
        let posMetric = y;
        let bandFrac = (x / width) * N - n;
        if (scanMode === 'tb') {
          bandFrac = (y / height) * N - n;
        } else if (scanMode === 'rl') {
          bandFrac = 1 - ((x / width) * N - n);
        } else if (scanMode === 'rad') {
          const dx = (x - width / 2) / (width / 2);
          const dy = (y - height / 2) / (height / 2);
          const rNorm = Math.sqrt(dx * dx + dy * dy);
          if (rNorm < n / N || rNorm >= (n + 1) / N) continue;
          bandFrac = rNorm * N - n;
        } else if (scanMode === 'radar') {
          const dx = x - width / 2;
          const dy = y - height / 2;
          const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
          const sector = Math.floor((angle / (Math.PI * 2)) * N);
          if (sector !== n) continue;
          bandFrac = (angle / (Math.PI * 2)) * N - n;
          const maxR = Math.hypot(width / 2, height / 2);
          const rDist = Math.hypot(dx, dy) / maxR;
          posMetric = (1 - Math.min(1, rDist)) * height;
        }
        bandFrac = Math.max(0, Math.min(0.99, bandFrac));

        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        const h = rgbToHue(r, g, b);

        const isTopOrBottomZone = y < height * 0.22 || y > height * 0.78;
        const isWhiteOrAchromatic =
          (luma > 0.48 && sat < 0.28) ||
          (r > 155 && g > 155 && b > 155 && sat < 0.32) ||
          (luma > 0.72 && sat < 0.22);

        // Ignore white / near-white pixels in the top and bottom regions (polar ice, snow bands, white borders)
        if (isTopOrBottomZone && isWhiteOrAchromatic) {
          continue;
        }

        // Ignore washed-out pure white pixels anywhere on the line
        if (luma > 0.80 && sat < 0.18) {
          continue;
        }

        sb += luma;
        cnt++;
        totalPx++;
        if (luma < 0.08) darkPx++;
        if (luma > 0.6) brightPx++;
        if (luma > 0.2) cov++;
        if (luma > mb) {
          mb = luma;
          my = posMetric;
        }

        // Earth Feature Classification & Multi-Feature Acoustic Salience
        let pxFeature: EarthFeatureType = 'ocean';
        let salience = 0;

        if (
          sat > 0.38 &&
          luma > 0.18 &&
          (h > 310 || h < 22 || (sat > 0.52 && h < 55))
        ) {
          // Precipitation Radar / Extreme Storm Core
          pxFeature = 'precipitation';
          salience = 0.38 + sat * 0.42 + luma * 0.2;
        } else if (h >= 65 && h <= 165 && sat > 0.15 && luma > 0.12 && luma < 0.72) {
          // Vegetation Canopy / Rainforest / Biosphere
          pxFeature = 'vegetation';
          salience = 0.34 + sat * 0.42 + (g / 255) * 0.24;
        } else if (h >= 22 && h < 65 && sat >= 0.18 && luma >= 0.28 && luma <= 0.78) {
          // Desert Sands / Arid Thermal Ridge
          pxFeature = 'desert';
          salience = 0.32 + sat * 0.38 + luma * 0.22;
        } else if (h >= 145 && h < 195 && sat > 0.18 && luma >= 0.22 && luma <= 0.65) {
          // Coastal Shelf / Marine Margin
          pxFeature = 'coastal';
          salience = 0.32 + sat * 0.4 + luma * 0.22;
        } else if (
          (h >= 170 && h <= 265 && sat > 0.12 && luma > 0.06) ||
          (b > r + 10 && luma >= 0.06 && luma < 0.55)
        ) {
          // Ocean Basin / Deep Currents
          pxFeature = 'ocean';
          salience = 0.26 + sat * 0.35 + (b / 255) * 0.28 + Math.max(0, 0.22 - Math.abs(luma - 0.22));
        } else if (luma > 0.58 && sat < 0.22) {
          // Atmospheric Cloud Swirl (heavily dampened so white/gray clouds do not dominate)
          pxFeature = 'atmosphere';
          salience = isTopOrBottomZone ? 0 : 0.12 + luma * 0.15;
        } else {
          // Neutral terrain or water
          pxFeature = 'ocean';
          salience = luma * 0.3;
        }

        featureCounts[pxFeature]++;
        if (salience > featureBestSalience[pxFeature]) {
          featureBestSalience[pxFeature] = salience;
          featureBestY[pxFeature] = posMetric;
        }

        const sliceIdx = Math.max(
          0,
          Math.min(LINE_SLICE_COUNT - 1, Math.floor((posMetric / Math.max(1, height)) * LINE_SLICE_COUNT))
        );
        const slice = slices[sliceIdx];
        slice.sb += luma;
        slice.cnt++;
        if (luma > 0.16) slice.cov++;
        if (luma > slice.maxLuma) slice.maxLuma = luma;
        if (salience > slice.maxSalience) {
          slice.maxSalience = salience;
          slice.bestY = posMetric;
          slice.bestFeature = pxFeature;
        }
        if (sat > 0.25 && luma > 0.12) {
          slice.hx += Math.cos((h * Math.PI) / 180);
          slice.hy += Math.sin((h * Math.PI) / 180);
          slice.hn++;
          if (h < 50 || h > 330) slice.w++;
          else if (h < 170) slice.m++;
          else slice.c++;
        }

        if (salience > maxSalience) {
          maxSalience = salience;
          bestFeature = pxFeature;
          salientY = posMetric;
        }

        if (salience > 0.42) {
          if (!bestSpot || salience > bestSpot.luma) {
            if (bestSpot && Math.hypot(x - bestSpot.x, y - bestSpot.y) > 22) {
              secondSpot = bestSpot;
            }
            bestSpot = { x, y, r, g, b, luma: salience, frac: bandFrac, feature: pxFeature };
          } else if (
            Math.hypot(x - bestSpot.x, y - bestSpot.y) > 22 &&
            (!secondSpot || salience > secondSpot.luma)
          ) {
            secondSpot = { x, y, r, g, b, luma: salience, frac: bandFrac, feature: pxFeature };
          }
        }

        if (sat > 0.35 && luma > 0.18) {
          hx += Math.cos((h * Math.PI) / 180);
          hy += Math.sin((h * Math.PI) / 180);
          hn++;
          totColored++;
          if (h < 50 || h > 330) {
            w++;
            totWarm++;
            if (luma > wb) { wb = luma; wy = posMetric; }
          } else if (h < 170) {
            m++;
            totMid++;
          } else {
            c++;
            totCool++;
            if (luma > cb) { cb = luma; cy = posMetric; }
          }
        }
      }
    }

    const brightness = cnt ? sb / cnt : 0;
    const coverage = cnt ? cov / cnt : 0;
    if (brightness > maxBrightness) maxBrightness = brightness;

    const prevBand = n > 0 ? bands[n - 1] : null;
    const edge = prevBand
      ? Math.abs(brightness - prevBand.brightness) + Math.abs(coverage - prevBand.coverage)
      : 0;

    const prevFrame = prevBands && prevBands[n] ? prevBands[n] : null;
    const deltaBrightness = prevFrame ? brightness - prevFrame.brightness : 0;
    const deltaCoverage = prevFrame ? coverage - prevFrame.coverage : 0;

    const hotspots: Hotspot[] = [];
    if (bestSpot) hotspots.push(bestSpot);
    if (secondSpot) hotspots.push(secondSpot);

    const lineVoices: LineVoiceData[] = [];
    for (let s = 0; s < LINE_SLICE_COUNT; s++) {
      const slice = slices[s];
      if (!slice.cnt) continue;
      if (slice.bestFeature === 'cryosphere') continue;
      const isEdgePolarSlice = s <= 1 || s >= LINE_SLICE_COUNT - 2;
      if (isEdgePolarSlice && (slice.bestFeature === 'atmosphere' || slice.hn / slice.cnt < 0.22)) {
        continue;
      }
      const sBrightness = slice.sb / slice.cnt;
      const sCoverage = slice.cov / slice.cnt;
      const sSalience = slice.maxSalience > 0 ? slice.maxSalience : sBrightness;
      if (sBrightness > 0.02 || slice.maxLuma > 0.06 || sSalience > 0.08) {
        const yNorm = height > 0 ? slice.bestY / height : (s + 0.5) / LINE_SLICE_COUNT;
        if (yNorm < 0.16 || yNorm > 0.84) continue;
        lineVoices.push({
          sliceIndex: s,
          y: Math.max(0.16, Math.min(0.84, yNorm)),
          pitchIndex: LINE_SLICE_COUNT - 1 - s,
          brightness: sBrightness,
          peakBrightness: slice.maxLuma,
          salience: sSalience,
          coverage: sCoverage,
          hue: slice.hn ? ((Math.atan2(slice.hy, slice.hx) * 180) / Math.PI + 360) % 360 : 0,
          warm: (slice.w / slice.cnt) * 8,
          mid: (slice.m / slice.cnt) * 8,
          cool: (slice.c / slice.cnt) * 8,
          feature: slice.bestFeature,
          featureColor: FEATURE_COLORS[slice.bestFeature] || '#38bdf8',
        });
      }
    }

    const allFeatures: EarthFeatureType[] = [
      'precipitation',
      'vegetation',
      'desert',
      'coastal',
      'ocean',
    ];
    for (const feat of allFeatures) {
      if (featureCounts[feat] > 0 && featureBestSalience[feat] > 0.2) {
        const featY = height > 0 ? featureBestY[feat] / height : 0.5;
        if (featY < 0.16 || featY > 0.84) continue;
        const alreadyCovered = lineVoices.some(
          (v) => v.feature === feat && Math.abs(v.y - featY) < 0.12
        );
        if (!alreadyCovered) {
          const sIdx = Math.max(0, Math.min(LINE_SLICE_COUNT - 1, Math.floor(featY * LINE_SLICE_COUNT)));
          lineVoices.push({
            sliceIndex: sIdx,
            y: Math.max(0.16, Math.min(0.84, featY)),
            pitchIndex: Math.max(0, Math.min(9, Math.floor((1 - featY) * 9.99))),
            brightness: Math.max(brightness, featureBestSalience[feat] * 0.7),
            peakBrightness: featureBestSalience[feat],
            salience: featureBestSalience[feat],
            coverage: featureCounts[feat] / Math.max(1, cnt),
            hue: hn ? ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360 : 0,
            warm: feat === 'desert' || feat === 'precipitation' ? 0.5 : 0,
            mid: feat === 'vegetation' || feat === 'coastal' ? 0.5 : 0,
            cool: feat === 'ocean' ? 0.5 : 0,
            feature: feat,
            featureColor: FEATURE_COLORS[feat] || '#38bdf8',
          });
        }
      }
    }

    lineVoices.sort((a, b) => a.y - b.y);
    const clampedPeakY = height > 0 ? Math.max(0.18, Math.min(0.82, salientY / height)) : 0.5;

    bands.push({
      index: n,
      brightness,
      coverage,
      peakBrightness: mb,
      peakY: clampedPeakY,
      dominantFeature: bestFeature,
      featureColor: FEATURE_COLORS[bestFeature] || '#38bdf8',
      salience: maxSalience > 0 ? maxSalience : 0.5,
      hue: hn ? ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360 : 0,
      coloredFraction: cnt ? hn / cnt : 0,
      warm: cnt ? (w / cnt) * 8 : 0,
      mid: cnt ? (m / cnt) * 8 : 0,
      cool: cnt ? (c / cnt) * 8 : 0,
      warmPeakY: height > 0 ? wy / height : 0.5,
      coolPeakY: height > 0 ? cy / height : 0.5,
      warmPeakB: wb,
      coolPeakB: cb,
      edge,
      hotspots,
      lineVoices,
      delta: deltaBrightness + deltaCoverage,
      deltaBrightness,
      deltaCoverage,
      oceanPeakY: height > 0 ? featureBestY.ocean / height : 0.5,
      vegPeakY: height > 0 ? featureBestY.vegetation / height : 0.5,
      desertPeakY: height > 0 ? featureBestY.desert / height : 0.5,
      precipPeakY: height > 0 ? featureBestY.precipitation / height : 0.5,
      cloudPeakY: height > 0 ? featureBestY.atmosphere / height : 0.5,
    });
  }

  // Wrap-around edge for band 0 (continuous spherical wrap)
  if (bands.length > 1) {
    const last = bands[bands.length - 1];
    bands[0].edge = Math.abs(bands[0].brightness - last.brightness) + Math.abs(bands[0].coverage - last.coverage);
  }

  const edgeDensity = bands.length
    ? bands.reduce((acc, b) => acc + b.edge, 0) / bands.length
    : 0;

  const warmShare = totColored ? totWarm / totColored : 0;
  const midShare = totColored ? totMid / totColored : 0;
  const coolShare = totColored ? totCool / totColored : 0;
  const darkFrac = totalPx ? darkPx / totalPx : 0;
  const brightDensity = totalPx ? brightPx / totalPx : 0;

  // Derive a distinct musical key transposition (-7 to +7 semitones) per image from its color & luminance signature
  const rawPitchOffset =
    (warmShare - coolShare) * 6.5 +
    (midShare - 0.3) * 3.5 +
    (brightDensity - darkFrac * 0.4) * 5.0;
  const keySemitoneOffset = Math.max(-7, Math.min(7, Math.round(rawPitchOffset)));

  for (const b of bands) {
    b.imagePitchShift = keySemitoneOffset;
  }

  return {
    bands,
    maxBrightness,
    summary: {
      darkFraction: darkFrac,
      brightPointDensity: brightDensity,
      bucketShare: {
        warm: warmShare,
        mid: midShare,
        cool: coolShare,
      },
      edgeDensity,
      keySemitoneOffset,
    },
  };
}

/**
 * Loads an image from URL and extracts its pixel analysis.
 */
export async function analyzeImageFromUrl(
  url: string,
  options: AnalyzeOptions = {}
): Promise<{ result: AnalysisResult; image: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Could not get 2D canvas context'));
        return;
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const result = analyzeImageData(imgData.data, CANVAS_WIDTH, CANVAS_HEIGHT, options);
      resolve({ result, image: img });
    };
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
