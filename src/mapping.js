import { BAND_COUNT, SCALES } from './presets.js';

export function quantizeFrequency(index, scaleId = 'pentatonic') {
  const scale = SCALES[scaleId] || SCALES.pentatonic;
  const clamped = Math.max(0, Math.min(scale.semitones.length - 1, Math.floor(index)));
  return 220 * Math.pow(2, scale.semitones[clamped] / 12);
}

function pitchHeightLabel(index) {
  if (index > 6) return 'high note';
  if (index > 3) return 'middle note';
  return 'low note';
}

/**
 * Pure mapping function: converts one analyzed band into audio note events and a plain-language caption.
 * Shared by both the live Web Audio engine and the offline WAV renderer.
 */
export function mapBandToEvents(band, context = {}) {
  const {
    style = 'sparkle',
    scaleId = 'pentatonic',
    maxBrightness = 0.01,
    bandCount = BAND_COUNT,
    bandIndex = band.index || 0
  } = context;

  const bn = Math.min(1, band.brightness / Math.max(0.01, maxBrightness));
  const pan = bandCount > 1 ? -0.8 + (1.6 * bandIndex) / (bandCount - 1) : 0;
  const events = [];
  let pitchIndex = 0;
  let caption = '';
  let extra = '';

  if (style === 'duet') {
    const lit = band.warm > 0.02;
    const cy = band.cool > 0.02;
    if (lit) {
      pitchIndex = Math.max(0, Math.min(9, Math.floor((1 - band.warmPeakY) * 9.99)));
      const freq = quantizeFrequency(pitchIndex, scaleId) * 2;
      events.push({
        freq,
        gain: 0.03 + Math.min(1, band.warmPeakB) * 0.09,
        duration: 0.35,
        wave: 'triangle',
        pan
      });
      if (band.warm > 0.3) {
        events.push({
          freq: quantizeFrequency(pitchIndex, scaleId) * 3,
          gain: 0.02,
          duration: 0.3,
          wave: 'sine',
          pan
        });
      }
    }
    if (cy) {
      const ci = Math.max(0, Math.min(9, Math.floor(Math.min(1, band.coolPeakB) * 9.99)));
      const cf = quantizeFrequency(ci, scaleId);
      events.push({
        freq: cf,
        gain: 0.025 + Math.min(0.1, band.cool * 0.1),
        duration: 1.0,
        wave: 'sine',
        pan
      });
      events.push({
        freq: cf * 1.5,
        gain: 0.015,
        duration: 1.0,
        wave: 'sine',
        pan
      });
      if (!lit) pitchIndex = ci;
    }
    if (lit || cy) {
      events.push({
        freq: 55 * Math.pow(2, pitchIndex / 24),
        gain: 0.035,
        duration: 0.8,
        wave: 'sine',
        pan
      });
    }
    if (band.edge > 0.05 && lit) {
      events.push({ freq: 1000, gain: 0.025, duration: 0.06, wave: 'square', pan });
      extra = ', with a sparkle';
    }
    caption = lit && cy
      ? 'orange lights and cyan currents together'
      : lit
        ? `orange city lights, ${pitchHeightLabel(pitchIndex)}`
        : cy
          ? 'cyan ocean currents, glassy pad'
          : 'dark space or ocean, silence';
  } else {
    if (style === 'flow') {
      pitchIndex = Math.floor((band.hue / 360) * 9.99);
    } else if (style === 'sparkle') {
      pitchIndex = Math.floor((1 - band.peakY) * 9.99);
    } else {
      pitchIndex = Math.floor(Math.min(1, bn) * 9.99);
    }
    pitchIndex = Math.max(0, Math.min(9, pitchIndex));

    const freq = quantizeFrequency(pitchIndex, scaleId);
    const vol = 0.02 + Math.min(1, band.brightness * 3) * 0.1;
    const dur = style === 'flow' ? 0.9 : 0.48;
    const isSilent = band.brightness < 0.02 && band.coverage < 0.02;

    if (!isSilent) {
      if (style === 'layers') {
        if (band.warm > 0.02) {
          events.push({ freq: freq / 2, gain: 0.02 + Math.min(0.1, band.warm * 0.1), duration: 0.7, wave: 'triangle', pan });
        }
        if (band.mid > 0.02) {
          events.push({ freq, gain: 0.01 + Math.min(0.06, band.mid * 0.1), duration: 0.4, wave: 'square', pan });
        }
        if (band.cool > 0.02) {
          events.push({ freq: freq * 2, gain: 0.02 + Math.min(0.1, band.cool * 0.1), duration: 0.6, wave: 'sine', pan });
        }
      } else {
        const wave = style === 'flow' ? 'sine' : 'triangle';
        events.push({ freq, gain: vol, duration: dur, wave, pan });
        if (band.coverage > 0.15) {
          events.push({ freq: freq * 1.5, gain: vol * 0.6, duration: dur, wave: 'sine', pan });
        }
        if (band.coverage > 0.4) {
          events.push({ freq: freq * 2, gain: vol * 0.5, duration: dur, wave: 'sine', pan });
        }
      }
      events.push({
        freq: 55 * Math.pow(2, pitchIndex / 24),
        gain: 0.035,
        duration: 0.7,
        wave: 'sine',
        pan
      });
    }

    if ((style === 'sparkle' || style === 'field') && (band.edge > 0.06 || band.peakBrightness > 0.9)) {
      events.push({ freq: 900, gain: 0.035, duration: 0.07, wave: 'square', pan });
      extra = ', with a sharp hit';
    }

    const loudWord = bn > 0.6 ? 'bright' : bn > 0.25 ? 'medium' : 'dark';
    caption = `${loudWord} area, ${isSilent ? 'silence' : pitchHeightLabel(pitchIndex)}`;
  }

  // Multi-frame delta shimmer/glide (Section 6.6)
  if (Math.abs(band.delta || 0) > 0.08) {
    const rising = band.delta > 0;
    events.push({
      freq: rising ? 660 : 520,
      glideToFreq: rising ? 990 : 330,
      gain: 0.02,
      duration: 0.35,
      wave: 'sine',
      pan
    });
    extra += rising ? ', rising shimmer' : ', fading glide';
  }

  return {
    events,
    pitchIndex,
    brightnessNorm: bn,
    pan,
    caption: `Column ${bandIndex + 1} of ${bandCount}: ${caption}${extra}`
  };
}
