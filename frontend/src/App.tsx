import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { RadioScreen } from './components/RadioScreen';
import { SonificationEngine } from './sonification/SonificationEngine';
import { Narrator } from './sonification/narrator';
import {
  analyzeImageFromUrl,
  analyzeImageData,
  AnalysisResult,
  BandData,
} from './sonification/analyzer';
import { selectStyle } from './sonification/styleSelector';
import { mapBandToEvents } from './sonification/mapping';
import { ImageSonifier, sonifyScanLine } from './sonification/ImageSonifier';
import {
  BAND_COUNT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SPEED_INTERVALS_MS,
  ScaleId,
  StyleId,
} from './sonification/presets';

export interface HotspotRegion {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  indicator: string;
  latest_distress: number;
}

// Helper to get latest viable UTC date string for NASA GIBS WMS (today or yesterday)
function getLatestNasaGibsDateString(daysOffset = 1): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysOffset);
  return d.toISOString().split('T')[0];
}

const REGION_TRACK_MAP: Record<
  string,
  { textureUrl: string; defaultStyle: StyleId; label: string }
> = {
  eyes_on_earth: {
    textureUrl: '/textures/eyes_on_earth_now.jpg',
    defaultStyle: 'duet',
    label: "NASA's Eyes on the Earth Live Satellite Mosaic",
  },
  realtime_precipitation: {
    textureUrl: '/textures/imergert_1080p.now.png',
    defaultStyle: 'layers',
    label: 'Real-Time Global Precipitation (NASA SVS 4285)',
  },
  global_temp: {
    textureUrl: '/textures/snow_and_rain.jpg',
    defaultStyle: 'duet',
    label: 'Global Mean Temperature & Aurora Lights',
  },
  arctic: {
    textureUrl: '/textures/night_lights.jpg',
    defaultStyle: 'sparkle',
    label: 'Arctic Polar Ice & Urban Sparkle',
  },
  amazon: {
    textureUrl: '/textures/aerosols.png',
    defaultStyle: 'layers',
    label: 'Amazon Canopy & Atmospheric Aerosols',
  },
  barrier_reef: {
    textureUrl: '/textures/earth_day.jpg',
    defaultStyle: 'flow',
    label: 'Great Barrier Reef & Ocean Currents',
  },
};

const FALLBACK_REGIONS: HotspotRegion[] = [
  {
    id: 'eyes_on_earth',
    name: 'Eyes on Earth Live',
    coordinates: { lat: 24.0, lng: -45.0 },
    indicator: 'NASA Eyes on Earth Visible Earth (Daily)',
    latest_distress: 0.96,
  },
  {
    id: 'realtime_precipitation',
    name: 'Global Precipitation',
    coordinates: { lat: 0.0, lng: 0.0 },
    indicator: 'Near Real-Time Precipitation (SVS 4285)',
    latest_distress: 0.96,
  },
  {
    id: 'global_temp',
    name: 'Global Thermal Drift',
    coordinates: { lat: 18.0, lng: -28.0 },
    indicator: 'Aurora & Ocean Currents (NASA EIC)',
    latest_distress: 0.97,
  },
  {
    id: 'arctic',
    name: 'Arctic Cryo Echo',
    coordinates: { lat: 78.0, lng: 15.0 },
    indicator: 'Black Marble Night Lights (SVS 5313)',
    latest_distress: 0.88,
  },
  {
    id: 'amazon',
    name: 'Amazon Canopy Pulse',
    coordinates: { lat: -3.46, lng: -62.21 },
    indicator: 'GEOS Aerosol Simulation (SVS 5669)',
    latest_distress: 0.96,
  },
  {
    id: 'barrier_reef',
    name: 'Coral Heatwave Waltz',
    coordinates: { lat: -18.28, lng: 147.69 },
    indicator: 'Multi-Spectral Biosphere Flow',
    latest_distress: 0.95,
  },
];

