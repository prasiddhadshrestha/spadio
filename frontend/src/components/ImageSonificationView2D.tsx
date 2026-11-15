import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Activity, Radio, Crosshair } from 'lucide-react';
import { EarthSkeleton } from './EarthSkeleton';
import { LineVoiceData } from '../sonification/analyzer';

const BAND_COUNT = 48;

export interface ImageSonificationView2DProps {
  textureUrl?: string;
  customTexture?: THREE.Texture | null;
  currentBandIndex: number;
  peakY: number;
  lineVoices?: LineVoiceData[];
  isPlaying: boolean;
  activeStyle: string;
  featureColor?: string;
  onSeekBand?: (bandIndex: number) => void;
  isLoading?: boolean;
  loadingMessage?: string;
  loadingSubMessage?: string;
}

export const ImageSonificationView2D: React.FC<ImageSonificationView2DProps> = ({
  textureUrl,
  customTexture,
  currentBandIndex,
  peakY,
  lineVoices = [],
  isPlaying,
  activeStyle,
  featureColor = '#f59e0b',
  onSeekBand,
  isLoading,
  loadingMessage,
  loadingSubMessage,
}) => {
  const [imageSrc, setImageSrc] = useState<string>(
    textureUrl || '/textures/eyes_on_earth_now.jpg'
  );
  const [hoverBand, setHoverBand] = useState<number | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Update image source whenever textureUrl or customTexture changes
  useEffect(() => {
    if (customTexture?.image) {
      try {
        if (customTexture.image instanceof HTMLCanvasElement) {
          setImageSrc(customTexture.image.toDataURL());
          return;
        }
        if (customTexture.image instanceof HTMLImageElement && customTexture.image.src) {
          setImageSrc(customTexture.image.src);
          return;
        }
      } catch (err) {
        console.warn('Could not extract custom texture image:', err);
      }
    }
    if (textureUrl) {
      setImageSrc(textureUrl);
    }
  }, [textureUrl, customTexture]);

  // Calculate current scan line position and coordinates
  const scanProgressPercent = ((currentBandIndex + 0.5) / BAND_COUNT) * 100;
  const probeYPercent = Math.max(5, Math.min(95, peakY * 100));

  const meridianDeg = Math.round((currentBandIndex / BAND_COUNT) * 360 - 180);
  const meridianLabel =
    meridianDeg === 0
      ? '0°'
      : meridianDeg > 0
      ? `${meridianDeg}°E`
      : `${Math.abs(meridianDeg)}°W`;

  const probeLat = Math.round(90 - peakY * 180);
  const probeLatLabel =
    probeLat === 0 ? '0° EQ' : probeLat > 0 ? `${probeLat}°N` : `${Math.abs(probeLat)}°S`;

  // Handle interactive seek by clicking on the 2D map
  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!mapContainerRef.current || !onSeekBand) return;
      const rect = mapContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      const targetBand = Math.floor(ratio * BAND_COUNT);
      onSeekBand(targetBand);
    },
    [onSeekBand]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetBand = Math.floor(ratio * BAND_COUNT);
    setHoverBand(targetBand);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverBand(null);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#06080e] flex flex-col items-center justify-center p-3 select-none">
      {/* Background Deep Starfield & Radial Aura */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, #93c5fd, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 150px 120px, #38bdf8, rgba(0,0,0,0))',
          backgroundSize: '240px 240px',
        }}
      />
      <div className="absolute inset-0 bg-radial-gradient from-cyan-950/20 via-transparent to-[#06080e]/90 pointer-events-none" />

      {/* Main 2D Projection Map Display Container */}
      <div className="relative w-full max-w-[96%] aspect-[2/1] max-h-[76%] rounded-2xl overflow-hidden border border-white/[0.14] shadow-[0_16px_40px_rgba(0,0,0,0.85)] bg-[#0a0d14]">
        {/* 2D Satellite / Climate Layer Image */}
        <img
          src={imageSrc}
          alt="2D Sonification Satellite Map"
          className="w-full h-full object-fill pointer-events-none transition-opacity duration-300"
        />

        {/* Semi-transparent Dark Tint & Coordinate Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-black/15">
          {/* Latitude Lines */}
          <div className="absolute inset-x-0 top-[16.6%] border-b border-white/[0.08] dashed" />
          <div className="absolute inset-x-0 top-[33.3%] border-b border-white/[0.08]" />
          <div className="absolute inset-x-0 top-[50%] border-b border-cyan-400/25 shadow-[0_0_8px_rgba(34,211,238,0.3)]" />
          <div className="absolute inset-x-0 top-[66.6%] border-b border-white/[0.08]" />
          <div className="absolute inset-x-0 top-[83.3%] border-b border-white/[0.08] dashed" />

          {/* Prime Meridian (0°) Center Marker */}
          <div className="absolute inset-y-0 left-[50%] border-r border-cyan-400/30" />

          {/* Quarter Meridians (-90° and +90°) */}
          <div className="absolute inset-y-0 left-[25%] border-r border-white/[0.08]" />
          <div className="absolute inset-y-0 left-[75%] border-r border-white/[0.08]" />

          {/* Latitude HUD Ticks (Left edge) */}
          <div className="absolute left-1.5 inset-y-0 flex flex-col justify-between py-2 text-[8px] font-mono font-semibold text-slate-400 pointer-events-none opacity-75">
            <span>+90°N</span>
            <span>+45°N</span>
            <span className="text-cyan-300">0° EQ</span>
            <span>-45°S</span>
            <span>-90°S</span>
          </div>

          {/* Longitude HUD Ticks (Bottom edge) */}
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-3 text-[8px] font-mono font-semibold text-slate-400 pointer-events-none opacity-75">
            <span>-180°W</span>
            <span>-90°W</span>
            <span className="text-cyan-300">0° (GREENWICH)</span>
            <span>+90°E</span>
            <span>+180°E</span>
          </div>
        </div>

        {/* Interactive Scrubbing Click Surface */}
        <div
          ref={mapContainerRef}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 cursor-crosshair z-20 group"
          title="Click or drag to seek meridian band"
        >
          {/* Hover preview scan line */}
          {hoverBand !== null && hoverBand !== currentBandIndex && (
            <div
              className="absolute inset-y-0 w-[1px] bg-white/40 pointer-events-none transition-all duration-75"
              style={{ left: `${((hoverBand + 0.5) / BAND_COUNT) * 100}%` }}
            >
              <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-white/90 border border-white/20 whitespace-nowrap">
                Seek: M{hoverBand + 1}
              </div>
            </div>
          )}

          {/* ACTIVE MERIDIAN SCAN LINE */}
          <div
            className="absolute inset-y-0 pointer-events-none transition-all duration-200 ease-linear"
            style={{
              left: `${scanProgressPercent}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {/* Luminous Light Aura Sweep */}
            <div className="absolute inset-y-0 -left-4 w-8 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none" />

            {/* Core Laser Scan Line */}
            <div className="w-[2px] h-full bg-gradient-to-b from-cyan-300 via-white to-cyan-300 shadow-[0_0_12px_#22d3ee,0_0_4px_#ffffff]" />

            {/* Top Scanning Head Indicator */}
            <div className="absolute -top-1 -left-3.5 flex flex-col items-center">
              <div className="px-1.5 py-0.5 rounded bg-cyan-500 text-[#06080e] font-mono text-[8px] font-bold shadow-[0_0_8px_#22d3ee]">
                M{currentBandIndex + 1}
              </div>
              <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] border-t-cyan-400" />
            </div>

            {/* ALL SIMULTANEOUS LINE VOICE NODES ALONG THE SCAN LINE */}
            {lineVoices.map((voice, idx) => {
              const vTop = Math.max(4, Math.min(96, voice.y * 100));
              const isPrimaryPeak = Math.abs(voice.y - peakY) < 0.04;
              if (isPrimaryPeak) return null;
              return (
                <div
                  key={`${voice.sliceIndex}-${idx}`}
                  className="absolute -left-[6px] flex items-center justify-center transition-all duration-200 pointer-events-none"
                  style={{
                    top: `${vTop}%`,
                    transform: 'translateY(-50%)',
                  }}
                >
                  {isPlaying && (
                    <div
                      className="absolute w-5 h-5 rounded-full border animate-ping"
                      style={{
                        borderColor: `${voice.featureColor}aa`,
                        boxShadow: `0 0 8px ${voice.featureColor}`,
                      }}
                    />
                  )}
                  <div
                    className="w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center"
                    style={{
                      borderColor: voice.featureColor,
                      backgroundColor: `${voice.featureColor}44`,
                      boxShadow: `0 0 8px ${voice.featureColor}`,
                    }}
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>
              );
            })}

            {/* PEAK ACOUSTIC PROBE BEACON */}
            <div
              className="absolute -left-3 flex items-center justify-center transition-all duration-300 pointer-events-none"
              style={{
                top: `${probeYPercent}%`,
                transform: 'translateY(-50%)',
              }}
            >
              {/* Pulsing Concentric Radar Rings */}
              {isPlaying && (
                <div
                  className="absolute w-8 h-8 rounded-full border animate-ping"
                  style={{
                    borderColor: `${featureColor}cc`,
                    boxShadow: `0 0 12px ${featureColor}`,
                  }}
                />
              )}
              <div
                className="w-5 h-5 rounded-full border-2 backdrop-blur-xs flex items-center justify-center"
                style={{
                  borderColor: featureColor,
                  backgroundColor: `${featureColor}33`,
                  boxShadow: `0 0 12px ${featureColor}`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#ffffff]" />
              </div>

              {/* Probe Telemetry Floating Tag */}
              <div
                className="absolute left-6 whitespace-nowrap bg-[#0a0d14]/90 backdrop-blur-md px-2 py-0.5 rounded border shadow-lg text-[9px] font-mono flex items-center gap-1.5"
                style={{
                  borderColor: `${featureColor}66`,
                  color: featureColor,
                }}
              >
                <Crosshair className="w-2.5 h-2.5" style={{ color: featureColor }} />
                <span className="font-semibold text-white">{probeLatLabel}</span>
                {lineVoices.length > 1 && (
                  <span className="text-cyan-300">+{lineVoices.length - 1} voices</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Top-Left Telemetry Overlay */}
        <div className="absolute top-2.5 left-3 pointer-events-none z-10 flex items-center gap-2">
          <div className="bg-[#0a0d14]/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/[0.1] text-[9.5px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span className="font-semibold text-white">2D EQUIR-PROJECTION</span>
            <span className="text-slate-500">·</span>
            <span className="text-cyan-300">
              {meridianLabel} ({currentBandIndex + 1}/{BAND_COUNT})
            </span>
          </div>
        </div>

        {/* Top-Right Style Readout */}
        <div className="absolute top-2.5 right-3 pointer-events-none z-10">
          <div className="bg-[#0a0d14]/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/[0.1] text-[9px] font-mono text-slate-400 uppercase">
            DSP: <span className="text-amber-400 font-semibold">{activeStyle}</span>
          </div>
        </div>
      </div>

      {/* Sub-display Diagnostics Bar */}
      <div className="w-full max-w-[96%] mt-2.5 flex items-center justify-between px-2 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-300 font-semibold">
              {isPlaying ? 'AUDIO SCANNING' : 'STANDBY'}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span>Click anywhere on 2D map to jump meridians</span>
        </div>

        <div className="flex items-center gap-2 text-slate-300">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>
            BAND {currentBandIndex + 1} OF {BAND_COUNT}
          </span>
        </div>
      </div>

      {/* Skeleton Loading State when scraping live NASA imagery */}
      <EarthSkeleton
        isLoading={Boolean(isLoading)}
        message={loadingMessage}
        subMessage={loadingSubMessage}
      />
    </div>
  );
};
