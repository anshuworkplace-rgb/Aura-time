import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Wind,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ArrowRight,
  Square,
} from 'lucide-react';
import {
  BreathingPresetId,
  ChamberId,
  LiquidLensBreatheProps,
  LiquidLensContextualTuning,
  LiquidLensExperienceProps,
  LiquidLensSoundscapeProps,
  LiquidLensStillnessProps,
  LiquidLensSubMode,
  QuietMomentPresetId,
  RestoreEnvironmentId,
} from '../types/aura';
import {
  CHAMBERS,
  calculateBreathingPhaseAtTime,
  formatRemainingTime,
} from '../utils/focusEngine';
import { AuraButton } from './AuraButton';

/**
 * ============================================================================
 * SUB-MODULE A: BREATHE (Guided Cadence & Contextual Tuning)
 * ============================================================================
 */
export const Breathe: React.FC<LiquidLensBreatheProps> = ({
  activePresetId,
  availablePresets,
  tuning,
  isRunning,
  currentPhase,
  phaseRemainingSeconds,
  elapsedSeconds,
  completedCycles,
  environment,
  reducedMotion,
  onSelectPreset,
  onUpdateTuning,
  onStart,
  onPause,
  onReset,
  onCompleteSession,
}) => {
  const [tuningOpen, setTuningOpen] = useState(false);

  const phaseTitle =
    !isRunning && elapsedSeconds === 0
      ? 'Ready to Breathe'
      : currentPhase === 'inhale'
      ? 'Breathe In'
      : currentPhase === 'hold-in'
      ? 'Hold Gently'
      : currentPhase === 'exhale'
      ? 'Release Slowly'
      : 'Rest Still';

  return (
    <div
      data-testid="liquid-lens-breathe-panel"
      className="w-full flex flex-col items-center gap-5"
    >
      {/* Central Phase Readout */}
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#2FE8FF]/90">
          {environment.name} · Cadence {tuning.inhaleSeconds}-
          {tuning.enableBreathHold ? tuning.holdInSeconds : 0}-
          {tuning.exhaleSeconds}
        </span>
        <h2
          data-testid="breathing-phase-label"
          className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F6FF] tracking-tight mt-1"
        >
          {phaseTitle}
        </h2>
        <div className="flex items-center gap-3 mt-1.5 font-mono text-xs text-[#A3A1BA] tabular-nums">
          <span data-testid="breathing-phase-countdown" className="text-[#2FE8FF]">
            {isRunning || elapsedSeconds > 0
              ? `${phaseRemainingSeconds}s phase`
              : `${tuning.inhaleSeconds}s in · ${tuning.exhaleSeconds}s out`}
          </span>
          <span aria-hidden="true">·</span>
          <span data-testid="restore-timer-readout">
            {formatRemainingTime(
              Math.max(0, tuning.stillnessDurationSeconds - elapsedSeconds)
            )}{' '}
            remaining
          </span>
          {completedCycles > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {completedCycles} {completedCycles === 1 ? 'cycle' : 'cycles'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Primary Session Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {!isRunning && elapsedSeconds === 0 ? (
          <AuraButton
            variant="primary"
            size="lg"
            data-testid="restore-start-btn"
            reducedMotion={reducedMotion}
            accentColor={environment.accentHex}
            secondaryColor={environment.secondaryHex}
            onClick={onStart}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Begin Breathing</span>
          </AuraButton>
        ) : (
          <>
            <AuraButton
              variant="primary"
              size="md"
              data-testid="restore-pause-resume-btn"
              reducedMotion={reducedMotion}
              accentColor={environment.accentHex}
              secondaryColor={environment.secondaryHex}
              onClick={isRunning ? onPause : onStart}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
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
              <span>Complete</span>
            </AuraButton>

            <button
              type="button"
              data-testid="restore-reset-btn"
              onClick={onReset}
              aria-label="Reset breathing session"
              className="p-2.5 rounded-full aura-glass text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          type="button"
          data-testid="restore-custom-breathing-toggle"
          aria-expanded={tuningOpen}
          onClick={() => setTuningOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            tuningOpen
              ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
              : 'aura-glass text-[#A3A1BA] hover:text-[#F5F6FF]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-[#2FE8FF]" />
          <span>Contextual Tune</span>
        </button>
      </div>

      {/* Compact Breathing Cadence Selector */}
      <div
        role="radiogroup"
        aria-label="Breathing Cadence Presets"
        className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        {availablePresets
          .filter((p) => p.id !== 'custom')
          .map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`breathing-preset-${preset.id}`}
                onClick={() => onSelectPreset(preset.id)}
                className={`text-left px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#2FE8FF]/14 border-[#2FE8FF]/50 text-[#F5F6FF]'
                    : 'aura-glass border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-[#F5F6FF] truncate">
                    {preset.name}
                  </span>
                  <span className="font-mono text-[10px] text-[#2FE8FF] shrink-0 tabular-nums">
                    {preset.inhaleSeconds}-{preset.holdInSeconds}-
                    {preset.exhaleSeconds}
                  </span>
                </div>
                <p className="text-[11px] text-[#A3A1BA] mt-0.5 truncate">
                  {preset.subtitle}
                </p>
              </button>
            );
          })}
      </div>

      {/* Contextual Tuning Popover Card */}
      {tuningOpen && (
        <div
          data-testid="liquid-lens-tuning-card"
          className="w-full max-w-xl aura-glass-elevated rounded-3xl p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F5F6FF]">
              Cadence & Breath-Hold Calibration
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A3A1BA]">Breath Holds</span>
              <button
                type="button"
                role="switch"
                aria-checked={tuning.enableBreathHold}
                data-testid="toggle-breath-hold"
                onClick={() =>
                  onUpdateTuning({
                    enableBreathHold: !tuning.enableBreathHold,
                  })
                }
                className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                  tuning.enableBreathHold ? 'bg-[#2FE8FF]' : 'bg-white/15'
                }`}
              >
                <span
                  className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                    tuning.enableBreathHold
                      ? 'translate-x-4.5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-[#A3A1BA] font-mono">
                Inhale · {tuning.inhaleSeconds}s
              </span>
              <input
                type="range"
                min={2}
                max={10}
                value={tuning.inhaleSeconds}
                onChange={(e) => {
                  onSelectPreset('custom');
                  onUpdateTuning({ inhaleSeconds: Number(e.target.value) });
                }}
                className="w-full accent-[#2FE8FF]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[#A3A1BA] font-mono">
                Hold · {tuning.enableBreathHold ? tuning.holdInSeconds : 0}s
              </span>
              <input
                type="range"
                min={0}
                max={10}
                disabled={!tuning.enableBreathHold}
                value={tuning.holdInSeconds}
                onChange={(e) => {
                  onSelectPreset('custom');
                  onUpdateTuning({ holdInSeconds: Number(e.target.value) });
                }}
                className="w-full accent-[#2FE8FF] disabled:opacity-40"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[#A3A1BA] font-mono">
                Exhale · {tuning.exhaleSeconds}s
              </span>
              <input
                type="range"
                min={2}
                max={12}
                value={tuning.exhaleSeconds}
                onChange={(e) => {
                  onSelectPreset('custom');
                  onUpdateTuning({ exhaleSeconds: Number(e.target.value) });
                }}
                className="w-full accent-[#2FE8FF]"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ============================================================================
 * SUB-MODULE B: STILLNESS (Minimalist Quiet Moment Sanctuary)
 * ============================================================================
 */
export const Stillness: React.FC<LiquidLensStillnessProps> = ({
  activePresetId,
  availablePresets,
  durationSeconds,
  remainingSeconds,
  elapsedSeconds,
  isRunning,
  environment,
  reducedMotion,
  onSelectPreset,
  onChangeDurationSeconds,
  onStart,
  onPause,
  onReset,
  onCompleteSession,
}) => {
  const activePreset =
    availablePresets.find((p) => p.id === activePresetId) ||
    availablePresets[0];

  return (
    <div
      data-testid="liquid-lens-stillness-panel"
      className="w-full flex flex-col items-center gap-5"
    >
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FFB08A]">
          {activePreset.subtitle} · {environment.name}
        </span>
        <div
          data-testid="stillness-timer-readout"
          className="font-display text-4xl sm:text-5xl font-semibold text-[#F5F6FF] tabular-nums tracking-tight mt-1"
        >
          {formatRemainingTime(remainingSeconds)}
        </div>
        <p className="text-xs sm:text-sm text-[#A3A1BA] mt-1.5 max-w-md">
          {activePreset.guidanceText}
        </p>
      </div>

      {/* Primary Session Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        {!isRunning && elapsedSeconds === 0 ? (
          <AuraButton
            variant="primary"
            size="lg"
            data-testid="stillness-start-btn"
            reducedMotion={reducedMotion}
            accentColor={environment.accentHex}
            secondaryColor={environment.secondaryHex}
            onClick={onStart}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Begin Stillness ({Math.round(durationSeconds / 60)}m)</span>
          </AuraButton>
        ) : (
          <>
            <AuraButton
              variant="primary"
              size="md"
              data-testid="stillness-pause-resume-btn"
              reducedMotion={reducedMotion}
              accentColor={environment.accentHex}
              secondaryColor={environment.secondaryHex}
              onClick={isRunning ? onPause : onStart}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Resume</span>
                </>
              )}
            </AuraButton>

            <AuraButton
              variant="secondary"
              size="md"
              data-testid="stillness-stop-btn"
              reducedMotion={reducedMotion}
              onClick={onCompleteSession}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Complete</span>
            </AuraButton>

            <button
              type="button"
              onClick={onReset}
              aria-label="Reset stillness session"
              className="p-2.5 rounded-full aura-glass text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Quiet Moment Presets + Custom Duration */}
      <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {availablePresets.map((preset) => {
          const isSelected =
            activePresetId === preset.id &&
            durationSeconds === preset.durationSeconds;
          return (
            <button
              key={preset.id}
              type="button"
              data-testid={`quiet-preset-${preset.id}`}
              onClick={() => onSelectPreset(preset.id)}
              className={`text-left px-4 py-3 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FFB08A]/14 border-[#FFB08A]/55 text-[#F5F6FF]'
                  : 'aura-glass border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F5F6FF]">
                  {preset.name}
                </span>
                <span className="font-mono text-[11px] text-[#FFB08A] tabular-nums">
                  {preset.durationMinutes}m
                </span>
              </div>
              <p className="text-[11px] text-[#A3A1BA] mt-1 line-clamp-1">
                {preset.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Fine Duration Slider (1m - 20m) */}
      <div className="w-full max-w-md aura-glass rounded-2xl px-4 py-2.5 flex items-center justify-between gap-4 text-xs">
        <span className="text-[#A3A1BA] font-mono whitespace-nowrap">
          Stillness Duration · {Math.round(durationSeconds / 60)} min
        </span>
        <input
          type="range"
          min={60}
          max={1200}
          step={60}
          value={durationSeconds}
          onChange={(e) => onChangeDurationSeconds(Number(e.target.value))}
          aria-label="Stillness duration in minutes"
          className="w-40 accent-[#FFB08A]"
        />
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * SUB-MODULE C: SOUNDSCAPE (Restorative Acoustic & Environment Selector)
 * ============================================================================
 */
export const Soundscape: React.FC<LiquidLensSoundscapeProps> = ({
  activeEnvironmentId,
  availableEnvironments,
  audio,
  onSelectEnvironment,
}) => {
  return (
    <div
      data-testid="liquid-lens-soundscape-panel"
      className="w-full max-w-2xl flex flex-col items-center gap-4"
    >
      <div className="text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#2FE8FF]">
          LIQUID LENS · ACOUSTIC RESONANCE
        </span>
        <h2 className="font-display text-2xl font-semibold text-[#F5F6FF] mt-0.5">
          Restorative Environments & Soundscapes
        </h2>
      </div>

      {/* 4 Curated Restorative Environments */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {availableEnvironments.map((env) => {
          const isSelected = activeEnvironmentId === env.id;
          return (
            <button
              key={env.id}
              type="button"
              data-testid={`restore-env-${env.id}`}
              onClick={() => onSelectEnvironment(env.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/[0.1] border-[#2FE8FF]/55 text-[#F5F6FF]'
                  : 'aura-glass border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#F5F6FF]">
                  {env.name}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: env.accentHex }}
                />
              </div>
              <span className="block text-[10px] font-mono text-[#2FE8FF] mt-0.5">
                {env.soundLabel}
              </span>
              <p className="text-[11px] text-[#A3A1BA] mt-1 line-clamp-1">
                {env.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Direct 6-Chamber Selector + Volume Balance */}
      <div className="w-full aura-glass rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#F5F6FF]">
            Direct Acoustic Chamber
          </span>
          <button
            type="button"
            data-testid="restore-sound-toggle"
            onClick={() => audio.onTogglePlay()}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
              audio.isPlaying
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border-[#2FE8FF]/45'
                : 'bg-white/[0.04] text-[#A3A1BA] border-white/10'
            }`}
          >
            {audio.isPlaying ? (
              <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#A3A1BA]" />
            )}
            <span>{audio.isPlaying ? 'Playing' : 'Muted / Paused'}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CHAMBERS.map((ch) => {
            const active = audio.activeChamberId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                data-testid={`liquid-soundscape-chamber-${ch.id}`}
                onClick={() => audio.onSelectChamber(ch.id as ChamberId)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                    : 'bg-white/[0.03] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10'
                }`}
              >
                {ch.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10 text-xs">
          <label className="flex items-center justify-between gap-3">
            <span className="text-[#A3A1BA]">
              Ambience ({Math.round(audio.ambienceVolume * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.ambienceVolume * 100)}
              onChange={(e) =>
                audio.onChangeAmbienceVolume(Number(e.target.value) / 100)
              }
              aria-label="Restore ambience volume"
              className="w-32 accent-[#2FE8FF]"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span className="text-[#A3A1BA]">
              Bell Chime ({Math.round(audio.alertVolume * 100)}%)
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.alertVolume * 100)}
              onChange={(e) =>
                audio.onChangeAlertVolume(Number(e.target.value) / 100)
              }
              aria-label="Restore completion bell volume"
              className="w-32 accent-[#2FE8FF]"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * PRIMARY MODULE: LIQUID LENS EXPERIENCE
 * ============================================================================
 */
export const LiquidLensExperience: React.FC<LiquidLensExperienceProps> = ({
  interaction,
  restoreCompatibility,
  activeSubMode: controlledSubMode,
  onSubModeChange,
  onReturnToFocusOrganism,
}) => {
  const { settings, onUpdateSettings, onCompleteRestoreSession } =
    restoreCompatibility;
  const {
    availableEnvironments,
    availableBreathingPresets,
    availableStillnessPresets,
  } = restoreCompatibility;

  const [internalSubMode, setInternalSubMode] = useState<LiquidLensSubMode>(
    () =>
      settings.defaultRestoreMode === 'quiet-moment' ? 'stillness' : 'breathe'
  );

  const subMode = controlledSubMode ?? internalSubMode;
  const handleSelectSubMode = useCallback(
    (next: LiquidLensSubMode) => {
      setInternalSubMode(next);
      onSubModeChange?.(next);
      if (next === 'breathe') {
        onUpdateSettings({ defaultRestoreMode: 'breathing' });
      } else if (next === 'stillness') {
        onUpdateSettings({ defaultRestoreMode: 'quiet-moment' });
      }
    },
    [onSubModeChange, onUpdateSettings]
  );

  const [selectedEnvId, setSelectedEnvId] = useState<RestoreEnvironmentId>(
    () => settings.defaultRestoreEnvironmentId ?? 'rain-garden'
  );
  const [selectedBreathingId, setSelectedBreathingId] =
    useState<BreathingPresetId>(
      () => settings.defaultBreathingPresetId ?? 'coherent-5-5'
    );
  const [selectedQuietId, setSelectedQuietId] = useState<QuietMomentPresetId>(
    () => settings.defaultQuietMomentPresetId ?? 'reset-2m'
  );

  const [tuning, setTuning] = useState<LiquidLensContextualTuning>(() => {
    const initialPreset =
      availableBreathingPresets.find(
        (b) => b.id === (settings.defaultBreathingPresetId ?? 'coherent-5-5')
      ) || availableBreathingPresets[0];
    const initialQuiet =
      availableStillnessPresets.find(
        (q) => q.id === (settings.defaultQuietMomentPresetId ?? 'reset-2m')
      ) || availableStillnessPresets[0];

    return {
      inhaleSeconds: initialPreset.inhaleSeconds,
      holdInSeconds: initialPreset.holdInSeconds,
      exhaleSeconds: initialPreset.exhaleSeconds,
      holdOutSeconds: initialPreset.holdOutSeconds,
      enableBreathHold: true,
      stillnessDurationSeconds: initialQuiet.durationSeconds,
      environmentId: settings.defaultRestoreEnvironmentId ?? 'rain-garden',
      ambienceVolume: settings.ambienceVolume,
      reducedMotion: settings.reducedMotion,
    };
  });

  const [sessionState, setSessionState] = useState<
    'idle' | 'running' | 'paused' | 'completed'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedFloatSec, setElapsedFloatSec] = useState(0);

  const rafRef = useRef<number>(0);
  const lastFrameMsRef = useRef<number>(0);
  const lensCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeEnvironment = useMemo(
    () =>
      availableEnvironments.find((e) => e.id === selectedEnvId) ||
      availableEnvironments[0],
    [availableEnvironments, selectedEnvId]
  );

  const activeBreathingConfig = useMemo(() => {
    const preset =
      availableBreathingPresets.find((b) => b.id === selectedBreathingId) ||
      availableBreathingPresets[0];
    if (selectedBreathingId === 'custom') {
      return {
        ...preset,
        inhaleSeconds: tuning.inhaleSeconds,
        holdInSeconds: tuning.enableBreathHold ? tuning.holdInSeconds : 0,
        exhaleSeconds: tuning.exhaleSeconds,
        holdOutSeconds: tuning.enableBreathHold ? tuning.holdOutSeconds : 0,
      };
    }
    return {
      ...preset,
      holdInSeconds: tuning.enableBreathHold ? preset.holdInSeconds : 0,
      holdOutSeconds: tuning.enableBreathHold ? preset.holdOutSeconds : 0,
    };
  }, [availableBreathingPresets, selectedBreathingId, tuning]);

  const activeQuietConfig = useMemo(
    () =>
      availableStillnessPresets.find((q) => q.id === selectedQuietId) ||
      availableStillnessPresets[0],
    [availableStillnessPresets, selectedQuietId]
  );

  const targetDurationSeconds =
    subMode === 'stillness'
      ? tuning.stillnessDurationSeconds
      : activeBreathingConfig.recommendedDurationSeconds;

  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);

  const breathingPhaseState = useMemo(
    () =>
      calculateBreathingPhaseAtTime(activeBreathingConfig, elapsedFloatSec),
    [activeBreathingConfig, elapsedFloatSec]
  );

  const cycleLengthSeconds = Math.max(
    1,
    activeBreathingConfig.inhaleSeconds +
      activeBreathingConfig.holdInSeconds +
      activeBreathingConfig.exhaleSeconds +
      activeBreathingConfig.holdOutSeconds
  );
  const completedCycles = Math.floor(elapsedSeconds / cycleLengthSeconds);

  // High-precision restorative session loop
  useEffect(() => {
    if (sessionState !== 'running') {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameMsRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(
        0.25,
        Math.max(0, (now - lastFrameMsRef.current) / 1000)
      );
      lastFrameMsRef.current = now;

      setElapsedFloatSec((prev) => {
        const next = prev + dt;
        const nextWhole = Math.floor(next);
        setElapsedSeconds(nextWhole);
        if (nextWhole >= targetDurationSeconds) {
          setSessionState('completed');
          interaction.audio.onPlayGentleBell();
          onCompleteRestoreSession({
            mode: subMode === 'stillness' ? 'quiet-moment' : 'breathing',
            presetName:
              subMode === 'stillness'
                ? activeQuietConfig.name
                : activeBreathingConfig.name,
            environmentId: selectedEnvId,
            durationSeconds: targetDurationSeconds,
            elapsedSeconds: targetDurationSeconds,
          });
          return targetDurationSeconds;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [
    activeBreathingConfig.name,
    activeQuietConfig.name,
    interaction.audio,
    onCompleteRestoreSession,
    selectedEnvId,
    sessionState,
    subMode,
    targetDurationSeconds,
  ]);

  // Refractive Liquid Lens Caustics & Breathing Portal Canvas
  useEffect(() => {
    const canvas = lensCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let animId = 0;
    let ambientTime = 0;

    const draw = () => {
      ambientTime += 0.016;
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;

      const expansion =
        subMode === 'breathe'
          ? sessionState === 'running' || sessionState === 'paused'
            ? breathingPhaseState.expansion
            : 0.45 + 0.22 * Math.sin(ambientTime * 1.05)
          : 0.52 + 0.14 * Math.sin(ambientTime * 0.75);

      const minR = 52;
      const maxR = 108;
      const currentR = minR + expansion * (maxR - minR);

      // Outer Refractive Caustics Halo
      const halo = ctx.createRadialGradient(
        cx,
        cy,
        currentR * 0.18,
        cx,
        cy,
        maxR * 1.24
      );
      halo.addColorStop(0, `${activeEnvironment.accentHex}42`);
      halo.addColorStop(0.55, `${activeEnvironment.secondaryHex}22`);
      halo.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 1.24, 0, Math.PI * 2);
      ctx.fill();

      // Target Horizon Ring
      ctx.strokeStyle = 'rgba(245, 246, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3 Refractive Liquid Glass Meniscus Rings
      for (let layer = 2; layer >= 0; layer--) {
        const layerScale = 1 + layer * 0.1;
        const r = currentR * layerScale;
        ctx.beginPath();
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const wave = interaction.reducedMotion
            ? 0
            : Math.sin(theta * 4 + ambientTime * (1.1 - layer * 0.2)) *
                (2.8 + expansion * 2.4) +
              Math.cos(theta * 3 - ambientTime * 0.65) * 1.8;
          const rad = r + wave;
          const x = cx + Math.cos(theta) * rad;
          const y = cy + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(
          cx - r * 0.22,
          cy - r * 0.22,
          6,
          cx,
          cy,
          r * 1.08
        );
        const alphaHex = layer === 0 ? '60' : layer === 1 ? '30' : '18';
        grad.addColorStop(0, `${activeEnvironment.accentHex}${alphaHex}`);
        grad.addColorStop(0.68, `${activeEnvironment.secondaryHex}${alphaHex}`);
        grad.addColorStop(1, 'rgba(7, 8, 18, 0.04)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle =
          layer === 0
            ? `${activeEnvironment.accentHex}BB`
            : `${activeEnvironment.secondaryHex}44`;
        ctx.lineWidth = layer === 0 ? 1.6 : 1.0;
        ctx.stroke();
      }

      // Active Session Perimeter Progress Arc
      if (sessionState === 'running' || sessionState === 'paused') {
        const ratio = Math.min(
          1,
          elapsedFloatSec / Math.max(1, targetDurationSeconds)
        );
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + ratio * Math.PI * 2;
        ctx.strokeStyle = activeEnvironment.accentHex;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, maxR + 12, startAngle, endAngle);
        ctx.stroke();
      }

      if (!interaction.reducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [
    activeEnvironment,
    breathingPhaseState.expansion,
    elapsedFloatSec,
    interaction.reducedMotion,
    sessionState,
    subMode,
    targetDurationSeconds,
  ]);

  const handleSelectEnvironment = useCallback(
    (envId: RestoreEnvironmentId) => {
      setSelectedEnvId(envId);
      setTuning((prev) => ({ ...prev, environmentId: envId }));
      onUpdateSettings({ defaultRestoreEnvironmentId: envId });
      const found = availableEnvironments.find((e) => e.id === envId);
      if (found) {
        interaction.onSelectScene(found.sceneId);
        interaction.audio.onSelectChamber(found.chamberId);
      }
    },
    [availableEnvironments, interaction, onUpdateSettings]
  );

  const handleSelectBreathingPreset = useCallback(
    (presetId: BreathingPresetId) => {
      setSelectedBreathingId(presetId);
      onUpdateSettings({ defaultBreathingPresetId: presetId });
      const found = availableBreathingPresets.find((p) => p.id === presetId);
      if (found && presetId !== 'custom') {
        setTuning((prev) => ({
          ...prev,
          inhaleSeconds: found.inhaleSeconds,
          holdInSeconds: found.holdInSeconds,
          exhaleSeconds: found.exhaleSeconds,
          holdOutSeconds: found.holdOutSeconds,
          stillnessDurationSeconds: found.recommendedDurationSeconds,
        }));
      }
      setSessionState('idle');
      setElapsedSeconds(0);
      setElapsedFloatSec(0);
    },
    [availableBreathingPresets, onUpdateSettings]
  );

  const handleSelectQuietPreset = useCallback(
    (presetId: QuietMomentPresetId) => {
      setSelectedQuietId(presetId);
      onUpdateSettings({ defaultQuietMomentPresetId: presetId });
      const found = availableStillnessPresets.find((p) => p.id === presetId);
      if (found) {
        setTuning((prev) => ({
          ...prev,
          stillnessDurationSeconds: found.durationSeconds,
        }));
      }
      setSessionState('idle');
      setElapsedSeconds(0);
      setElapsedFloatSec(0);
    },
    [availableStillnessPresets, onUpdateSettings]
  );

  const handleStart = useCallback(() => {
    if (sessionState === 'completed') {
      setElapsedSeconds(0);
      setElapsedFloatSec(0);
    }
    setSessionState('running');
    if (!interaction.audio.isPlaying && !interaction.audio.muted) {
      interaction.audio.onTogglePlay(true);
    }
  }, [interaction.audio, sessionState]);

  const handlePause = useCallback(() => {
    setSessionState('paused');
  }, []);

  const handleReset = useCallback(() => {
    setSessionState('idle');
    setElapsedSeconds(0);
    setElapsedFloatSec(0);
  }, []);

  const handleCompleteEarly = useCallback(() => {
    const creditSeconds = Math.max(1, elapsedSeconds);
    setSessionState('completed');
    interaction.audio.onPlayGentleBell();
    onCompleteRestoreSession({
      mode: subMode === 'stillness' ? 'quiet-moment' : 'breathing',
      presetName:
        subMode === 'stillness'
          ? activeQuietConfig.name
          : activeBreathingConfig.name,
      environmentId: selectedEnvId,
      durationSeconds: targetDurationSeconds,
      elapsedSeconds: creditSeconds,
    });
  }, [
    activeBreathingConfig.name,
    activeQuietConfig.name,
    elapsedSeconds,
    interaction.audio,
    onCompleteRestoreSession,
    selectedEnvId,
    subMode,
    targetDurationSeconds,
  ]);

  return (
    <section
      data-testid="liquid-lens-experience"
      aria-label="Liquid Lens Restorative Sanctuary"
      className="relative z-20 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-14 pb-4 flex flex-col items-center justify-between flex-1"
    >
      {/* Top Sub-Mode Bar: Breathe | Stillness | Soundscape */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-2">
        <div
          role="tablist"
          aria-label="Liquid Lens Restorative Modes"
          data-testid="liquid-lens-submode-tabs"
          className="flex items-center gap-1 p-1 rounded-full aura-glass"
        >
          {(
            [
              {
                id: 'breathe',
                label: 'Breathe',
                testId: 'restore-mode-breathing',
                Icon: Wind,
              },
              {
                id: 'stillness',
                label: 'Stillness',
                testId: 'restore-mode-quiet',
                Icon: Sparkles,
              },
              {
                id: 'soundscape',
                label: 'Soundscape',
                testId: 'restore-mode-soundscape',
                Icon: Volume2,
              },
            ] as const
          ).map(({ id, label, testId, Icon }) => {
            const isSelected = subMode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                data-testid={testId}
                onClick={() => handleSelectSubMode(id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50 shadow-[0_0_16px_rgba(47,232,255,0.18)]'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#2FE8FF]" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Restorative Session Count & Optional 3D Refractive Orb Stage Toggle */}
        <div className="flex items-center gap-2">
          {restoreCompatibility.restoreSessions.length > 0 && (
            <span
              data-testid="liquid-lens-restore-count"
              className="text-xs font-mono text-[#A3A1BA] tabular-nums"
            >
              {restoreCompatibility.restoreSessions.length} restorative{' '}
              {restoreCompatibility.restoreSessions.length === 1
                ? 'pause'
                : 'pauses'}
            </span>
          )}
          {onReturnToFocusOrganism && (
            <button
              type="button"
              data-testid="liquid-lens-stage-mode-toggle"
              onClick={() => onReturnToFocusOrganism('original')}
              className="px-3 py-1.5 rounded-full aura-glass text-xs text-[#2FE8FF] hover:text-[#F5F6FF] transition-colors cursor-pointer whitespace-nowrap"
            >
              Ripple Portal Stage
            </button>
          )}
        </div>
      </div>

      {/* Central Refractive Liquid Lens Portal + Active Sub-Mode Experience */}
      <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-2">
        {sessionState === 'completed' ? (
          <div
            data-testid="restore-completion-card"
            className="aura-glass-elevated rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center max-w-md"
          >
            <div className="w-12 h-12 rounded-full bg-[#2FE8FF]/15 border border-[#2FE8FF]/45 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-[#2FE8FF]" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#2FE8FF]">
              RESTORATION COMPLETE
            </span>
            <h2 className="font-display text-2xl font-semibold text-[#F5F6FF] mt-1">
              Nervous System Reset
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A1BA] mt-2 leading-relaxed">
              Logged{' '}
              <span className="text-[#F5F6FF] font-medium tabular-nums">
                {Math.max(1, Math.round(elapsedSeconds / 60))}m{' '}
                {elapsedSeconds % 60}s
              </span>{' '}
              in {activeEnvironment.name}. Kept separate from your focus
              productivity totals.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <AuraButton
                variant="primary"
                size="md"
                data-testid="restore-return-focus-btn"
                accentColor={activeEnvironment.accentHex}
                secondaryColor={activeEnvironment.secondaryHex}
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
                <span>Restore Again</span>
              </AuraButton>
            </div>
          </div>
        ) : (
          <>
            {/* Optical Caustics Lens Canvas */}
            <div className="relative flex items-center justify-center w-[210px] h-[210px] sm:w-[250px] sm:h-[250px] mb-2">
              <canvas
                ref={lensCanvasRef}
                className="w-full h-full pointer-events-none"
                aria-hidden="true"
              />
            </div>

            {subMode === 'breathe' && (
              <Breathe
                activePresetId={selectedBreathingId}
                availablePresets={availableBreathingPresets}
                tuning={tuning}
                isRunning={sessionState === 'running'}
                currentPhase={breathingPhaseState.phase}
                phaseProgress={breathingPhaseState.expansion}
                phaseRemainingSeconds={
                  breathingPhaseState.phaseRemainingSeconds
                }
                elapsedSeconds={elapsedSeconds}
                completedCycles={completedCycles}
                environment={activeEnvironment}
                reducedMotion={interaction.reducedMotion}
                onSelectPreset={handleSelectBreathingPreset}
                onUpdateTuning={(partial) =>
                  setTuning((prev) => ({ ...prev, ...partial }))
                }
                onStart={handleStart}
                onPause={handlePause}
                onReset={handleReset}
                onCompleteSession={handleCompleteEarly}
              />
            )}

            {subMode === 'stillness' && (
              <Stillness
                activePresetId={selectedQuietId}
                availablePresets={availableStillnessPresets}
                durationSeconds={tuning.stillnessDurationSeconds}
                remainingSeconds={remainingSeconds}
                elapsedSeconds={elapsedSeconds}
                isRunning={sessionState === 'running'}
                environment={activeEnvironment}
                reducedMotion={interaction.reducedMotion}
                onSelectPreset={handleSelectQuietPreset}
                onChangeDurationSeconds={(secs) => {
                  setTuning((prev) => ({
                    ...prev,
                    stillnessDurationSeconds: secs,
                  }));
                  handleReset();
                }}
                onStart={handleStart}
                onPause={handlePause}
                onReset={handleReset}
                onCompleteSession={handleCompleteEarly}
              />
            )}

            {subMode === 'soundscape' && (
              <Soundscape
                activeEnvironmentId={selectedEnvId}
                availableEnvironments={availableEnvironments}
                audio={interaction.audio}
                reducedMotion={interaction.reducedMotion}
                onSelectEnvironment={handleSelectEnvironment}
              />
            )}
          </>
        )}
      </div>
    </section>
  );
};