const FALLBACK_DETAILS: Record<string, any> = {
  global_temp: {
    id: 'global_temp',
    name: 'Global Thermal Drift',
    indicator: 'Aurora & Ocean Currents (NASA EIC)',
    unit: '°C vs 1951-1980',
    narrative:
      'Planetary sonification reveals cyan bioluminescent ocean currents contrasting with amber city lights in expressive stereo.',
    time_series: [
      { year: 2000, raw_val: 0.39, distress_score: 0.22, pitch_hz: 210, harmonic_dissonance: 0.1, pulse_bpm: 66 },
      { year: 2005, raw_val: 0.68, distress_score: 0.44, pitch_hz: 275, harmonic_dissonance: 0.28, pulse_bpm: 82 },
      { year: 2010, raw_val: 0.72, distress_score: 0.49, pitch_hz: 295, harmonic_dissonance: 0.34, pulse_bpm: 88 },
      { year: 2012, raw_val: 0.65, distress_score: 0.41, pitch_hz: 265, harmonic_dissonance: 0.25, pulse_bpm: 80 },
      { year: 2016, raw_val: 1.01, distress_score: 0.76, pitch_hz: 415, harmonic_dissonance: 0.66, pulse_bpm: 116 },
      { year: 2020, raw_val: 1.02, distress_score: 0.78, pitch_hz: 425, harmonic_dissonance: 0.68, pulse_bpm: 118 },
      { year: 2023, raw_val: 1.17, distress_score: 0.89, pitch_hz: 480, harmonic_dissonance: 0.82, pulse_bpm: 130 },
      { year: 2024, raw_val: 1.28, distress_score: 0.95, pitch_hz: 510, harmonic_dissonance: 0.9, pulse_bpm: 138 },
      { year: 2026, raw_val: 1.32, distress_score: 0.97, pitch_hz: 525, harmonic_dissonance: 0.93, pulse_bpm: 142 },
    ],
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Cryo Echo',
    indicator: 'Black Marble Night Lights (SVS 5313)',
    unit: 'Million sq km',
    narrative:
      'Sharp bell-like plucks map satellite-observed urban settlement clusters and electrical light density across continents.',
    time_series: [
      { year: 2000, raw_val: 6.32, distress_score: 0.15, pitch_hz: 180, harmonic_dissonance: 0.05, pulse_bpm: 60 },
      { year: 2005, raw_val: 5.57, distress_score: 0.32, pitch_hz: 230, harmonic_dissonance: 0.18, pulse_bpm: 72 },
      { year: 2010, raw_val: 4.9, distress_score: 0.48, pitch_hz: 290, harmonic_dissonance: 0.35, pulse_bpm: 86 },
      { year: 2012, raw_val: 3.41, distress_score: 0.95, pitch_hz: 520, harmonic_dissonance: 0.88, pulse_bpm: 140 },
      { year: 2015, raw_val: 4.41, distress_score: 0.6, pitch_hz: 340, harmonic_dissonance: 0.5, pulse_bpm: 98 },
      { year: 2020, raw_val: 3.82, distress_score: 0.82, pitch_hz: 460, harmonic_dissonance: 0.74, pulse_bpm: 125 },
      { year: 2024, raw_val: 4.28, distress_score: 0.68, pitch_hz: 380, harmonic_dissonance: 0.58, pulse_bpm: 105 },
      { year: 2026, raw_val: 3.65, distress_score: 0.88, pitch_hz: 490, harmonic_dissonance: 0.82, pulse_bpm: 132 },
    ],
  },
  amazon: {
    id: 'amazon',
    name: 'Amazon Canopy Pulse',
    indicator: 'GEOS Aerosol Simulation (SVS 5669)',
    unit: 'Normalized Anomaly',
    narrative:
      'Three simultaneous synthesized instruments sonify mineral dust (bass triangle), organic smoke (mid square), and sea salt (high sine).',
    time_series: [
      { year: 2000, raw_val: 0.82, distress_score: 0.08, pitch_hz: 150, harmonic_dissonance: 0.02, pulse_bpm: 55 },
      { year: 2005, raw_val: 0.74, distress_score: 0.35, pitch_hz: 240, harmonic_dissonance: 0.22, pulse_bpm: 75 },
      { year: 2010, raw_val: 0.69, distress_score: 0.52, pitch_hz: 310, harmonic_dissonance: 0.4, pulse_bpm: 90 },
      { year: 2015, raw_val: 0.65, distress_score: 0.64, pitch_hz: 360, harmonic_dissonance: 0.55, pulse_bpm: 102 },
      { year: 2020, raw_val: 0.58, distress_score: 0.8, pitch_hz: 440, harmonic_dissonance: 0.75, pulse_bpm: 120 },
      { year: 2024, raw_val: 0.52, distress_score: 0.92, pitch_hz: 510, harmonic_dissonance: 0.89, pulse_bpm: 138 },
      { year: 2026, raw_val: 0.5, distress_score: 0.96, pitch_hz: 540, harmonic_dissonance: 0.94, pulse_bpm: 145 },
    ],
  },
  barrier_reef: {
    id: 'barrier_reef',
    name: 'Coral Heatwave Waltz',
    indicator: 'Multi-Spectral Biosphere Flow',
    unit: 'Deg C above baseline',
    narrative:
      'Continuous sine pads morph through musical scales as the scan line sweeps across global continental coastlines and oceanic gyres.',
    time_series: [
      { year: 2000, raw_val: 0.2, distress_score: 0.1, pitch_hz: 160, harmonic_dissonance: 0.04, pulse_bpm: 58 },
      { year: 2005, raw_val: 0.5, distress_score: 0.25, pitch_hz: 210, harmonic_dissonance: 0.15, pulse_bpm: 68 },
      { year: 2010, raw_val: 0.7, distress_score: 0.38, pitch_hz: 260, harmonic_dissonance: 0.28, pulse_bpm: 78 },
      { year: 2016, raw_val: 1.9, distress_score: 0.9, pitch_hz: 480, harmonic_dissonance: 0.85, pulse_bpm: 130 },
      { year: 2020, raw_val: 1.4, distress_score: 0.75, pitch_hz: 410, harmonic_dissonance: 0.68, pulse_bpm: 115 },
      { year: 2024, raw_val: 2.1, distress_score: 0.98, pitch_hz: 530, harmonic_dissonance: 0.92, pulse_bpm: 142 },
      { year: 2026, raw_val: 2.0, distress_score: 0.95, pitch_hz: 515, harmonic_dissonance: 0.9, pulse_bpm: 140 },
    ],
  },
  eyes_on_earth: {
    id: 'eyes_on_earth',
    name: 'Eyes on Earth Live',
    indicator: 'NASA Eyes on Earth Visible Earth (Daily)',
    unit: 'Reflectance Index',
    narrative:
      "Real-time satellite mosaic scraped from NASA's Eyes on the Earth, bringing today's planetary cloud systems and land features into dynamic sound.",
    time_series: [
      { year: 2000, raw_val: 0.35, distress_score: 0.2, pitch_hz: 200, harmonic_dissonance: 0.08, pulse_bpm: 65 },
      { year: 2005, raw_val: 0.5, distress_score: 0.38, pitch_hz: 250, harmonic_dissonance: 0.2, pulse_bpm: 78 },
      { year: 2010, raw_val: 0.62, distress_score: 0.45, pitch_hz: 280, harmonic_dissonance: 0.3, pulse_bpm: 85 },
      { year: 2016, raw_val: 0.88, distress_score: 0.72, pitch_hz: 395, harmonic_dissonance: 0.6, pulse_bpm: 112 },
      { year: 2020, raw_val: 0.94, distress_score: 0.8, pitch_hz: 435, harmonic_dissonance: 0.7, pulse_bpm: 120 },
      { year: 2024, raw_val: 1.15, distress_score: 0.92, pitch_hz: 500, harmonic_dissonance: 0.88, pulse_bpm: 135 },
      { year: 2026, raw_val: 1.25, distress_score: 0.96, pitch_hz: 525, harmonic_dissonance: 0.93, pulse_bpm: 142 },
    ],
  },
  realtime_precipitation: {
    id: 'realtime_precipitation',
    name: 'Global Precipitation',
    indicator: 'Near Real-Time Precipitation (SVS 4285)',
    unit: 'mm/h',
    narrative:
      'Near real-time global precipitation scraped from NASA SVS 4285 and the GPM constellation, sonifying active rain bands and storm fronts worldwide.',
    time_series: [
      { year: 2000, raw_val: 2.1, distress_score: 0.12, pitch_hz: 180, harmonic_dissonance: 0.06, pulse_bpm: 64 },
      { year: 2005, raw_val: 2.3, distress_score: 0.28, pitch_hz: 220, harmonic_dissonance: 0.16, pulse_bpm: 74 },
      { year: 2010, raw_val: 2.6, distress_score: 0.42, pitch_hz: 280, harmonic_dissonance: 0.26, pulse_bpm: 84 },
      { year: 2016, raw_val: 3.4, distress_score: 0.78, pitch_hz: 420, harmonic_dissonance: 0.65, pulse_bpm: 118 },
      { year: 2020, raw_val: 3.6, distress_score: 0.84, pitch_hz: 450, harmonic_dissonance: 0.72, pulse_bpm: 124 },
      { year: 2024, raw_val: 3.9, distress_score: 0.92, pitch_hz: 495, harmonic_dissonance: 0.86, pulse_bpm: 136 },
      { year: 2026, raw_val: 4.1, distress_score: 0.96, pitch_hz: 520, harmonic_dissonance: 0.92, pulse_bpm: 140 },
    ],
  },
};

