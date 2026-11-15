import React, { useRef, useState } from 'react';
import { Radio, Upload, ImagePlus, Check } from 'lucide-react';
import { playDetentClick, triggerHaptic } from '../utils/tactileAudio';

export interface PlaylistTrackMeta {
  songTitle: string;
  fmFreq: string;
  subtitle: string;
}

export const TRACK_METADATA: Record<string, PlaylistTrackMeta> = {
  sea_surface_temp: {
    songTitle: 'Sea Surface Temperature',
    fmFreq: '88.1 MHz',
    subtitle: 'NASA Worldview GHRSST Sea Temp',
  },
  worldview_sst: {
    songTitle: 'Sea Surface Temperature',
    fmFreq: '88.1 MHz',
    subtitle: 'NASA Worldview GHRSST Sea Temp',
  },
  current_snow_rain: {
    songTitle: 'Sea Surface Temperature',
    fmFreq: '88.1 MHz',
    subtitle: 'NASA Worldview GHRSST Sea Temp',
  },
  eyes_on_earth: {
    songTitle: 'Eyes on Earth Live',
    fmFreq: '91.3 MHz',
    subtitle: "NASA's Live Visible Earth Today",
  },
  realtime_precipitation: {
    songTitle: 'Global Precipitation',
    fmFreq: '94.5 MHz',
    subtitle: 'Real-Time Precipitation (NASA SVS 4285)',
  },
};

export interface PlaylistRegionItem {
  id: string;
  name: string;
  indicator: string;
  latest_distress: number;
}

interface PlaylistPanelProps {
  regions: PlaylistRegionItem[];
  selectedRegionId: string;
  onSelectRegion: (id: string) => void;
  isPlaying: boolean;
  activeMetricLabel: string;
  onUploadImage: (file: File) => void;
  isCustomLoaded: boolean;
  customImageName: string;
}

