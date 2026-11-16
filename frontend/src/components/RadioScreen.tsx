import React, { useState } from 'react';
import { Play, Square, SkipBack, SkipForward, Radio as RadioIcon, Globe, Scan } from 'lucide-react';
import * as THREE from 'three';
import { AudioSpectrum } from './AudioSpectrum';
import { VolumeDial } from './VolumeDial';
import { PlaylistPanel, PlaylistRegionItem, TRACK_METADATA } from './PlaylistPanel';
import { PlanetScene } from './PlanetScene';
import { ImageSonificationView2D } from './ImageSonificationView2D';
import { SonificationControls } from './SonificationControls';
import { SonificationEngine } from '../sonification/SonificationEngine';
import { ScaleId, StyleId, BAND_COUNT } from '../sonification/presets';
import { LineVoiceData } from '../sonification/analyzer';
import { playDetentClick, triggerHaptic } from '../utils/tactileAudio';

interface Region extends PlaylistRegionItem {
  coordinates: { lat: number; lng: number };
}

export interface RadioScreenProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  sonificationEngine: SonificationEngine;
  regions: Region[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  regionName: string;
  indicator: string;
  narrative: string;
  activeMetricLabel: string;
  distressScore: number;
  pitchHz: number;
  pulseBpm: number;
  autoSweep: boolean;
  onToggleAutoSweep: () => void;

  // Sonification Engine Props
  currentBandIndex: number;
  peakY: number;
  lineVoices?: LineVoiceData[];
  selectedStyle: StyleId;
  resolvedStyle: Exclude<StyleId, 'auto'>;
  onSelectStyle: (style: StyleId) => void;
  scaleId: ScaleId;
  onSelectScale: (scale: ScaleId) => void;
  speed: number;
  onChangeSpeed: (spd: number) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onUploadImage: (file: File) => void;
  isCustomLoaded: boolean;
  customImageName: string;
  textureUrl: string;
  customTexture: THREE.Texture | null;
  currentCaption: string;
  onSeekBand: (bandIndex: number) => void;
  featureColor?: string;
  isEarthLoading?: boolean;
  earthLoadingMessage?: string;
  earthLoadingSubMessage?: string;
  onInstantSonify?: () => void;
  onSonifyCurrentLine?: () => void;
}