function interpolateTelemetry(timeSeries: any[] | undefined, targetYear: number) {
  if (!timeSeries || timeSeries.length === 0) {
    return {
      year: targetYear,
      raw_val: 0.5,
      distress_score: 0.5,
      pitch_hz: 300,
      harmonic_dissonance: 0.3,
      pulse_bpm: 80,
    };
  }

  const exact = timeSeries.find((p) => p.year === targetYear);
  if (exact) return exact;

  const sorted = [...timeSeries].sort((a, b) => a.year - b.year);
  if (targetYear <= sorted[0].year) return sorted[0];
  if (targetYear >= sorted[sorted.length - 1].year) return sorted[sorted.length - 1];

  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].year <= targetYear && sorted[i + 1].year >= targetYear) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  const t = (targetYear - lower.year) / (upper.year - lower.year);
  return {
    year: targetYear,
    raw_val: +(lower.raw_val + t * ((upper.raw_val ?? lower.raw_val) - lower.raw_val)).toFixed(2),
    distress_score: +(lower.distress_score + t * (upper.distress_score - lower.distress_score)).toFixed(3),
    pitch_hz: Math.round(lower.pitch_hz + t * (upper.pitch_hz - lower.pitch_hz)),
    harmonic_dissonance: +(
      lower.harmonic_dissonance +
      t * (upper.harmonic_dissonance - lower.harmonic_dissonance)
    ).toFixed(3),
    pulse_bpm: Math.round(lower.pulse_bpm + t * (upper.pulse_bpm - lower.pulse_bpm)),
  };
}

