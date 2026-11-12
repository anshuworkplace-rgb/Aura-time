import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wind,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  ArrowRight,
  RotateCcw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  BreathingPresetId,
  ChamberId,
  FocusSceneId,
  QuietMomentPresetId,
  RestoreEnvironmentId,
  RestoreModeId,
  RestoreSessionRecord,
  UserSettings,
} from '../types/aura';
import {
  BREATHING_PRESETS,
  QUIET_MOMENT_PRESETS,
  RESTORE_ENVIRONMENTS,
  calculateBreathingPhaseAtTime,
  formatRemainingTime,
} from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface RestoreExperienceProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  soundscapePlaying: boolean;
  onToggleSoundscape: (playing: boolean) => void;
  onSelectEnvironment: (sceneId: FocusSceneId, chamberId: ChamberId) => void;
  onReturnToFocus: () => void;
  onRecordRestoreSession: (record: RestoreSessionRecord) => void;
  restoreSessionsCount: number;
}

export const RestoreExperience: React.FC<RestoreExperienceProps> = ({
  settings,
  onUpdateSettings,
  soundscapePlaying,
  onToggleSoundscape,
  onSelectEnvironment,
  onReturnToFocus,
  onRecordRestoreSession,
  restoreSessionsCount,
}) => {
  const [activeMode, setActiveMode] = useState<RestoreModeId>('breathing');
  const [selectedEnvId, setSelectedEnvId] =
    useState<RestoreEnvironmentId>('rain-garden');
  const [selectedBreathingId, setSelectedBreathingId] =
    useState<BreathingPresetId>('coherent-5-5');
  const [selectedQuietId, setSelectedQuietId] =
    useState<QuietMomentPresetId>('reset-2m');

  // Custom breathing timing configuration
  const [customInhale, setCustomInhale] = useState(4);
  const [customHoldIn, setCustomHoldIn] = useState(4);
  const [customExhale, setCustomExhale] = useState(6);
  const [customHoldOut, setCustomHoldOut] = useState(0);
  const [enableBreathHold, setEnableBreathHold] = useState(true);
  const [showCustomBreathing, setShowCustomBreathing] = useState(false);

  // Active restorative session state
  const [sessionState, setSessionState] = useState<
    'idle' | 'running' | 'paused' | 'completed'
  >('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [elapsedFloatSec, setElapsedFloatSec] = useState(0);

  const rafRef = useRef<number>(0);
  const lastFrameMsRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeEnvironment = useMemo(
    () =>
      RESTORE_ENVIRONMENTS.find((e) => e.id === selectedEnvId) ||
      RESTORE_ENVIRONMENTS[0],
    [selectedEnvId]
  );

  const activeBreathingConfig = useMemo(() => {
    const preset =
      BREATHING_PRESETS.find((b) => b.id === selectedBreathingId) ||
      BREATHING_PRESETS[0];
    if (selectedBreathingId === 'custom') {
      return {
        ...preset,
        inhaleSeconds: customInhale,
        holdInSeconds: enableBreathHold ? customHoldIn : 0,
        exhaleSeconds: customExhale,
        holdOutSeconds: enableBreathHold ? customHoldOut : 0,
      };
    }
    return {
      ...preset,
      holdInSeconds: enableBreathHold ? preset.holdInSeconds : 0,
      holdOutSeconds: enableBreathHold ? preset.holdOutSeconds : 0,
    };
  }, [
    selectedBreathingId,
    customInhale,
    customHoldIn,
    customExhale,
    customHoldOut,
    enableBreathHold,
  ]);

  const activeQuietConfig = useMemo(
    () =>
      QUIET_MOMENT_PRESETS.find((q) => q.id === selectedQuietId) ||
      QUIET_MOMENT_PRESETS[0],
    [selectedQuietId]
  );

  const targetDurationSeconds =
    activeMode === 'breathing'
      ? activeBreathingConfig.recommendedDurationSeconds
      : activeQuietConfig.durationSeconds;

  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);

  const breathingPhaseState = useMemo(
    () =>
      calculateBreathingPhaseAtTime(activeBreathingConfig, elapsedFloatSec),
    [activeBreathingConfig, elapsedFloatSec]
  );

  // Accurate high-frequency timer loop for smooth breathing visual & countdown
  useEffect(() => {
    if (sessionState !== 'running') {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    lastFrameMsRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.25, Math.max(0, (now - lastFrameMsRef.current) / 1000));
      lastFrameMsRef.current = now;

      setElapsedFloatSec((prev) => {
        const next = prev + dt;
        const nextWhole = Math.floor(next);
        setElapsedSeconds(nextWhole);
        if (nextWhole >= targetDurationSeconds) {
          setSessionState('completed');
          soundEngine.playRestoreCompletionChime(settings.alertVolume);
          onRecordRestoreSession({
            id: `restore-${Date.now()}`,
            mode: activeMode,
            presetName:
              activeMode === 'breathing'
                ? activeBreathingConfig.name
                : activeQuietConfig.name,
            environmentId: selectedEnvId,
            durationSeconds: targetDurationSeconds,
            completedAt: new Date().toISOString(),
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
    sessionState,
    targetDurationSeconds,
    activeMode,
    activeBreathingConfig.name,
    activeQuietConfig.name,
    selectedEnvId,
    settings.alertVolume,
    onRecordRestoreSession,
  ]);

  // Procedural Canvas Renderer for the Expanding/Contracting Breathing & Quiet Sanctuary Guide
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 340;
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
        activeMode === 'breathing'
          ? sessionState === 'running' || sessionState === 'paused'
            ? breathingPhaseState.expansion
            : 0.45 + 0.25 * Math.sin(ambientTime * 1.1)
          : 0.5 + 0.18 * Math.sin(ambientTime * 0.8);

      const minR = 56;
      const maxR = 128;
      const currentR = minR + expansion * (maxR - minR);

      // 1. Soft Outer Sanctuary Halo
      const outerHalo = ctx.createRadialGradient(
        cx,
        cy,
        currentR * 0.2,
        cx,
        cy,
        maxR * 1.22
      );
      outerHalo.addColorStop(0, `${activeEnvironment.accentHex}38`);
      outerHalo.addColorStop(0.55, `${activeEnvironment.secondaryHex}1E`);
      outerHalo.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // 2. Reference Horizon Ring (Max Expansion Target)
      ctx.strokeStyle = 'rgba(245, 246, 255, 0.11)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Organic Multi-Petal Breathing Ripple Layers
      for (let layer = 2; layer >= 0; layer--) {
        const layerScale = 1 + layer * 0.11;
        const r = currentR * layerScale;
        ctx.beginPath();
        const steps = 72;
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          const wave =
            Math.sin(theta * 5 + ambientTime * (1.1 - layer * 0.2)) *
              (3.5 + expansion * 3) +
            Math.cos(theta * 3 - ambientTime * 0.7) * 2.5;
          const rad = r + wave;
          const x = cx + Math.cos(theta) * rad;
          const y = cy + Math.sin(theta) * rad;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const layerGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, r * 1.1);
        const alphaHex = layer === 0 ? '58' : layer === 1 ? '2C' : '16';
        layerGrad.addColorStop(0, `${activeEnvironment.accentHex}${alphaHex}`);
        layerGrad.addColorStop(
          0.7,
          `${activeEnvironment.secondaryHex}${alphaHex}`
        );
        layerGrad.addColorStop(1, 'rgba(7, 8, 18, 0.05)');
        ctx.fillStyle = layerGrad;
        ctx.fill();

        ctx.strokeStyle =
          layer === 0
            ? `${activeEnvironment.accentHex}AA`
            : `${activeEnvironment.secondaryHex}44`;
        ctx.lineWidth = layer === 0 ? 1.8 : 1.0;
        ctx.stroke();
      }

      // 4. Progress Ring around Perimeter when Session is Running
      if (sessionState === 'running' || sessionState === 'paused') {
        const progressRatio = Math.min(
          1,
          elapsedFloatSec / Math.max(1, targetDurationSeconds)
        );
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + progressRatio * Math.PI * 2;
        ctx.strokeStyle = activeEnvironment.accentHex;
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, maxR + 16, startAngle, endAngle);
        ctx.stroke();
      }

      if (!settings.reducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [
    activeMode,
    sessionState,
    breathingPhaseState.expansion,
    activeEnvironment,
    elapsedFloatSec,
    targetDurationSeconds,
    settings.reducedMotion,
  ]);

  const handleSelectNatureEnv = (envId: RestoreEnvironmentId) => {
    setSelectedEnvId(envId);
    const found = RESTORE_ENVIRONMENTS.find((e) => e.id === envId);
    if (found) {
      onSelectEnvironment(found.sceneId, found.chamberId);
    }
  };

  const handleStartSession = () => {
    if (sessionState === 'completed') {
      setElapsedSeconds(0);
      setElapsedFloatSec(0);
    }
    setSessionState('running');
    if (!soundscapePlaying && !settings.soundMuted) {
      onToggleSoundscape(true);
    }
  };

  const handlePauseResume = () => {
    setSessionState((prev) => (prev === 'running' ? 'paused' : 'running'));
  };

  const handleStopOrCompleteEarly = () => {
    if (elapsedSeconds >= 10) {
      setSessionState('completed');
      soundEngine.playRestoreCompletionChime(settings.alertVolume);
      onRecordRestoreSession({
        id: `restore-${Date.now()}`,
        mode: activeMode,
        presetName:
          activeMode === 'breathing'
            ? activeBreathingConfig.name
            : activeQuietConfig.name,
        environmentId: selectedEnvId,
        durationSeconds: elapsedSeconds,
        completedAt: new Date().toISOString(),
      });
    } else {
      setSessionState('idle');
      setElapsedSeconds(0);
      setElapsedFloatSec(0);
    }
  };

  const handleResetSession = () => {
    setSessionState('idle');
    setElapsedSeconds(0);
    setElapsedFloatSec(0);
  };

  return (
    <section
      data-testid="restore-experience-view"
      aria-label="Restore Sanctuary"
      className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 flex flex-col items-center"
    >
      {/* Top Header & Pillar Switcher */}
      <div className="w-full flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#2FE8FF]" />
            <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#2FE8FF]">
              RESTORE SANCTUARY · NON-GOAL RECOVERY
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight mt-1">
            Restorative Breathing & Quiet Moments
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A1BA] mt-0.5 max-w-xl">
            Unhurried nervous-system recovery between deep work sessions.
            Restorative time is kept strictly separate from your focus totals.
          </p>
        </div>

        {/* Mode Switcher Tabs: Breathing Space vs Quiet Moments */}
        <div
          role="tablist"
          aria-label="Restore modes"
          className="flex items-center gap-1.5 p-1 rounded-2xl aura-glass self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'breathing'}
            data-testid="restore-mode-breathing"
            onClick={() => {
              setActiveMode('breathing');
              handleResetSession();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeMode === 'breathing'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45 shadow-[0_0_20px_rgba(47,232,255,0.18)]'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Breathing Space</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'quiet-moment'}
            data-testid="restore-mode-quiet"
            onClick={() => {
              setActiveMode('quiet-moment');
              handleResetSession();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeMode === 'quiet-moment'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45 shadow-[0_0_20px_rgba(47,232,255,0.18)]'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFB08A]" />
            <span>Quiet Moments</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Sanctuary Stage */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left/Center Stage: Expanding Breathing / Quiet Visual Guide (7 cols) */}
        <div className="lg:col-span-7 aura-glass rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden min-h-[420px]">
          {sessionState === 'completed' ? (
            <div
              data-testid="restore-completion-card"
              className="flex flex-col items-center text-center max-w-md py-6 animate-fade-in"
            >
              <div className="w-14 h-14 rounded-full bg-[#2FE8FF]/15 border border-[#2FE8FF]/45 flex items-center justify-center mb-4 shadow-[0_0_32px_rgba(47,232,255,0.28)]">
                <CheckCircle2 className="w-7 h-7 text-[#2FE8FF]" />
              </div>
              <span className="text-xs font-mono uppercase tracking-[0.18em] text-[#2FE8FF]">
                RESTORATION COMPLETE
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-1.5">
                Clarity & Calm Restored
              </h2>
              <p className="text-xs sm:text-sm text-[#A3A1BA] mt-2 leading-relaxed">
                You spent{' '}
                <span className="text-[#F5F6FF] font-medium">
                  {Math.max(1, Math.round(elapsedSeconds / 60))}m{' '}
                  {elapsedSeconds % 60}s
                </span>{' '}
                in{' '}
                <span className="text-[#F5F6FF] font-medium">
                  {activeEnvironment.name}
                </span>
                . Return to focus whenever you feel ready, or remain here
                without pressure.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <AuraButton
                  variant="primary"
                  size="md"
                  data-testid="restore-return-focus-btn"
                  accentColor={activeEnvironment.accentHex}
                  secondaryColor={activeEnvironment.secondaryHex}
                  onClick={onReturnToFocus}
                >
                  <span>Return to Focus</span>
                  <ArrowRight className="w-4 h-4" />
                </AuraButton>
                <AuraButton
                  variant="secondary"
                  size="md"
                  data-testid="restore-again-btn"
                  onClick={handleResetSession}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Stay in Restore</span>
                </AuraButton>
              </div>
            </div>
          ) : (
            <>
              {/* Visual Breathing / Quiet Guide Canvas */}
              <div className="relative flex items-center justify-center w-[260px] h-[260px] sm:w-[310px] sm:h-[310px]">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full pointer-events-none"
                  aria-hidden="true"
                />

                {/* Central Phase Instruction & Countdown Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                  {activeMode === 'breathing' ? (
                    <>
                      <span
                        data-testid="breathing-phase-label"
                        className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] tracking-tight drop-shadow-[0_4px_16px_rgba(7,8,18,0.9)]"
                      >
                        {sessionState === 'idle'
                          ? 'Ready to Breathe'
                          : breathingPhaseState.label}
                      </span>
                      <span className="font-mono text-xs text-[#2FE8FF] mt-1">
                        {sessionState === 'idle'
                          ? `${activeBreathingConfig.inhaleSeconds}s in${
                              activeBreathingConfig.holdInSeconds > 0
                                ? ` · ${activeBreathingConfig.holdInSeconds}s hold`
                                : ''
                            } · ${activeBreathingConfig.exhaleSeconds}s out`
                          : `${breathingPhaseState.phaseRemainingSeconds}s`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#FFB08A]">
                        {activeQuietConfig.subtitle}
                      </span>
                      <span className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F6FF] tabular-nums mt-1">
                        {formatRemainingTime(remainingSeconds)}
                      </span>
                    </>
                  )}

                  <span
                    data-testid="restore-timer-readout"
                    className="font-mono text-xs text-[#A3A1BA] mt-2 tabular-nums"
                  >
                    {activeMode === 'breathing'
                      ? `${formatRemainingTime(remainingSeconds)} remaining`
                      : activeQuietConfig.guidanceText}
                  </span>
                </div>
              </div>

              {/* Primary Session Controls */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {sessionState === 'idle' ? (
                  <AuraButton
                    variant="primary"
                    size="lg"
                    data-testid="restore-start-btn"
                    accentColor={activeEnvironment.accentHex}
                    secondaryColor={activeEnvironment.secondaryHex}
                    onClick={handleStartSession}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {activeMode === 'breathing'
                        ? 'Begin Breathing'
                        : `Start ${activeQuietConfig.name}`}
                    </span>
                  </AuraButton>
                ) : (
                  <>
                    <AuraButton
                      variant="primary"
                      size="md"
                      data-testid="restore-pause-resume-btn"
                      accentColor={activeEnvironment.accentHex}
                      secondaryColor={activeEnvironment.secondaryHex}
                      onClick={handlePauseResume}
                    >
                      {sessionState === 'running' ? (
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
                      onClick={handleStopOrCompleteEarly}
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Complete Restore</span>
                    </AuraButton>
                  </>
                )}

                {/* Ambient Sound Quick Toggle */}
                <button
                  type="button"
                  data-testid="restore-sound-toggle"
                  onClick={() => onToggleSoundscape(!soundscapePlaying)}
                  aria-label={
                    soundscapePlaying
                      ? 'Mute restore ambient sound'
                      : 'Enable restore ambient sound'
                  }
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-medium border transition-all cursor-pointer ${
                    soundscapePlaying && !settings.soundMuted
                      ? 'bg-[#2FE8FF]/14 text-[#F5F6FF] border-[#2FE8FF]/40'
                      : 'bg-white/[0.03] text-[#A3A1BA] border-white/10 hover:text-[#F5F6FF]'
                  }`}
                >
                  {soundscapePlaying && !settings.soundMuted ? (
                    <Volume2 className="w-4 h-4 text-[#2FE8FF]" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-[#A3A1BA]" />
                  )}
                  <span>{activeEnvironment.soundLabel}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Cadence / Quiet Presets & Nature Environments (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Card 1: Breathing Patterns or Quiet Moment Presets */}
          <div className="aura-glass rounded-3xl p-5">
            {activeMode === 'breathing' ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                      BREATHING RHYTHM
                    </h2>
                    <p className="text-xs text-[#A3A1BA] mt-0.5">
                      Choose a cadence or customize your inhale and exhale
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="restore-custom-breathing-toggle"
                    onClick={() => setShowCustomBreathing((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-[#A3A1BA] hover:text-[#F5F6FF] px-2.5 py-1 rounded-xl border border-white/10 cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#2FE8FF]" />
                    <span>Tune</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {BREATHING_PRESETS.filter((p) => p.id !== 'custom').map(
                    (preset) => {
                      const isSelected = selectedBreathingId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-testid={`breathing-preset-${preset.id}`}
                          onClick={() => {
                            setSelectedBreathingId(preset.id);
                            handleResetSession();
                          }}
                          className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#2FE8FF]/14 border-[#2FE8FF]/50 text-[#F5F6FF]'
                              : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#F5F6FF]">
                              {preset.name}
                            </span>
                            <span className="text-[11px] font-mono text-[#2FE8FF]">
                              {preset.inhaleSeconds}-{preset.holdInSeconds}-
                              {preset.exhaleSeconds}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A3A1BA] mt-1 line-clamp-2">
                            {preset.description}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Optional Breath Hold Toggle & Custom Sliders */}
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs text-[#A3A1BA]">
                    Include gentle breath-hold pauses
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enableBreathHold}
                    data-testid="toggle-breath-hold"
                    onClick={() => setEnableBreathHold((v) => !v)}
                    className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                      enableBreathHold ? 'bg-[#2FE8FF]' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                        enableBreathHold ? 'translate-x-4.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {showCustomBreathing && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A3A1BA]">
                        Inhale ({customInhale}s)
                      </span>
                      <input
                        type="range"
                        min={3}
                        max={8}
                        value={customInhale}
                        onChange={(e) => {
                          setSelectedBreathingId('custom');
                          setCustomInhale(Number(e.target.value));
                        }}
                        className="w-32 accent-[#2FE8FF]"
                      />
                    </div>
                    {enableBreathHold && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#A3A1BA]">
                          Hold ({customHoldIn}s)
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={8}
                          value={customHoldIn}
                          onChange={(e) => {
                            setSelectedBreathingId('custom');
                            setCustomHoldIn(Number(e.target.value));
                          }}
                          className="w-32 accent-[#2FE8FF]"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A3A1BA]">
                        Exhale ({customExhale}s)
                      </span>
                      <input
                        type="range"
                        min={4}
                        max={10}
                        value={customExhale}
                        onChange={(e) => {
                          setSelectedBreathingId('custom');
                          setCustomExhale(Number(e.target.value));
                        }}
                        className="w-32 accent-[#2FE8FF]"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#FFB08A]">
                    QUIET MOMENTS
                  </h2>
                  <p className="text-xs text-[#A3A1BA] mt-0.5">
                    Short restorative pauses with zero cognitive load
                  </p>
                </div>

                <div className="space-y-2">
                  {QUIET_MOMENT_PRESETS.map((preset) => {
                    const isSelected = selectedQuietId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        data-testid={`quiet-preset-${preset.id}`}
                        onClick={() => {
                          setSelectedQuietId(preset.id);
                          handleResetSession();
                        }}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFB08A]/14 border-[#FFB08A]/50 text-[#F5F6FF]'
                            : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#F5F6FF]">
                            {preset.name}
                          </span>
                          <span className="text-[11px] font-mono text-[#FFB08A]">
                            {Math.round(preset.durationSeconds / 60)} min
                          </span>
                        </div>
                        <p className="text-[11px] text-[#A3A1BA] mt-1">
                          {preset.guidanceText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Card 2: Nature Environments */}
          <div className="aura-glass rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  NATURE ENVIRONMENTS
                </h2>
                <p className="text-xs text-[#A3A1BA] mt-0.5">
                  Atmospheric sanctuary & paired acoustic bed
                </p>
              </div>
              {restoreSessionsCount > 0 && (
                <span className="text-[11px] font-mono text-[#A3A1BA]">
                  {restoreSessionsCount} pauses taken
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {RESTORE_ENVIRONMENTS.map((env) => {
                const isSelected = selectedEnvId === env.id;
                return (
                  <button
                    key={env.id}
                    type="button"
                    data-testid={`restore-env-${env.id}`}
                    onClick={() => handleSelectNatureEnv(env.id)}
                    className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.08] border-[#2FE8FF]/55 text-[#F5F6FF]'
                        : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF] hover:border-white/20'
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
                    <p className="text-[11px] text-[#A3A1BA] mt-1 line-clamp-2">
                      {env.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Ambience Volume Slider */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <span className="text-xs text-[#A3A1BA]">Sanctuary Volume</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.ambienceVolume * 100)}
                onChange={(e) =>
                  onUpdateSettings({
                    ambienceVolume: Number(e.target.value) / 100,
                    soundMuted: false,
                  })
                }
                aria-label="Restore ambience volume"
                className="w-36 accent-[#2FE8FF]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
