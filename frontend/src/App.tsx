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
  sea_surface_temp: {
    textureUrl: '/textures/sea_surface_temperature.png',
    defaultStyle: 'flow',
    label: 'Sea Surface Temperature (NASA Worldview GHRSST)',
  },
  worldview_sst: {
    textureUrl: '/textures/sea_surface_temperature.png',
    defaultStyle: 'flow',
    label: 'Sea Surface Temperature (NASA Worldview GHRSST)',
  },
  current_snow_rain: {
    textureUrl: '/textures/worldview_snow_and_rain.png',
    defaultStyle: 'duet',
    label: 'Current Snow & Rain (NASA Worldview IMERG)',
  },
  worldview_snow_rain: {
    textureUrl: '/textures/worldview_snow_and_rain.png',
    defaultStyle: 'duet',
    label: 'Current Snow & Rain (NASA Worldview IMERG)',
  },
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
};

const FALLBACK_REGIONS: HotspotRegion[] = [
  {
    id: 'sea_surface_temp',
    name: 'Sea Surface Temperature',
    coordinates: { lat: 0.0, lng: -140.0 },
    indicator: 'GHRSST L4 MUR Sea Surface Temperature (Worldview)',
    latest_distress: 0.96,
  },
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
];

const FALLBACK_DETAILS: Record<string, any> = {
  sea_surface_temp: {
    id: 'sea_surface_temp',
    name: 'Sea Surface Temperature',
    indicator: 'GHRSST L4 MUR Sea Surface Temperature (Worldview)',
    unit: '°C',
    narrative:
      'Real-time global sea surface temperature retrieved directly from NASA Worldview using GHRSST L4 MUR Sea Surface Temperature and Coastlines layers.',
    raw_val: 22.9,
    distress_score: 0.96,
    pitch_hz: 525,
    pulse_bpm: 142,
  },
  worldview_sst: {
    id: 'sea_surface_temp',
    name: 'Sea Surface Temperature',
    indicator: 'GHRSST L4 MUR Sea Surface Temperature (Worldview)',
    unit: '°C',
    narrative:
      'Real-time global sea surface temperature retrieved directly from NASA Worldview using GHRSST L4 MUR Sea Surface Temperature and Coastlines layers.',
    raw_val: 22.9,
    distress_score: 0.96,
    pitch_hz: 525,
    pulse_bpm: 142,
  },
  current_snow_rain: {
    id: 'current_snow_rain',
    name: 'Current Snow and Rain',
    indicator: 'IMERG Precipitation Rate & Land Mask (Worldview)',
    unit: 'mm / hour',
    narrative:
      'Real-time global precipitation and snow rates retrieved from NASA Worldview using GIBS IMERG Precipitation Rate and OpenStreetMap Land Mask.',
    raw_val: 3.8,
    distress_score: 0.94,
    pitch_hz: 515,
    pulse_bpm: 138,
  },
  worldview_snow_rain: {
    id: 'current_snow_rain',
    name: 'Current Snow and Rain',
    indicator: 'IMERG Precipitation Rate & Land Mask (Worldview)',
    unit: 'mm / hour',
    narrative:
      'Real-time global precipitation and snow rates retrieved from NASA Worldview using GIBS IMERG Precipitation Rate and OpenStreetMap Land Mask.',
    raw_val: 3.8,
    distress_score: 0.94,
    pitch_hz: 515,
    pulse_bpm: 138,
  },
  eyes_on_earth: {
    id: 'eyes_on_earth',
    name: 'Eyes on Earth Live',
    indicator: 'NASA Eyes on Earth Visible Earth (Daily)',
    unit: 'Reflectance Index',
    narrative:
      "Real-time satellite mosaic scraped from NASA's Eyes on the Earth, bringing today's planetary cloud systems and land features into dynamic sound.",
    raw_val: 1.25,
    distress_score: 0.96,
    pitch_hz: 525,
    pulse_bpm: 142,
  },
  realtime_precipitation: {
    id: 'realtime_precipitation',
    name: 'Global Precipitation',
    indicator: 'Near Real-Time Precipitation (SVS 4285)',
    unit: 'mm/h',
    narrative:
      'Near real-time global precipitation scraped from NASA SVS 4285 and the GPM constellation, sonifying active rain bands and storm fronts worldwide.',
    raw_val: 4.1,
    distress_score: 0.96,
    pitch_hz: 520,
    pulse_bpm: 140,
  },
};