export const RadioScreen: React.FC<RadioScreenProps> = ({
  volume,
  onVolumeChange,
  isPlaying,
  onTogglePlay,
  sonificationEngine,
  regions,
  selectedRegionId,
  onSelectRegion,
  onPrevTrack,
  onNextTrack,
  regionName,
  narrative,
  activeMetricLabel,
  distressScore,
  pitchHz,
  pulseBpm,
  autoSweep,
  onToggleAutoSweep,
  currentBandIndex,
  peakY,
  lineVoices = [],
  selectedStyle,
  resolvedStyle,
  onSelectStyle,
  scaleId,
  onSelectScale,
  speed,
  onChangeSpeed,
  voiceEnabled,
  onToggleVoice,
  onUploadImage,
  isCustomLoaded,
  customImageName,
  textureUrl,
  customTexture,
  currentCaption,
  onSeekBand,
  featureColor = '#38bdf8',
  isEarthLoading,
  earthLoadingMessage,
  earthLoadingSubMessage,
  onInstantSonify,
  onSonifyCurrentLine,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const activeIdx = Math.max(
    0,
    regions.findIndex((r) => r.id === selectedRegionId)
  );
  const activeRegion = regions[activeIdx];
  const activeMeta = activeRegion ? TRACK_METADATA[activeRegion.id] : undefined;
  const activeSongTitle = isCustomLoaded
    ? `Custom: ${customImageName}`
    : activeMeta?.songTitle || activeRegion?.name || 'Planetary Sonification';

  const handlePlayToggle = () => {
    playDetentClick(isPlaying ? 560 : 1040, 0.035);
    triggerHaptic(8);
    onTogglePlay();
  };

  const handlePrev = () => {
    playDetentClick(820, 0.03);
    triggerHaptic(5);
    onPrevTrack();
  };

  const handleNext = () => {
    playDetentClick(920, 0.03);
    triggerHaptic(5);
    onNextTrack();
  };

  const currentLongitudeDeg = Math.round((currentBandIndex / BAND_COUNT) * 360 - 180);
  const meridianLabel = `${Math.abs(currentLongitudeDeg)}°${currentLongitudeDeg >= 0 ? 'E' : 'W'}`;

  return (
    <div className="w-screen h-screen neu-surface p-3 sm:p-4 md:p-5 overflow-y-auto md:overflow-hidden select-none">
      {/* 50 / 50 Split: Left Radio Deck + Right 3D Earth Sonification Window */}
      <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {/* LEFT 1/2: Retro Neumorphic Radio Control Deck */}
        <section className="h-full flex flex-col justify-between gap-3 sm:gap-3.5 md:overflow-y-auto pr-0.5">

          {/* 1. Audio Spectrum Meter */}
          <div className="flex-1 min-h-[125px] max-h-[160px]">
            <AudioSpectrum
              engine={sonificationEngine}
              isPlaying={isPlaying}
              pitchHz={pitchHz}
              pulseBpm={pulseBpm}
              distressScore={distressScore}
            />
          </div>

          {/* 2. Sound Engine & Image Sonification DSP Controls */}
          <div className="flex-shrink-0">
            <SonificationControls
              selectedStyle={selectedStyle}
              resolvedStyle={resolvedStyle}
              onSelectStyle={onSelectStyle}
              scaleId={scaleId}
              onSelectScale={onSelectScale}
              speed={speed}
              onChangeSpeed={onChangeSpeed}
              voiceEnabled={voiceEnabled}
              onToggleVoice={onToggleVoice}
              onUploadImage={onUploadImage}
              isCustomLoaded={isCustomLoaded}
              customImageName={customImageName}
              currentCaption={currentCaption}
              currentBandIndex={currentBandIndex}
            />
          </div>

          {/* 3. Playlist Cards */}
          <div className="flex-shrink-0">
            <PlaylistPanel
              regions={regions}
              selectedRegionId={selectedRegionId}
              onSelectRegion={onSelectRegion}
              isPlaying={isPlaying}
              activeMetricLabel={activeMetricLabel}
              onUploadImage={onUploadImage}
              isCustomLoaded={isCustomLoaded}
              customImageName={customImageName}
            />
          </div>

          {/* 4. Volume Dial + Transport Buttons */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:py-3 rounded-2xl neu-raised flex-shrink-0">
            <VolumeDial
              volume={volume}
              onVolumeChange={onVolumeChange}
              isPlaying={isPlaying}
              onTogglePlay={handlePlayToggle}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="w-10 h-10 rounded-xl flex items-center justify-center neu-raised-sm text-[#1e2430] hover:scale-[1.03] active:scale-[0.97] transition-all"
                title="Previous track"
                aria-label="Previous track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={handlePlayToggle}
                className={`h-10 px-5 rounded-xl flex items-center justify-center gap-2 font-mono text-[11px] font-bold tracking-wider uppercase transition-all active:scale-[0.97] ${
                  isPlaying
                    ? 'bg-[#141820] text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),3px_3px_8px_rgba(160,169,185,0.5)]'
                    : 'bg-[#ff5a1f] hover:bg-[#ff6a33] text-white shadow-[4px_4px_10px_rgba(160,169,185,0.65),-3px_-3px_8px_rgba(255,255,255,0.8)]'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-10 h-10 rounded-xl flex items-center justify-center neu-raised-sm text-[#1e2430] hover:scale-[1.03] active:scale-[0.97] transition-all"
                title="Next track"
                aria-label="Next track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT 1/2: 3D Earth or 2D Image Sonification Screen */}
        <main className="relative h-[46vh] md:h-full w-full rounded-[28px] overflow-hidden neu-glass-bezel">
          {viewMode === '3d' ? (
            <PlanetScene
              textureUrl={textureUrl}
              customTexture={customTexture}
              currentBandIndex={currentBandIndex}
              isPlaying={isPlaying}
              activeStyle={resolvedStyle}
              isLoading={isEarthLoading}
              loadingMessage={earthLoadingMessage}
              loadingSubMessage={earthLoadingSubMessage}
            />
          ) : (
            <ImageSonificationView2D
              textureUrl={textureUrl}
              customTexture={customTexture}
              currentBandIndex={currentBandIndex}
              peakY={peakY}
              lineVoices={lineVoices}
              isPlaying={isPlaying}
              activeStyle={resolvedStyle}
              featureColor={featureColor}
              onSeekBand={onSeekBand}
              isLoading={isEarthLoading}
              loadingMessage={earthLoadingMessage}
              loadingSubMessage={earthLoadingSubMessage}
            />
          )}

          {/* Subtle Recessed Glass Lens Specular Sheen */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[28px]"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 26%, transparent 50%)',
              boxShadow: 'inset 0 0 48px rgba(0, 0, 0, 0.72)',
            }}
          />

          {/* Top Scope Status Badge and 3D / 2D View Switch Button */}
          <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2 bg-[#0a0d14]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.12] shadow-lg">
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{
                  backgroundColor: featureColor || '#22d3ee',
                  boxShadow: `0 0 8px ${featureColor || '#22d3ee'}`,
                }}
              />
              <span className="text-[10px] font-mono tracking-[0.16em] text-slate-100 uppercase font-semibold">
                {viewMode === '3d' ? 'Scan Line Active' : '2D Sonification'} · M{currentBandIndex + 1}/{BAND_COUNT} ({meridianLabel})
              </span>
            </div>

            {/* Prominent Dual-Perspective Segmented Switcher & 3D/2D View Mode */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <nav className="flex items-center gap-1.5 p-1 rounded-full bg-[#0a0d14]/92 backdrop-blur-md border border-white/[0.18] shadow-2xl">
                <a
                  href="/"
                  onClick={(e) => {
                    // Fall back to in-app 2D view if standalone dev server redirects root /
                    if (window.location.pathname === '/live-earth/' || window.location.pathname === '/live-earth') {
                      e.preventDefault();
                      setViewMode('2d');
                    }
                  }}
                  className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold tracking-wider text-cyan-400 hover:text-white hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_18px_rgba(6,182,212,0.5)] active:scale-95"
                  title="Switch to 2D SVS Laboratory Console"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                  <span>📻 2D SVS Console</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/25 text-cyan-200 border border-cyan-400/30 uppercase">
                    Spectrometer ↗
                  </span>
                </a>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161c28] border border-white/10 text-white shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span className="text-[11px] font-mono font-bold tracking-wider text-slate-100">
                    🛰️ 3D Live Earth
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                    Active
                  </span>
                </div>
              </nav>

              <div className="flex items-center bg-[#0a0d14]/90 backdrop-blur-md p-1 rounded-full border border-white/[0.15] shadow-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold tracking-wider transition-all active:scale-95 ${
                    viewMode === '3d'
                      ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                  title="Switch to 3D Earth Globe view"
                  aria-label="Switch to 3D Earth Globe view"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-mono font-bold tracking-wider transition-all active:scale-95 ${
                    viewMode === '2d'
                      ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                  }`}
                  title="Switch to 2D Image Sonification view"
                  aria-label="Switch to 2D Image Sonification view"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>2D</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Floating Now-Playing / Sonification Diagnostic Pill */}
          <div className="absolute bottom-4 left-5 right-5 pointer-events-none z-10">
            <div className="bg-[#0a0d14]/88 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/[0.1] shadow-2xl flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isPlaying ? '#34d399' : '#f59e0b',
                      boxShadow: `0 0 8px ${isPlaying ? '#34d399' : '#f59e0b'}`,
                    }}
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {activeSongTitle}
                  </span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-[11px] text-slate-300 truncate">{regionName}</span>
                </div>

                <span className="text-xs font-mono font-bold text-amber-300 flex-shrink-0 tabular-nums">
                  {activeMetricLabel}
                </span>
              </div>

              {currentCaption ? (
                <p className="text-[11px] font-mono text-cyan-300 leading-snug line-clamp-1">
                  ♪ {currentCaption}
                </p>
              ) : narrative ? (
                <p className="text-[11px] text-slate-400 leading-snug line-clamp-1">
                  {narrative}
                </p>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
