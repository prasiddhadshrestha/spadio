import { describe, it, expect } from 'vitest';
import { mapBandToEvents, quantizeFrequency } from '../src/mapping.js';

const sampleBand = {
  index: 10,
  brightness: 0.45,
  coverage: 0.5,
  peakBrightness: 0.85,
  peakY: 0.25,
  hue: 195,
  coloredFraction: 0.4,
  warm: 0.35,
  mid: 0.2,
  cool: 0.35,
  warmPeakY: 0.2,
  coolPeakY: 0.6,
  warmPeakB: 0.8,
  coolPeakB: 0.7,
  edge: 0.08,
  delta: 0
};

describe('mapping', () => {
  it('quantizes frequencies strictly to the chosen scale', () => {
    const f0 = quantizeFrequency(0, 'pentatonic');
    const f5 = quantizeFrequency(5, 'pentatonic');
    expect(f0).toBeCloseTo(220, 2);
    expect(f5).toBeCloseTo(440, 2);
  });

  it('maps duet style with both warm plucks and cool pads', () => {
    const res = mapBandToEvents(sampleBand, { style: 'duet', maxBrightness: 0.6, bandIndex: 10 });
    expect(res.events.length).toBeGreaterThanOrEqual(4);
    expect(res.caption).toContain('orange lights and cyan currents');
  });

  it('maps layers style into 3 color voices plus drone', () => {
    const res = mapBandToEvents(sampleBand, { style: 'layers', maxBrightness: 0.6, bandIndex: 10 });
    expect(res.events.length).toBe(4);
  });

  it('emits silence for dark bands in sparkle style', () => {
    const darkBand = { ...sampleBand, brightness: 0.005, coverage: 0.005, peakBrightness: 0.01, edge: 0 };
    const res = mapBandToEvents(darkBand, { style: 'sparkle', maxBrightness: 0.6, bandIndex: 0 });
    expect(res.events.length).toBe(0);
    expect(res.caption).toContain('silence');
  });

  it('adds rising shimmer on positive delta', () => {
    const res = mapBandToEvents({ ...sampleBand, delta: 0.2 }, { style: 'field', maxBrightness: 0.6, bandIndex: 5 });
    expect(res.events.some((e) => e.glideToFreq && e.glideToFreq > e.freq)).toBe(true);
    expect(res.caption).toContain('rising shimmer');
  });
});
