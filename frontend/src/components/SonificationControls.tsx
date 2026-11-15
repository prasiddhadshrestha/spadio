import React, { useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Upload,
  Sparkles,
  Music,
  Sliders,
  Zap,
  Waves,
  Layers,
  Radio,
} from 'lucide-react';
import { STYLES, ScaleId, StyleId, BAND_COUNT } from '../sonification/presets';
import { playDetentClick, triggerHaptic } from '../utils/tactileAudio';

interface SonificationControlsProps {
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
  currentCaption: string;
  currentBandIndex?: number;
}

export const SonificationControls: React.FC<SonificationControlsProps> = ({
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
  currentCaption,
  currentBandIndex = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const styleList: StyleId[] = ['auto', 'duet', 'sparkle', 'flow', 'layers', 'field'];
  const scaleList: ScaleId[] = ['pentatonic', 'minor', 'wholeTone'];

  const handleStyleClick = (s: StyleId) => {
    playDetentClick(880, 0.02);
    triggerHaptic(4);
    onSelectStyle(s);
  };

  const handleScaleClick = (sc: ScaleId) => {
    playDetentClick(760, 0.02);
    triggerHaptic(3);
    onSelectScale(sc);
  };

  const handleSpeedChange = (newSpeed: number) => {
    playDetentClick(600 + newSpeed * 80, 0.02);
    triggerHaptic(3);
    onChangeSpeed(newSpeed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  const activeWhy = STYLES[selectedStyle === 'auto' ? resolvedStyle : selectedStyle]?.why || '';

  const getStyleIcon = (st: StyleId) => {
    switch (st) {
      case 'auto':
        return <Sparkles className="w-3 h-3 flex-shrink-0" />;
      case 'duet':
        return <Music className="w-3 h-3 flex-shrink-0" />;
      case 'sparkle':
        return <Zap className="w-3 h-3 flex-shrink-0" />;
      case 'flow':
        return <Waves className="w-3 h-3 flex-shrink-0" />;
      case 'layers':
        return <Layers className="w-3 h-3 flex-shrink-0" />;
      case 'field':
        return <Radio className="w-3 h-3 flex-shrink-0" />;
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5 sm:gap-3 p-3.5 sm:p-4 rounded-2xl neu-raised select-none text-[#1e2430]">
      {/* SECTION 1: SOUND ENGINE */}
      <div className="flex flex-col gap-2">
        {/* Sound Engine Section Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#ff5a1f] shadow-[0_0_6px_rgba(255,90,31,0.6)]" />
            <span className="text-[10px] font-mono tracking-[0.16em] text-[#2c3340] uppercase font-bold">
              Sound Engine
            </span>
            <span className="text-[9px] font-mono text-[#788190] uppercase hidden sm:inline">
              · Synthesis Style
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[8.5px] font-mono uppercase font-semibold text-[#646c7a]">
              Active:
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[#12151c] text-amber-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/[0.08]">
              {resolvedStyle}
              {selectedStyle === 'auto' ? ' (Auto)' : ''}
            </span>
          </div>
        </div>

        {/* 6-Style Synthesizer Buttons */}
        <div className="grid grid-cols-6 gap-1.5">
          {styleList.map((st) => {
            const isSelected = selectedStyle === st;
            const isAutoActive = selectedStyle === 'auto' && resolvedStyle === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStyleClick(st)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-center transition-all ${
                  isSelected
                    ? 'bg-[#12151c] text-white shadow-[inset_0_1px_4px_rgba(0,0,0,0.85)] ring-1 ring-white/10'
                    : isAutoActive
                    ? 'bg-[#ff5a1f]/15 text-[#ff5a1f] ring-1 ring-[#ff5a1f]/40 font-bold'
                    : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430] active:scale-[0.98]'
                }`}
                title={`Select ${st} sonification style`}
              >
                <span className={isSelected ? 'text-[#ff5a1f]' : isAutoActive ? 'text-[#ff5a1f]' : 'text-[#788190]'}>
                  {getStyleIcon(st)}
                </span>
                <span className="text-[8.5px] font-mono font-bold uppercase tracking-wider">
                  {st}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Acoustic Rationale */}
        <div className="flex items-center gap-1.5 px-1 text-[9px] text-[#555d6d] leading-tight italic">
          <span className="text-[#ff5a1f] font-mono font-bold flex-shrink-0">♪</span>
          <span className="truncate">{activeWhy}</span>
        </div>
      </div>

      {/* SECTION 2: IMAGE SONIFICATION */}
      <div className="flex flex-col gap-2 pt-2 border-t border-black/[0.06]">
        {/* Image Sonification Section Header */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
            <span className="text-[10px] font-mono tracking-[0.16em] text-[#2c3340] uppercase font-bold">
              Image Sonification
            </span>
            <span className="text-[9px] font-mono text-[#788190] uppercase hidden sm:inline">
              · Optical Scanner
            </span>
          </div>

          {/* Voice Narration Toggle Switch */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase transition-all ${
              voiceEnabled
                ? 'bg-[#12151c] text-emerald-400 border border-emerald-500/40 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]'
                : 'neu-raised-sm text-[#646c7a] hover:text-[#1e2430]'
            }`}
            title="Toggle voice narration for scanned planetary features"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                voiceEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
              }`}
            />
            {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
            <span>Voice {voiceEnabled ? 'On' : 'Off'}</span>
          </button>
        </div>

        {/* Sub-grid: Musical Scale Tuning & Scan Sweep Speed */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Harmonic Musical Scale */}
          <div className="flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl bg-black/[0.025] border border-black/[0.04]">
            <div className="flex items-center justify-between text-[9px] font-mono text-[#646c7a]">
              <div className="flex items-center gap-1 uppercase font-semibold">
                <Music className="w-2.5 h-2.5 text-[#38bdf8]" />
                <span>Scale</span>
              </div>
              <span className="text-[8.5px] font-bold text-[#1e2430] uppercase">
                {scaleId === 'wholeTone' ? 'Whole' : scaleId}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {scaleList.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => handleScaleClick(sc)}
                  className={`py-1.5 px-0.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                    scaleId === sc
                      ? 'bg-[#12151c] text-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.85)] border border-white/10'
                      : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
                  }`}
                >
                  {sc === 'wholeTone' ? 'Whole' : sc === 'pentatonic' ? 'Penta' : 'Minor'}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Sweep Speed */}
          <div className="flex flex-col gap-1.5 p-2 sm:p-2.5 rounded-xl bg-black/[0.025] border border-black/[0.04]">
            <div className="flex items-center justify-between text-[9px] font-mono text-[#646c7a]">
              <div className="flex items-center gap-1 uppercase font-semibold">
                <Sliders className="w-2.5 h-2.5 text-[#ff5a1f]" />
                <span>Sweep Speed</span>
              </div>
              <span className="font-bold text-[#ff5a1f]">{speed}x</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleSpeedChange(spd)}
                  className={`py-1.5 px-0.5 rounded-lg text-[9px] font-mono font-bold transition-all ${
                    speed === spd
                      ? 'bg-[#ff5a1f] text-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]'
                      : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Optical Scan Ticker / Telemetry Bar */}
        {currentCaption ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c1017] text-slate-200 text-[10px] font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="text-[#38bdf8] font-bold flex-shrink-0 tracking-wider">SCAN:</span>
            <span className="truncate text-slate-300 font-sans text-[10.5px]">{currentCaption}</span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0c1017] text-slate-400 text-[9.5px] font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/[0.08]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0 shadow-[0_0_5px_rgba(34,211,238,0.7)]" />
              <span className="text-[#38bdf8] font-bold tracking-wider">OPTICAL SCAN:</span>
              <span className="truncate text-slate-300">Meridian sonification active</span>
            </div>
            <span className="text-amber-400 font-bold tabular-nums flex-shrink-0">
              M{currentBandIndex + 1}/{BAND_COUNT}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
