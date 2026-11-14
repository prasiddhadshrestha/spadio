import { describe, it, expect } from 'vitest';
import { selectStyle } from '../src/styleSelector.js';

describe('styleSelector', () => {
  it('selects duet when two color buckets >= 0.25 on dark background', () => {
    expect(
      selectStyle({
        darkFraction: 0.65,
        brightPointDensity: 0.08,
        bucketShare: { warm: 0.45, mid: 0.05, cool: 0.5 },
        edgeDensity: 0.03
      })
    ).toBe('duet');
  });

  it('selects layers when all three color buckets >= 0.15', () => {
    expect(
      selectStyle({
        darkFraction: 0.2,
        brightPointDensity: 0.1,
        bucketShare: { warm: 0.35, mid: 0.35, cool: 0.3 },
        edgeDensity: 0.05
      })
    ).toBe('layers');
  });

  it('selects sparkle on dark scenes with sparse bright points', () => {
    expect(
      selectStyle({
        darkFraction: 0.85,
        brightPointDensity: 0.03,
        bucketShare: { warm: 0.96, mid: 0.02, cool: 0.02 },
        edgeDensity: 0.02
      })
    ).toBe('sparkle');
  });

  it('selects flow on smooth gradients with high edge density', () => {
    expect(
      selectStyle({
        darkFraction: 0.3,
        brightPointDensity: 0.05,
        bucketShare: { warm: 0.02, mid: 0.02, cool: 0.96 },
        edgeDensity: 0.07
      })
    ).toBe('flow');
  });

  it('falls back to field otherwise', () => {
    expect(
      selectStyle({
        darkFraction: 0.1,
        brightPointDensity: 0.4,
        bucketShare: { warm: 0.96, mid: 0.02, cool: 0.02 },
        edgeDensity: 0.01
      })
    ).toBe('field');
  });
});
