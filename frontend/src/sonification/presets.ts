export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 358;
export const BAND_COUNT = 48;

export type ScaleId = 'pentatonic' | 'minor' | 'wholeTone';
export type StyleId = 'auto' | 'sparkle' | 'flow' | 'layers' | 'field' | 'duet';
export type ScanMode = 'lr' | 'rl' | 'tb' | 'rad' | 'radar';

export type EarthFeatureType =
  | 'ocean'
  | 'vegetation'
  | 'desert'
  | 'precipitation'
  | 'coastal'
  | 'atmosphere'
  | 'cryosphere';

export const FEATURE_COLORS: Record<EarthFeatureType, string> = {
  ocean: '#38bdf8',        // Cyan / Sky Blue
  vegetation: '#34d399',   // Emerald Green
  desert: '#f59e0b',       // Warm Amber / Solar Gold
  precipitation: '#f43f5e',// Vibrant Rose / Coral
  coastal: '#2dd4bf',      // Aquamarine Teal
  atmosphere: '#e0f2fe',   // Crystalline Cloud Ice Blue
  cryosphere: '#a5f3fc',   // Polar Ice Diamond
};

export interface ScaleDefinition {
  id: ScaleId;
  name: string;
  semitones: number[];
}

export const SCALES: Record<ScaleId, ScaleDefinition> = {
  pentatonic: {
    id: 'pentatonic',
    name: 'Pentatonic',
    semitones: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21],
  },
  minor: {
    id: 'minor',
    name: 'Minor',
    semitones: [0, 2, 3, 5, 7, 8, 10, 12, 14, 15],
  },
  wholeTone: {
    id: 'wholeTone',
    name: 'Whole tone',
    semitones: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18],
  },
};

export const STYLE_THRESHOLDS = {
  duetMinBucketShare: 0.25,
  duetMinDarkFraction: 0.5,
  duetMinBrightDensity: 0.015,
  layersMinBucketShare: 0.05,
  sparkleMinDarkFraction: 0.55,
  sparkleMaxBrightDensity: 0.1,
  flowMinEdgeDensity: 0.04,
  flowMaxBrightDensity: 0.15,
};

export interface StyleMeta {
  id: StyleId;
  name: string;
  why: string;
  mapping?: {
    pitch: string;
    volume: string;
    rhythm: string;
  };
}

export const STYLES: Record<StyleId, StyleMeta> = {
  auto: {
    id: 'auto',
    name: 'Auto',
    why: 'Analyzes darkness, bright points, edges, and color buckets to pick the best-fitting sound style automatically.',
  },
  sparkle: {
    id: 'sparkle',
    name: 'Sparkle',
    why: 'Sudden bright points feel like short, bell-like or percussive sounds while dark areas stay silent so contrast is audible.',
    mapping: {
      pitch: 'Height of brightest pixel in the band: higher in the image = higher note.',
      volume: 'Mean brightness sets loudness; dark space (below 2%) stays silent.',
      rhythm: 'Short plucks with sharp percussive taps on sudden edges or bright flashes.',
    },
  },
  flow: {
    id: 'flow',
    name: 'Flow',
    why: 'Long, overlapping, smooth sine notes feel like continuous swirling ocean or atmospheric movement.',
    mapping: {
      pitch: 'Color hue (cool to warm) maps smoothly across the selected musical scale.',
      volume: 'Mean brightness sets loudness; dense coverage adds a fifth and an octave.',
      rhythm: 'Long 0.9 s overlapping sine pads with smooth left-to-right stereo pan.',
    },
  },
  layers: {
    id: 'layers',
    name: 'Layers',
    why: 'One instrument per color family lets the listener hear each aerosol or data category separately.',
    mapping: {
      pitch: 'Normalized band brightness drives the shared harmonic pitch.',
      volume: 'Each color family (warm, mid, cool) controls its own instrument volume.',
      rhythm: 'Three simultaneous voices: warm bass triangle, mid soft square, cool high sine.',
    },
  },
  field: {
    id: 'field',
    name: 'Field',
    why: 'Brightness maps to pitch and coverage maps to chord fullness, so denser intensity areas sound fuller.',
    mapping: {
      pitch: 'Normalized band brightness quantized to the selected musical scale.',
      volume: 'Overall brightness sets gain; dense coverage adds harmonic intervals.',
      rhythm: 'Warm triangle tones with optional soft taps when intensity jumps sharply.',
    },
  },
  duet: {
    id: 'duet',
    name: 'Duet',
    why: 'Two clearly different color regions get their own voices, so both stories play at once.',
    mapping: {
      pitch: 'Warm lights: vertical height sets bell note. Cool currents: brightness sets pad note.',
      volume: 'Warm and cool brightness/coverage independently drive each voice.',
      rhythm: 'Warm triangle plucks + cool 1.0 s glassy sine pads; dark space stays silent.',
    },
  },
};

export const SPEED_INTERVALS_MS = [700, 500, 360, 240, 160];

export interface TrackDefinition {
  id: string;
  name: string;
  icon: string;
  svsId: string;
  textureUrl: string;
  defaultStyle: StyleId;
  description: string;
  whyItMatters: string;
  fmFreq: string;
}

export const PLANETARY_TRACKS: TrackDefinition[] = [
  {
    id: 'sea-surface-temp',
    name: 'Sea Surface Temperature',
    icon: '🌊',
    svsId: 'Worldview GHRSST',
    textureUrl: '/textures/sea_surface_temperature.png',
    defaultStyle: 'flow',
    description: 'Real-time global sea surface temperature from NASA Worldview (GHRSST L4 MUR Sea Surface Temperature & Coastlines).',
    whyItMatters: 'Global monitoring of ocean temperature anomalies, marine heatwaves, and oceanic thermal circulation driving continuous ambient flow synthesis.',
    fmFreq: '88.1 MHz',
  },
  {
    id: 'eyes-on-earth',
    name: 'Eyes on Earth Live',
    icon: '🌍',
    svsId: 'NASA Eyes on Earth',
    textureUrl: '/textures/eyes_on_earth_now.jpg',
    defaultStyle: 'duet',
    description: "Real-time daily visible Earth satellite mosaic scraped from NASA's Eyes on the Earth.",
    whyItMatters: 'Scans live cloud systems, continental weather patterns, and ocean reflections across Earth today.',
    fmFreq: '91.3 MHz',
  },
  {
    id: 'global-precipitation',
    name: 'Global Precipitation',
    icon: '🌧️',
    svsId: 'SVS 4285',
    textureUrl: '/textures/imergert_1080p.now.png',
    defaultStyle: 'layers',
    description: 'Near real-time global precipitation visualization from NASA SVS 4285 and the GPM satellite constellation.',
    whyItMatters: 'Sonifies active rain bands and storm fronts worldwide with multi-layered harmonic voices.',
    fmFreq: '94.5 MHz',
  },
];
