import React from 'react';
import { Radio } from 'lucide-react';

export interface PlaylistTrackMeta {
  songTitle: string;
  fmFreq: string;
  subtitle: string;
}

export const TRACK_METADATA: Record<string, PlaylistTrackMeta> = {
  eyes_on_earth: {
    songTitle: 'Eyes on Earth Live',
    fmFreq: '88.1 MHz',
    subtitle: "NASA's Live Visible Earth Today",
  },
  realtime_precipitation: {
    songTitle: 'Global Precipitation',
    fmFreq: '90.3 MHz',
    subtitle: 'Real-Time Precipitation (NASA SVS 4285)',
  },
  global_temp: {
    songTitle: 'Current Rain and Snow',
    fmFreq: '92.5 MHz',
    subtitle: 'Global Current Rain & Snow from Satellite',
  },
  arctic: {
    songTitle: 'Arctic Cryo Echo',
    fmFreq: '94.8 MHz',
    subtitle: 'Polar Sea Ice & Warming',
  },
  amazon: {
    songTitle: 'GEOS Aerosols',
    fmFreq: '98.2 MHz',
    subtitle: 'Tropical Heat & Drought',
  },
  barrier_reef: {
    songTitle: 'Coral Heatwave Waltz',
    fmFreq: '101.4 MHz',
    subtitle: 'Ocean Surface Temp Anomaly',
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
}) => {
  return (
    <div className="w-full flex flex-col gap-2 p-3.5 rounded-2xl neu-raised select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-[#4b5260]" />
          <span className="text-[10px] font-mono tracking-[0.16em] text-[#4b5260] uppercase font-bold">
            Playlist · Now Playing
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#646c7a] tabular-nums">
          {regions.length} SONGS
        </span>
      </div>

      {/* 4 Crisp Radio Tracks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {regions.map((region, idx) => {
          const isCurrent = region.id === selectedRegionId;
          const meta = TRACK_METADATA[region.id] || {
            songTitle: region.name,
            fmFreq: `${(88.1 + idx * 4.2).toFixed(1)} MHz`,
            subtitle: region.indicator,
          };

          return (
            <button
              key={region.id}
              type="button"
              onClick={() => onSelectRegion(region.id)}
              className={`group relative text-left rounded-xl px-3 py-2.5 transition-all duration-150 flex items-center justify-between gap-2.5 ${
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
      </div>
    </div>
  );
};
