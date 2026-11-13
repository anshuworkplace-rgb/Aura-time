import React from 'react';
import { Eye, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { STILLNESS_PRESETS } from '../hooks/useLiquidLensEngine';
import { LIQUID_LENS_TOKENS } from '../styles/liquidLens.styles';
import type {
  LiquidLensSessionStatus,
  StillnessVisualIntensity,
} from '../types/liquidLens.types';

export interface StillnessControlsProps {
  status: LiquidLensSessionStatus;
  durationMinutes: number;
  visualIntensity: StillnessVisualIntensity;
  ambientSoundEnabled: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onSelectDurationMinutes: (minutes: number) => void;
  onSelectVisualIntensity: (intensity: StillnessVisualIntensity) => void;
  onToggleAmbientSound: (enabled: boolean) => void;
}

const INTENSITY_OPTIONS: {
  id: StillnessVisualIntensity;
  label: string;
}[] = [
  { id: 'subtle', label: 'Subtle' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'deep-calm', label: 'Deep Calm' },
];

export const StillnessControls: React.FC<StillnessControlsProps> = ({
  status,
  durationMinutes,
  visualIntensity,
  ambientSoundEnabled,
  onStart,
  onPause,
  onResume,
  onEnd,
  onSelectDurationMinutes,
  onSelectVisualIntensity,
  onToggleAmbientSound,
}) => {
  const isActive = status === 'running' || status === 'paused';
  const activePreset =
    STILLNESS_PRESETS.find((p) => p.durationMinutes === durationMinutes) ||
    STILLNESS_PRESETS[1];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`${LIQUID_LENS_TOKENS.surfaces.translucentDock} p-4 sm:p-5 flex flex-col gap-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Stillness Duration Selector */}
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="radiogroup"
            aria-label="Stillness duration presets"
          >
            {STILLNESS_PRESETS.map((preset) => {
              const selected = preset.durationMinutes === durationMinutes;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={isActive}
                  onClick={() => onSelectDurationMinutes(preset.durationMinutes)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50 ${
                    selected
                      ? LIQUID_LENS_TOKENS.surfaces.activePill
                      : LIQUID_LENS_TOKENS.surfaces.subtlePill
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Ambient Sound Toggle */}
          <button
            type="button"
            onClick={() => onToggleAmbientSound(!ambientSoundEnabled)}
            aria-pressed={ambientSoundEnabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${
              ambientSoundEnabled
                ? LIQUID_LENS_TOKENS.surfaces.activePill
                : LIQUID_LENS_TOKENS.surfaces.subtlePill
            }`}
          >
            {ambientSoundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>
              {ambientSoundEnabled ? 'Ambient Sound On' : 'Silent Stillness'}
            </span>
          </button>
        </div>

        {/* Guidance + Visual Intensity + Start/Pause/End */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#F5F6FF]">
              {activePreset.subtitle}
            </span>
            <p className="text-[11px] text-[#A3A1BA] mt-0.5 max-w-md">
              {activePreset.guidance}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
            {/* Visual Intensity Selector */}
            <div
              className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl p-1"
              aria-label="Visual intensity"
            >
              <Eye className="w-3.5 h-3.5 text-[#A3A1BA] ml-1.5 mr-0.5" />
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectVisualIntensity(opt.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    visualIntensity === opt.id
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                      : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {status === 'idle' || status === 'completed' ? (
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2FE8FF] text-[#050711] font-semibold text-xs tracking-wide hover:bg-[#5EF2C4] transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{status === 'completed' ? 'Begin Again' : 'Begin Stillness'}</span>
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
                  aria-label="End stillness session"
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
    </div>
  );
};
