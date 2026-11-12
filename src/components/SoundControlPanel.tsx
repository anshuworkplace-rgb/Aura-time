import React, { useEffect, useState } from 'react';
import { ChamberId } from '../types/aura';
import { CHAMBERS } from '../utils/focusEngine';
import { CHAMBER_PRESETS, soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';
import {
  Volume2,
  VolumeX,
  Layers,
  Activity,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface SoundControlPanelProps {
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  secondaryChamberId: ChamberId | null;
  onSelectSecondaryChamber: (id: ChamberId | null) => void;
  isSoundPlaying: boolean;
  onToggleSound: () => void;
  ambienceVolume: number;
  onChangeAmbienceVolume: (val: number) => void;
  secondaryVolume: number;
  onChangeSecondaryVolume: (val: number) => void;
  alertVolume: number;
  onChangeAlertVolume: (val: number) => void;
  audioReactive: boolean;
  onToggleAudioReactive: () => void;
  onOpenChambersStudio: () => void;
  reducedMotion?: boolean;
}

export const SoundControlPanel: React.FC<SoundControlPanelProps> = ({
  primaryChamberId,
  onSelectPrimaryChamber,
  secondaryChamberId,
  onSelectSecondaryChamber,
  isSoundPlaying,
  onToggleSound,
  ambienceVolume,
  onChangeAmbienceVolume,
  secondaryVolume,
  onChangeSecondaryVolume,
  alertVolume,
  onChangeAlertVolume,
  audioReactive,
  onToggleAudioReactive,
  onOpenChambersStudio,
  reducedMotion = false,
}) => {
  const [spectrum, setSpectrum] = useState<number[]>([
    0.2, 0.35, 0.5, 0.4, 0.6, 0.45, 0.3, 0.2,
  ]);

  useEffect(() => {
    if (!isSoundPlaying || reducedMotion) return;
    const interval = window.setInterval(() => {
      setSpectrum(soundEngine.getFrequencySpectrum(8));
    }, 110);
    return () => window.clearInterval(interval);
  }, [isSoundPlaying, reducedMotion]);

  const activePrimary =
    CHAMBERS.find((c) => c.id === primaryChamberId) || CHAMBERS[0];

  return (
    <div
      role="dialog"
      aria-label="Sound Controls"
      data-testid="sound-control-panel"
      className="w-[calc(100vw-2rem)] sm:w-96 max-h-[72vh] overflow-y-auto rounded-3xl aura-glass-elevated p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-[#F5F6FF]"
    >
      {/* Top Header: Active Chamber + Mute/Unmute + Live Spectrum */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{
              background: `radial-gradient(circle at 35% 35%, #F5F6FF, ${activePrimary.primaryHex})`,
            }}
          />
          <div className="truncate">
            <span className="text-[10px] uppercase tracking-wider text-[#A3A1BA] block">
              {activePrimary.spaceType}
            </span>
            <span className="font-display text-sm font-semibold text-[#F5F6FF] truncate block">
              {activePrimary.name}
            </span>
          </div>
        </div>

        {/* Live 8-Band Frequency Spectrum & Mute Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="flex items-end gap-0.5 h-4 px-1.5"
            aria-hidden="true"
            title="Live Chamber Frequency Spectrum"
          >
            {spectrum.map((bar, i) => (
              <span
                key={i}
                style={{
                  height: `${Math.round(
                    (isSoundPlaying ? bar : 0.18) * 100
                  )}%`,
                  backgroundColor: isSoundPlaying
                    ? activePrimary.primaryHex
                    : 'rgba(163, 161, 186, 0.3)',
                }}
                className="w-1 rounded-full transition-all duration-150"
              />
            ))}
          </div>

          <AuraButton
            variant="secondary"
            size="sm"
            active={isSoundPlaying}
            reducedMotion={reducedMotion}
            onClick={onToggleSound}
            aria-label={isSoundPlaying ? 'Mute sound' : 'Unmute sound'}
            icon={
              isSoundPlaying ? (
                <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )
            }
          >
            {isSoundPlaying ? 'Active' : 'Muted'}
          </AuraButton>
        </div>
      </div>

      {/* Primary Chamber Quick Selector */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-[#A3A1BA]">
          <span>Sound Environment</span>
          <span>Shortcut: M</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CHAMBERS.map((ch) => {
            const isSelected = ch.id === primaryChamberId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelectPrimaryChamber(ch.id)}
                className={`px-2.5 py-2 rounded-xl text-left text-[11px] font-medium truncate transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-[#2FE8FF]/16 text-[#F5F6FF] border-[#2FE8FF]/50'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                {ch.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Volume Sliders: Ambience, Secondary Layer, Alert Chime */}
      <div className="flex flex-col gap-2.5 bg-black/25 rounded-2xl p-3 border border-white/8">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="dock-ambience-vol"
            className="text-[11px] text-[#A3A1BA] w-24 shrink-0"
          >
            Ambience
          </label>
          <input
            id="dock-ambience-vol"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={ambienceVolume}
            onChange={(e) =>
              onChangeAmbienceVolume(parseFloat(e.target.value))
            }
            className="flex-1 accent-[#2FE8FF] cursor-pointer"
          />
          <span className="font-mono tabular-nums text-[11px] text-[#F5F6FF] w-9 text-right">
            {Math.round(ambienceVolume * 100)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="dock-alert-vol"
            className="text-[11px] text-[#A3A1BA] w-24 shrink-0"
          >
            Alert Chime
          </label>
          <input
            id="dock-alert-vol"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={alertVolume}
            onChange={(e) => onChangeAlertVolume(parseFloat(e.target.value))}
            className="flex-1 accent-[#8A5CFF] cursor-pointer"
          />
          <span className="font-mono tabular-nums text-[11px] text-[#F5F6FF] w-9 text-right">
            {Math.round(alertVolume * 100)}%
          </span>
        </div>

        {/* Secondary Layer Quick Selector & Mix */}
        <div className="pt-2 border-t border-white/8 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A3A1BA]">
              <Layers className="w-3 h-3 text-[#8A5CFF]" />
              <span>Secondary Layer</span>
            </span>
            <select
              aria-label="Secondary sound layer"
              value={secondaryChamberId || ''}
              onChange={(e) =>
                onSelectSecondaryChamber(
                  e.target.value ? (e.target.value as ChamberId) : null
                )
              }
              className="bg-[#0B0E22] border border-white/14 rounded-lg px-2 py-1 text-[11px] text-[#F5F6FF] focus:outline-none focus:border-[#2FE8FF]"
            >
              <option value="">None</option>
              {CHAMBERS.filter(
                (c) => c.id !== 'deep-quiet' && c.id !== primaryChamberId
              ).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {secondaryChamberId && (
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="dock-secondary-vol"
                className="text-[11px] text-[#A3A1BA] w-24 shrink-0"
              >
                Layer 2 Mix
              </label>
              <input
                id="dock-secondary-vol"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={secondaryVolume}
                onChange={(e) =>
                  onChangeSecondaryVolume(parseFloat(e.target.value))
                }
                className="flex-1 accent-[#8A5CFF] cursor-pointer"
              />
              <span className="font-mono tabular-nums text-[11px] text-[#F5F6FF] w-9 text-right">
                {Math.round(secondaryVolume * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Curated Dual-Layer Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#A3A1BA] inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-[#2FE8FF]" />
          <span>Acoustic Combinations</span>
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {CHAMBER_PRESETS.map((preset) => {
            const isMatch =
              primaryChamberId === preset.primaryChamberId &&
              secondaryChamberId === preset.secondaryChamberId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectPrimaryChamber(preset.primaryChamberId);
                  onSelectSecondaryChamber(preset.secondaryChamberId);
                  onChangeAmbienceVolume(preset.ambienceVolume);
                  onChangeSecondaryVolume(preset.secondaryVolume);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-left text-[11px] truncate transition-colors border cursor-pointer ${
                  isMatch
                    ? 'bg-[#8A5CFF]/22 text-[#F5F6FF] border-[#8A5CFF]/50'
                    : 'bg-white/[0.025] hover:bg-white/[0.07] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer: Audio-Reactive Toggle + Open Chambers Studio */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={audioReactive}
          onClick={onToggleAudioReactive}
          className="inline-flex items-center gap-2 text-[11px] text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
        >
          <Activity
            className={`w-3.5 h-3.5 ${
              audioReactive ? 'text-[#2FE8FF]' : 'text-[#A3A1BA]'
            }`}
          />
          <span>Audio-Reactive Lens</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              audioReactive
                ? 'bg-[#2FE8FF]/20 text-[#2FE8FF]'
                : 'bg-white/8 text-[#A3A1BA]'
            }`}
          >
            {audioReactive ? 'ON' : 'OFF'}
          </span>
        </button>

        <AuraButton
          variant="secondary"
          size="sm"
          reducedMotion={reducedMotion}
          onClick={onOpenChambersStudio}
          icon={<Sliders className="w-3 h-3" />}
        >
          Chambers Studio
        </AuraButton>
      </div>
    </div>
  );
};
