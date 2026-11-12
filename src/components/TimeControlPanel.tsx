import React from 'react';
import { TimerStatus } from '../types/aura';
import {
  MAX_SCRUB_MINUTES,
  MIN_SCRUB_MINUTES,
  SNAP_PRESET_MINUTES,
} from '../utils/focusEngine';
import { AuraButton } from './AuraButton';
import { Clock, Plus, Minus, Compass } from 'lucide-react';

interface TimeControlPanelProps {
  status: TimerStatus;
  durationMinutes: number;
  onChangeDuration: (mins: number) => void;
  onAddMinutes: (deltaMins: number) => void;
  scrubberOpen: boolean;
  onToggleScrubber: () => void;
  reducedMotion?: boolean;
}

export const TimeControlPanel: React.FC<TimeControlPanelProps> = ({
  status,
  durationMinutes,
  onChangeDuration,
  onAddMinutes,
  scrubberOpen,
  onToggleScrubber,
  reducedMotion = false,
}) => {
  const isIdle = status === 'idle';

  const clampDuration = (val: number) =>
    Math.max(MIN_SCRUB_MINUTES, Math.min(MAX_SCRUB_MINUTES, Math.round(val)));

  return (
    <div
      role="dialog"
      aria-label="Time and Duration Controls"
      data-testid="time-control-panel"
      className="w-[calc(100vw-2rem)] sm:w-88 max-h-[72vh] overflow-y-auto rounded-3xl aura-glass-elevated p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-[#F5F6FF]"
    >
      {/* Top Header: Selected Duration & Radial Ring Toggle */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-[#2FE8FF]" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#A3A1BA] block">
              Session Horizon
            </span>
            <span className="font-display text-sm font-semibold text-[#F5F6FF] font-mono tabular-nums">
              {durationMinutes} minutes
            </span>
          </div>
        </div>

        {isIdle && (
          <AuraButton
            variant="secondary"
            size="sm"
            active={scrubberOpen}
            reducedMotion={reducedMotion}
            onClick={onToggleScrubber}
            icon={<Compass className="w-3.5 h-3.5" />}
          >
            Radial Ring
          </AuraButton>
        )}
      </div>

      {/* Quick Time Extensions (+1m, +5m, +10m) — Works in Idle, Running, or Paused */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-[#A3A1BA]">
          {isIdle ? 'Adjust Duration' : 'Extend Active Session'}
        </span>
        <div className="grid grid-cols-3 gap-2">
          {[1, 5, 10].map((addMins) => (
            <AuraButton
              key={addMins}
              variant="secondary"
              size="sm"
              reducedMotion={reducedMotion}
              data-testid={`extend-${addMins}m-btn`}
              onClick={() => onAddMinutes(addMins)}
              icon={<Plus className="w-3 h-3 text-[#2FE8FF]" />}
              className="font-mono tabular-nums"
            >
              {addMins}m
            </AuraButton>
          ))}
        </div>
      </div>

      {/* Quick Magnetic Duration Presets (25, 45, 60, 90 min) */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-[#A3A1BA]">
          Magnetic Duration Presets
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {SNAP_PRESET_MINUTES.map((preset) => {
            const isCurrent = durationMinutes === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeDuration(preset)}
                className={`py-2 rounded-xl font-mono tabular-nums text-xs font-medium transition-colors border cursor-pointer ${
                  isCurrent
                    ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                {preset}m
              </button>
            );
          })}
        </div>
      </div>

      {/* Precision Rotary / Custom Duration Scrubber (15–120 min) */}
      <div className="flex flex-col gap-2.5 bg-black/25 rounded-2xl p-3.5 border border-white/8">
        <div className="flex items-center justify-between">
          <label
            htmlFor="custom-duration-slider"
            className="text-[11px] text-[#A3A1BA]"
          >
            Precision Dial ({MIN_SCRUB_MINUTES}–{MAX_SCRUB_MINUTES}m)
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Decrease duration by 1 minute"
              onClick={() => onChangeDuration(clampDuration(durationMinutes - 1))}
              className="p-1 rounded-lg bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              aria-label="Custom duration in minutes"
              min={MIN_SCRUB_MINUTES}
              max={MAX_SCRUB_MINUTES}
              value={durationMinutes}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (!Number.isNaN(parsed)) {
                  onChangeDuration(clampDuration(parsed));
                }
              }}
              className="w-14 text-center bg-white/6 border border-white/12 rounded-lg py-0.5 font-mono tabular-nums text-xs text-[#F5F6FF] focus:outline-none focus:border-[#2FE8FF]"
            />
            <button
              type="button"
              aria-label="Increase duration by 1 minute"
              onClick={() => onChangeDuration(clampDuration(durationMinutes + 1))}
              className="p-1 rounded-lg bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        <input
          id="custom-duration-slider"
          type="range"
          min={MIN_SCRUB_MINUTES}
          max={MAX_SCRUB_MINUTES}
          step={1}
          value={durationMinutes}
          onChange={(e) => onChangeDuration(parseInt(e.target.value, 10))}
          className="w-full accent-[#2FE8FF] cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-mono text-[#A3A1BA]/75">
          <span>15m</span>
          <span>45m</span>
          <span>75m</span>
          <span>120m</span>
        </div>
      </div>
    </div>
  );
};
