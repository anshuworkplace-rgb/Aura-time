import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChamberId, SoundCategory } from '../types/aura';
import { CATEGORIZED_SOUND_OPTIONS, CHAMBERS } from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import {
  CloudRain,
  Waves,
  Trees,
  Sparkles,
  Flame,
  Radio,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

interface SoundControlPanelProps {
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  isSoundPlaying: boolean;
  onToggleSound: () => void;
  ambienceVolume?: number;
  onChangeAmbienceVolume?: (vol: number) => void;
  alertVolume?: number;
  onChangeAlertVolume?: (vol: number) => void;
  onClose?: () => void;
  reducedMotion?: boolean;
}

const PRESET_ICONS: Record<ChamberId, React.FC<{ className?: string }>> = {
  'rain-chamber': CloudRain,
  'ocean-drift': Waves,
  'forest-echo': Trees,
  'cosmic-silence': Sparkles,
  'ember-glow': Flame,
  'celestial-tone': Radio,
};

export const SoundControlPanel: React.FC<SoundControlPanelProps> = ({
  primaryChamberId,
  onSelectPrimaryChamber,
  isSoundPlaying,
  onToggleSound,
  ambienceVolume = 0.75,
  onChangeAmbienceVolume,
  alertVolume = 0.7,
  onChangeAlertVolume,
  onClose,
  reducedMotion = false,
}) => {
  const [categoryTab, setCategoryTab] = useState<'all' | SoundCategory>('all');
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    soundEngine.preload();
  }, []);

  const activeIndex = Math.max(
    0,
    CHAMBERS.findIndex((c) => c.id === primaryChamberId)
  );
  const activeChamber = CHAMBERS[activeIndex] || CHAMBERS[0];

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (idx + 1) % CHAMBERS.length;
      buttonRefs.current[nextIdx]?.focus();
      onSelectPrimaryChamber(CHAMBERS[nextIdx].id);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (idx - 1 + CHAMBERS.length) % CHAMBERS.length;
      buttonRefs.current[prevIdx]?.focus();
      onSelectPrimaryChamber(CHAMBERS[prevIdx].id);
    } else if (e.key === 'Escape' && onClose) {
      e.preventDefault();
      onClose();
    }
  };

  const filteredCategorized =
    categoryTab === 'all'
      ? []
      : CATEGORIZED_SOUND_OPTIONS.filter((opt) => opt.category === categoryTab);

  return (
    <div
      role="dialog"
      aria-label="Smart Soundscape Switcher"
      data-testid="sound-control-panel"
      className="w-[calc(100vw-1.5rem)] max-w-[356px] rounded-3xl aura-glass-elevated p-4 sm:p-4.5 flex flex-col gap-3 text-left shadow-2xl border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: Title, Active Status & Mute/Play Toggle */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/8">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0 transition-all duration-500"
            style={{
              backgroundColor: isSoundPlaying
                ? activeChamber.primaryHex
                : 'rgba(163, 161, 186, 0.45)',
              boxShadow: isSoundPlaying
                ? `0 0 10px ${activeChamber.primaryHex}`
                : 'none',
            }}
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <h3 className="font-display text-xs font-semibold tracking-wider uppercase text-[#F5F6FF] truncate">
              Smart Soundscape
            </h3>
            <span className="text-[11px] text-[#A3A1BA] truncate">
              {isSoundPlaying
                ? `${activeChamber.name} · Playing`
                : `${activeChamber.name} · Paused`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="sound-panel-mute-toggle"
            onClick={onToggleSound}
            aria-pressed={isSoundPlaying}
            aria-label={
              isSoundPlaying ? 'Pause soundscape' : 'Play soundscape'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer ${
              isSoundPlaying
                ? 'bg-[#2FE8FF]/16 text-[#2FE8FF] border border-[#2FE8FF]/40'
                : 'bg-white/6 text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10'
            }`}
          >
            {isSoundPlaying ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span>{isSoundPlaying ? 'On' : 'Muted'}</span>
          </button>

          {onClose && (
            <button
              type="button"
              data-testid="sound-panel-close-btn"
              onClick={onClose}
              aria-label="Close Soundscape panel"
              className="p-1.5 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter: All Chambers | Focus Sounds | Restore Sounds */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8">
        {(
          [
            { id: 'all', label: 'All Chambers' },
            { id: 'focus', label: 'Focus' },
            { id: 'restore', label: 'Restore' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`sound-category-${tab.id}`}
            onClick={() => setCategoryTab(tab.id)}
            className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              categoryTab === tab.id
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/40'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sound Presets List */}
      {categoryTab === 'all' ? (
        <div
          role="radiogroup"
          aria-label="Curated Soundscape Presets"
          className="grid grid-cols-1 gap-1.5"
        >
          {CHAMBERS.map((ch, idx) => {
            const isSelected = ch.id === primaryChamberId;
            const IconComponent = PRESET_ICONS[ch.id] || Sparkles;

            return (
              <motion.button
                key={ch.id}
                ref={(el) => {
                  buttonRefs.current[idx] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${ch.name} — ${ch.shortDescription}`}
                data-testid={`sound-chamber-${ch.id}`}
                whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                onClick={() => onSelectPrimaryChamber(ch.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`group relative flex items-center justify-between gap-3 px-3 py-2 rounded-2xl text-left transition-all duration-250 cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-[#2FE8FF] ${
                  isSelected
                    ? 'text-[#F5F6FF]'
                    : 'bg-white/[0.025] hover:bg-white/[0.06] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/[0.05]'
                }`}
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${ch.primaryHex}22 0%, ${ch.secondaryHex}14 100%)`,
                        boxShadow: `inset 0 0 0 1px ${ch.primaryHex}66, 0 8px 24px -8px ${ch.primaryHex}33`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${ch.primaryHex}38, ${ch.secondaryHex}28)`
                        : 'rgba(255, 255, 255, 0.05)',
                      boxShadow: isSelected
                        ? `inset 0 0 0 1px ${ch.primaryHex}55`
                        : 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <IconComponent className="w-3.5 h-3.5 transition-colors duration-300" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#F5F6FF] tracking-tight truncate">
                        {ch.name}
                      </span>
                      {isSelected && (
                        <span
                          data-testid={`soundscape-active-badge-${ch.id}`}
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider shrink-0"
                          style={{
                            backgroundColor: `${ch.primaryHex}24`,
                            color: ch.primaryHex,
                          }}
                        >
                          {isSoundPlaying ? 'Playing' : 'Selected'}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#A3A1BA] truncate">
                      {ch.shortDescription}
                    </span>
                  </div>
                </div>

                <div
                  className="flex items-end gap-[2.5px] h-3.5 shrink-0 pl-1"
                  aria-hidden="true"
                >
                  {ch.waveformBars.slice(0, 4).map((bar, bIdx) => {
                    const activeAnim =
                      isSelected && isSoundPlaying && !reducedMotion;
                    return (
                      <motion.span
                        key={bIdx}
                        animate={
                          activeAnim
                            ? {
                                height: [
                                  `${Math.max(25, Math.round(bar * 55))}%`,
                                  `${Math.max(45, Math.round(bar * 100))}%`,
                                  `${Math.max(25, Math.round(bar * 55))}%`,
                                ],
                              }
                            : {
                                height: isSelected
                                  ? `${Math.max(32, Math.round(bar * 85))}%`
                                  : `${Math.max(24, Math.round(bar * 48))}%`,
                              }
                        }
                        transition={
                          activeAnim
                            ? {
                                duration: 0.9 + bIdx * 0.18,
                                repeat: Infinity,
                                ease: 'easeInOut',
                              }
                            : { duration: 0.25 }
                        }
                        className="w-[2.5px] rounded-full"
                        style={{
                          backgroundColor: isSelected
                            ? ch.primaryHex
                            : 'rgba(163, 161, 186, 0.35)',
                        }}
                      />
                    );
                  })}
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label={`${categoryTab} soundscapes`}
          className="grid grid-cols-1 gap-1.5"
        >
          {filteredCategorized.map((opt) => {
            const isSelected = opt.chamberId === primaryChamberId;
            const IconComponent = PRESET_ICONS[opt.chamberId] || Sparkles;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`sound-option-${opt.id}`}
                onClick={() => onSelectPrimaryChamber(opt.chamberId)}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2FE8FF]/16 text-[#F5F6FF] border border-[#2FE8FF]/50'
                    : 'bg-white/[0.025] hover:bg-white/[0.06] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-white/6 flex items-center justify-center shrink-0">
                    <IconComponent className="w-3.5 h-3.5 text-[#2FE8FF]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#F5F6FF] block truncate">
                      {opt.name}
                    </span>
                    <span className="text-[11px] text-[#A3A1BA] block truncate">
                      {opt.description}
                    </span>
                  </div>
                </div>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: opt.primaryHex }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Volume Controls: Ambience & Completion Chime */}
      {onChangeAmbienceVolume && (
        <div className="pt-2.5 border-t border-white/10 space-y-2 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[#A3A1BA]">Ambience Volume</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(ambienceVolume * 100)}
              onChange={(e) =>
                onChangeAmbienceVolume(Number(e.target.value) / 100)
              }
              aria-label="Ambience volume slider"
              className="w-32 accent-[#2FE8FF]"
            />
          </div>
          {onChangeAlertVolume && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#A3A1BA]">Completion Chime</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(alertVolume * 100)}
                onChange={(e) =>
                  onChangeAlertVolume(Number(e.target.value) / 100)
                }
                aria-label="Completion alert volume slider"
                className="w-32 accent-[#2FE8FF]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
