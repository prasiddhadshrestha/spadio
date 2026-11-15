import React, { useEffect, useRef } from 'react';
import { EarthAudioEngine } from '../AudioEngine';

export interface AudioSpectrumEngine {
  getAnalyserData: (dataArray: Uint8Array) => void;
  getLevel?: () => number;
}

interface AudioSpectrumProps {
  engine: AudioSpectrumEngine;
  isPlaying: boolean;
  pitchHz?: number;
  pulseBpm?: number;
  distressScore?: number;
}

export const AudioSpectrum: React.FC<AudioSpectrumProps> = ({
  engine,
  isPlaying,
  pitchHz = 210,
  pulseBpm = 66,
  distressScore = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const numBars = 24;
    const numSegments = 12;
    const freqData = new Uint8Array(128);
    const barLevels = new Float32Array(numBars);
    const peakLevels = new Float32Array(numBars);
    const peakHoldTimers = new Float32Array(numBars);

    const render = () => {
      animId = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      if (isPlaying) {
        engine.getAnalyserData(freqData);
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
      ctx.lineWidth = 1;
      for (let g = 1; g <= 2; g++) {
        const gy = Math.round((height / 3) * g) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      const horizontalPad = 2;
      const usableWidth = width - horizontalPad * 2;
      const slotWidth = usableWidth / numBars;
      const barWidth = Math.max(4, Math.floor(slotWidth * 0.72));
      const segGap = 2;
      const segHeight = Math.max(2, (height - (numSegments - 1) * segGap) / numSegments);

      for (let i = 0; i < numBars; i++) {
        const exactBin = 0.8 + (i / (numBars - 1)) * 22;
        const binLow = Math.floor(exactBin);
        const binHigh = Math.min(freqData.length - 1, binLow + 1);
        const frac = exactBin - binLow;

        const rawSample = isPlaying
          ? (freqData[binLow] * (1 - frac) + freqData[binHigh] * frac) / 255.0
          : 0;

        const tiltBoost = 1 + (i / numBars) * 0.45;
        const target = isPlaying ? Math.min(1, Math.max(0.06, rawSample * tiltBoost)) : 0.04;

        if (target > barLevels[i]) {
          barLevels[i] += (target - barLevels[i]) * 0.45;
        } else {
          barLevels[i] += (target - barLevels[i]) * 0.14;
        }

        if (barLevels[i] >= peakLevels[i]) {
          peakLevels[i] = barLevels[i];
          peakHoldTimers[i] = 18;
        } else if (peakHoldTimers[i] > 0) {
          peakHoldTimers[i] -= 1;
        } else {
          peakLevels[i] = Math.max(0, peakLevels[i] - 0.015);
        }

        const activeSegs = Math.round(barLevels[i] * numSegments);
        const peakSeg = Math.min(numSegments - 1, Math.floor(peakLevels[i] * numSegments));
        const x = horizontalPad + i * slotWidth + (slotWidth - barWidth) / 2;

        for (let s = 0; s < numSegments; s++) {
          const y = height - (s + 1) * segHeight - s * segGap;
          const isLit = isPlaying ? s < activeSegs : s === 0;
          const isPeakCap = isPlaying && s === peakSeg && peakLevels[i] > 0.1;

          let litColor = '#6ee7b7';
          if (s >= numSegments - 2) {
            litColor = '#ff5a1f';
          } else if (s >= numSegments - 4) {
            litColor = '#fbbf24';
          } else if (s >= numSegments - 7) {
            litColor = '#e2e8f0';
          }

          if (isLit || isPeakCap) {
            ctx.fillStyle = litColor;
            ctx.globalAlpha = isPeakCap && !isLit ? 0.9 : isPlaying ? 0.92 : 0.28;
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.globalAlpha = 1;
          }

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, segHeight, 1);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [engine, isPlaying]);

  return (
    <div className="w-full h-full flex flex-col justify-between px-3.5 py-2.5 select-none neu-glass-bezel rounded-2xl relative overflow-hidden">
      {/* Subtle curved smoked-glass reflection */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 35%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-2 pb-1.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              isPlaying
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-[10px] font-mono tracking-[0.18em] text-slate-300 uppercase font-semibold">
            Audio Spectrum
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[10px] font-mono tabular-nums">
          <span className="text-slate-400">
            <span className="text-slate-100 font-semibold">{pitchHz}Hz</span>
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-400">
            <span className="text-amber-300 font-semibold">{pulseBpm} BPM</span>
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-400 hidden sm:inline">
            FLUX{' '}
            <span className={distressScore > 0.65 ? 'text-[#ff5a1f] font-semibold' : 'text-emerald-300 font-semibold'}>
              {Math.round(distressScore * 100)}%
            </span>
          </span>
        </div>
      </div>

      <div className="relative z-10 flex-1 w-full my-1.5 min-h-[68px]">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      <div className="relative z-10 flex justify-between text-[8.5px] font-mono tracking-wider text-slate-500 pt-1 border-t border-white/[0.05]">
        <span>60Hz</span>
        <span>250Hz</span>
        <span>1kHz</span>
        <span>4kHz</span>
        <span>12kHz</span>
      </div>
    </div>
  );
};
