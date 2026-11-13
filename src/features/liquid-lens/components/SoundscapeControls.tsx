import React from 'react';
import { Headphones, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { RestoreEnvironmentId } from '../../../types/aura';
import { SOUNDSCAPE_ENVIRONMENTS } from '../hooks/useLiquidLensEngine';
import { LIQUID_LENS_TOKENS } from '../styles/liquidLens.styles';
import type { LiquidLensSoundscapeEnvironment } from '../types/liquidLens.types';

export interface SoundscapeControlsProps {
  selectedEnvironmentId: RestoreEnvironmentId;
  activeEnvironment: LiquidLensSoundscapeEnvironment;
  isPlaying: boolean;
  isMuted: boolean;
  ambienceVolume: number;
  harmonicVolume: number;
  crossfadeStatusText: string;
  onSelectEnvironment: (envId: RestoreEnvironmentId) => void;
  onPreviewEnvironment: (envId: RestoreEnvironmentId) => void;
  onChangeAmbienceVolume: (volume01: number) => void;
  onChangeHarmonicVolume: (volume01: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
}

export const SoundscapeControls: React.FC<SoundscapeControlsProps> = ({
  selectedEnvironmentId,
  activeEnvironment,
  isPlaying,
  isMuted,
  ambienceVolume,
  harmonicVolume,
  crossfadeStatusText,
  onSelectEnvironment,
  onPreviewEnvironment,
  onChangeAmbienceVolume,
  onChangeHarmonicVolume,
  onTogglePlay,
  onToggleMute,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`${LIQUID_LENS_TOKENS.surfaces.translucentDock} p-4 sm:p-5 flex flex-col gap-4`}
      >
        {/* Curated Nature Soundscape Environments */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
          role="radiogroup"
          aria-label="Restorative soundscape environments"
        >
          {SOUNDSCAPE_ENVIRONMENTS.map((env) => {
            const selected = env.id === selectedEnvironmentId;
            return (
              <div
                key={env.id}
                className={`flex flex-col justify-between p-3 rounded-2xl border transition-all ${
                  selected
                    ? 'bg-[#2FE8FF]/12 border-[#2FE8FF]/45 shadow-[0_0_25px_rgba(47,232,255,0.12)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07]'
                }`}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectEnvironment(env.id)}
                  className="text-left focus:outline-none"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-[#F5F6FF]">
                      {env.name}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: env.primaryHex }}
                    />
                  </div>
                  <p className="text-[11px] text-[#A3A1BA] mt-1 line-clamp-1">
                    {env.soundLabel}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onPreviewEnvironment(env.id)}
                  className="mt-2.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#2FE8FF] hover:text-[#5EF2C4]"
                >
                  <Headphones className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Acoustic Layer Controls & Playback Continuity */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {/* Primary Ambience Volume */}
            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#A3A1BA]">
                  {activeEnvironment.soundLabel}
                </span>
                <span className="font-mono text-[#F5F6FF]">
                  {Math.round(ambienceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Primary nature ambience volume"
                value={Math.round(ambienceVolume * 100)}
                onChange={(e) =>
                  onChangeAmbienceVolume(Number(e.target.value) / 100)
                }
                className="accent-[#2FE8FF] w-full"
              />
            </label>

            {/* Secondary Harmonic Layer */}
            <label className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1 text-[#A3A1BA] truncate">
                  <Sparkles className="w-3 h-3 text-[#8A5CFF] shrink-0" />
                  <span className="truncate">
                    {activeEnvironment.harmonicLayerLabel}
                  </span>
                </span>
                <span className="font-mono text-[#F5F6FF]">
                  {Math.round(harmonicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Harmonic layer volume"
                value={Math.round(harmonicVolume * 100)}
                onChange={(e) =>
                  onChangeHarmonicVolume(Number(e.target.value) / 100)
                }
                className="accent-[#8A5CFF] w-full"
              />
            </label>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[10px] font-mono text-[#A3A1BA] sm:hidden">
              {crossfadeStatusText}
            </span>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={isMuted ? 'Unmute soundscape' : 'Mute soundscape'}
              className={`p-2.5 rounded-xl border transition-colors ${
                isMuted
                  ? 'bg-rose-500/15 border-rose-400/30 text-rose-200'
                  : LIQUID_LENS_TOKENS.surfaces.subtlePill
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                isPlaying && !isMuted
                  ? 'bg-[#2FE8FF]/20 border border-[#2FE8FF]/50 text-[#F5F6FF]'
                  : 'bg-[#2FE8FF] text-[#050711] hover:bg-[#5EF2C4]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPlaying && !isMuted ? 'Streaming' : 'Play Soundscape'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
