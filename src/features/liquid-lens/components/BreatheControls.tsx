import React from 'react';
import { Pause, Play, RotateCcw, SlidersHorizontal, Square } from 'lucide-react';
import {
  BREATHE_SESSION_DURATION_MINUTES,
  BREATHING_CADENCE_PRESETS,
} from '../hooks/useLiquidLensEngine';
import { LIQUID_LENS_TOKENS } from '../styles/liquidLens.styles';
import type {
  LiquidLensBreathingCadence,
  LiquidLensBreathingPresetId,
  LiquidLensCustomCadenceInput,
  LiquidLensSessionStatus,
} from '../types/liquidLens.types';

export interface BreatheControlsProps {
  status: LiquidLensSessionStatus;
  selectedPresetId: LiquidLensBreathingPresetId;
  activeCadence: LiquidLensBreathingCadence;
  customCadence: LiquidLensCustomCadenceInput;
  includeBreathHolds: boolean;
  sessionDurationMinutes: number;
  isTuningOpen: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onSelectPreset: (presetId: LiquidLensBreathingPresetId) => void;
  onUpdateCustomCadence: (partial: Partial<LiquidLensCustomCadenceInput>) => void;
  onToggleBreathHolds: (enabled: boolean) => void;
  onSelectDurationMinutes: (minutes: number) => void;
  onToggleTuning: (open: boolean) => void;
}