function formatActiveMetric(regionId: string, rawVal: number | undefined): string {
  if (rawVal === undefined || Number.isNaN(rawVal)) return '--';
  if (regionId === 'global_temp' || regionId === 'barrier_reef') {
    const sign = rawVal >= 0 ? '+' : '';
    return `${sign}${rawVal.toFixed(2)} °C`;
  }
  if (regionId === 'arctic') {
    return `${rawVal.toFixed(2)} M km²`;
  }
  if (regionId === 'amazon') {
    return `${rawVal.toFixed(2)} NDVI`;
  }
  if (regionId === 'realtime_precipitation') {
    return `${rawVal.toFixed(2)} mm/h`;
  }
  if (regionId === 'eyes_on_earth') {
    return `${rawVal.toFixed(2)} Refl`;
  }
  return rawVal.toFixed(2);
}

export const App: React.FC = () => {
  const sonificationEngine = useMemo(() => new SonificationEngine(), []);
  const narrator = useMemo(() => new Narrator(), []);

  // UI State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [regions, setRegions] = useState<HotspotRegion[]>(FALLBACK_REGIONS);
  const [selectedRegionId, setSelectedRegionId] = useState<string>('eyes_on_earth');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [volume, setVolume] = useState<number>(0.75);
  const [regionDetail, setRegionDetail] = useState<any>(FALLBACK_DETAILS.eyes_on_earth);
  const [autoSweep, setAutoSweep] = useState<boolean>(true);

  // Sonification & 3D Planet Scan Line State
  const [currentBandIndex, setCurrentBandIndex] = useState<number>(0);
  const [peakY, setPeakY] = useState<number>(0.5);
  const [featureColor, setFeatureColor] = useState<string>('#38bdf8');
  const [selectedStyle, setSelectedStyle] = useState<StyleId>('auto');
  const [resolvedStyle, setResolvedStyle] = useState<Exclude<StyleId, 'auto'>>('duet');
  const [scaleId, setScaleId] = useState<ScaleId>('pentatonic');
  const [speed, setSpeed] = useState<number>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  // Planetary Image Texture State - Defaults to NASA Eyes on Earth live imagery
  const [textureUrl, setTextureUrl] = useState<string>('/textures/eyes_on_earth_now.jpg');
  const [customTexture, setCustomTexture] = useState<THREE.CanvasTexture | null>(null);
  const [customImageName, setCustomImageName] = useState<string>('');
  const [isCustomLoaded, setIsCustomLoaded] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // 3D Earth Loading State (Skeleton UI)
  const [isEarthLoading, setIsEarthLoading] = useState<boolean>(true);
  const [earthLoadingMessage, setEarthLoadingMessage] = useState<string>(
    "Connecting to NASA's Eyes on the Earth..."
  );
  const [earthLoadingSubMessage, setEarthLoadingSubMessage] = useState<string>(
    'Scraping NOAA-21 / VIIRS true-color 24-hour composite (bottom-right preview)...'
  );

  // References for live scheduler loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const analysisRef = useRef(analysis);
  analysisRef.current = analysis;
  const currentBandRef = useRef(currentBandIndex);
  currentBandRef.current = currentBandIndex;
  const resolvedStyleRef = useRef(resolvedStyle);
  resolvedStyleRef.current = resolvedStyle;
  const scaleIdRef = useRef(scaleId);
  scaleIdRef.current = scaleId;
  const speedRef = useRef(speed);
  speedRef.current = speed;

  const rawImageDataRef = useRef<ImageData | null>(null);
  const imageSonifierRef = useRef<ImageSonifier | null>(null);

  if (!imageSonifierRef.current) {
    imageSonifierRef.current = new ImageSonifier({
      engine: sonificationEngine,
      narrator,
      bandCount: BAND_COUNT,
      speed,
      volume,
      style: selectedStyle,
      scaleId,
    });
  }

  // Load backend regions if available, fallback gracefully
  useEffect(() => {
    fetch('http://localhost:8000/api/regions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRegions(data);
          if (!data.some((r: HotspotRegion) => r.id === selectedRegionId)) {
            setSelectedRegionId(data[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Helper to load planetary textures with Skeleton UI transition
  const applyTextureWithSkeleton = useCallback((url: string, onLoaded?: () => void) => {
    setIsEarthLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setTextureUrl(url);
      setTimeout(() => {
        setIsEarthLoading(false);
        onLoaded?.();
      }, 450);
    };
    img.onerror = () => {
      setTextureUrl(url);
      setTimeout(() => {
        setIsEarthLoading(false);
        onLoaded?.();
      }, 450);
    };
    img.src = url;
  }, []);

  // Helper to fetch direct image URL from backend and apply to 3D Earth with CORS fallback
  const loadNasaDatasetFromBackend = useCallback(
    (
      dataset: 'eyes_on_earth' | 'precipitation',
      loadingMsg: string,
      loadingSubMsg: string,
      fallbackTextureUrl: string
    ) => {
      setIsEarthLoading(true);
      setEarthLoadingMessage(loadingMsg);
      setEarthLoadingSubMessage(loadingSubMsg);

      const endpoint =
        dataset === 'eyes_on_earth'
          ? 'http://localhost:8000/api/nasa/eyes-on-earth/url'
          : 'http://localhost:8000/api/nasa/precipitation/url';

      fetch(endpoint)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then(
          (data: {
            image_url?: string;
            fallback_url?: string;
            cors_supported?: boolean;
            local_cache_url?: string;
          }) => {
            const directUrl = data.image_url;
            if (!directUrl) {
              throw new Error('No direct image_url in response');
            }

            // Direct URL received from backend! Load onto 3D Earth
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            testImg.onload = () => {
              // Direct URL successfully loaded with CORS
              setTextureUrl(directUrl);
              setTimeout(() => {
                setIsEarthLoading(false);
              }, 450);
            };
            testImg.onerror = () => {
              // If cross-origin image loading is restricted by remote CORS headers (e.g. SVS),
              // gracefully fall back to the backend proxy URL or bundled local asset
              const proxyUrl = data.fallback_url
                ? `http://localhost:8000${data.fallback_url}`
                : fallbackTextureUrl;
              console.warn(
                `Direct cross-origin fetch for ${dataset} restricted, falling back to proxy:`,
                proxyUrl
              );
              const fallbackImg = new Image();
              fallbackImg.crossOrigin = 'anonymous';
              fallbackImg.onload = () => {
                setTextureUrl(proxyUrl);
                setTimeout(() => {
                  setIsEarthLoading(false);
                }, 450);
              };
              fallbackImg.onerror = () => {
                setTextureUrl(data.local_cache_url || fallbackTextureUrl);
                setTimeout(() => {
                  setIsEarthLoading(false);
                }, 450);
              };
              fallbackImg.src = proxyUrl;
            };
            testImg.src = directUrl;
          }
        )
        .catch((err) => {
          console.warn(`Backend URL fetch failed for ${dataset}:`, err);
          applyTextureWithSkeleton(fallbackTextureUrl);
        });
    },
    [applyTextureWithSkeleton]
  );

  // Pre-fetch live Eyes on Earth image URL on startup
  useEffect(() => {
    loadNasaDatasetFromBackend(
      'eyes_on_earth',
      "Scraping NASA's Eyes on the Earth Live Mosaic...",
      'Receiving direct image URL from NOAA-21 / VIIRS true-color 24-hour composite...',
      '/textures/eyes_on_earth_now.jpg'
    );
  }, [loadNasaDatasetFromBackend]);

  // Fetch telemetry for selected region
  useEffect(() => {
    fetch(`http://localhost:8000/api/region/${selectedRegionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setRegionDetail(data);
      })
      .catch(() => {
        setRegionDetail(FALLBACK_DETAILS[selectedRegionId] || FALLBACK_DETAILS.global_temp);
      });
  }, [selectedRegionId]);

  // Analyze active image frame when textureUrl changes
  useEffect(() => {
    if (isCustomLoaded) return;
    let isCancelled = false;

    if (imageSonifierRef.current) {
      imageSonifierRef.current.loadImage(textureUrl).then((imgData) => {
        if (!isCancelled) {
          rawImageDataRef.current = imgData;
        }
      }).catch(() => {});
    }

    analyzeImageFromUrl(textureUrl, { bandCount: BAND_COUNT, scanMode: 'lr' })
      .then(({ result }) => {
        if (isCancelled) return;
        setAnalysis(result);
        const autoStyle = selectStyle(result.summary);
        if (selectedStyle === 'auto') {
          setResolvedStyle(autoStyle);
        }
      })
      .catch((err) => {
        console.warn('Image analysis fallback:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [textureUrl, isCustomLoaded, selectedStyle]);

  // Trigger sound generation and visual update for a specific band
  const playBandStep = useCallback(
    (bandIdx: number) => {
      const currentAnalysis = analysisRef.current;
      if (!currentAnalysis || !currentAnalysis.bands[bandIdx]) return;

      const band = currentAnalysis.bands[bandIdx];
      const output = mapBandToEvents(band, {
        style: resolvedStyleRef.current,
        scaleId: scaleIdRef.current,
        maxBrightness: currentAnalysis.maxBrightness,
        bandCount: BAND_COUNT,
        bandIndex: bandIdx,
      });

      // Play synthesized audio notes via Web Audio DSP
      sonificationEngine.scheduleEvents(output.events);

      // Update probe beacon latitude, feature telemetry and caption
      setPeakY(band.peakY);
      setFeatureColor(band.featureColor);
      setCurrentCaption(output.caption);

      // Voice narration if enabled
      const speedIntervalMs = SPEED_INTERVALS_MS[Math.max(0, Math.min(4, speedRef.current - 1))];
      narrator.updateCaption(output.caption, speedIntervalMs);
    },
    [sonificationEngine, narrator]
  );

  // Playback scheduler stepping through meridians
  useEffect(() => {
    if (!isPlaying) {
      sonificationEngine.stopScheduler();
      return;
    }

    const getStepSec = () => {
      const ms = SPEED_INTERVALS_MS[Math.max(0, Math.min(4, speed - 1))];
      return ms / 1000;
    };

    sonificationEngine.startScheduler(getStepSec, () => {
      const nextIdx = (currentBandRef.current + 1) % BAND_COUNT;
      setCurrentBandIndex(nextIdx);
      currentBandRef.current = nextIdx;
      playBandStep(nextIdx);

      // Smoothly sync Year Tuner (2000 to 2026)
      const synYear = 2000 + Math.round((nextIdx / (BAND_COUNT - 1)) * 26);
      setSelectedYear(synYear);
    });

    return () => {
      sonificationEngine.stopScheduler();
    };
  }, [isPlaying, speed, sonificationEngine, playBandStep]);

  // Handle Play/Stop Toggle
  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      sonificationEngine.stopScheduler();
      setIsPlaying(false);
    } else {
      sonificationEngine.init();
      sonificationEngine.setVolume(volume);
      setIsPlaying(true);
      playBandStep(currentBandIndex);
    }
  }, [isPlaying, sonificationEngine, volume, playBandStep, currentBandIndex]);

  // Handle Seek / Scrub to a specific meridian band
  const handleSeekBand = useCallback(
    (bandIndex: number) => {
      const clamped = Math.max(0, Math.min(BAND_COUNT - 1, bandIndex));
      setCurrentBandIndex(clamped);
      currentBandRef.current = clamped;
      playBandStep(clamped);
      const synYear = 2000 + Math.round((clamped / (BAND_COUNT - 1)) * 26);
      setSelectedYear(synYear);
    },
    [playBandStep]
  );

  // Handle track selection - Immediately scrapes / fetches live NASA Eyes on Earth or SVS 4285 imagery
  const handleSelectRegion = useCallback(
    (regionId: string) => {
      setSelectedRegionId(regionId);
      setIsCustomLoaded(false);
      setCustomTexture(null);

      const mapping = REGION_TRACK_MAP[regionId] || REGION_TRACK_MAP.eyes_on_earth;

      // 1. If Real-Time Global Precipitation is selected (NASA SVS 4285)
      if (regionId === 'realtime_precipitation') {
        loadNasaDatasetFromBackend(
          'precipitation',
          'Scraping NASA SVS 4285 Precipitation...',
          'Receiving direct image URL for near real-time global GPM IMERG composite...',
          '/textures/imergert_1080p.now.png'
        );
      }
      // 2. If Eyes on Earth Live is selected (NASA Eyes on Earth - Visible Earth Panel)
      else if (regionId === 'eyes_on_earth') {
        loadNasaDatasetFromBackend(
          'eyes_on_earth',
          "Scraping NASA's Eyes on the Earth Live Mosaic...",
          'Receiving direct image URL from NOAA-21 / VIIRS true-color 24-hour composite...',
          '/textures/eyes_on_earth_now.jpg'
        );
      }
      // 3. For other preset tracks, load their respective planetary textures
      else {
        setEarthLoadingMessage(`Loading ${mapping.label}...`);
        setEarthLoadingSubMessage('Mapping planetary dataset to 3D sphere');
        applyTextureWithSkeleton(mapping.textureUrl);
      }

      if (selectedStyle === 'auto') {
        setResolvedStyle(mapping.defaultStyle as Exclude<StyleId, 'auto'>);
      }

      if (isPlaying) {
        playBandStep(currentBandIndex);
      }
    },
    [isPlaying, currentBandIndex, playBandStep, selectedStyle, applyTextureWithSkeleton, loadNasaDatasetFromBackend]
  );

  // Handle custom image frame upload: simultaneously analyze and sonify
  const handleUploadImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

          const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          rawImageDataRef.current = imgData;

          const result = analyzeImageData(imgData.data, CANVAS_WIDTH, CANVAS_HEIGHT, {
            bandCount: BAND_COUNT,
            scanMode: 'lr',
          });

          setAnalysis(result);
          const autoStyle = selectStyle(result.summary);
          if (selectedStyle === 'auto') {
            setResolvedStyle(autoStyle);
          }

          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          setCustomTexture(texture);
          setIsCustomLoaded(true);
          setCustomImageName(file.name);

          // Reset to band 0 and simultaneously trigger sonification
          setCurrentBandIndex(0);
          currentBandRef.current = 0;
          if (isPlaying) {
            playBandStep(0);
          } else {
            // Instant feedback sound on image load
            sonificationEngine.init();
            sonificationEngine.setVolume(volume);
            if (result.bands[0]) {
              const output = mapBandToEvents(result.bands[0], {
                style: autoStyle,
                scaleId,
                maxBrightness: result.maxBrightness,
                bandCount: BAND_COUNT,
                bandIndex: 0,
              });
              sonificationEngine.scheduleEvents(output.events);
            }
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [selectedStyle, isPlaying, playBandStep, sonificationEngine, volume, scaleId]
  );

  // Trigger instantaneous whole-image analysis and polyphonic chord sonification
  const handleInstantSonify = useCallback(async () => {
    sonificationEngine.init();
    sonificationEngine.setVolume(volume);
    if (imageSonifierRef.current) {
      if (rawImageDataRef.current) {
        await imageSonifierRef.current.playInstantChord(rawImageDataRef.current);
      } else {
        await imageSonifierRef.current.playInstantChord(textureUrl);
      }
    }
  }, [sonificationEngine, volume, textureUrl]);

  // Pick up all frequencies along active vertical scan line and play simultaneously
  const handleSonifyCurrentLine = useCallback(() => {
    sonificationEngine.init();
    sonificationEngine.setVolume(volume);
    const audioContext = sonificationEngine.getAudioContext();
    if (rawImageDataRef.current && audioContext) {
      const stepWidth = CANVAS_WIDTH / BAND_COUNT;
      const x = Math.min(CANVAS_WIDTH - 1, Math.floor((currentBandIndex + 0.5) * stepWidth));
      sonifyScanLine(rawImageDataRef.current, x, audioContext, 0.45);
    } else {
      playBandStep(currentBandIndex);
    }
  }, [sonificationEngine, volume, currentBandIndex, playBandStep]);

  const handleStyleChange = useCallback((st: StyleId) => {
    setSelectedStyle(st);
    if (st === 'auto') {
      if (analysisRef.current) {
        setResolvedStyle(selectStyle(analysisRef.current.summary));
      }
    } else {
      setResolvedStyle(st);
    }
  }, []);

  const handleToggleVoice = useCallback(() => {
    const newState = narrator.toggle();
    setVoiceEnabled(newState);
  }, [narrator]);

  const handleVolumeChange = useCallback(
    (v: number) => {
      setVolume(v);
      sonificationEngine.setVolume(v);
    },
    [sonificationEngine]
  );

  const handlePrevTrack = useCallback(() => {
    if (regions.length === 0) return;
    const idx = regions.findIndex((r) => r.id === selectedRegionId);
    const prevIdx = idx <= 0 ? regions.length - 1 : idx - 1;
    handleSelectRegion(regions[prevIdx].id);
  }, [regions, selectedRegionId, handleSelectRegion]);

  const handleNextTrack = useCallback(() => {
    if (regions.length === 0) return;
    const idx = regions.findIndex((r) => r.id === selectedRegionId);
    const nextIdx = idx < 0 || idx >= regions.length - 1 ? 0 : idx + 1;
    handleSelectRegion(regions[nextIdx].id);
  }, [regions, selectedRegionId, handleSelectRegion]);

  const handleManualYearChange = useCallback(
    (y: number) => {
      setSelectedYear(y);
      // Map year (2000-2026) to band (0-47)
      const mappedBand = Math.round(((y - 2000) / 26) * (BAND_COUNT - 1));
      handleSeekBand(mappedBand);
    },
    [handleSeekBand]
  );

  const activePoint = useMemo(() => {
    return interpolateTelemetry(regionDetail?.time_series, selectedYear);
  }, [regionDetail, selectedYear]);

  const activeMetricLabel = formatActiveMetric(selectedRegionId, activePoint?.raw_val);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#e2e5ec]">
      <RadioScreen
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        sonificationEngine={sonificationEngine}
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelectRegion={handleSelectRegion}
        onPrevTrack={handlePrevTrack}
        onNextTrack={handleNextTrack}
        regionName={
          isCustomLoaded
            ? `Uploaded: ${customImageName}`
            : regionDetail?.name || 'Global Mean Temperature'
        }
        indicator={
          isCustomLoaded
            ? 'User Frame Sonification'
            : regionDetail?.indicator || 'Satellite Observation'
        }
        narrative={regionDetail?.narrative || ''}
        activeMetricLabel={activeMetricLabel}
        distressScore={activePoint?.distress_score ?? 0.5}
        pitchHz={activePoint?.pitch_hz ?? 300}
        pulseBpm={activePoint?.pulse_bpm ?? 80}
        year={selectedYear}
        onYearChange={handleManualYearChange}
        autoSweep={autoSweep}
        onToggleAutoSweep={() => setAutoSweep((prev) => !prev)}
        currentBandIndex={currentBandIndex}
        peakY={peakY}
        lineVoices={analysis?.bands[currentBandIndex]?.lineVoices || []}
        selectedStyle={selectedStyle}
        resolvedStyle={resolvedStyle}
        onSelectStyle={handleStyleChange}
        scaleId={scaleId}
        onSelectScale={setScaleId}
        speed={speed}
        onChangeSpeed={setSpeed}
        voiceEnabled={voiceEnabled}
        onToggleVoice={handleToggleVoice}
        onUploadImage={handleUploadImage}
        isCustomLoaded={isCustomLoaded}
        customImageName={customImageName}
        textureUrl={textureUrl}
        customTexture={customTexture}
        currentCaption={currentCaption}
        onSeekBand={handleSeekBand}
        featureColor={featureColor}
        isEarthLoading={isEarthLoading}
        earthLoadingMessage={earthLoadingMessage}
        earthLoadingSubMessage={earthLoadingSubMessage}
        onInstantSonify={handleInstantSonify}
        onSonifyCurrentLine={handleSonifyCurrentLine}
      />
    </div>
  );
};

export default App;
