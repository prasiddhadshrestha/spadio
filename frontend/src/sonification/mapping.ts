import { BAND_COUNT, EarthFeatureType, FEATURE_COLORS, SCALES, ScaleId, StyleId } from './presets';
import { BandData, LineVoiceData } from './analyzer';

export type InstrumentRole =
  | 'taiko'
  | 'tom'
  | 'rim'
  | 'bass'
  | 'guitar'
  | 'epiano'
  | 'pad'
  | 'bell';

export interface AudioNoteEvent {
  freq: number;
  gain: number;
  duration: number;
  wave: OscillatorType;
  pan?: number;
  glideToFreq?: number;
  glideDuration?: number;
  attack?: number;
  filterFreq?: number;
  noiseGain?: number;
  noiseFilterFreq?: number;
  instrument?: InstrumentRole;
}

export interface MappingContext {
  style?: StyleId;
  scaleId?: ScaleId;
  maxBrightness?: number;
  bandCount?: number;
  bandIndex?: number;
}

export interface MappedBandOutput {
  events: AudioNoteEvent[];
  pitchIndex: number;
  brightnessNorm: number;
  pan: number;
  caption: string;
  loudWord: string;
}

export const FEATURE_REGISTER_SEMITONES: Record<EarthFeatureType, number> = {
  ocean: -12,        // Sub-bass / low marine register (-1 octave)
  desert: -5,        // Warm low-mid fourth below
  coastal: -2,       // Mid-low whole tone below
  vegetation: 3,     // Vibrant mid-high minor third above
  atmosphere: 7,     // Airy high fifth above
  precipitation: 11, // High storm droplet register
  cryosphere: 16,    // Sparkling crystalline polar bell register (+1 octave & 3rd)
};

export function quantizeFrequency(
  index: number,
  scaleId: ScaleId = 'pentatonic',
  semitoneShift: number = 0
): number {
  const scale = SCALES[scaleId] || SCALES.pentatonic;
  const clamped = Math.max(0, Math.min(scale.semitones.length - 1, Math.floor(index)));
  const totalSemitones = scale.semitones[clamped] + semitoneShift;
  return Math.max(45, Math.min(2400, 220 * Math.pow(2, totalSemitones / 12)));
}

export function pitchHeightLabel(index: number): string {
  if (index > 6) return 'high note';
  if (index > 3) return 'middle note';
  return 'low note';
}

/**
 * Converts all active voices along a scanned meridian line into simultaneous polyphonic audio note events.
 */
