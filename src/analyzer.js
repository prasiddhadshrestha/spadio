import { BAND_COUNT, CANVAS_WIDTH, CANVAS_HEIGHT } from './presets.js';

export function rgbToHue(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * Pure pixel-to-feature analyzer (no DOM dependencies).
 * Splits a RGBA pixel buffer into N vertical (or horizontal/radial) bands.
 */
export function analyzeImageData(data, width = CANVAS_WIDTH, height = CANVAS_HEIGHT, options = {}) {
  const N = options.bandCount || BAND_COUNT;
  const scanMode = options.scanMode || 'lr';
  const prevBands = options.prevFrameBands || null;

  const bands = [];
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
    let bestSpot = null, secondSpot = null;

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
          // Clockwise angle from 12 o'clock (top) in [0, 2*PI)
          const angle = (Math.atan2(dx, -dy) + Math.PI * 2) % (Math.PI * 2);
          const sector = Math.floor((angle / (Math.PI * 2)) * N);
          if (sector !== n) continue;
          bandFrac = (angle / (Math.PI * 2)) * N - n;
          const maxR = Math.hypot(width / 2, height / 2);
          const rDist = Math.hypot(dx, dy) / maxR;
          // Caldwell 73 rule: further from center = higher pitch (so smaller posMetric -> higher (1 - peakY))
          posMetric = (1 - Math.min(1, rDist)) * height;
        }
        bandFrac = Math.max(0, Math.min(0.99, bandFrac));

        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

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
        if (luma > 0.48) {
          if (!bestSpot || luma > bestSpot.luma) {
            if (bestSpot && Math.hypot(x - bestSpot.x, y - bestSpot.y) > 22) {
              secondSpot = bestSpot;
            }
            bestSpot = { x, y, r, g, b, luma, frac: bandFrac };
          } else if (
            Math.hypot(x - bestSpot.x, y - bestSpot.y) > 22 &&
            (!secondSpot || luma > secondSpot.luma)
          ) {
            secondSpot = { x, y, r, g, b, luma, frac: bandFrac };
          }
        }

        const mx = Math.max(r, g, b);
        const mn = Math.min(r, g, b);
        const sat = mx ? (mx - mn) / mx : 0;
        if (sat > 0.35 && luma > 0.18) {
          const h = rgbToHue(r, g, b);
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

    const hotspots = [];
    if (bestSpot) hotspots.push(bestSpot);
    if (secondSpot) hotspots.push(secondSpot);

    bands.push({
      index: n,
      brightness,
      coverage,
      peakBrightness: mb,
      peakY: my / height,
      hue: hn ? ((Math.atan2(hy, hx) * 180) / Math.PI + 360) % 360 : 0,
      coloredFraction: cnt ? hn / cnt : 0,
      warm: cnt ? (w / cnt) * 8 : 0,
      mid: cnt ? (m / cnt) * 8 : 0,
      cool: cnt ? (c / cnt) * 8 : 0,
      warmPeakY: wy / height,
      coolPeakY: cy / height,
      warmPeakB: wb,
      coolPeakB: cb,
      edge,
      hotspots,
      delta: deltaBrightness + deltaCoverage,
      deltaBrightness,
      deltaCoverage
    });
  }

  // Wrap-around edge for band 0
  if (bands.length > 1) {
    const last = bands[bands.length - 1];
    bands[0].edge = Math.abs(bands[0].brightness - last.brightness) + Math.abs(bands[0].coverage - last.coverage);
  }

  const edgeDensity = bands.length
    ? bands.reduce((acc, b) => acc + b.edge, 0) / bands.length
    : 0;

  return {
    bands,
    maxBrightness,
    summary: {
      darkFraction: totalPx ? darkPx / totalPx : 0,
      brightPointDensity: totalPx ? brightPx / totalPx : 0,
      bucketShare: {
        warm: totColored ? totWarm / totColored : 0,
        mid: totColored ? totMid / totColored : 0,
        cool: totColored ? totCool / totColored : 0
      },
      edgeDensity
    }
  };
}