const EqualizerBars: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const barColor = isPlaying ? 'bg-[#ff5a1f]' : 'bg-amber-300/75';
  return (
    <div className="flex items-end justify-center gap-[2px] w-4 h-3.5" aria-hidden="true">
      <span className={`w-[2.5px] rounded-full ${barColor} ${isPlaying ? 'eq-bar-1' : 'h-[5px]'}`} />
      <span className={`w-[2.5px] rounded-full ${barColor} ${isPlaying ? 'eq-bar-2' : 'h-[9px]'}`} />
      <span className={`w-[2.5px] rounded-full ${barColor} ${isPlaying ? 'eq-bar-3' : 'h-[6px]'}`} />
    </div>
  );
};

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({
  regions,
  selectedRegionId,
  onSelectRegion,
  isPlaying,
  activeMetricLabel,
  onUploadImage,
  isCustomLoaded,
  customImageName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      playDetentClick(940, 0.04);
      triggerHaptic(6);
      onUploadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      playDetentClick(980, 0.04);
      triggerHaptic(8);
      onUploadImage(file);
    }
  };

  const handleUploadClick = () => {
    playDetentClick(760, 0.03);
    triggerHaptic(4);
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl neu-raised select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#4b5260]" />
          <span className="text-[10px] font-mono tracking-[0.16em] text-[#4b5260] uppercase font-bold">
            Playlist · Planetary Audio Stations
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#646c7a] tabular-nums">
          {regions.length} STATIONS + 1 CUSTOM
        </span>
      </div>

      {/* 2x2 Grid: 3 Stations + Prominent Upload Button next to Global Precipitation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {regions.map((region, idx) => {
          const isCurrent = !isCustomLoaded && region.id === selectedRegionId;
          const meta = TRACK_METADATA[region.id] || {
            songTitle: region.name,
            fmFreq: `${(88.1 + idx * 3.2).toFixed(1)} MHz`,
            subtitle: region.indicator,
          };

          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelectRegion(region.id)}
              className={`group relative text-left rounded-xl px-3.5 py-2.5 sm:py-3 transition-all duration-150 flex items-center justify-between gap-2.5 ${
                isCurrent
                  ? 'bg-[#12151c] text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),2px_2px_6px_rgba(160,169,185,0.45)]'
                  : 'neu-raised-sm text-[#1c212b] hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {/* Left Signal-Orange Accent Bar on Current Track */}
              {isCurrent && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#ff5a1f]" />
              )}

              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 font-mono text-[10.5px] font-bold ${
                    isCurrent
                      ? 'bg-white/[0.08] text-white'
                      : 'neu-inset text-[#4b5260]'
                  }`}
                >
                  {isCurrent ? <EqualizerBars isPlaying={isPlaying} /> : <span>0{idx + 1}</span>}
                </div>

                <div className="min-w-0">
                  <div
                    className={`text-xs font-semibold tracking-tight truncate ${
                      isCurrent ? 'text-white' : 'text-[#14171f]'
                    }`}
                  >
                    {meta.songTitle}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isCurrent ? 'text-slate-400' : 'text-[#5a6170]'
                    }`}
                  >
                    {region.name}
                  </div>
                </div>
              </div>

              {/* Right Live Status / Frequency */}
              <div className="flex flex-col items-end flex-shrink-0">
                {isCurrent ? (
                  <>
                    <span
                      className={`text-[8.5px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${
                        isPlaying
                          ? 'bg-[#ff5a1f]/20 text-[#ff8357]'
                          : 'bg-white/10 text-amber-200'
                      }`}
                    >
                      {isPlaying ? 'Playing' : 'Cued'}
                    </span>
                    <span className="text-[9.5px] font-mono text-amber-300 mt-0.5 tabular-nums">
                      {activeMetricLabel}
                    </span>
                  </>
                ) : (
                  <span className="text-[9.5px] font-mono text-[#5a6170] tabular-nums">
                    {meta.fmFreq}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Large Prominent Custom Image Upload Card (positioned right next to Global Precipitation) */}
        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={`group relative text-left rounded-xl px-3.5 py-2.5 sm:py-3 transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer select-none ${
            isCustomLoaded
              ? 'bg-[#12151c] text-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.85),2px_2px_6px_rgba(160,169,185,0.45)] border border-[#ff5a1f]/40'
              : isDragOver
              ? 'bg-[#ff5a1f]/10 border-2 border-dashed border-[#ff5a1f] scale-[1.02]'
              : 'neu-raised-sm text-[#1c212b] hover:scale-[1.01] active:scale-[0.99] border border-dashed border-[#ff5a1f]/40 hover:border-[#ff5a1f]'
          }`}
          title="Upload or drop your own image to sonify on the 3D globe"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Left Signal-Orange Accent Bar on Active Custom Track */}
          {isCustomLoaded && (
            <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#ff5a1f]" />
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                isCustomLoaded
                  ? 'bg-[#ff5a1f] text-white shadow-[0_0_12px_rgba(255,90,31,0.55)]'
                  : 'bg-[#ff5a1f]/15 text-[#ff5a1f]'
              }`}
            >
              {isCustomLoaded ? (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
              )}
            </div>

            <div className="min-w-0">
              <div
                className={`text-xs font-semibold tracking-tight truncate flex items-center gap-1.5 ${
                  isCustomLoaded ? 'text-white' : 'text-[#14171f]'
                }`}
              >
                <span>{isCustomLoaded ? 'Custom Sonification' : 'Upload Your Image'}</span>
                {!isCustomLoaded && (
                  <span className="text-[8.5px] font-mono font-bold tracking-wider text-[#ff5a1f] px-1 py-0.2 bg-[#ff5a1f]/10 rounded uppercase">
                    Custom
                  </span>
                )}
              </div>
              <div
                className={`text-[10px] truncate ${
                  isCustomLoaded ? 'text-amber-300 font-mono font-medium' : 'text-[#5a6170]'
                }`}
              >
                {isCustomLoaded
                  ? customImageName || 'Loaded Image'
                  : 'Drop file or click to sonify'}
              </div>
            </div>
          </div>

          {/* Right Status / Action */}
          <div className="flex flex-col items-end flex-shrink-0">
            <span
              className={`text-[8.5px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-colors ${
                isCustomLoaded
                  ? 'bg-[#ff5a1f]/20 text-[#ff8357]'
                  : 'bg-[#ff5a1f]/10 text-[#ff5a1f] group-hover:bg-[#ff5a1f] group-hover:text-white'
              }`}
            >
              {isCustomLoaded ? (isPlaying ? 'Playing' : 'Active') : 'Browse'}
            </span>
            <span className="text-[9.5px] font-mono text-[#5a6170] mt-0.5 tabular-nums">
              {isCustomLoaded ? 'Custom Frame' : 'JPG / PNG'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
