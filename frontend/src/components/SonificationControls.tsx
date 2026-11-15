import React, { useRef } from 'react';
import { Volume2, VolumeX, Upload, Sparkles, Music, Sliders, Zap, Waves } from 'lucide-react';
import { STYLES, SCALES, ScaleId, StyleId } from '../sonification/presets';
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
  onInstantSonify?: () => void;
  onSonifyCurrentLine?: () => void;
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

  return (
    <div className="w-full flex flex-col gap-2.5 p-3 rounded-2xl neu-raised select-none text-[#1e2430]">
      {/* 1. Header with Mode Badge & Narration Toggle */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#ff5a1f]" />
          <span className="text-[10px] font-mono tracking-[0.16em] text-[#4b5260] uppercase font-bold">
            Sound Engine &amp; Image Sonification
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice Narration Button */}
          <button
            type="button"
            onClick={onToggleVoice}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase transition-all ${
              voiceEnabled
                ? 'bg-[#ff5a1f] text-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]'
                : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
            }`}
            title="Spoken voice description of scanned planetary features"
          >
            {voiceEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
            <span>Voice {voiceEnabled ? 'On' : 'Off'}</span>
          </button>

          {/* Upload Custom Frame Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase transition-all ${
              isCustomLoaded
                ? 'bg-[#12151c] text-sky-400 shadow-[inset_0_1px_4px_rgba(0,0,0,0.7)]'
                : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
            }`}
            title="Upload custom image to sonify on 3D Earth"
          >
            <Upload className="w-2.5 h-2.5" />
            <span className="max-w-[70px] truncate">{isCustomLoaded ? customImageName : 'Upload'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* 2. Sound Style Buttons */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[9px] font-mono text-[#646c7a]">
          <span className="uppercase font-semibold">Sonification Style</span>
          <span className="text-amber-700 font-bold uppercase">
            Active: {resolvedStyle} {selectedStyle === 'auto' ? '(Auto-Detected)' : ''}
          </span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {styleList.map((st) => {
            const isSelected = selectedStyle === st;
            const isAutoActive = selectedStyle === 'auto' && resolvedStyle === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStyleClick(st)}
                className={`py-1 px-1 rounded-lg text-center text-[9.5px] font-mono font-bold uppercase transition-all ${
                  isSelected
                    ? 'bg-[#12151c] text-white shadow-[inset_0_1px_4px_rgba(0,0,0,0.85)] ring-1 ring-white/10'
                    : isAutoActive
                    ? 'bg-[#ff5a1f]/15 text-[#ff5a1f] ring-1 ring-[#ff5a1f]/40 font-bold'
                    : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
        <p className="text-[9.5px] text-[#646c7a] leading-tight line-clamp-1 italic px-0.5">
          {activeWhy}
        </p>
      </div>

      {/* 3. Musical Scale & Scan Speed Controls */}
      <div className="grid grid-cols-2 gap-2 pt-0.5 border-t border-black/[0.06]">
        {/* Musical Scale */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[9px] font-mono text-[#646c7a] uppercase font-semibold">
            <Music className="w-2.5 h-2.5" />
            <span>Scale</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {scaleList.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => handleScaleClick(sc)}
                className={`py-1 px-0.5 rounded-lg text-[9px] font-mono font-bold uppercase transition-all ${
                  scaleId === sc
                    ? 'bg-[#12151c] text-white shadow-[inset_0_1px_4px_rgba(0,0,0,0.85)]'
                    : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
                }`}
              >
                {sc === 'wholeTone' ? 'Whole' : sc.slice(0, 5)}
              </button>
            ))}
          </div>
        </div>

        {/* Scan Speed */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-mono text-[#646c7a] uppercase font-semibold">
            <div className="flex items-center gap-1">
              <Sliders className="w-2.5 h-2.5" />
              <span>Speed</span>
            </div>
            <span className="font-bold text-[#1e2430]">{speed}x</span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedChange(spd)}
                className={`py-1 px-0.5 rounded-lg text-[9px] font-mono font-bold transition-all ${
                  speed === spd
                    ? 'bg-[#ff5a1f] text-white shadow-[inset_1px_1px_3px_rgba(0,0,0,0.3)]'
                    : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Live Meridian Audio Caption Readout Ticker */}
      {currentCaption && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#0f131a] text-slate-200 text-[10px] font-mono shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          <span className="text-[#38bdf8] font-bold flex-shrink-0">SCAN:</span>
          <span className="truncate text-slate-300">{currentCaption}</span>
        </div>
      )}
    </div>
  );
};