export function mapBandToEvents(band: BandData, context: MappingContext = {}): MappedBandOutput {
  const {
    style = 'sparkle',
    scaleId = 'pentatonic',
    maxBrightness = 0.01,
    bandCount = BAND_COUNT,
    bandIndex = band.index || 0,
  } = context;

  const bn = Math.min(1, band.brightness / Math.max(0.01, maxBrightness));
  const pan = bandCount > 1 ? -0.8 + (1.6 * bandIndex) / (bandCount - 1) : 0;
  const events: AudioNoteEvent[] = [];

  const primaryPitchIndex = Math.max(0, Math.min(9, Math.floor((1 - band.peakY) * 9.99)));
  let caption = '';
  let extra = '';

  const fallbackVoice: LineVoiceData = {
    sliceIndex: Math.floor(band.peakY * 10),
    y: band.peakY,
    pitchIndex: primaryPitchIndex,
    brightness: band.brightness,
    peakBrightness: band.peakBrightness,
    salience: band.salience || band.brightness,
    coverage: band.coverage,
    hue: band.hue,
    warm: band.warm,
    mid: band.mid,
    cool: band.cool,
    feature: band.dominantFeature || 'ocean',
    featureColor: band.featureColor || FEATURE_COLORS[band.dominantFeature || 'ocean'] || '#38bdf8',
  };

  const isLineSilent =
    band.brightness < 0.02 &&
    band.coverage < 0.02 &&
    (band.salience || 0) < 0.08 &&
    (!band.lineVoices || band.lineVoices.length === 0);

  const voices: LineVoiceData[] = isLineSilent
    ? []
    : band.lineVoices && band.lineVoices.length > 0
    ? band.lineVoices
    : [fallbackVoice];

  // Equal-power polyphonic gain scaling so simultaneous voices along the line blend cleanly without clipping
  const voiceNorm = 1 / Math.sqrt(Math.max(1, voices.length));

  if (!isLineSilent && voices.length > 0) {
    const imageShift = band.imagePitchShift || 0;

    for (const voice of voices) {
      let vPitch =
        style === 'flow'
          ? Math.floor(((1 - voice.y) * 0.5 + (voice.hue / 360) * 0.5) * 9.99)
          : Math.floor(((1 - voice.y) * 0.78 + (voice.hue / 360) * 0.22) * 9.99);
      vPitch = Math.max(0, Math.min(9, vPitch));

      const featureSemitones = FEATURE_REGISTER_SEMITONES[voice.feature] ?? 0;
      const hueSemitoneMod = Math.round(((voice.hue / 360) - 0.5) * 4);
      const lumaSemitoneMod = voice.peakBrightness > 0.75 ? 2 : voice.peakBrightness < 0.2 ? -2 : 0;
      const totalSemitoneShift = imageShift + featureSemitones + hueSemitoneMod + lumaSemitoneMod;

      const freq = quantizeFrequency(vPitch, scaleId, totalSemitoneShift);
      const vol =
        (0.024 + Math.min(1, (voice.salience || voice.brightness) * 1.8) * 0.085) * voiceNorm;
      const dur = style === 'flow' ? 0.85 : style === 'sparkle' ? 0.36 : 0.48;

      switch (voice.feature) {
        case 'desert': {
          // O-DAIKO: Deep resonant Taiko drum ONLY on desert / arid thermal data
          const bodyFreq = Math.max(48, Math.min(88, 52 + (1 - voice.y) * 32));
          const strikeFreq = bodyFreq * 3.2;
          events.push({
            freq: strikeFreq,
            glideToFreq: bodyFreq,
            glideDuration: 0.075,
            attack: 0.002,
            gain: vol * 1.45,
            duration: 0.42,
            wave: 'sine',
            pan,
            noiseGain: vol * 0.7,
            noiseFilterFreq: 380,
            instrument: 'taiko',
          });
          // Wooden barrel inharmonic overtone
          events.push({
            freq: bodyFreq * 2.4,
            glideToFreq: bodyFreq * 1.48,
            glideDuration: 0.05,
            attack: 0.002,
            gain: vol * 0.55,
            duration: 0.16,
            wave: 'triangle',
            pan,
            instrument: 'taiko',
          });
          break;
        }

        case 'precipitation': {
          // SHIME-DAIKO / TOM: High-tension rhythmic Taiko drum ONLY on storm / rain cores
          const tomBodyFreq = Math.max(82, Math.min(145, 86 + (1 - voice.y) * 52));
          const tomStrikeFreq = tomBodyFreq * 2.8;
          events.push({
            freq: tomStrikeFreq,
            glideToFreq: tomBodyFreq,
            glideDuration: 0.055,
            attack: 0.002,
            gain: vol * 1.3,
            duration: 0.28,
            wave: 'sine',
            pan,
            noiseGain: vol * 0.6,
            noiseFilterFreq: 860,
            instrument: 'tom',
          });
          events.push({
            freq: tomBodyFreq * 1.52,
            attack: 0.002,
            gain: vol * 0.4,
            duration: 0.12,
            wave: 'triangle',
            pan,
            instrument: 'tom',
          });
          break;
        }

        case 'ocean': {
          // BASS GUITAR / SUB-SYNTH: Deep groovy marine bassline
          const bassFreq = Math.max(48, Math.min(150, freq * 0.75));
          events.push({
            freq: bassFreq,
            attack: 0.01,
            gain: vol * 1.05,
            duration: dur * 1.25,
            wave: 'sawtooth',
            filterFreq: 340,
            pan,
            instrument: 'bass',
          });
          events.push({
            freq: bassFreq,
            attack: 0.012,
            gain: vol * 0.85,
            duration: dur * 1.3,
            wave: 'sine',
            pan,
            instrument: 'bass',
          });
          break;
        }

        case 'vegetation': {
          // GUITAR / KEYS: Plucked organic biosphere chords
          events.push({
            freq,
            attack: 0.006,
            gain: vol * 1.05,
            duration: dur * 0.9,
            wave: 'triangle',
            filterFreq: 1800,
            pan,
            instrument: 'guitar',
          });
          events.push({
            freq: freq * 1.5,
            attack: 0.008,
            gain: vol * 0.42,
            duration: dur * 0.75,
            wave: 'sine',
            pan,
            instrument: 'guitar',
          });
          break;
        }

        case 'coastal': {
          // ELECTRIC PIANO / RHODES: Warm coastal harmonic interval
          events.push({
            freq,
            attack: 0.008,
            gain: vol * 0.95,
            duration: dur,
            wave: 'triangle',
            pan,
            instrument: 'epiano',
          });
          events.push({
            freq: freq * 1.25,
            attack: 0.01,
            gain: vol * 0.48,
            duration: dur * 0.95,
            wave: 'sine',
            pan,
            instrument: 'epiano',
          });
          break;
        }

        case 'cryosphere': {
          // Suppress top/bottom polar white ice sounds completely
          break;
        }

        case 'atmosphere':
        default: {
          // SYNTH PAD / STRINGS: Lush floating cloud harmony (suppress if located in top/bottom polar white margin)
          if (voice.y < 0.18 || voice.y > 0.82) break;
          events.push({
            freq,
            attack: 0.045,
            gain: vol * 0.85,
            duration: dur * 1.2,
            wave: 'sine',
            pan,
            instrument: 'pad',
          });
          if (voice.coverage > 0.22) {
            events.push({
              freq: freq * 1.5,
              attack: 0.05,
              gain: vol * 0.35,
              duration: dur * 1.15,
              wave: 'sine',
              pan,
              instrument: 'pad',
            });
          }
          break;
        }
      }
    }

    // Sub-bass planetary resonance anchor for the scan line
    events.push({
      freq: 55 * Math.pow(2, (primaryPitchIndex / 24) + (imageShift / 12)),
      gain: 0.03,
      duration: 0.7,
      wave: 'sine',
      pan,
    });
  }

  // TAIKO RIM / KACHI HIT on sharp continental boundaries
  if (band.edge > 0.06 || band.peakBrightness > 0.92) {
    events.push({
      freq: 480,
      glideToFreq: 195,
      glideDuration: 0.03,
      attack: 0.001,
      gain: 0.04,
      duration: 0.075,
      wave: 'triangle',
      pan,
      noiseGain: 0.035,
      noiseFilterFreq: 1850,
      instrument: 'rim',
    });
    extra = ', with Taiko rim hit';
  }

  // Multi-frame delta shimmer / sweep
  if (Math.abs(band.delta || 0) > 0.08) {
    const rising = (band.delta || 0) > 0;
    events.push({
      freq: rising ? 660 : 520,
      glideToFreq: rising ? 990 : 330,
      gain: 0.02,
      duration: 0.35,
      wave: 'sine',
      pan,
    });
    extra += rising ? ', rising shimmer' : ', fading glide';
  }

  const loudWord = bn > 0.6 ? 'bright' : bn > 0.25 ? 'medium' : 'dark';
  const uniqueFeatures = Array.from(new Set(voices.map((v) => v.feature)));

  if (isLineSilent || voices.length === 0) {
    caption = 'dark space or ocean, silence';
  } else {
    caption = `${voices.length} simultaneous line voices (${uniqueFeatures.join(' + ')}), ${pitchHeightLabel(primaryPitchIndex)}`;
  }

  return {
    events,
    pitchIndex: primaryPitchIndex,
    brightnessNorm: bn,
    pan,
    loudWord,
    caption: `Meridian ${bandIndex + 1} of ${bandCount}: ${caption}${extra}`,
  };
}