function formatActiveMetric(regionId: string, rawVal: number | undefined): string {
  if (rawVal === undefined || Number.isNaN(rawVal)) return '--';
  if (regionId === 'sea_surface_temp' || regionId === 'worldview_sst') {
    return `${rawVal.toFixed(1)} °C`;
  }
  if (regionId === 'current_snow_rain' || regionId === 'worldview_snow_rain') {
    return `${rawVal.toFixed(2)} mm/h`;
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
  const [selectedRegionId, setSelectedRegionId] = useState<string>('sea_surface_temp');
  const [volume, setVolume] = useState<number>(0.75);
  const [regionDetail, setRegionDetail] = useState<any>(FALLBACK_DETAILS.sea_surface_temp);
  const [autoSweep, setAutoSweep] = useState<boolean>(true);

  // Sonification & 3D Planet Scan Line State
  const [currentBandIndex, setCurrentBandIndex] = useState<number>(0);
  const [peakY, setPeakY] = useState<number>(0.5);
  const [featureColor, setFeatureColor] = useState<string>('#38bdf8');
  const [selectedStyle, setSelectedStyle] = useState<StyleId>('auto');
  const [resolvedStyle, setResolvedStyle] = useState<Exclude<StyleId, 'auto'>>('flow');
  const [scaleId, setScaleId] = useState<ScaleId>('pentatonic');
  const [speed, setSpeed] = useState<number>(3);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const [currentCaption, setCurrentCaption] = useState<string>('');

  // Planetary Image Texture State - Defaults to NASA Worldview Sea Surface Temperature
  const [textureUrl, setTextureUrl] = useState<string>('/textures/sea_surface_temperature.png');
  const [customTexture, setCustomTexture] = useState<THREE.CanvasTexture | null>(null);
  const [customImageName, setCustomImageName] = useState<string>('');
  const [isCustomLoaded, setIsCustomLoaded] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // 3D Earth Loading State (Skeleton UI)
  const [isEarthLoading, setIsEarthLoading] = useState<boolean>(true);
  const [earthLoadingMessage, setEarthLoadingMessage] = useState<string>(
    'Scraping NASA Worldview Sea Surface Temperature...'
  );
  const [earthLoadingSubMessage, setEarthLoadingSubMessage] = useState<string>(
    'Retrieving real-time GHRSST MUR Sea Surface Temperature from NASA Worldview...'
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
      dataset: 'eyes_on_earth' | 'precipitation' | 'worldview_snow_rain' | 'worldview_sst',
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
          : dataset === 'worldview_sst'
          ? 'http://localhost:8000/api/nasa/worldview-sst/url'
          : dataset === 'worldview_snow_rain'
          ? 'http://localhost:8000/api/nasa/worldview-snow-rain/url'
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

  // Pre-fetch live Sea Surface Temperature image URL from NASA Worldview on startup
  useEffect(() => {
    loadNasaDatasetFromBackend(
      'worldview_sst',
      'Scraping NASA Worldview Sea Surface Temperature...',
      'Receiving real-time GHRSST MUR Sea Surface Temperature from NASA Worldview...',
      '/textures/sea_surface_temperature.png'
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
        setRegionDetail(FALLBACK_DETAILS[selectedRegionId] || FALLBACK_DETAILS.current_snow_rain);
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

      // 1. If Sea Surface Temperature is selected (NASA Worldview GHRSST)
      if (regionId === 'sea_surface_temp' || regionId === 'worldview_sst') {
        loadNasaDatasetFromBackend(
          'worldview_sst',
          'Scraping NASA Worldview Sea Surface Temperature...',
          'Receiving real-time GHRSST MUR Sea Surface Temperature from NASA Worldview...',
          '/textures/sea_surface_temperature.png'
        );
      }
      // 2. If Current Snow and Rain is selected (NASA Worldview IMERG & Land Mask)
      else if (regionId === 'current_snow_rain' || regionId === 'worldview_snow_rain') {
        loadNasaDatasetFromBackend(
          'worldview_snow_rain',
          'Scraping NASA Worldview Snow & Rain...',
          'Receiving real-time IMERG Precipitation Rate & Land Mask from NASA Worldview...',
          '/textures/worldview_snow_and_rain.png'
        );
      }
      // 2. If Real-Time Global Precipitation is selected (NASA SVS 4285)
      else if (regionId === 'realtime_precipitation') {
        loadNasaDatasetFromBackend(
          'precipitation',
          'Scraping NASA SVS 4285 Precipitation...',
          'Receiving direct image URL for near real-time global GPM IMERG composite...',
          '/textures/imergert_1080p.now.png'
        );
      }
      // 3. If Eyes on Earth Live is selected (NASA Eyes on Earth - Visible Earth Panel)
      else if (regionId === 'eyes_on_earth') {
        loadNasaDatasetFromBackend(
          'eyes_on_earth',
          "Scraping NASA's Eyes on the Earth Live Mosaic...",
          'Receiving direct image URL from NOAA-21 / VIIRS true-color 24-hour composite...',
          '/textures/eyes_on_earth_now.jpg'
        );
      }
      // 4. For other preset tracks, load their respective planetary textures
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

  const activeMetricLabel = formatActiveMetric(selectedRegionId, regionDetail?.raw_val);

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
            : regionDetail?.name || 'Current Snow and Rain'
        }
        indicator={
          isCustomLoaded
            ? 'User Frame Sonification'
            : regionDetail?.indicator || 'Satellite Observation'
        }
        narrative={regionDetail?.narrative || ''}
        activeMetricLabel={activeMetricLabel}
        distressScore={regionDetail?.distress_score ?? 0.5}
        pitchHz={regionDetail?.pitch_hz ?? 300}
        pulseBpm={regionDetail?.pulse_bpm ?? 80}
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