export function classifyColorFamily(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx ? (mx - mn) / mx : 0;
  if (sat < 0.22) return 'neutral';
  const h = rgbToHue(r, g, b);
  if (h < 68 || h > 315) return 'warm';
  if (h >= 150 && h <= 275) return 'cool';
  return h < 150 ? 'warm' : 'cool';
}

export function detectPeakFeatures(imageData, { scanMode = 'radar', threshold = 0.45, bandCount = BAND_COUNT } = {}) {
  const { width, height, data } = imageData;
  const step = 3;
  const cols = Math.floor(width / step);
  const rows = Math.floor(height / step);
  const grid = new Float32Array(cols * rows);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const i = (gy * step * width + gx * step) * 4;
      grid[gy * cols + gx] = Math.max(data[i], data[i + 1], data[i + 2]) / 255;
    }
  }

  const maxR = Math.hypot(width / 2, height / 2);
  const raw = [];
  for (let gy = 1; gy < rows - 1; gy++) {
    for (let gx = 1; gx < cols - 1; gx++) {
      const v = grid[gy * cols + gx];
      if (v < threshold) continue;
      let isPeak = true;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nv = grid[(gy + dy) * cols + (gx + dx)];
          sum += nv;
          if ((dx !== 0 || dy !== 0) && nv > v) {
            isPeak = false;
            break;
          }
        }
        if (!isPeak) break;
      }
      if (!isPeak || sum / 9 < threshold * 0.52) continue;

      const x = gx * step;
      const y = gy * step;
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.hypot(dx, dy);
      if (dist < 12) continue;

      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const family = classifyColorFamily(r, g, b);
      const colorMap = { warm: 'rgb(251, 146, 60)', cool: 'rgb(56, 189, 248)', neutral: 'rgb(248, 250, 252)' };
      const angleDeg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const normDist = Math.min(1, dist / maxR);

      let bandIdx = Math.min(bandCount - 1, Math.floor((x / width) * bandCount));
      let frac = (x / width) * bandCount - bandIdx;
      if (scanMode === 'tb') {
        bandIdx = Math.min(bandCount - 1, Math.floor((y / height) * bandCount));
        frac = (y / height) * bandCount - bandIdx;
      } else if (scanMode === 'rl') {
        bandIdx = Math.min(bandCount - 1, Math.floor((x / width) * bandCount));
        frac = 1 - ((x / width) * bandCount - bandIdx);
      } else if (scanMode === 'rad') {
        const rx = dx / (width / 2);
        const ry = dy / (height / 2);
        const rn = Math.min(0.999, Math.sqrt(rx * rx + ry * ry));
        bandIdx = Math.min(bandCount - 1, Math.floor(rn * bandCount));
        frac = rn * bandCount - bandIdx;
      } else if (scanMode === 'radar') {
        bandIdx = Math.min(bandCount - 1, Math.floor((angleDeg / 360) * bandCount));
        frac = (angleDeg / 360) * bandCount - bandIdx;
      }

      raw.push({
        x, y, r, g, b,
        luma: v,
        brightness: v,
        loudness: Math.min(1, 0.35 + v * 0.65),
        dist,
        normDist,
        angleDeg,
        family,
        ringColor: colorMap[family],
        bandIdx,
        frac: Math.max(0, Math.min(0.99, frac))
      });
    }
  }

  raw.sort((a, b) => b.brightness - a.brightness);
  const merged = [];
  for (const p of raw) {
    if (merged.every((m) => Math.hypot(m.x - p.x, m.y - p.y) > 18)) {
      merged.push(p);
    }
  }

  const byBand = Array.from({ length: bandCount }, () => []);
  for (const p of merged) {
    if (byBand[p.bandIdx].length < 2) {
      byBand[p.bandIdx].push(p);
    }
  }
  return byBand;
}

/**
 * Draws an HTMLImageElement or canvas onto a target 2D context scaled to cover with black letterbox.
 */
export function drawFrameToContext(ctx, img, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  const scale = Math.max(width / img.width, height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  return ctx.getImageData(0, 0, width, height);
}
