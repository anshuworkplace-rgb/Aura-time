import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Square,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  Waves,
  X,
} from 'lucide-react';
import {
  BreathingPresetId,
  ChamberId,
  LiquidLensBreatheProps,
  LiquidLensExperienceProps,
  RestoreEnvironmentId,
} from '../types/aura';
import {
  calculateBreathingPhaseAtTime,
  formatRemainingTime,
} from '../utils/focusEngine';
import {
  ADAPTIVE_ATMOSPHERE_PROFILES,
  BREATHING_DURATION_OPTIONS,
  computeBreathingOrbKinematics,
  computeClockElapsed,
  CustomBreathingTiming,
  dampValue,
  DiscreteBreathingUiState,
  formatPatternCadenceSummary,
  getBreathingPhaseInstruction,
  hasDiscreteBreathingStateChanged,
  INTELLIGENT_BREATHING_PATTERNS,
  resolveIntelligentBreathingPattern,
  sanitizeCustomBreathingPattern,
  SPATIAL_SOUND_CATALOG,
} from '../utils/breathingEngine';
import {
  computeThemeOrganismPalette,
  rgbaString,
} from '../utils/organicOrbEngine';
import { getResonancePresetByChamberId } from '../utils/auraResonance';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface LiquidMote {
  angle: number;
  radialFraction: number;
  baseRadius: number;
  angularSpeed: number;
  alpha: number;
  hueShift: number;
  depthLayer: number;
}

interface LensSurfaceRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  intensity: number;
}

function mapPresetToEnvironmentId(
  presetId: BreathingPresetId
): RestoreEnvironmentId {
  if (presetId === 'deep-rest-4-7-8') return 'rain-garden';
  if (presetId === 'wave-6-2-7') return 'ocean-drift';
  if (presetId === 'box-4-4-4-4') return 'celestial-night';
  return 'forest-stillness';
}

export interface ExtendedLiquidLensBreatheProps extends LiquidLensBreatheProps {
  focusZenMode?: boolean;
  onToggleFocusZenMode?: () => void;
  customTiming?: CustomBreathingTiming;
  onChangeCustomTiming?: (next: CustomBreathingTiming) => void;
  activeSpatialChamberId?: ChamberId;
  isSoundPlaying?: boolean;
  isSoundMuted?: boolean;
  ambienceVolume?: number;
  breathSoundSync?: boolean;
  onSelectSpatialSound?: (chamberId: ChamberId) => void;
  onToggleSoundPlay?: () => void;
  onToggleSoundMute?: () => void;
  onChangeAmbienceVolume?: (vol: number) => void;
  onToggleBreathSoundSync?: () => void;
}

/**
 * ============================================================================
 * BREATHE: LIVING BREATHING INTELLIGENCE & COMPACT STUDIO PANELS
 * ============================================================================
 */
