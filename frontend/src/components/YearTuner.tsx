import React, { useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { playDetentClick, triggerHaptic } from '../utils/tactileAudio';

interface YearTunerProps {
  year: number;
  onYearChange: (year: number) => void;
  minYear?: number;
  maxYear?: number;
  isPlaying: boolean;
  autoSweep?: boolean;
  onToggleAutoSweep?: () => void;
  metricDisplay?: string;
}

export const YearTuner: React.FC<YearTunerProps> = ({
  year,
  onYearChange,
  minYear = 2000,
  maxYear = 2026,
  isPlaying,
  autoSweep = false,
  onToggleAutoSweep,
  metricDisplay,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingTrack = useRef(false);
  const isDraggingKnob = useRef(false);
  const lastKnobPos = useRef(0);
  const knobAccumulator = useRef(0);

  const keyYears = [2000, 2005, 2008, 2012, 2016, 2020, 2024, 2026];
  const totalYears = maxYear - minYear;
  const percent = ((year - minYear) / totalYears) * 100;
  const knobAngle = ((year - minYear) / totalYears) * 540 - 270;

  const commitYear = useCallback(
    (nextYear: number) => {
      const clamped = Math.max(minYear, Math.min(maxYear, Math.round(nextYear)));
      if (clamped !== year) {
        onYearChange(clamped);
        playDetentClick(640 + (clamped - minYear) * 22, 0.025);
        triggerHaptic(3);
      }
    },
    [minYear, maxYear, year, onYearChange]
  );

  const updateFromTrackPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      commitYear(minYear + fraction * totalYears);
    },
    [minYear, totalYears, commitYear]
  );

  const handleTrackPointerDown = (e: React.PointerEvent) => {
    isDraggingTrack.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    updateFromTrackPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingTrack.current) return;
    updateFromTrackPointer(e.clientX);
  };

  const handleTrackPointerUp = () => {
    isDraggingTrack.current = false;
  };

  const handleKnobPointerDown = (e: React.PointerEvent) => {
    isDraggingKnob.current = true;
    lastKnobPos.current = e.clientX - e.clientY;
    knobAccumulator.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleKnobPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingKnob.current) return;
    const pos = e.clientX - e.clientY;
    const delta = pos - lastKnobPos.current;
    lastKnobPos.current = pos;
    knobAccumulator.current += delta;

    const stepPx = 12;
    if (Math.abs(knobAccumulator.current) >= stepPx) {
      const steps = Math.trunc(knobAccumulator.current / stepPx);
      knobAccumulator.current -= steps * stepPx;
      commitYear(year + steps);
    }
  };

  const handleKnobPointerUp = () => {
    isDraggingKnob.current = false;
  };

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 || e.deltaX < 0 ? -1 : 1;
      commitYear(year + delta);
    },
    [year, commitYear]
  );

  useEffect(() => {
    const trackEl = trackRef.current;
    const knobEl = knobRef.current;
    trackEl?.addEventListener('wheel', handleWheel, { passive: false });
    knobEl?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      trackEl?.removeEventListener('wheel', handleWheel);
      knobEl?.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  return (
    <div className="w-full flex flex-col gap-2.5 p-3.5 rounded-2xl neu-raised select-none">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-[0.16em] text-[#4b5260] uppercase font-bold">
            Year Meter
          </span>
          {metricDisplay && (
            <span className="text-[10px] font-mono font-bold text-[#1e2430] px-2 py-0.5 rounded-full neu-inset tabular-nums">
              {metricDisplay}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleAutoSweep && (
            <button
              type="button"
              onClick={onToggleAutoSweep}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-mono font-bold tracking-wider uppercase transition-all ${
                autoSweep
                  ? 'bg-[#ff5a1f] text-white shadow-[inset_2px_2px_5px_rgba(0,0,0,0.28)]'
                  : 'neu-raised-sm text-[#4b5260] hover:text-[#1e2430]'
              }`}
              title="Automatically sweep across years 2000–2026"
            >
              {autoSweep ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
              <span>Auto</span>
            </button>
          )}

          {/* Recessed Stepper Pill */}
          <div className="flex items-center rounded-full px-1 py-0.5 neu-inset">
            <button
              type="button"
              onClick={() => commitYear(year - 1)}
              disabled={year <= minYear}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/60 text-[#2c313c] disabled:opacity-30 transition-colors"
              aria-label="Previous year"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-[#14171f] tabular-nums">
              {year}
            </span>
            <button
              type="button"
              onClick={() => commitYear(year + 1)}
              disabled={year >= maxYear}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/60 text-[#2c313c] disabled:opacity-30 transition-colors"
              aria-label="Next year"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Illuminated Retro Scale + Neumorphic Tuning Jog Knob */}
      <div className="flex items-center gap-3">
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          className="relative flex-1 h-[54px] rounded-xl cursor-ew-resize overflow-hidden neu-glass-bezel"
          title="Drag or scroll to tune year (2000–2026)"
        >
          {/* Warm Retro Radio Backlight */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              opacity: isPlaying ? 0.9 : 0.45,
              background:
                'radial-gradient(ellipse at 50% 65%, rgba(251, 191, 36, 0.18) 0%, rgba(245, 158, 11, 0.05) 55%, transparent 85%)',
            }}
          />

          <div
            className="absolute inset-x-0 top-0 h-[40%] pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
            }}
          />

          {/* Year Graduations */}
          <div className="absolute inset-x-3.5 top-1.5 bottom-4 flex justify-between items-end pointer-events-none">
            {Array.from({ length: totalYears + 1 }, (_, i) => {
              const y = minYear + i;
              const isMajor = y % 5 === 0 || y === 2026;
              const isMid = y === 2008 || y === 2012 || y === 2016 || y === 2024;
              const isSelected = y === year;
              return (
                <div key={y} className="flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-[1px] transition-colors ${
                      isSelected
                        ? 'h-5 bg-[#ff5a1f]'
                        : isMajor
                        ? 'h-3.5 bg-amber-100/80'
                        : isMid
                        ? 'h-2.5 bg-amber-200/45'
                        : 'h-1.5 bg-slate-500/45'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="absolute inset-x-3 bottom-0.5 flex justify-between text-[8px] font-mono tracking-tight text-amber-100/65 pointer-events-none tabular-nums">
            <span>2000</span>
            <span>05</span>
            <span>10</span>
            <span>15</span>
            <span>20</span>
            <span>2026</span>
          </div>

          {/* Signal-Orange Analog Tuning Needle */}
          <div
            className="absolute top-0 bottom-0 w-[2px] pointer-events-none transition-all duration-75"
            style={{
              left: `calc(14px + (100% - 28px) * ${percent / 100} - 1px)`,
              backgroundColor: '#ff5a1f',
              boxShadow: '0 0 8px rgba(255, 90, 31, 0.85)',
            }}
          >
            <div className="absolute top-1 -left-[3.5px] w-[9px] h-[4px] rounded-sm bg-[#ff5a1f] border border-white/50" />
          </div>
        </div>

        {/* Soft Sculpted Neumorphic Tuning Jog Knob */}
        <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
          <div className="w-[50px] h-[50px] rounded-full p-1 neu-inset flex items-center justify-center">
            <div
              ref={knobRef}
              onPointerDown={handleKnobPointerDown}
              onPointerMove={handleKnobPointerMove}
              onPointerUp={handleKnobPointerUp}
              className="w-full h-full rounded-full neu-raised-sm cursor-grab active:cursor-grabbing relative flex items-center justify-center transition-transform duration-75"
              style={{ transform: `rotate(${knobAngle}deg)` }}
              title="Drag or scroll to tune year"
            >
              <div className="w-2 h-2 rounded-full absolute top-1.5 left-1/2 -translate-x-1/2 neu-inset" />
            </div>
          </div>
          <span className="text-[8px] font-mono tracking-[0.16em] text-[#5a6170] uppercase font-bold">
            Tune
          </span>
        </div>
      </div>

      {/* Quick Year Preset Pills (Raised vs Pressed Neumorphic State) */}
      <div className="flex items-center justify-between gap-1.5">
        {keyYears.map((ky) => {
          const active = year === ky;
          return (
            <button
              key={ky}
              type="button"
              onClick={() => commitYear(ky)}
              className={`flex-1 py-1 rounded-lg text-[9.5px] font-mono tabular-nums transition-all ${
                active
                  ? 'neu-inset text-[#ff5a1f] font-bold'
                  : 'neu-raised-sm text-[#4b5260] hover:text-[#14171f]'
              }`}
            >
              &apos;{ky.toString().slice(-2)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