export const BreatheControls: React.FC<BreatheControlsProps> = ({
  status,
  selectedPresetId,
  activeCadence,
  customCadence,
  includeBreathHolds,
  sessionDurationMinutes,
  isTuningOpen,
  onStart,
  onPause,
  onResume,
  onEnd,
  onSelectPreset,
  onUpdateCustomCadence,
  onToggleBreathHolds,
  onSelectDurationMinutes,
  onToggleTuning,
}) => {
  const isActive = status === 'running' || status === 'paused';

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-3">
      {/* Primary Action Bar */}
      <div
        className={`${LIQUID_LENS_TOKENS.surfaces.translucentDock} p-4 sm:p-5 flex flex-col gap-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Cadence Preset Selector */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
            aria-label="Breathing cadence presets"
          >
            {BREATHING_CADENCE_PRESETS.map((preset) => {
              const selected = preset.id === selectedPresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selected
                      ? LIQUID_LENS_TOKENS.surfaces.activePill
                      : LIQUID_LENS_TOKENS.surfaces.subtlePill
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>

          {/* Progressive Disclosure Tune Cadence Button */}
          <button
            type="button"
            onClick={() => onToggleTuning(!isTuningOpen)}
            aria-expanded={isTuningOpen}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
              isTuningOpen
                ? LIQUID_LENS_TOKENS.surfaces.activePill
                : LIQUID_LENS_TOKENS.surfaces.subtlePill
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tune Cadence</span>
          </button>
        </div>

        {/* Active Cadence Summary & Session Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs text-[#F5F6FF] font-medium">
              <span>{activeCadence.name}</span>
              <span className="text-[#A3A1BA]">·</span>
              <span className="font-mono text-[11px] text-[#2FE8FF]">
                {activeCadence.inhaleSeconds}s in
                {activeCadence.holdSeconds > 0
                  ? ` · ${activeCadence.holdSeconds}s hold`
                  : ''}
                {` · ${activeCadence.exhaleSeconds}s out`}
                {activeCadence.pauseSeconds > 0
                  ? ` · ${activeCadence.pauseSeconds}s pause`
                  : ''}
              </span>
            </div>
            <p className="text-[11px] text-[#A3A1BA] mt-0.5">
              {activeCadence.description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Session Duration Selector */}
            <div
              className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1"
              aria-label="Session duration in minutes"
            >
              {BREATHE_SESSION_DURATION_MINUTES.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  disabled={isActive}
                  onClick={() => onSelectDurationMinutes(mins)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                    sessionDurationMinutes === mins
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                      : 'text-[#A3A1BA] hover:text-[#F5F6FF] disabled:opacity-45'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Start / Pause / Resume / End */}
            {status === 'idle' || status === 'completed' ? (
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2FE8FF] text-[#050711] font-semibold text-xs tracking-wide hover:bg-[#5EF2C4] transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{status === 'completed' ? 'Restart' : 'Start'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {status === 'running' ? (
                  <button
                    type="button"
                    onClick={onPause}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.09] hover:bg-white/[0.15] border border-white/[0.14] text-xs font-medium text-[#F5F6FF]"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onResume}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2FE8FF] text-[#050711] text-xs font-semibold"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onEnd}
                  aria-label="End breathing session"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-400/40 text-xs text-[#A3A1BA] hover:text-rose-200 transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>End</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Progressive Disclosure Cadence Tuning Drawer */}
      {isTuningOpen && (
        <div
          className={LIQUID_LENS_TOKENS.surfaces.drawerPanel}
          aria-label="Custom breathing cadence tuning"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2FE8FF]">
                Cadence Phase Tuning
              </h3>
              <p className="text-[11px] text-[#A3A1BA]">
                Adjusting phase durations switches cleanly to Custom Cadence.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-[#F5F6FF] cursor-pointer">
              <input
                type="checkbox"
                checked={includeBreathHolds}
                onChange={(e) => onToggleBreathHolds(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-[#2FE8FF] focus:ring-[#2FE8FF]"
              />
              <span>Gentle breath-hold pauses</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A3A1BA]">Inhale</span>
                <span className="font-mono text-[#F5F6FF]">
                  {selectedPresetId === 'custom'
                    ? customCadence.inhaleSeconds
                    : activeCadence.inhaleSeconds}
                  s
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={12}
                step={1}
                value={
                  selectedPresetId === 'custom'
                    ? customCadence.inhaleSeconds
                    : activeCadence.inhaleSeconds
                }
                onChange={(e) =>
                  onUpdateCustomCadence({
                    inhaleSeconds: Number(e.target.value),
                  })
                }
                className="accent-[#2FE8FF] w-full"
              />
            </label>

            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A3A1BA]">Hold</span>
                <span className="font-mono text-[#F5F6FF]">
                  {includeBreathHolds
                    ? selectedPresetId === 'custom'
                      ? customCadence.holdSeconds
                      : activeCadence.holdSeconds
                    : 0}
                  s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                disabled={!includeBreathHolds}
                value={
                  includeBreathHolds
                    ? selectedPresetId === 'custom'
                      ? customCadence.holdSeconds
                      : activeCadence.holdSeconds
                    : 0
                }
                onChange={(e) =>
                  onUpdateCustomCadence({
                    holdSeconds: Number(e.target.value),
                  })
                }
                className="accent-[#2FE8FF] w-full disabled:opacity-40"
              />
            </label>

            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A3A1BA]">Exhale</span>
                <span className="font-mono text-[#F5F6FF]">
                  {selectedPresetId === 'custom'
                    ? customCadence.exhaleSeconds
                    : activeCadence.exhaleSeconds}
                  s
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={14}
                step={1}
                value={
                  selectedPresetId === 'custom'
                    ? customCadence.exhaleSeconds
                    : activeCadence.exhaleSeconds
                }
                onChange={(e) =>
                  onUpdateCustomCadence({
                    exhaleSeconds: Number(e.target.value),
                  })
                }
                className="accent-[#2FE8FF] w-full"
              />
            </label>

            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#A3A1BA]">Pause</span>
                <span className="font-mono text-[#F5F6FF]">
                  {includeBreathHolds
                    ? selectedPresetId === 'custom'
                      ? customCadence.pauseSeconds
                      : activeCadence.pauseSeconds
                    : 0}
                  s
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                disabled={!includeBreathHolds}
                value={
                  includeBreathHolds
                    ? selectedPresetId === 'custom'
                      ? customCadence.pauseSeconds
                      : activeCadence.pauseSeconds
                    : 0
                }
                onChange={(e) =>
                  onUpdateCustomCadence({
                    pauseSeconds: Number(e.target.value),
                  })
                }
                className="accent-[#2FE8FF] w-full disabled:opacity-40"
              />
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                onUpdateCustomCadence({
                  inhaleSeconds: 4,
                  holdSeconds: 4,
                  exhaleSeconds: 6,
                  pauseSeconds: 2,
                });
              }}
              className="inline-flex items-center gap-1 text-[11px] text-[#A3A1BA] hover:text-[#F5F6FF]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset custom values</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
