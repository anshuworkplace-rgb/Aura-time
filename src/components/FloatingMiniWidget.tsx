import React, { useEffect, useRef, useState } from 'react';
import { FocusSceneConfig, TimerStatus } from '../types/aura';
import { formatRemainingTime } from '../utils/focusEngine';
import { Pause, Play, SkipForward, Minimize2, Maximize2, X } from 'lucide-react';

interface FloatingMiniWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  scene: FocusSceneConfig;
  status: TimerStatus;
  remainingSeconds: number;
  progress: number;
  onStartOrPause: () => void;
  onSkipOrComplete: () => void;
}

export const FloatingMiniWidget: React.FC<FloatingMiniWidgetProps> = ({
  isOpen,
  onClose,
  scene,
  status,
  remainingSeconds,
  progress,
  onStartOrPause,
  onSkipOrComplete,
}) => {
  const [position, setPosition] = useState(() => ({
    x: typeof window !== 'undefined' ? Math.max(24, window.innerWidth - 230) : 1180,
    y: typeof window !== 'undefined' ? Math.max(80, window.innerHeight - 120) : 740,
  }));
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [ultraMinimal, setUltraMinimal] = useState(false);
  const [opacity, setOpacity] = useState(0.94);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const nextX = Math.max(
        12,
        Math.min(window.innerWidth - 180, e.clientX - dragOffset.current.x)
      );
      const nextY = Math.max(
        12,
        Math.min(window.innerHeight - 76, e.clientY - dragOffset.current.y)
      );
      setPosition({ x: nextX, y: nextY });
    };
    const onUp = () => {
      setIsDragging(false);
      // Dock magnetically to left or right screen edges when dragged near them
      setPosition((prev) => {
        const rightDock = window.innerWidth - (ultraMinimal ? 132 : 216) - 18;
        if (prev.x < 68) return { ...prev, x: 18 };
        if (prev.x > rightDock - 54) return { ...prev, x: Math.max(18, rightDock) };
        return prev;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, ultraMinimal]);

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Floating Liquid Capsule Timer"
      data-testid="floating-mini-widget"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        opacity,
        background: `radial-gradient(circle at 22% 25%, ${scene.colors.primary}2E, ${scene.colors.secondary}18 55%, rgba(11, 15, 32, 0.92))`,
        boxShadow: `0 14px 40px -8px rgba(7, 8, 18, 0.8), 0 0 24px -6px ${scene.colors.primary}40`,
      }}
      className="fixed top-0 left-0 z-40 rounded-full border border-white/18 overflow-hidden transition-all duration-300 select-none"
    >
      {/* Colorful Refracted Progress Edge along the Top Rim */}
      <div className="w-full h-[3px] bg-white/8 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${Math.max(5, Math.round((1 - progress) * 100))}%`,
            background: `linear-gradient(90deg, ${scene.colors.secondary}, ${scene.colors.primary}, ${scene.colors.iridescent})`,
          }}
        />
      </div>

      <div
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button, input')) return;
          setIsDragging(true);
          dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
          };
        }}
        className="px-4 py-2.5 flex flex-col gap-2 cursor-grab active:cursor-grabbing"
      >
        {/* Main Capsule Row: Only Remaining Time + Tiny State Indicator by default; expands gracefully on hover */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {!ultraMinimal && (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    status === 'running'
                      ? '#2FE8FF'
                      : status === 'paused'
                      ? '#FFB08A'
                      : scene.colors.primary,
                  boxShadow: `0 0 10px ${scene.colors.primary}`,
                }}
                title={`Timer ${status}`}
              />
            )}
            <span className="font-display text-lg font-semibold text-[#F5F6FF] tabular-nums tracking-tight">
              {formatRemainingTime(remainingSeconds)}
            </span>
          </div>

          {/* Hover-Expanded Controls (Pause, Skip, Ultra-Minimal Toggle, Close) */}
          {isHovered && (
            <div className="flex items-center gap-1 animate-fade-in">
              <button
                type="button"
                onClick={onStartOrPause}
                aria-label={
                  status === 'running'
                    ? 'Pause Mini Timer'
                    : 'Resume Mini Timer'
                }
                className="p-1.5 rounded-full bg-white/12 hover:bg-white/22 text-[#F5F6FF] transition-colors"
              >
                {status === 'running' ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={onSkipOrComplete}
                aria-label="Skip or Complete Session"
                className="p-1.5 rounded-full bg-white/8 hover:bg-white/18 text-[#F5F6FF] transition-colors"
              >
                <SkipForward className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setUltraMinimal((prev) => !prev)}
                aria-label={
                  ultraMinimal
                    ? 'Standard Capsule Mode'
                    : 'Ultra-Minimal Numerals Mode'
                }
                title={
                  ultraMinimal
                    ? 'Standard Capsule Mode'
                    : 'Ultra-Minimal Numerals Mode'
                }
                className="p-1.5 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF]"
              >
                {ultraMinimal ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Floating Droplet"
                className="p-1.5 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Hover Opacity Scrubber */}
        {isHovered && !ultraMinimal && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px] text-[#A3A1BA]">
            <label htmlFor="droplet-opacity">Opacity</label>
            <input
              id="droplet-opacity"
              type="range"
              min={0.4}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 accent-[#2FE8FF] cursor-pointer"
            />
          </div>
        )}
      </div>
    </aside>
  );
};
