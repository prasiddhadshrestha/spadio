import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { analyzeImageData, rgbToHue } from '../src/analyzer.js';
import { selectStyle } from '../src/styleSelector.js';

function loadFixtureScaled(filename, targetW = 640, targetH = 358) {
  const fullPath = join(process.cwd(), 'tests', 'fixtures', filename);
  const buf = readFileSync(fullPath);
  let srcW, srcH, srcData;

  if (filename.endsWith('.png')) {
    const png = PNG.sync.read(buf);
    srcW = png.width;
    srcH = png.height;
    srcData = png.data;
  } else {
    const raw = jpeg.decode(buf, { useTArray: true });
    srcW = raw.width;
    srcH = raw.height;
    srcData = raw.data;
  }

  // Nearest-neighbor scale-to-cover into 640x358
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const offsetX = (targetW - srcW * scale) / 2;
  const offsetY = (targetH - srcH * scale) / 2;

  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(srcH - 1, Math.max(0, Math.floor((y - offsetY) / scale)));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(srcW - 1, Math.max(0, Math.floor((x - offsetX) / scale)));
      const si = (sy * srcW + sx) * 4;
      const di = (y * targetW + x) * 4;
      out[di] = srcData[si];
      out[di + 1] = srcData[si + 1];
      out[di + 2] = srcData[si + 2];
      out[di + 3] = 255;
    }
  }
  return out;
}

describe('analyzer', () => {
  it('computes expected RGB to hue angles', () => {
    expect(Math.round(rgbToHue(255, 0, 0))).toBe(0);
    expect(Math.round(rgbToHue(0, 255, 0))).toBe(120);
    expect(Math.round(rgbToHue(0, 0, 255))).toBe(240);
  });

  it('produces 48 bands and detects delta between frames', () => {
    const dark = new Uint8ClampedArray(640 * 358 * 4);
    const bright = new Uint8ClampedArray(640 * 358 * 4).fill(220);
    const res1 = analyzeImageData(dark, 640, 358);
    const res2 = analyzeImageData(bright, 640, 358, { prevFrameBands: res1.bands });

    expect(res1.bands).toHaveLength(48);
    expect(res2.bands[0].deltaBrightness).toBeGreaterThan(0.5);
  });

  it('auto-selects Duet for aurora_globe.jpg fixture', () => {
    const data = loadFixtureScaled('aurora_globe.jpg');
    const res = analyzeImageData(data, 640, 358);
    expect(selectStyle(res.summary)).toBe('duet');
  });

  it('auto-selects Sparkle for night_lights.jpg fixture', () => {
    const data = loadFixtureScaled('night_lights.jpg');
    const res = analyzeImageData(data, 640, 358);
    expect(selectStyle(res.summary)).toBe('sparkle');
  });

  it('auto-selects Layers for aerosols.png fixture', () => {
    const data = loadFixtureScaled('aerosols.png');
    const res = analyzeImageData(data, 640, 358);
    expect(selectStyle(res.summary)).toBe('layers');
  });
});
