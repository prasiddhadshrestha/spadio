import React from 'react';
import { Satellite, Radio, Loader2 } from 'lucide-react';

interface EarthSkeletonProps {
  isLoading: boolean;
  message?: string;
  subMessage?: string;
}

export const EarthSkeleton: React.FC<EarthSkeletonProps> = ({
  isLoading,
  message = "Scraping NASA's Eyes on the Earth Live Mosaic...",
  subMessage = 'Ingesting NOAA-21 / VIIRS true-color telemetry without orbital gaps',
}) => {
  return (
    <div
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-all duration-700 ease-out select-none ${
        isLoading
          ? 'opacity-100 backdrop-blur-[2px]'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background:
          'radial-gradient(circle at center, rgba(10, 14, 24, 0.88) 0%, rgba(6, 8, 14, 0.96) 80%)',
      }}
    >
      {/* Top Scope Status Skeleton Pill */}
      <div className="absolute top-4 left-5 right-5 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2.5 bg-[#0a0d14]/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-ping" />
          <span className="text-[10px] font-mono tracking-[0.16em] text-cyan-200 uppercase font-semibold">
            TELEMETRY INGESTION · DOWNLINK ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-2 bg-[#0a0d14]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/[0.12] text-[10px] font-mono text-amber-300">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          <span>BUFFERING</span>
        </div>
      </div>

      {/* Main Spherical Skeleton Container */}
      <div className="relative flex items-center justify-center w-[300px] h-[300px] sm:w-[340px] sm:h-[340px] md:w-[380px] md:h-[380px] lg:w-[410px] lg:h-[410px]">
        {/* Outermost Orbiting / Halo Rings */}
        <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/20 animate-skeleton-spin" />
        <div className="absolute -inset-4 rounded-full border border-cyan-500/10 pointer-events-none" />

        {/* Outer Glow Halo Rim */}
        <div
          className="absolute inset-2 rounded-full pointer-events-none"
          style={{
            boxShadow:
              '0 0 50px rgba(34, 211, 238, 0.22), inset 0 0 40px rgba(34, 211, 238, 0.1)',
          }}
        />

        {/* Spherical Skeleton Body */}
        <div className="relative w-full h-full rounded-full overflow-hidden bg-[#0c1220] border border-cyan-500/25 animate-skeleton-pulse shadow-2xl flex items-center justify-center">
          {/* Latitude Skeleton Circles */}
          <div className="absolute w-full h-[75%] rounded-full border border-white/[0.07] pointer-events-none" />
          <div className="absolute w-full h-[45%] rounded-full border border-white/[0.08] pointer-events-none" />
          <div className="absolute w-full h-[15%] rounded-full border border-cyan-400/20 pointer-events-none" />

          {/* Longitude Skeleton Ellipses */}
          <div className="absolute h-full w-[75%] rounded-full border border-white/[0.07] pointer-events-none" />
          <div className="absolute h-full w-[45%] rounded-full border border-white/[0.08] pointer-events-none" />
          <div className="absolute h-full w-[15%] rounded-full border border-cyan-400/20 pointer-events-none" />

          {/* Sweeping Shimmer Scan Wave */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="w-full h-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent" />
          </div>

          {/* Inner Depth Vignette */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.06) 0%, transparent 55%, rgba(0,0,0,0.88) 100%)',
            }}
          />

          {/* Center Skeleton HUD Readout */}
          <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 text-center max-w-[280px]">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
              <Satellite className="w-5 h-5 text-cyan-300 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-mono font-semibold tracking-wider text-white uppercase drop-shadow">
                {message}
              </p>
              <p className="text-[10px] font-mono text-cyan-300/80 leading-tight">
                {subMessage}
              </p>
            </div>

            {/* Skeleton Shimmer Progress Bar */}
            <div className="w-40 h-1.5 rounded-full bg-slate-800/90 overflow-hidden relative border border-white/10 shadow-inner mt-1">
              <div className="absolute inset-0 w-full h-full bg-cyan-400 animate-skeleton-shimmer opacity-80" />
            </div>

            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400 tracking-widest mt-0.5">
              <span>MERIDIAN RESOLUTION: 2048×1024</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating Now-Playing Skeleton Bar */}
      <div className="absolute bottom-4 left-5 right-5 pointer-events-none">
        <div className="bg-[#0a0d14]/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/[0.1] shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-2.5 w-36 rounded-full bg-slate-700/80 overflow-hidden relative">
                <div className="absolute inset-0 animate-skeleton-shimmer bg-white/20" />
              </div>
              <div className="h-2 w-48 rounded-full bg-slate-800/80 overflow-hidden relative">
                <div className="absolute inset-0 animate-skeleton-shimmer bg-white/10" />
              </div>
            </div>
          </div>

          <div className="h-3 w-16 rounded-full bg-amber-400/20 border border-amber-400/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