export const Breathe: React.FC<ExtendedLiquidLensBreatheProps> = ({
  activePresetId,
  activePreset,
  availablePresets,
  durationSeconds,
  availableDurations,
  isRunning,
  currentPhase,
  phaseRemainingSeconds,
  elapsedSeconds,
  completedCycles,
  accentHex,
  secondaryHex,
  reducedMotion,
  onSelectPreset,
  onSelectDurationSeconds,
  onStart,
  onPause,
  onReset,
  onCompleteSession,
  focusZenMode = false,
  onToggleFocusZenMode,
  customTiming,
  onChangeCustomTiming,
  activeSpatialChamberId = 'ocean-drift',
  isSoundPlaying = false,
  isSoundMuted = false,
  ambienceVolume = 0.75,
  breathSoundSync = false,
  onSelectSpatialSound,
  onToggleSoundPlay,
  onToggleSoundMute,
  onChangeAmbienceVolume,
  onToggleBreathSoundSync,
}) => {
  const isIdle = !isRunning && elapsedSeconds === 0;
  const remainingTotalSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  const progressPercent = Math.min(
    100,
    Math.round((elapsedSeconds / Math.max(1, durationSeconds)) * 100)
  );

  const [activeCompactDrawer, setActiveCompactDrawer] = useState<
    'none' | 'custom' | 'sound'
  >('none');
  const [spectrumBars, setSpectrumBars] = useState<number[]>(() =>
    Array.from({ length: 12 }, () => 0.18)
  );

  // Update Web Audio spectrum visualizer bars when Spatial Sound drawer is open
  useEffect(() => {
    if (activeCompactDrawer !== 'sound') return;
    const interval = window.setInterval(() => {
      if (isSoundPlaying && !isSoundMuted) {
        setSpectrumBars(soundEngine.getFrequencySpectrum(12));
      } else {
        setSpectrumBars(Array.from({ length: 12 }, () => 0.16));
      }
    }, 90);
    return () => window.clearInterval(interval);
  }, [activeCompactDrawer, isSoundMuted, isSoundPlaying]);

  const phaseTitle = isIdle
    ? formatRemainingTime(durationSeconds)
    : getBreathingPhaseInstruction(currentPhase);

  const cadenceSummary = useMemo(
    () => formatPatternCadenceSummary(activePreset),
    [activePreset]
  );

  const activeSoundMeta = useMemo(
    () =>
      SPATIAL_SOUND_CATALOG.find(
        (s) => s.chamberId === activeSpatialChamberId
      ) || SPATIAL_SOUND_CATALOG[0],
    [activeSpatialChamberId]
  );

  const safeCustom = useMemo(
    () => sanitizeCustomBreathingPattern(customTiming),
    [customTiming]
  );

  return (
    <div
      data-testid="liquid-lens-breathe-panel"
      className="w-full flex flex-col items-center gap-3 sm:gap-3.5"
    >
      {/* Central Readout: Large Elegant Countdown & Synchronized Phase Instruction */}
      <div className="flex flex-col items-center text-center px-2">
        <div
          data-testid="breathing-phase-label"
          className={`font-display font-semibold text-[#F5F6FF] tracking-tight tabular-nums leading-none transition-all duration-300 ${
            isIdle ? 'text-5xl sm:text-[56px]' : 'text-3xl sm:text-[44px]'
          }`}
        >
          {phaseTitle}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-[#A3A1BA]">
          <span className="font-medium text-[#D6D6EA]">
            {activePreset.name}
          </span>
          <span aria-hidden="true" className="opacity-45">
            ·
          </span>
          <span
            data-testid="breathing-phase-countdown"
            className="font-mono tabular-nums font-medium"
            style={{ color: accentHex }}
          >
            {!isIdle ? `${phaseRemainingSeconds}s` : cadenceSummary}
          </span>
          {!isIdle && (
            <>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span
                data-testid="restore-timer-readout"
                className="font-mono tabular-nums text-[#D6D6EA]"
              >
                {formatRemainingTime(remainingTotalSeconds)}
              </span>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span
                data-testid="breathing-session-progress"
                className="font-mono tabular-nums text-[11px] text-[#A3A1BA]"
              >
                {progressPercent}%
              </span>
            </>
          )}
          {isIdle && (
            <span data-testid="restore-timer-readout" className="sr-only">
              {formatRemainingTime(remainingTotalSeconds)} remaining
            </span>
          )}
          {completedCycles > 0 && (
            <>
              <span aria-hidden="true" className="opacity-45">
                ·
              </span>
              <span className="font-mono tabular-nums">
                {completedCycles} {completedCycles === 1 ? 'cycle' : 'cycles'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Primary Session Actions + Segmented Duration & Compact Studio Triggers */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {isIdle ? (
          <>
            <AuraButton
              variant="primary"
              size="md"
              data-testid="restore-start-btn"
              reducedMotion={reducedMotion}
              accentColor={accentHex}
              secondaryColor={secondaryHex}
              onClick={() => {
                setActiveCompactDrawer('none');
                onStart();
              }}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Begin Breathing</span>
            </AuraButton>

            {/* Duration Segmented Control */}
            <div
              role="group"
              aria-label="Session duration"
              className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[#090C1A]/65 border border-white/[0.08]"
            >
              {availableDurations.map((secs) => {
                const mins = Math.round(secs / 60);
                const selected = durationSeconds === secs;
                return (
                  <button
                    key={secs}
                    type="button"
                    data-testid={`breathing-duration-${mins}m`}
                    aria-pressed={selected}
                    onClick={() => onSelectDurationSeconds(secs)}
                    className={`px-2.5 py-1 rounded-full font-mono text-[11px] transition-all cursor-pointer ${
                      selected
                        ? 'text-[#F5F6FF] bg-white/[0.12] font-medium shadow-sm'
                        : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                    }`}
                    style={
                      selected
                        ? {
                            color: accentHex,
                            boxShadow: `inset 0 0 0 1px ${accentHex}55`,
                          }
                        : undefined
                    }
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <AuraButton
              variant="primary"
              size="md"
              data-testid="restore-pause-resume-btn"
              reducedMotion={reducedMotion}
              accentColor={accentHex}
              secondaryColor={secondaryHex}
              onClick={isRunning ? onPause : onStart}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </>
              )}
            </AuraButton>

            <AuraButton
              variant="secondary"
              size="md"
              data-testid="restore-stop-btn"
              reducedMotion={reducedMotion}
              onClick={onCompleteSession}
            >
              <Square className="w-3.5 h-3.5" />
              <span>End Session</span>
            </AuraButton>

            <button
              type="button"
              data-testid="restore-reset-btn"
              onClick={onReset}
              aria-label="Restart breathing session"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full aura-glass text-xs font-medium text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>

            {onToggleFocusZenMode && (
              <button
                type="button"
                data-testid="liquid-lens-zen-toggle-btn"
                aria-pressed={focusZenMode}
                onClick={onToggleFocusZenMode}
                title={
                  focusZenMode
                    ? 'Show breathing patterns & sound controls'
                    : 'Focus Mode: hide secondary controls'
                }
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  focusZenMode
                    ? 'bg-white/[0.12] text-[#F5F6FF] border-white/25'
                    : 'aura-glass text-[#A3A1BA] hover:text-[#F5F6FF] border-white/10'
                }`}
              >
                {focusZenMode ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Focus Mode</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Focus Mode</span>
                  </>
                )}
              </button>
            )}
          </>
        )}

        {/* Compact Spatial Sound & Custom Rhythm Drawer Triggers (Hidden in Active Focus Mode) */}
        {!focusZenMode && (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              data-testid="liquid-lens-sound-drawer-btn"
              aria-expanded={activeCompactDrawer === 'sound'}
              onClick={() =>
                setActiveCompactDrawer((prev) =>
                  prev === 'sound' ? 'none' : 'sound'
                )
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                activeCompactDrawer === 'sound'
                  ? 'bg-white/[0.12] text-[#F5F6FF] border-white/25'
                  : 'bg-[#090C1A]/60 text-[#A3A1BA] hover:text-[#F5F6FF] border-white/[0.08]'
              }`}
            >
              <Waves
                className="w-3.5 h-3.5"
                style={{ color: activeSoundMeta.accentHex }}
              />
              <span>{activeSoundMeta.label}</span>
              {breathSoundSync && (
                <span
                  className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-white/10 text-[#F5F6FF]"
                  title="Breath phase sound sync active"
                >
                  Sync
                </span>
              )}
            </button>

            <button
              type="button"
              data-testid="liquid-lens-custom-drawer-btn"
              aria-expanded={activeCompactDrawer === 'custom'}
              onClick={() => {
                setActiveCompactDrawer((prev) =>
                  prev === 'custom' ? 'none' : 'custom'
                );
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                activeCompactDrawer === 'custom' || activePresetId === 'custom'
                  ? 'bg-white/[0.12] text-[#F5F6FF] border-white/25'
                  : 'bg-[#090C1A]/60 text-[#A3A1BA] hover:text-[#F5F6FF] border-white/[0.08]'
              }`}
            >
              <SlidersHorizontal
                className="w-3.5 h-3.5"
                style={{ color: accentHex }}
              />
              <span>Configure Phases</span>
            </button>
          </div>
        )}
      </div>

      {/* Compact Popover 1: Configurable 4-Phase Breathing Studio (Inhale · Hold · Exhale · Rest) */}
      {!focusZenMode && activeCompactDrawer === 'custom' && (
        <div
          role="region"
          aria-label="Custom Breathing Phase Configurator"
          data-testid="custom-breathing-configurator"
          className="w-full max-w-[680px] rounded-2xl bg-[#090C1A]/88 border border-white/15 px-4 py-3.5 shadow-2xl flex flex-col gap-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" style={{ color: accentHex }} />
              <span className="text-xs font-semibold text-[#F5F6FF]">
                Intelligent Breathing Phase Timing
              </span>
              <span className="font-mono text-[11px] text-[#A3A1BA]">
                ({formatPatternCadenceSummary(safeCustom)})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveCompactDrawer('none')}
              aria-label="Close phase configurator"
              className="p-1 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                {
                  key: 'inhaleSeconds',
                  label: 'Inhale',
                  min: 2,
                  max: 12,
                  value: safeCustom.inhaleSeconds,
                },
                {
                  key: 'holdInSeconds',
                  label: 'Hold',
                  min: 0,
                  max: 12,
                  value: safeCustom.holdInSeconds,
                },
                {
                  key: 'exhaleSeconds',
                  label: 'Exhale',
                  min: 2,
                  max: 15,
                  value: safeCustom.exhaleSeconds,
                },
                {
                  key: 'holdOutSeconds',
                  label: 'Rest',
                  min: 0,
                  max: 12,
                  value: safeCustom.holdOutSeconds,
                },
              ] as const
            ).map((phaseItem) => (
              <label
                key={phaseItem.key}
                className="flex flex-col gap-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#D6D6EA] font-medium">
                    {phaseItem.label}
                  </span>
                  <span
                    className="font-mono tabular-nums font-semibold"
                    style={{ color: accentHex }}
                  >
                    {phaseItem.value}s
                  </span>
                </div>
                <input
                  type="range"
                  min={phaseItem.min}
                  max={phaseItem.max}
                  value={phaseItem.value}
                  aria-label={`${phaseItem.label} seconds`}
                  data-testid={`custom-slider-${phaseItem.key}`}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    const updated: CustomBreathingTiming = {
                      ...safeCustom,
                      [phaseItem.key]: nextVal,
                    };
                    onChangeCustomTiming?.(updated);
                    if (activePresetId !== 'custom') {
                      onSelectPreset('custom');
                    }
                  }}
                  className="w-full accent-[#2FE8FF] cursor-pointer"
                />
              </label>
            ))}
          </div>

          {/* Quick Intelligent Pattern Templates inside the configurator */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.07] text-[11px]">
            <span className="text-[#A3A1BA]">Pattern Presets:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {INTELLIGENT_BREATHING_PATTERNS.map((pat) => {
                const isPatSelected = activePresetId === pat.id;
                return (
                  <button
                    key={pat.id}
                    type="button"
                    data-testid={`intelligent-pattern-${pat.id}`}
                    onClick={() => onSelectPreset(pat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                      isPatSelected
                        ? 'bg-white/15 text-[#F5F6FF] border border-white/30'
                        : 'bg-white/[0.04] text-[#A3A1BA] hover:text-[#F5F6FF]'
                    }`}
                  >
                    {pat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Compact Popover 2: Spatial Sound Experience (Ocean, Rain, Forest, Wind, Singing Bowls, Deep Ambient) */}
      {!focusZenMode && activeCompactDrawer === 'sound' && (
        <div
          role="region"
          aria-label="Spatial Sound Experience"
          data-testid="spatial-sound-panel"
          className="w-full max-w-[680px] rounded-2xl bg-[#090C1A]/88 border border-white/15 px-4 py-3.5 shadow-2xl flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Waves
                className="w-4 h-4"
                style={{ color: activeSoundMeta.accentHex }}
              />
              <div>
                <span className="text-xs font-semibold text-[#F5F6FF] block">
                  Spatial Sound Experience
                </span>
                <span className="text-[11px] text-[#A3A1BA] block">
                  {activeSoundMeta.label} · {activeSoundMeta.subtitle}
                </span>
              </div>
            </div>

            {/* Live Web Audio Spectrum Visualizer + Play/Mute Controls */}
            <div className="flex items-center gap-2">
              <div
                data-testid="spatial-sound-spectrum"
                className="flex items-end gap-[2px] h-4 px-2"
                aria-hidden="true"
              >
                {spectrumBars.map((bar, idx) => (
                  <span
                    key={idx}
                    className="w-[2.5px] rounded-full transition-all duration-100"
                    style={{
                      height: `${Math.max(20, Math.round(bar * 100))}%`,
                      backgroundColor:
                        isSoundPlaying && !isSoundMuted
                          ? activeSoundMeta.accentHex
                          : 'rgba(163, 161, 186, 0.3)',
                    }}
                  />
                ))}
              </div>

              <button
                type="button"
                data-testid="spatial-sound-play-toggle"
                onClick={onToggleSoundPlay}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                  isSoundPlaying && !isSoundMuted
                    ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border-[#2FE8FF]/45'
                    : 'bg-white/[0.05] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/10'
                }`}
              >
                {isSoundPlaying && !isSoundMuted ? 'Playing' : 'Paused'}
              </button>

              <button
                type="button"
                data-testid="spatial-sound-mute-toggle"
                onClick={onToggleSoundMute}
                aria-label={isSoundMuted ? 'Unmute audio' : 'Mute audio'}
                className="p-1.5 rounded-full bg-white/[0.05] text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                {isSoundMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveCompactDrawer('none')}
                aria-label="Close spatial sound panel"
                className="p-1 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 6 Spatial Soundscapes Grid */}
          <div
            role="radiogroup"
            aria-label="Spatial Soundscapes"
            className="grid grid-cols-2 sm:grid-cols-6 gap-1.5"
          >
            {SPATIAL_SOUND_CATALOG.map((sound) => {
              const selected = sound.chamberId === activeSpatialChamberId;
              return (
                <button
                  key={sound.chamberId}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid={`spatial-sound-${sound.chamberId}`}
                  onClick={() => onSelectSpatialSound?.(sound.chamberId)}
                  className={`px-2.5 py-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-0.5 ${
                    selected
                      ? 'bg-white/[0.11] text-[#F5F6FF]'
                      : 'bg-white/[0.025] border-white/[0.06] text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/[0.06]'
                  }`}
                  style={
                    selected
                      ? {
                          borderColor: `${sound.accentHex}88`,
                          boxShadow: `0 0 14px ${sound.accentHex}22`,
                        }
                      : undefined
                  }
                >
                  <span className="text-[11px] font-semibold text-[#F5F6FF] truncate">
                    {sound.label}
                  </span>
                  <span
                    className="font-mono text-[9px] truncate"
                    style={{ color: selected ? sound.accentHex : '#A3A1BA' }}
                  >
                    {selected && isSoundPlaying && !isSoundMuted
                      ? 'Active'
                      : 'Select'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Volume Slider & Breath-Synchronized Sound Cue Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-white/[0.08] text-[11px]">
            <label className="flex items-center gap-2.5 text-[#A3A1BA]">
              <span>Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(ambienceVolume * 100)}
                aria-label="Spatial sound volume"
                data-testid="spatial-sound-volume-slider"
                onChange={(e) =>
                  onChangeAmbienceVolume?.(Number(e.target.value) / 100)
                }
                className="w-28 sm:w-36 accent-[#2FE8FF] cursor-pointer"
              />
              <span className="font-mono tabular-nums text-[#D6D6EA]">
                {Math.round(ambienceVolume * 100)}%
              </span>
            </label>

            <button
              type="button"
              role="switch"
              aria-checked={breathSoundSync}
              data-testid="breath-sound-sync-toggle"
              onClick={onToggleBreathSoundSync}
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium transition-colors cursor-pointer ${
                breathSoundSync
                  ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border-[#2FE8FF]/50'
                  : 'bg-white/[0.04] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/10'
              }`}
            >
              <span>Sync Sound with Breath Phases</span>
              <span
                className="font-mono text-[10px]"
                style={{ color: breathSoundSync ? accentHex : '#A3A1BA' }}
              >
                {breathSoundSync ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Curated Breathing Purpose & Pattern Cards (Hidden in Active Focus Mode) */}
      {!focusZenMode && (
        <div
          role="radiogroup"
          aria-label="Breathing Purposes"
          data-testid="breathing-purpose-cards"
          className={`w-full max-w-[820px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 transition-opacity duration-500 ${
            isRunning ? 'opacity-75 hover:opacity-100' : 'opacity-100'
          }`}
        >
          {availablePresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            const summary = formatPatternCadenceSummary(preset);
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`breathing-preset-${preset.id}`}
                onClick={() => onSelectPreset(preset.id)}
                className={`text-left px-3.5 py-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 ${
                  isSelected
                    ? 'text-[#F5F6FF] bg-[#0B0E1E]/76'
                    : 'bg-[#090C1A]/52 border-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-[#0B0E1E]/65 hover:border-white/[0.16]'
                }`}
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(145deg, ${accentHex}22 0%, rgba(11, 14, 30, 0.78) 72%)`,
                        borderColor: `${accentHex}99`,
                        boxShadow: `0 10px 28px -12px rgba(4, 5, 12, 0.75), 0 0 18px ${accentHex}1C, inset 0 1px 0 ${accentHex}38`,
                      }
                    : undefined
                }
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-[#F5F6FF] leading-tight">
                    {preset.name}
                  </span>
                  <span
                    className="font-mono text-[10px] tabular-nums leading-tight"
                    style={{ color: isSelected ? accentHex : '#A3A1BA' }}
                  >
                    {summary}
                  </span>
                </div>
                <p
                  className={`text-[11px] leading-snug line-clamp-2 ${
                    isSelected ? 'text-[#D6D6EA]/95' : 'text-[#A3A1BA]/90'
                  }`}
                >
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * ============================================================================
 * PRIMARY MODULE: LIQUID LENS LIVING BREATHING SANCTUARY
 * ============================================================================
 */
export const LiquidLensExperience: React.FC<LiquidLensExperienceProps> = ({
  interaction,
  restoreCompatibility,
  onReturnToFocusOrganism,
}) => {
  const { settings, onUpdateSettings, onCompleteRestoreSession } =
    restoreCompatibility;

  const [selectedBreathingId, setSelectedBreathingId] =
    useState<BreathingPresetId>(
      () => settings.defaultBreathingPresetId ?? 'coherent-5-5'
    );

  const [customTiming, setCustomTiming] = useState<CustomBreathingTiming>(() =>
    sanitizeCustomBreathingPattern(settings.customBreathingPattern)
  );

  const [focusZenMode, setFocusZenMode] = useState<boolean>(false);

  // Build the 4 primary pattern cards displayed on stage (3 curated + Box Breathing, or Custom when active)
  const stagePresets = useMemo(() => {
    const balanced = resolveIntelligentBreathingPattern(
      'coherent-5-5',
      customTiming
    );
    const box = resolveIntelligentBreathingPattern(
      'box-4-4-4-4',
      customTiming
    );
    const relaxing = resolveIntelligentBreathingPattern(
      'deep-rest-4-7-8',
      customTiming
    );
    const eveningOrCustom =
      selectedBreathingId === 'custom'
        ? resolveIntelligentBreathingPattern('custom', customTiming)
        : resolveIntelligentBreathingPattern('wave-6-2-7', customTiming);

    return [
      {
        ...balanced,
        name: 'Find Your Balance',
      },
      {
        ...relaxing,
        name: 'Release Tension',
      },
      {
        ...eveningOrCustom,
        name:
          selectedBreathingId === 'custom'
            ? 'Custom Rhythm'
            : 'Prepare for Rest',
      },
      box,
    ];
  }, [customTiming, selectedBreathingId]);

  const activeBreathingConfig = useMemo(
    () => {
      const resolved = resolveIntelligentBreathingPattern(
        selectedBreathingId,
        customTiming
      );
      if (selectedBreathingId === 'coherent-5-5') {
        return { ...resolved, name: 'Find Your Balance' };
      }
      if (selectedBreathingId === 'deep-rest-4-7-8') {
        return { ...resolved, name: 'Release Tension' };
      }
      if (selectedBreathingId === 'wave-6-2-7') {
        return { ...resolved, name: 'Prepare for Rest' };
      }
      return resolved;
    },
    [customTiming, selectedBreathingId]
  );

  const [targetDurationSeconds, setTargetDurationSeconds] = useState<number>(
    () => activeBreathingConfig.recommendedDurationSeconds || 180
  );

  const [sessionState, setSessionState] = useState<
    'idle' | 'running' | 'paused' | 'completed'
  >('idle');

  const [discreteUi, setDiscreteUi] = useState<DiscreteBreathingUiState>({
    elapsedSeconds: 0,
    phase: 'inhale',
    phaseRemainingSeconds: activeBreathingConfig.inhaleSeconds,
    completedCycles: 0,
  });

  // Drift-free monotonic clock and canvas smoothing refs (zero 60fps React state updates)
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerCanvasRef = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const surfaceRipplesRef = useRef<LensSurfaceRipple[]>([]);
  const accumulatedSecondsRef = useRef<number>(0);
  const segmentStartPerfMsRef = useRef<number | null>(null);
  const smoothedExpansionRef = useRef<number>(0.38);
  const smoothedBrightnessRef = useRef<number>(0.68);
  const smoothedOuterGlowRef = useRef<number>(0.32);
  const ambientTimeRef = useRef<number>(0);
  const lastDiscreteUiRef = useRef<DiscreteBreathingUiState>(discreteUi);

  // Smoothly interpolated RGB channels for silky Adaptive Atmosphere transitions
  const initialPalette = computeThemeOrganismPalette(
    interaction.activeScene,
    'focus'
  );
  const initialAtmo =
    ADAPTIVE_ATMOSPHERE_PROFILES[interaction.activeScene.id] ||
    ADAPTIVE_ATMOSPHERE_PROFILES['deep-current'];

  const currentPrimaryRgbRef = useRef<[number, number, number]>([
    ...initialPalette.primaryRgb,
  ]);
  const currentSecondaryRgbRef = useRef<[number, number, number]>([
    ...initialPalette.secondaryRgb,
  ]);
  const currentTertiaryRgbRef = useRef<[number, number, number]>([
    ...initialPalette.tertiaryRgb,
  ]);
  const currentIridescentRgbRef = useRef<[number, number, number]>([
    ...initialPalette.iridescentRgb,
  ]);
  const currentLavenderRgbRef = useRef<[number, number, number]>([
    ...initialAtmo.lavenderTintRgb,
  ]);

  // Live refs read directly inside the single stable canvas RAF loop
  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;
  const activePresetRef = useRef(activeBreathingConfig);
  activePresetRef.current = activeBreathingConfig;
  const targetDurationRef = useRef(targetDurationSeconds);
  targetDurationRef.current = targetDurationSeconds;
  const reducedMotionRef = useRef(interaction.reducedMotion);
  reducedMotionRef.current = interaction.reducedMotion;
  const sceneRef = useRef(interaction.activeScene);
  sceneRef.current = interaction.activeScene;
  const audioRef = useRef(interaction.audio);
  audioRef.current = interaction.audio;
  const breathSoundSyncRef = useRef(Boolean(settings.breathSoundSync));
  breathSoundSyncRef.current = Boolean(settings.breathSoundSync);
  const onCompleteRestoreRef = useRef(onCompleteRestoreSession);
  onCompleteRestoreRef.current = onCompleteRestoreSession;

  // Cleanly stop active Liquid Lens sound if user switches away mid-session
  useEffect(() => {
    return () => {
      if (sessionStateRef.current === 'running') {
        audioRef.current.onTogglePlay(false);
      }
    };
  }, []);

  // Single non-overlapping 60fps Living Breathing Orb & drift-free wall-clock loop
  useEffect(() => {
    const canvas = lensCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 620;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 36 internal bioluminescent particles with polar coordinates for radial Inhale/Exhale sync
    const motes: LiquidMote[] = Array.from({ length: 36 }, (_, idx) => ({
      angle: (idx / 36) * Math.PI * 2 + (idx % 3) * 0.41,
      radialFraction: 0.14 + ((idx * 17) % 76) / 100, // 0.14..0.90
      baseRadius: 1.8 + (idx % 5) * 1.35,
      angularSpeed:
        (idx % 2 === 0 ? 1 : -1) * (0.08 + (idx % 4) * 0.045),
      alpha: 0.26 + (idx % 4) * 0.14,
      hueShift: idx % 4,
      depthLayer: (idx % 3) + 1,
    }));

    const traceLensContour = (
      cx: number,
      cy: number,
      baseR: number,
      t: number,
      elasticity: number,
      audioBass: number
    ) => {
      const ptr = pointerCanvasRef.current;
      ctx.beginPath();
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const n1 =
          Math.sin(theta * 3 + t * 1.3) *
          (8.2 * elasticity + audioBass * 7.5);
        const n2 =
          Math.cos(theta * 4 - t * 0.95) *
          (5.2 * elasticity + audioBass * 4.5);
        const n3 = Math.sin(theta * 2 + t * 0.6) * (4.2 * elasticity);
        let r = baseR + n1 + n2 + n3;

        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (ptr.x !== null && ptr.y !== null) {
          const distToPtr = Math.hypot(px - ptr.x, py - ptr.y);
          if (distToPtr < 140) {
            r += Math.sin((1 - distToPtr / 140) * Math.PI) * 8;
          }
        }

        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    let animId = 0;
    let prevFrameMs = performance.now();
    let completionDispatched = false;

    const drawFrame = (nowMs: number) => {
      const dt = Math.min(0.25, Math.max(0, (nowMs - prevFrameMs) / 1000));
      prevFrameMs = nowMs;

      const currentState = sessionStateRef.current;
      const preset = activePresetRef.current;
      const durationSecs = targetDurationRef.current;
      const scene = sceneRef.current;
      const isReduced = reducedMotionRef.current;
      const atmoProfile =
        ADAPTIVE_ATMOSPHERE_PROFILES[scene.id] ||
        ADAPTIVE_ATMOSPHERE_PROFILES['deep-current'];

      if (currentState !== 'running') {
        completionDispatched = false;
      }

      const clock = computeClockElapsed({
        accumulatedSeconds: accumulatedSecondsRef.current,
        segmentStartPerfMs:
          currentState === 'running' ? segmentStartPerfMsRef.current : null,
        nowPerfMs: nowMs,
        targetDurationSeconds: durationSecs,
      });

      const cycleLen = Math.max(
        1,
        preset.inhaleSeconds +
          preset.holdInSeconds +
          preset.exhaleSeconds +
          preset.holdOutSeconds
      );
      const phaseState = calculateBreathingPhaseAtTime(
        preset,
        clock.elapsedFloatSeconds
      );

      if (currentState === 'running') {
        const nextDiscrete: DiscreteBreathingUiState = {
          elapsedSeconds: clock.elapsedWholeSeconds,
          phase: phaseState.phase,
          phaseRemainingSeconds: phaseState.phaseRemainingSeconds,
          completedCycles: Math.floor(clock.elapsedWholeSeconds / cycleLen),
        };

        if (
          hasDiscreteBreathingStateChanged(
            lastDiscreteUiRef.current,
            nextDiscrete
          )
        ) {
          const prevPhase = lastDiscreteUiRef.current.phase;
          lastDiscreteUiRef.current = nextDiscrete;
          setDiscreteUi(nextDiscrete);

          // Optional breath-synchronized harmonic cue & ripple on phase transitions
          if (prevPhase !== nextDiscrete.phase) {
            surfaceRipplesRef.current.push({
              id: nowMs + Math.random(),
              x: 310,
              y: 310,
              radius: 22,
              maxRadius: 235,
              intensity: 0.72,
            });
            if (
              breathSoundSyncRef.current &&
              !audioRef.current.muted
            ) {
              soundEngine.playBreathingPhaseCue(
                nextDiscrete.phase,
                audioRef.current.alertVolume
              );
            }
          }
        }

        if (clock.isComplete && !completionDispatched) {
          completionDispatched = true;
          accumulatedSecondsRef.current = durationSecs;
          segmentStartPerfMsRef.current = null;
          sessionStateRef.current = 'completed';
          setSessionState('completed');
          if (!audioRef.current.muted) {
            audioRef.current.onPlayGentleBell();
          }
          audioRef.current.onTogglePlay(false);
          onCompleteRestoreRef.current({
            mode: 'breathing',
            presetName: preset.name,
            environmentId: mapPresetToEnvironmentId(preset.id),
            durationSeconds: durationSecs,
            elapsedSeconds: durationSecs,
          });
        }
      }

      // Query Web Audio API energy bands for subtle audio-reactive visuals
      const audioBands =
        audioRef.current.audioReactive && audioRef.current.isPlaying
          ? soundEngine.getAudioBands()
          : { bass: 0, mid: 0, treble: 0, overall: 0 };

      // Compute synchronized 4-phase orb kinematics (Inhale, Hold, Exhale, Rest)
      const kinematics = computeBreathingOrbKinematics({
        sessionState: currentState,
        phase: phaseState.phase,
        phaseProgress: phaseState.phaseProgress,
        expansion: phaseState.expansion,
        ambientTimeSec: ambientTimeRef.current,
        audioEnergy: audioBands.overall,
        reducedMotion: isReduced,
      });

      const motionSpeed = isReduced
        ? 0.08
        : currentState === 'paused'
        ? 0.22
        : 0.88 * scene.motion.flowSpeed * kinematics.surfaceElasticityScale;
      ambientTimeRef.current += dt * motionSpeed;
      const t = ambientTimeRef.current;

      smoothedExpansionRef.current = isReduced
        ? kinematics.targetExpansion
        : dampValue(
            smoothedExpansionRef.current,
            kinematics.targetExpansion,
            6.8,
            dt
          );
      smoothedBrightnessRef.current = dampValue(
        smoothedBrightnessRef.current,
        kinematics.coreBrightness,
        5.5,
        dt
      );
      smoothedOuterGlowRef.current = dampValue(
        smoothedOuterGlowRef.current,
        kinematics.outerGlowAlpha,
        5.5,
        dt
      );

      const expansion = smoothedExpansionRef.current;
      const coreBright = smoothedBrightnessRef.current;
      const outerGlowAlpha = smoothedOuterGlowRef.current;

      // Smoothly damp Adaptive Atmosphere theme palette RGBs
      const targetPalette = computeThemeOrganismPalette(scene, 'focus');
      const colorDamp = isReduced ? 1 : Math.min(1, dt * 5.0);
      for (let c = 0; c < 3; c++) {
        currentPrimaryRgbRef.current[c] +=
          (targetPalette.primaryRgb[c] - currentPrimaryRgbRef.current[c]) *
          colorDamp;
        currentSecondaryRgbRef.current[c] +=
          (targetPalette.secondaryRgb[c] - currentSecondaryRgbRef.current[c]) *
          colorDamp;
        currentTertiaryRgbRef.current[c] +=
          (targetPalette.tertiaryRgb[c] - currentTertiaryRgbRef.current[c]) *
          colorDamp;
        currentIridescentRgbRef.current[c] +=
          (targetPalette.iridescentRgb[c] -
            currentIridescentRgbRef.current[c]) *
          colorDamp;
        currentLavenderRgbRef.current[c] +=
          (atmoProfile.lavenderTintRgb[c] - currentLavenderRgbRef.current[c]) *
          colorDamp;
      }

      const primaryRgb = currentPrimaryRgbRef.current;
      const currentResonanceRgb = currentSecondaryRgbRef.current;
      const tertiaryRgb = currentTertiaryRgbRef.current;
      const currentResonanceSecRgb = currentIridescentRgbRef.current;
      const lavenderRgb = currentLavenderRgbRef.current;
      const resonancePreset = getResonancePresetByChamberId(
        audioRef.current.activeChamberId
      );

      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const floatOffsetY =
        isReduced || currentState === 'paused'
          ? 0
          : Math.sin(nowMs * 0.0012 * atmoProfile.shimmerFrequency) *
            atmoProfile.buoyancyAmplitude *
            (phaseState.phase === 'hold-in' && currentState === 'running'
              ? 0.25
              : 0.65);
      const cy = size / 2 + floatOffsetY;
      const lensRadius =
        178 + expansion * 42 + audioBands.bass * 10;
      const elasticity = isReduced
        ? 0.14
        : scene.motion.elasticity * kinematics.surfaceElasticityScale;

      // 1. Volumetric Outer Glow (Synchronized with Inhale/Hold/Exhale/Rest & Audio)
      const outerHaloR = lensRadius * kinematics.outerGlowScale;
      const ambientGlow = ctx.createRadialGradient(
        cx,
        cy,
        lensRadius * 0.14,
        cx,
        cy,
        outerHaloR
      );
      ambientGlow.addColorStop(
        0,
        rgbaString(currentResonanceRgb, outerGlowAlpha)
      );
      ambientGlow.addColorStop(
        0.46,
        rgbaString(lavenderRgb, outerGlowAlpha * 0.68)
      );
      ambientGlow.addColorStop(
        0.76,
        rgbaString(primaryRgb, outerGlowAlpha * 0.32)
      );
      ambientGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, outerHaloR, 0, Math.PI * 2);
      ctx.fill();

      // 2. Clip to the Organic Liquid Lens Contour
      ctx.save();
      traceLensContour(cx, cy, lensRadius, t, elasticity, audioBands.bass);
      ctx.clip();

      // Translucent Optical Glass Base (Midnight Blue & Deep Violet Depth)
      const baseGrad = ctx.createRadialGradient(
        cx - 36,
        cy - 44,
        18,
        cx,
        cy,
        lensRadius * 1.08
      );
      baseGrad.addColorStop(0, 'rgba(28, 24, 58, 0.42)');
      baseGrad.addColorStop(0.62, 'rgba(13, 16, 36, 0.34)');
      baseGrad.addColorStop(1, 'rgba(7, 9, 22, 0.26)');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, size, size);

      // 3. Internal Light Diffusion & Volumetric Caustics (Cyan, Violet, Lavender, Subtle Pink)
      ctx.globalCompositeOperation = 'screen';

      const drawInternalCaustic = (
        offsetX: number,
        offsetY: number,
        blobR: number,
        rgbColor: [number, number, number],
        alpha: number
      ) => {
        const bx = cx + offsetX;
        const by = cy + offsetY;
        const g = ctx.createRadialGradient(bx, by, 6, bx, by, blobR);
        g.addColorStop(0, rgbaString(rgbColor, alpha * coreBright));
        g.addColorStop(0.56, rgbaString(rgbColor, alpha * 0.46 * coreBright));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, blobR, 0, Math.PI * 2);
        ctx.fill();
      };

      const orbitA = t * 0.72;
      const scaleFactor = lensRadius / 204;
      drawInternalCaustic(
        Math.cos(orbitA) * 56 * scaleFactor,
        Math.sin(orbitA * 0.8) * 48 * scaleFactor,
        (196 + expansion * 24 + audioBands.bass * 18) * scaleFactor,
        primaryRgb,
        0.84
      );
      drawInternalCaustic(
        Math.sin(-orbitA * 0.75) * 62 * scaleFactor,
        Math.cos(orbitA * 0.9) * 54 * scaleFactor,
        (190 + expansion * 20 + audioBands.mid * 16) * scaleFactor,
        currentResonanceRgb,
        0.88
      );
      drawInternalCaustic(
        Math.cos(orbitA * 0.5 + 2.1) * 46 * scaleFactor,
        Math.sin(orbitA * 1.1 + 1.4) * 58 * scaleFactor,
        (176 + expansion * 16) * scaleFactor,
        lavenderRgb,
        0.74
      );
      drawInternalCaustic(
        Math.sin(orbitA * 0.6 - 1.2) * 64 * scaleFactor,
        Math.cos(orbitA * 0.5 + 0.8) * 42 * scaleFactor,
        (174 + expansion * 18 + audioBands.treble * 14) * scaleFactor,
        currentResonanceSecRgb,
        0.78
      );
      drawInternalCaustic(
        0,
        0,
        lensRadius * (0.58 + expansion * 0.18),
        tertiaryRgb,
        0.48
      );

      // 4. Audio-Reactive & Breath-Synchronized Refractive Ripples inside the Lens
      const rippleCount = audioBands.overall > 0.12 ? 3 : 2;
      for (let rIdx = 0; rIdx < rippleCount; rIdx++) {
        const ripplePhase =
          (t * 0.26 + rIdx / rippleCount) % 1;
        const rr = 30 + ripplePhase * (lensRadius * 0.85);
        ctx.strokeStyle = rgbaString(
          currentResonanceRgb,
          (1 - ripplePhase) * (0.16 + audioBands.overall * 0.14)
        );
        ctx.lineWidth = 1.25 + audioBands.bass * 0.6;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Interactive pointer/phase ripples inside the lens
      if (surfaceRipplesRef.current.length > 0) {
        surfaceRipplesRef.current = surfaceRipplesRef.current.filter((rip) => {
          rip.radius += dt * 155;
          const progress = rip.radius / rip.maxRadius;
          if (progress >= 1) return false;
          ctx.strokeStyle = rgbaString(
            lavenderRgb,
            (1 - progress) * 0.36 * rip.intensity
          );
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.stroke();
          return true;
        });
      }

      // 5. Delicate Internal Particles Synchronized with Inhale (Outward) / Hold (Still) / Exhale (Inward)
      motes.forEach((mote) => {
        if (!isReduced && currentState !== 'paused') {
          mote.angle +=
            mote.angularSpeed *
            dt *
            kinematics.tangentialSpeedScale *
            (0.75 + audioBands.overall * 0.45);

          // Radial outward movement on Inhale, still on Hold, inward movement on Exhale
          mote.radialFraction +=
            kinematics.radialDriftVelocity *
            dt *
            0.22 *
            (0.7 + mote.depthLayer * 0.15);

          if (mote.radialFraction > 0.86) {
            mote.radialFraction = 0.86;
          } else if (mote.radialFraction < 0.1) {
            mote.radialFraction = 0.1;
          }
        }

        const radialDist =
          mote.radialFraction * lensRadius * (0.76 + expansion * 0.16);
        const mx = cx + Math.cos(mote.angle) * radialDist;
        const my = cy + Math.sin(mote.angle) * radialDist;

        const dotColor =
          mote.hueShift === 0
            ? targetPalette.iridescentHex
            : mote.hueShift === 1
            ? resonancePreset.primaryHex
            : mote.hueShift === 2
            ? rgbaString(lavenderRgb, 0.95)
            : targetPalette.secondaryHex;

        ctx.fillStyle = dotColor;
        ctx.globalAlpha = Math.min(
          0.86,
          mote.alpha * (0.45 + coreBright * 0.42 + audioBands.treble * 0.18)
        );
        ctx.beginPath();
        ctx.arc(
          mx,
          my,
          mote.baseRadius * (0.85 + expansion * 0.22),
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 6. Gentle Optical Depth Scrim
      ctx.globalCompositeOperation = 'source-over';
      const centerScrim = ctx.createRadialGradient(
        cx,
        cy,
        12,
        cx,
        cy,
        lensRadius * 0.78
      );
      centerScrim.addColorStop(0, 'rgba(10, 12, 26, 0.3)');
      centerScrim.addColorStop(0.6, 'rgba(10, 12, 26, 0.14)');
      centerScrim.addColorStop(1, 'rgba(10, 12, 26, 0.0)');
      ctx.fillStyle = centerScrim;
      ctx.fillRect(0, 0, size, size);

      // 7. 3D Specular Glass Dome Highlight (Top-Left Fresnel)
      const topSpecular = ctx.createLinearGradient(
        cx - lensRadius,
        cy - lensRadius,
        cx + lensRadius * 0.48,
        cy + lensRadius * 0.48
      );
      topSpecular.addColorStop(0, 'rgba(245, 246, 255, 0.26)');
      topSpecular.addColorStop(0.34, rgbaString(lavenderRgb, 0.1));
      topSpecular.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topSpecular;
      ctx.fillRect(0, 0, size, size);

      ctx.restore(); // End Lens Clip

      // 8. Feathered 3D Glass Rim Contour
      traceLensContour(cx, cy, lensRadius, t, elasticity, audioBands.bass);
      const rimStroke = ctx.createLinearGradient(
        cx - lensRadius,
        cy - lensRadius,
        cx + lensRadius,
        cy + lensRadius
      );
      rimStroke.addColorStop(0, 'rgba(245, 246, 255, 0.46)');
      rimStroke.addColorStop(0.5, rgbaString(currentResonanceRgb, 0.68));
      rimStroke.addColorStop(1, rgbaString(lavenderRgb, 0.68));
      ctx.strokeStyle = rimStroke;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 9. Synchronized Session & Phase Progress Rings around the Orb Rim
      if (currentState === 'running' || currentState === 'paused') {
        const startAngle = -Math.PI / 2;
        // Subtle full-circle track
        ctx.strokeStyle = 'rgba(245, 246, 255, 0.08)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(cx, cy, lensRadius + 12, 0, Math.PI * 2);
        ctx.stroke();

        // Session progress arc
        const endAngle = startAngle + clock.progressRatio * Math.PI * 2;
        ctx.strokeStyle = scene.colors.secondary || '#2FE8FF';
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, lensRadius + 12, startAngle, endAngle);
        ctx.stroke();
      }

      animId = requestAnimationFrame(drawFrame);
    };

    animId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleOrbPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((e.clientX - rect.left) / rect.width) * 620;
      const y = ((e.clientY - rect.top) / rect.height) * 620;
      pointerCanvasRef.current = { x, y };
    },
    []
  );

  const handleOrbPointerLeave = useCallback(() => {
    pointerCanvasRef.current = { x: null, y: null };
  }, []);

  const handleOrbClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x =
        rect.width > 0 ? ((e.clientX - rect.left) / rect.width) * 620 : 310;
      const y =
        rect.height > 0 ? ((e.clientY - rect.top) / rect.height) * 620 : 310;
      surfaceRipplesRef.current.push({
        id: Date.now() + Math.random(),
        x,
        y,
        radius: 14,
        maxRadius: 230,
        intensity: 1,
      });
    },
    []
  );

  const handleSelectBreathingPreset = useCallback(
    (presetId: BreathingPresetId) => {
      const resolved = resolveIntelligentBreathingPattern(
        presetId,
        customTiming
      );
      setSelectedBreathingId(presetId);
      onUpdateSettings({ defaultBreathingPresetId: presetId });

      surfaceRipplesRef.current.push({
        id: Date.now() + Math.random(),
        x: 310,
        y: 310,
        radius: 18,
        maxRadius: 220,
        intensity: 0.85,
      });

      if (sessionState === 'idle' || sessionState === 'completed') {
        setTargetDurationSeconds(resolved.recommendedDurationSeconds);
        accumulatedSecondsRef.current = 0;
        segmentStartPerfMsRef.current = null;
        const nextDiscrete: DiscreteBreathingUiState = {
          elapsedSeconds: 0,
          phase: 'inhale',
          phaseRemainingSeconds: resolved.inhaleSeconds,
          completedCycles: 0,
        };
        lastDiscreteUiRef.current = nextDiscrete;
        setDiscreteUi(nextDiscrete);
        if (sessionState === 'completed') {
          setSessionState('idle');
        }
      } else {
        const clock = computeClockElapsed({
          accumulatedSeconds: accumulatedSecondsRef.current,
          segmentStartPerfMs:
            sessionState === 'running' ? segmentStartPerfMsRef.current : null,
          nowPerfMs: performance.now(),
          targetDurationSeconds,
        });
        const phaseState = calculateBreathingPhaseAtTime(
          resolved,
          clock.elapsedFloatSeconds
        );
        const cycleLen = Math.max(
          1,
          resolved.inhaleSeconds +
            resolved.holdInSeconds +
            resolved.exhaleSeconds +
            resolved.holdOutSeconds
        );
        const nextDiscrete: DiscreteBreathingUiState = {
          elapsedSeconds: clock.elapsedWholeSeconds,
          phase: phaseState.phase,
          phaseRemainingSeconds: phaseState.phaseRemainingSeconds,
          completedCycles: Math.floor(clock.elapsedWholeSeconds / cycleLen),
        };
        lastDiscreteUiRef.current = nextDiscrete;
        setDiscreteUi(nextDiscrete);
      }
    },
    [customTiming, onUpdateSettings, sessionState, targetDurationSeconds]
  );

  const handleChangeCustomTiming = useCallback(
    (nextTiming: CustomBreathingTiming) => {
      const safe = sanitizeCustomBreathingPattern(nextTiming);
      setCustomTiming(safe);
      onUpdateSettings({
        customBreathingPattern: safe,
        defaultBreathingPresetId: 'custom',
      });
      if (sessionState === 'idle') {
        setDiscreteUi((prev) => ({
          ...prev,
          phaseRemainingSeconds: safe.inhaleSeconds,
        }));
      }
    },
    [onUpdateSettings, sessionState]
  );

  const handleSelectDurationSeconds = useCallback(
    (seconds: number) => {
      if (sessionState !== 'idle') return;
      setTargetDurationSeconds(seconds);
    },
    [sessionState]
  );

  const handleStart = useCallback(() => {
    if (sessionState === 'completed' || sessionState === 'idle') {
      accumulatedSecondsRef.current = 0;
      const nextDiscrete: DiscreteBreathingUiState = {
        elapsedSeconds: 0,
        phase: 'inhale',
        phaseRemainingSeconds: activeBreathingConfig.inhaleSeconds,
        completedCycles: 0,
      };
      lastDiscreteUiRef.current = nextDiscrete;
      setDiscreteUi(nextDiscrete);
      if (settings.breathSoundSync && !interaction.audio.muted) {
        soundEngine.playBreathingPhaseCue(
          'inhale',
          interaction.audio.alertVolume
        );
      }
    }
    segmentStartPerfMsRef.current = performance.now();
    setSessionState('running');
    interaction.audio.onTogglePlay(true);
  }, [
    activeBreathingConfig.inhaleSeconds,
    interaction.audio,
    sessionState,
    settings.breathSoundSync,
  ]);

  const handlePause = useCallback(() => {
    const clock = computeClockElapsed({
      accumulatedSeconds: accumulatedSecondsRef.current,
      segmentStartPerfMs: segmentStartPerfMsRef.current,
      nowPerfMs: performance.now(),
      targetDurationSeconds,
    });
    accumulatedSecondsRef.current = clock.elapsedFloatSeconds;
    segmentStartPerfMsRef.current = null;
    setSessionState('paused');
    interaction.audio.onTogglePlay(false);
  }, [interaction.audio, targetDurationSeconds]);

  const handleReset = useCallback(() => {
    accumulatedSecondsRef.current = 0;
    segmentStartPerfMsRef.current = null;
    setSessionState('idle');
    setFocusZenMode(false);
    const nextDiscrete: DiscreteBreathingUiState = {
      elapsedSeconds: 0,
      phase: 'inhale',
      phaseRemainingSeconds: activeBreathingConfig.inhaleSeconds,
      completedCycles: 0,
    };
    lastDiscreteUiRef.current = nextDiscrete;
    setDiscreteUi(nextDiscrete);
    interaction.audio.onTogglePlay(false);
  }, [activeBreathingConfig.inhaleSeconds, interaction.audio]);

  const handleCompleteEarly = useCallback(() => {
    const clock = computeClockElapsed({
      accumulatedSeconds: accumulatedSecondsRef.current,
      segmentStartPerfMs:
        sessionState === 'running' ? segmentStartPerfMsRef.current : null,
      nowPerfMs: performance.now(),
      targetDurationSeconds,
    });
    const creditSeconds = Math.max(1, clock.elapsedWholeSeconds);
    accumulatedSecondsRef.current = creditSeconds;
    segmentStartPerfMsRef.current = null;
    setDiscreteUi((prev) => ({ ...prev, elapsedSeconds: creditSeconds }));
    setSessionState('completed');
    setFocusZenMode(false);
    if (!interaction.audio.muted) {
      interaction.audio.onPlayGentleBell();
    }
    interaction.audio.onTogglePlay(false);
    onCompleteRestoreSession({
      mode: 'breathing',
      presetName: activeBreathingConfig.name,
      environmentId: mapPresetToEnvironmentId(activeBreathingConfig.id),
      durationSeconds: targetDurationSeconds,
      elapsedSeconds: creditSeconds,
    });
  }, [
    activeBreathingConfig.id,
    activeBreathingConfig.name,
    interaction.audio,
    onCompleteRestoreSession,
    sessionState,
    targetDurationSeconds,
  ]);

  const accentHex = interaction.activeScene.colors.secondary || '#2FE8FF';
  const secondaryHex = interaction.activeScene.colors.primary || '#5EF2C4';
  const activeAtmosphereProfile =
    ADAPTIVE_ATMOSPHERE_PROFILES[interaction.activeScene.id] ||
    ADAPTIVE_ATMOSPHERE_PROFILES['deep-current'];

  return (
    <section
      data-testid="liquid-lens-experience"
      aria-label="Liquid Lens Breathing Sanctuary"
      className="relative z-20 w-full max-w-4xl mx-auto px-3 sm:px-6 flex flex-col items-center justify-center flex-1 my-auto"
    >
      {/* Feature 2: Adaptive Atmosphere Crossfade Radial Aura Behind the Orb */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-1000"
        style={{
          background: activeAtmosphereProfile.radialGradientCss,
        }}
      />

      {sessionState === 'completed' ? (
        <div
          data-testid="restore-completion-card"
          className="relative z-10 aura-glass-elevated rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center max-w-md"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3 border"
            style={{
              backgroundColor: `${accentHex}22`,
              borderColor: `${accentHex}77`,
            }}
          >
            <CheckCircle2 className="w-6 h-6" style={{ color: accentHex }} />
          </div>
          <span
            className="font-mono text-[11px] uppercase tracking-[0.2em]"
            style={{ color: accentHex }}
          >
            BREATHING COMPLETE
          </span>
          <h2 className="font-display text-2xl font-semibold text-[#F5F6FF] mt-1">
            {activeBreathingConfig.name}
          </h2>
          <p className="text-xs sm:text-sm text-[#A3A1BA] mt-2 leading-relaxed">
            Completed{' '}
            <span className="text-[#F5F6FF] font-medium tabular-nums">
              {Math.floor(discreteUi.elapsedSeconds / 60)}m{' '}
              {discreteUi.elapsedSeconds % 60}s
            </span>{' '}
            of synchronized breathing. Kept separate from your focus
            productivity totals.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <AuraButton
              variant="primary"
              size="md"
              data-testid="restore-return-focus-btn"
              accentColor={accentHex}
              secondaryColor={secondaryHex}
              onClick={() => {
                handleReset();
                onReturnToFocusOrganism?.('celestial-jelly');
              }}
            >
              <span>Enter Focus Sanctuary</span>
              <ArrowRight className="w-4 h-4" />
            </AuraButton>
            <AuraButton
              variant="secondary"
              size="md"
              data-testid="restore-again-btn"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Breathe Again</span>
            </AuraButton>
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Centerpiece Living Breathing Intelligence Orb */}
          <div
            onPointerMove={handleOrbPointerMove}
            onPointerLeave={handleOrbPointerLeave}
            onClick={handleOrbClick}
            className={`relative flex items-center justify-center transition-all duration-500 cursor-pointer ${
              focusZenMode
                ? 'w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] -mb-1'
                : 'w-[240px] h-[240px] sm:w-[295px] sm:h-[295px] -mb-3'
            }`}
          >
            <canvas
              ref={lensCanvasRef}
              data-testid="liquid-lens-breathing-canvas"
              className="w-full h-full pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <Breathe
            activePresetId={selectedBreathingId}
            activePreset={activeBreathingConfig}
            availablePresets={stagePresets}
            durationSeconds={targetDurationSeconds}
            availableDurations={BREATHING_DURATION_OPTIONS}
            isRunning={sessionState === 'running'}
            currentPhase={discreteUi.phase}
            phaseRemainingSeconds={discreteUi.phaseRemainingSeconds}
            elapsedSeconds={discreteUi.elapsedSeconds}
            completedCycles={discreteUi.completedCycles}
            accentHex={accentHex}
            secondaryHex={secondaryHex}
            reducedMotion={interaction.reducedMotion}
            onSelectPreset={handleSelectBreathingPreset}
            onSelectDurationSeconds={handleSelectDurationSeconds}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onCompleteSession={handleCompleteEarly}
            focusZenMode={focusZenMode}
            onToggleFocusZenMode={() => setFocusZenMode((prev) => !prev)}
            customTiming={customTiming}
            onChangeCustomTiming={handleChangeCustomTiming}
            activeSpatialChamberId={interaction.audio.activeChamberId}
            isSoundPlaying={interaction.audio.isPlaying}
            isSoundMuted={interaction.audio.muted}
            ambienceVolume={interaction.audio.ambienceVolume}
            breathSoundSync={Boolean(settings.breathSoundSync)}
            onSelectSpatialSound={(id) => {
              interaction.audio.onSelectChamber(id);
              if (!interaction.audio.isPlaying) {
                interaction.audio.onPreviewChamber(
                  id,
                  interaction.audio.ambienceVolume
                );
              }
            }}
            onToggleSoundPlay={() => interaction.audio.onTogglePlay()}
            onToggleSoundMute={() => interaction.audio.onToggleMute()}
            onChangeAmbienceVolume={(vol) =>
              interaction.audio.onChangeAmbienceVolume(vol)
            }
            onToggleBreathSoundSync={() =>
              onUpdateSettings({
                breathSoundSync: !settings.breathSoundSync,
              })
            }
          />
        </div>
      )}
    </section>
  );
};
