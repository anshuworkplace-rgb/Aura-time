import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ChamberId } from '../types/aura';
import { CHAMBERS } from '../utils/focusEngine';
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
  onClose,
  reducedMotion = false,
}) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Preload Web Audio buffers as soon as the Smart Soundscape Switcher opens
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

  return (
    <div
      role="dialog"
      aria-label="Smart Soundscape Switcher"
      data-testid="sound-control-panel"
      className="w-[calc(100vw-1.5rem)] max-w-[336px] rounded-3xl aura-glass-elevated p-4 sm:p-4.5 flex flex-col gap-3.5 text-left shadow-2xl border border-white/10"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Compact Header: Title, Active Status Pill & Mute/Play Toggle */}
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
              Soundscape
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

      {/* Six Curated Sound Presets */}
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
              className={`group relative flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-250 cursor-pointer overflow-hidden focus-visible:outline-2 focus-visible:outline-[#2FE8FF] ${
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
              {/* Left: Minimal Icon Badge + Preset Name & Short Description */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${ch.primaryHex}38, ${ch.secondaryHex}28)`
                      : 'rgba(255, 255, 255, 0.05)',
                    boxShadow: isSelected
                      ? `inset 0 0 0 1px ${ch.primaryHex}55`
                      : 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <IconComponent
                    className="w-4 h-4 transition-colors duration-300"
                  />
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

              {/* Right: Subtle Animated Acoustic Identity Indicator */}
              <div
                className="flex items-end gap-[2.5px] h-3.5 shrink-0 pl-1"
                aria-hidden="true"
              >
                {ch.waveformBars.slice(0, 4).map((bar, bIdx) => {
                  const activeAnim = isSelected && isSoundPlaying && !reducedMotion;
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
    </div>
  );
};
