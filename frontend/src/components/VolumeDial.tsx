import React, { useRef, useCallback, useEffect, useState } from 'react';
import { playDetentClick, triggerHaptic } from '../utils/tactileAudio';

interface VolumeDialProps {
  volume: number; // 0.0 to 1.0
  onVolumeChange: (volume: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const VolumeDial: React.FC<VolumeDialProps> = ({
  volume,
  onVolumeChange,
  isPlaying,
  onTogglePlay,
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const pointerStartPos = useRef({ x: 0, y: 0, time: 0 });
  const hasMovedSignificantly = useRef(false);
  const lastDetent = useRef(-1);
  const [isPressed, setIsPressed] = useState(false);

  const minAngle = -135;
  const maxAngle = 135;
  const totalRange = maxAngle - minAngle;
  const currentAngle = minAngle + volume * totalRange;

  const numDetents = 17;
  const detentStep = 1 / (numDetents - 1);

  const calculateVolumeFromMouse = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return volume;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      angle = Math.max(minAngle, Math.min(maxAngle, angle));
      return (angle - minAngle) / totalRange;
    },
    [volume, minAngle, maxAngle, totalRange]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    hasMovedSignificantly.current = false;
    pointerStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setIsPressed(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const dist = Math.hypot(
        e.clientX - pointerStartPos.current.x,
        e.clientY - pointerStartPos.current.y
      );
      if (dist > 5) {
        hasMovedSignificantly.current = true;
      }

      if (!hasMovedSignificantly.current) return;

      let newVolume = calculateVolumeFromMouse(e.clientX, e.clientY);
      newVolume = Math.max(0, Math.min(1, newVolume));

      const currentDetent = Math.round(newVolume / detentStep);
      if (currentDetent !== lastDetent.current) {
        lastDetent.current = currentDetent;
        newVolume = currentDetent * detentStep;
        playDetentClick(780 + currentDetent * 35, 0.025);
        triggerHaptic(3);
      }

      onVolumeChange(newVolume);
    },
    [calculateVolumeFromMouse, onVolumeChange, detentStep]
  );

  const handlePointerUp = useCallback(() => {
    setIsPressed(false);
    isDragging.current = false;

    const timeDiff = Date.now() - pointerStartPos.current.time;
    if (!hasMovedSignificantly.current && timeDiff < 300) {
      playDetentClick(isPlaying ? 580 : 1050, 0.035);
      triggerHaptic(8);
      onTogglePlay();
    }
  }, [isPlaying, onTogglePlay]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -detentStep : detentStep;
      const newVolume = Math.max(0, Math.min(1, volume + delta));
      onVolumeChange(newVolume);
      playDetentClick(900, 0.02);
      triggerHaptic(4);
    },
    [volume, onVolumeChange, detentStep]
  );

  useEffect(() => {
    const el = dialRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const ticks = Array.from({ length: numDetents }, (_, i) => {
    const fraction = i / (numDetents - 1);
    const angle = minAngle + fraction * totalRange;
    const rad = (angle * Math.PI) / 180;
    const isMajor = i % 4 === 0;
    const isActive = fraction <= volume + 0.01;
    return {
      x1: Math.sin(rad) * (isMajor ? 46 : 48),
      y1: -Math.cos(rad) * (isMajor ? 46 : 48),
      x2: Math.sin(rad) * 53,
      y2: -Math.cos(rad) * 53,
      isMajor,
      isActive,
    };
  });

  return (
    <div className="flex items-center gap-3.5 select-none">
      {/* Neumorphic Dial Well */}
      <div className="relative w-[118px] h-[118px] rounded-full flex items-center justify-center flex-shrink-0">
        <svg viewBox="-59 -59 118 118" className="absolute inset-0 w-full h-full pointer-events-none">
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={
                t.isActive
                  ? isPlaying
                    ? '#ff5a1f'
                    : '#4b5260'
                  : 'rgba(30, 36, 48, 0.18)'
              }
              strokeWidth={t.isMajor ? '2' : '1.3'}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Concave Neumorphic Moat */}
        <div className="w-[82px] h-[82px] rounded-full p-1.5 neu-inset flex items-center justify-center">
          {/* Extruded Soft-Matte Rotary Knob */}
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`relative w-full h-full rounded-full neu-raised cursor-pointer flex items-center justify-center transition-transform duration-75 ${
              isPressed ? 'scale-[0.96]' : 'hover:scale-[1.015]'
            }`}
            style={{ transform: `rotate(${currentAngle}deg)` }}
            title="Drag or scroll to adjust volume · Tap to play/mute"
          >
            {/* Signal-Orange Indicator Line */}
            <div
              className="absolute top-[7px] left-1/2 -translate-x-1/2 w-[3px] h-[14px] rounded-full"
              style={{
                backgroundColor: isPlaying ? '#ff5a1f' : '#64748b',
                boxShadow: isPlaying ? '0 0 6px rgba(255, 90, 31, 0.45)' : 'none',
              }}
            />

            {/* Soft Concave Center Cap with Status Dot */}
            <div className="w-[24px] h-[24px] rounded-full neu-inset flex items-center justify-center">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isPlaying
                    ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.75)]'
                    : 'bg-slate-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Volume Numeric Readout */}
      <div className="flex flex-col">
        <span className="text-[10px] font-mono tracking-[0.16em] text-[#5a6170] uppercase font-bold">
          Volume
        </span>
        <span className="text-xl font-mono font-bold text-[#14171f] tabular-nums leading-tight">
          {Math.round(volume * 100)}
          <span className="text-xs text-[#5a6170] ml-0.5">%</span>
        </span>
        <span className="text-[9.5px] font-mono text-[#6b7280] mt-0.5">
          Tap knob to {isPlaying ? 'mute' : 'play'}
        </span>
      </div>
    </div>
  );
};
