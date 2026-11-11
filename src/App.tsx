import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveOverlay,
  ChamberId,
  FocusImmersionMode,
  FocusSceneId,
  SessionRecord,
  TimerPhase,
  TimerStatus,
  UserSettings,
} from './types/aura';
import {
  CHAMBERS,
  DEFAULT_USER_SETTINGS,
  FOCUS_SCENES,
  calculateDailyTotal,
  calculateProgress,
  extendTimer,
  formatRemainingTime,
  formatTodaySignal,
  generateSeedSessions,
} from './utils/focusEngine';
import { soundEngine } from './utils/soundSynthesizer';
import { LivingLens } from './components/LivingLens';
import { SceneSelectorOverlay } from './components/SceneSelectorOverlay';
import { ChambersOverlay } from './components/ChambersOverlay';
import { InsightsOverlay } from './components/InsightsOverlay';
import { CalibrationOverlay } from './components/CalibrationOverlay';
import { FloatingMiniWidget } from './components/FloatingMiniWidget';
import { QuantumNebulaBackground } from './components/QuantumNebulaBackground';
import {
  Volume2,
  VolumeX,
  Plus,
  SkipForward,
  RotateCcw,
  Maximize2,
  PictureInPicture2,
  SlidersHorizontal,
} from 'lucide-react';

const STORAGE_KEYS = {
  SETTINGS: 'aura_living_lens_settings_v2',
  SESSIONS: 'aura_living_lens_sessions_v2',
  STATE: 'aura_living_lens_state_v2',
};

function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function App() {
  const todayIsoDate = getTodayIsoDate();

  // 1. User Settings
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_USER_SETTINGS;
  });

  // 2. Session History (seeded so "2h 20m today" and Insights Visual Journal are immediately rich)
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return generateSeedSessions(todayIsoDate);
  });

  // 3. Remembered Defaults for Instant <2s Session Start
  const [sceneId, setSceneId] = useState<FocusSceneId>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.sceneId && FOCUS_SCENES[parsed.sceneId as FocusSceneId]) {
          return parsed.sceneId;
        }
      }
    } catch {
      // ignore
    }
    return 'deep-current';
  });

  const [chamberId, setChamberId] = useState<ChamberId>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.chamberId) return parsed.chamberId;
      }
    } catch {
      // ignore
    }
    return 'rain-chamber';
  });

  const [secondaryChamberId, setSecondaryChamberId] =
    useState<ChamberId | null>(null);

  const [durationMinutes, setDurationMinutes] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.durationMinutes === 'number') {
          return parsed.durationMinutes;
        }
      }
    } catch {
      // ignore
    }
    return 45;
  });

  const [sessionLabel, setSessionLabel] = useState<string>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.sessionLabel === 'string') return parsed.sessionLabel;
      }
    } catch {
      // ignore
    }
    return 'Deep work';
  });

  // 4. Live Timer State
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [totalSeconds, setTotalSeconds] = useState<number>(durationMinutes * 60);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    durationMinutes * 60
  );
  const [scrubberOpen, setScrubberOpen] = useState<boolean>(false);
  const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(false);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>('none');
  const [immersionMode, setImmersionMode] =
    useState<FocusImmersionMode>('standard');
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);
  const [railVisible, setRailVisible] = useState<boolean>(true);

  const targetEndTimestampRef = useRef<number | null>(null);

  // Subtle pointer-aware response for primary controls. Touch input is left untouched.
  useEffect(() => {
    const supportsFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!supportsFinePointer) return;

    let active: HTMLElement | null = null;
    const reset = () => {
      if (!active) return;
      active.style.setProperty('--aura-mx', '0px');
      active.style.setProperty('--aura-my', '0px');
      active.style.setProperty('--aura-x', '50%');
      active.style.setProperty('--aura-y', '50%');
      active = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.aura-magnetic');
      if (!target) {
        reset();
        return;
      }
      if (active !== target) reset();
      active = target;
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = (x / Math.max(1, rect.width) - 0.5) * 6;
      const dy = (y / Math.max(1, rect.height) - 0.5) * 6;
      target.style.setProperty('--aura-mx', dx.toFixed(2) + 'px');
      target.style.setProperty('--aura-my', dy.toFixed(2) + 'px');
      target.style.setProperty('--aura-x', (x / Math.max(1, rect.width) * 100).toFixed(1) + '%');
      target.style.setProperty('--aura-y', (y / Math.max(1, rect.height) * 100).toFixed(1) + '%');
    };

    const onPointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerout', onPointerOut);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerout', onPointerOut);
      reset();
    };
  }, []);

  // Persist user settings, sessions, and remembered defaults
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.STATE,
        JSON.stringify({
          sceneId,
          chamberId,
          durationMinutes,
          sessionLabel,
        })
      );
    } catch {
      // ignore
    }
  }, [sceneId, chamberId, durationMinutes, sessionLabel]);

  // Sync Web Audio API Chambers
  useEffect(() => {
    soundEngine.syncChambers({
      playing: isSoundPlaying,
      primaryChamberId: chamberId,
      ambienceVolume: settings.ambienceVolume,
      secondaryChamberId,
      secondaryVolume: settings.secondaryVolume,
    });
  }, [
    isSoundPlaying,
    chamberId,
    secondaryChamberId,
    settings.ambienceVolume,
    settings.secondaryVolume,
  ]);

  // Sync document title
  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      document.title = `${formatRemainingTime(remainingSeconds)} · ${
        sessionLabel || 'Focus'
      } — AURA TIME`;
    } else {
      document.title = 'AURA TIME';
    }
  }, [status, remainingSeconds, sessionLabel]);

  // Auto-hide tiny control rail during active running session until pointer/keyboard activity
  useEffect(() => {
    if (status !== 'running') {
      setRailVisible(true);
      return;
    }
    let timerId: number;
    const reveal = () => {
      setRailVisible(true);
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        setRailVisible(false);
      }, 3400);
    };
    reveal();
    window.addEventListener('mousemove', reveal);
    window.addEventListener('keydown', reveal);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('mousemove', reveal);
      window.removeEventListener('keydown', reveal);
    };
  }, [status]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // Complete Session Handler
  const handleCompleteSession = useCallback(() => {
    targetEndTimestampRef.current = null;
    soundEngine.playCompletionChime(settings.alertVolume);

    if (phase === 'focus') {
      const elapsedMins = Math.max(1, Math.round(totalSeconds / 60));
      const newEntry: SessionRecord = {
        id: `session-${Date.now()}`,
        label: sessionLabel.trim() || 'Deep work',
        durationMinutes: elapsedMins,
        completedAt: new Date().toISOString(),
        isoDate: getTodayIsoDate(),
        hourOfDay: new Date().getHours(),
        sceneId,
        chamberId,
      };
      setSessions((prev) => [newEntry, ...prev]);
    }

    if (
      settings.desktopNotifications &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('AURA TIME', {
        body: FOCUS_SCENES[sceneId].completionPhrase,
      });
    }

    setStatus('completed');
    setRemainingSeconds(0);
    setIsSoundPlaying(false);
  }, [
    chamberId,
    phase,
    sceneId,
    sessionLabel,
    settings.alertVolume,
    settings.desktopNotifications,
    totalSeconds,
  ]);

  // Wall-clock accurate countdown loop
  useEffect(() => {
    if (status !== 'running') return;

    if (!targetEndTimestampRef.current) {
      targetEndTimestampRef.current = Date.now() + remainingSeconds * 1000;
    }

    const interval = window.setInterval(() => {
      if (!targetEndTimestampRef.current) return;
      const diffMs = targetEndTimestampRef.current - Date.now();
      const nextSecs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(nextSecs);

      if (nextSecs <= 0) {
        window.clearInterval(interval);
        handleCompleteSession();
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [status, remainingSeconds, handleCompleteSession]);

  // Strict One Primary Action Per State:
  // Idle -> Begin | Running -> Pause | Paused -> Resume | Completed -> Start again
  const handlePrimaryAction = useCallback(() => {
    if (status === 'idle') {
      const startSecs = durationMinutes * 60;
      setPhase('focus');
      setTotalSeconds(startSecs);
      setRemainingSeconds(startSecs);
      setScrubberOpen(false);
      targetEndTimestampRef.current = Date.now() + startSecs * 1000;
      setStatus('running');
      if (chamberId !== 'deep-quiet' && settings.ambienceVolume > 0) {
        setIsSoundPlaying(true);
      }
    } else if (status === 'running') {
      if (targetEndTimestampRef.current) {
        const rem = Math.max(
          0,
          Math.ceil((targetEndTimestampRef.current - Date.now()) / 1000)
        );
        setRemainingSeconds(rem);
      }
      targetEndTimestampRef.current = null;
      setStatus('paused');
      setIsSoundPlaying(false);
    } else if (status === 'paused') {
      targetEndTimestampRef.current = Date.now() + remainingSeconds * 1000;
      setStatus('running');
      if (chamberId !== 'deep-quiet' && settings.ambienceVolume > 0) {
        setIsSoundPlaying(true);
      }
    } else if (status === 'completed') {
      const startSecs = durationMinutes * 60;
      setPhase('focus');
      setTotalSeconds(startSecs);
      setRemainingSeconds(startSecs);
      targetEndTimestampRef.current = Date.now() + startSecs * 1000;
      setStatus('running');
      if (chamberId !== 'deep-quiet' && settings.ambienceVolume > 0) {
        setIsSoundPlaying(true);
      }
    }
  }, [
    chamberId,
    durationMinutes,
    remainingSeconds,
    settings.ambienceVolume,
    status,
  ]);

  const handleStartBreak = useCallback(() => {
    const breakSecs = settings.breakMinutes * 60;
    setPhase('break');
    setTotalSeconds(breakSecs);
    setRemainingSeconds(breakSecs);
    targetEndTimestampRef.current = Date.now() + breakSecs * 1000;
    setStatus('running');
    if (chamberId !== 'deep-quiet' && settings.ambienceVolume > 0) {
      setIsSoundPlaying(true);
    }
  }, [chamberId, settings.ambienceVolume, settings.breakMinutes]);

  const handleReset = useCallback(() => {
    targetEndTimestampRef.current = null;
    setPhase('focus');
    setTotalSeconds(durationMinutes * 60);
    setRemainingSeconds(durationMinutes * 60);
    setStatus('idle');
    setImmersionMode('standard');
    setIsSoundPlaying(false);
  }, [durationMinutes]);

  const handleExtend5m = useCallback(() => {
    const next = extendTimer(remainingSeconds, totalSeconds, 5);
    setRemainingSeconds(next.remainingSeconds);
    setTotalSeconds(next.totalSeconds);
    if (status === 'running' && targetEndTimestampRef.current) {
      targetEndTimestampRef.current += 5 * 60 * 1000;
    }
  }, [remainingSeconds, status, totalSeconds]);

  const handleChangeDuration = useCallback((mins: number) => {
    targetEndTimestampRef.current = null;
    setPhase('focus');
    setDurationMinutes(mins);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setStatus('idle');
  }, []);

  const handleSelectScene = useCallback(
    (nextSceneId: FocusSceneId) => {
      setSceneId(nextSceneId);
      const suggested = FOCUS_SCENES[nextSceneId].suggestedChamberId;
      if (status === 'idle') {
        setChamberId(suggested);
      }
    },
    [status]
  );

  const toggleBrowserFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Global Keyboard Shortcuts: Space, F, M, R, S, Cmd/Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setActiveOverlay((prev) =>
          prev === 'calibration' ? 'none' : 'calibration'
        );
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (activeOverlay !== 'none') {
        if (e.key === 'Escape') {
          setActiveOverlay('none');
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePrimaryAction();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleBrowserFullScreen();
        setImmersionMode((prev) => (prev === 'deep' ? 'standard' : 'deep'));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsSoundPlaying((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReset();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (status === 'running' || status === 'paused') {
          handleCompleteSession();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeOverlay,
    handleCompleteSession,
    handlePrimaryAction,
    handleReset,
    status,
    toggleBrowserFullScreen,
  ]);

  const activeScene = FOCUS_SCENES[sceneId] || FOCUS_SCENES['deep-current'];
  const activeChamber =
    CHAMBERS.find((c) => c.id === chamberId) || CHAMBERS[0];
  const progress = calculateProgress(remainingSeconds, totalSeconds);
  const todayMinutes = calculateDailyTotal(sessions, todayIsoDate);
  const dailyGoalRatio = Math.min(
    1,
    settings.dailyGoalMinutes > 0
      ? todayMinutes / settings.dailyGoalMinutes
      : 0
  );

  const isRunningOrPaused = status === 'running' || status === 'paused';

  const primaryActionText =
    status === 'idle'
      ? 'Begin'
      : status === 'running'
      ? 'Pause'
      : status === 'paused'
      ? 'Resume'
      : 'Start again';

  return (
    <div
      style={{
        backgroundColor: isRunningOrPaused
          ? '#05060E'
          : activeScene.colors.baseBg,
      }}
      className={`min-h-screen w-full text-[#F5F6FF] relative overflow-hidden flex flex-col justify-between transition-colors duration-1000 select-none ${
        settings.highContrast ? 'high-contrast' : ''
      }`}
    >
      {/* Real-Time 3D Quantum Nebula × GPU Fluid Dynamics Background */}
      <QuantumNebulaBackground
        scene={activeScene}
        status={status}
        progress={progress}
        audioReactive={settings.audioReactive}
        reducedMotion={settings.reducedMotion || activeOverlay !== 'none'}
      />

      {/* Minimal Gallery Top Edge: [small AURA TIME mark] ... [2h 20m today] */}
      <header
        className={`relative z-30 w-full px-7 sm:px-12 pt-6 flex items-center justify-between transition-opacity duration-700 ${
          isRunningOrPaused && !railVisible
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100'
        }`}
      >
        {/* Upper-Left: Small AURA TIME brand mark */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveOverlay('calibration')}
            title="AURA TIME · Command & Calibration (⌘K)"
            className="aura-control aura-magnetic font-display text-xs font-semibold tracking-[0.22em] text-[#F5F6FF] hover:text-[#2FE8FF] uppercase px-3 py-1.5 rounded-full bg-[#070812]/65 border border-white/10"
          >
            AURA TIME
          </button>
        </div>

        {/* Upper-Right: Minimal "today" signal ("2h 20m today") + subtle calibration trigger */}
        <div className="flex items-center gap-2.5 bg-[#070812]/65 border border-white/10 px-3.5 py-1.5 rounded-full">
          <button
            type="button"
            data-testid="today-signal-btn"
            onClick={() => setActiveOverlay('insights')}
            title="Open Visual Focus Journal"
            className="aura-control font-mono tabular-nums text-xs text-[#F5F6FF]/90 hover:text-[#2FE8FF]"
          >
            {formatTodaySignal(todayMinutes)}
          </button>

          <span className="w-[1px] h-3 bg-white/15" aria-hidden="true" />

          <button
            type="button"
            data-testid="calibration-trigger-btn"
            onClick={() => setActiveOverlay('calibration')}
            aria-label="Open Studio Calibration and Commands"
            title="Studio Calibration & Commands (⌘K)"
            className="aura-control aura-icon-control p-1 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Digital Gallery Stage (Intentionally Sits Slightly Below Vertical Center) */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center pt-4 pb-6 px-4">
        {immersionMode === 'minimal' && isRunningOrPaused ? (
          /* Minimal Focus Option: Only the time and a subtle progress edge */
          <div className="flex flex-col items-center gap-6 p-12 rounded-3xl bg-[#070812]/88 border border-white/12 relative overflow-hidden shadow-2xl">
            <div
              className="absolute top-0 left-0 h-[3px] transition-all duration-500"
              style={{
                width: `${Math.max(4, Math.round((1 - progress) * 100))}%`,
                background: `linear-gradient(90deg, ${activeScene.colors.secondary}, ${activeScene.colors.primary})`,
              }}
            />
            <span className="font-display text-7xl sm:text-8xl font-semibold text-[#F5F6FF] tabular-nums tracking-tight">
              {formatRemainingTime(remainingSeconds)}
            </span>
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="px-6 py-2 rounded-full text-xs font-medium text-[#F5F6FF] bg-white/10 hover:bg-white/18 transition-colors"
            >
              {primaryActionText}
            </button>
          </div>
        ) : (
          /* Enormous Central Living Lens */
          <div className="flex flex-col items-center translate-y-2">
            <LivingLens
              scene={activeScene}
              chamber={activeChamber}
              status={status}
              phase={phase}
              remainingSeconds={remainingSeconds}
              totalSeconds={totalSeconds}
              progress={progress}
              durationMinutes={durationMinutes}
              onChangeDurationMinutes={handleChangeDuration}
              sessionLabel={sessionLabel}
              onChangeSessionLabel={setSessionLabel}
              scrubberOpen={scrubberOpen}
              onToggleScrubber={setScrubberOpen}
              audioReactive={settings.audioReactive}
              reducedMotion={settings.reducedMotion || activeOverlay !== 'none'}
              timerTextScale={settings.timerTextScale}
              immersionMode={immersionMode}
              onPrimaryAction={handlePrimaryAction}
              onStartBreak={handleStartBreak}
              onStartAgain={handlePrimaryAction}
            />

            {/* Single Dominant Primary Action Per State ("Begin" / "Pause" / "Resume") */}
            {status !== 'completed' && (
              <div
                className={`mt-3 flex flex-col items-center gap-4 transition-opacity duration-500 ${
                  isRunningOrPaused && !railVisible
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                <button
                  type="button"
                  data-testid="primary-action-btn"
                  onClick={handlePrimaryAction}
                  style={{
                    background:
                      status === 'running'
                        ? 'rgba(7, 8, 18, 0.82)'
                        : `linear-gradient(135deg, ${activeScene.colors.primary}, ${activeScene.colors.secondary})`,
                    boxShadow:
                      status === 'running'
                        ? '0 8px 24px -4px rgba(0, 0, 0, 0.65)'
                        : `0 10px 32px -6px ${activeScene.colors.primary}66`,
                  }}
                  className={`px-9 py-3 rounded-full font-display text-sm font-semibold tracking-wide transition-all duration-300 active:scale-[0.97] ${
                    status === 'running'
                      ? 'text-[#F5F6FF] border border-white/22 hover:bg-[#0D1024]'
                      : 'text-[#070812] hover:brightness-110'
                  }`}
                >
                  {primaryActionText}
                </button>

                {/* Idle Progressive Disclosure Triggers: "45 min" & "Rain Chamber" (+ subtle Scene name) */}
                {status === 'idle' ? (
                  <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-[#070812]/78 border border-white/12 text-xs text-[#F5F6FF]/85 shadow-xl">
                    <button
                      type="button"
                      data-testid="duration-trigger-btn"
                      onClick={() => setScrubberOpen((prev) => !prev)}
                      title="Click or drag around the Lens to scrub 15–120 minutes"
                      className={`font-mono tabular-nums transition-colors hover:text-[#2FE8FF] ${
                        scrubberOpen ? 'text-[#2FE8FF] font-semibold' : ''
                      }`}
                    >
                      {durationMinutes} min
                    </button>

                    <span className="w-1 h-1 rounded-full bg-white/20" aria-hidden="true" />

                    <button
                      type="button"
                      data-testid="chamber-trigger-btn"
                      onClick={() => setActiveOverlay('chambers')}
                      title="Open Chambers Sound Studio"
                      className="transition-colors hover:text-[#2FE8FF]"
                    >
                      {activeChamber.name}
                    </button>

                    <span className="w-1 h-1 rounded-full bg-white/20" aria-hidden="true" />

                    <button
                      type="button"
                      data-testid="scene-trigger-btn"
                      onClick={() => setActiveOverlay('scenes')}
                      title="Switch Focus Scene"
                      className="transition-colors hover:text-[#2FE8FF] flex items-center gap-1.5"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activeScene.colors.primary }}
                        aria-hidden="true"
                      />
                      <span>{activeScene.name}</span>
                    </button>
                  </div>
                ) : (
                  /* Tiny Elegant Control Rail when Running or Paused (Revealed on Activity) */
                  <div
                    role="toolbar"
                    aria-label="Session Control Rail"
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#090C1E]/90 border border-white/12 text-xs text-[#A3A1BA] shadow-xl"
                  >
                    <button
                      type="button"
                      onClick={() => setIsSoundPlaying((prev) => !prev)}
                      aria-label={
                        isSoundPlaying ? 'Mute Ambience' : 'Unmute Ambience'
                      }
                      title="Mute / Unmute Chamber (M)"
                      className="aura-control aura-magnetic aura-icon-control p-1.5 rounded-full hover:text-[#F5F6FF] hover:bg-white/8"
                    >
                      {isSoundPlaying ? (
                        <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveOverlay('chambers')}
                      className="aura-control px-2 py-1 rounded-full hover:text-[#F5F6FF]"
                    >
                      {activeChamber.name}
                    </button>

                    <span aria-hidden="true" className="text-white/15">
                      ·
                    </span>

                    <button
                      type="button"
                      onClick={handleExtend5m}
                      title="Extend session by 5 minutes"
                      className="aura-control flex items-center gap-0.5 px-2 py-1 rounded-full hover:text-[#F5F6FF] font-mono tabular-nums"
                    >
                      <Plus className="w-3 h-3" />
                      <span>5m</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCompleteSession}
                      title="Finish session now (S)"
                      aria-label="Complete Session"
                      className="p-1.5 rounded-full hover:text-[#F5F6FF] hover:bg-white/8 transition-colors"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setImmersionMode((prev) =>
                          prev === 'standard'
                            ? 'deep'
                            : prev === 'deep'
                            ? 'minimal'
                            : 'standard'
                        )
                      }
                      title="Cycle Immersion Mode: Standard / Deep Focus / Minimal Focus"
                      className="aura-control px-2 py-1 rounded-full hover:text-[#F5F6FF] capitalize"
                    >
                      {immersionMode === 'standard'
                        ? 'Deep Focus'
                        : immersionMode === 'deep'
                        ? 'Minimal Focus'
                        : 'Standard Lens'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFloatingOpen((prev) => !prev)}
                      aria-label="Toggle Floating Liquid Capsule"
                      title="Toggle Floating Liquid Capsule"
                      className={`p-1.5 rounded-full hover:bg-white/8 transition-colors ${
                        isFloatingOpen ? 'text-[#2FE8FF]' : 'hover:text-[#F5F6FF]'
                      }`}
                    >
                      <PictureInPicture2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={toggleBrowserFullScreen}
                      aria-label="Toggle Fullscreen"
                      title="Fullscreen (F)"
                      className="p-1.5 rounded-full hover:text-[#F5F6FF] hover:bg-white/8 transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      aria-label="Reset Session"
                      title="Reset Session (R)"
                      className="aura-control aura-icon-control p-1.5 rounded-full hover:text-[#FF5D88] hover:bg-white/8"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barely Visible Daily-Progress Ambient Glow Near Bottom Screen Edge */}
      <footer className="relative z-20 w-full flex flex-col items-center pointer-events-none">
        <div
          className="w-full max-w-xl h-8 blur-2xl opacity-35 transition-all duration-1000"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${activeScene.colors.primary}, ${activeScene.colors.secondary}, transparent 75%)`,
          }}
          aria-hidden="true"
        />
        <div
          role="progressbar"
          aria-label="Daily Focus Progress"
          aria-valuenow={Math.round(dailyGoalRatio * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="w-full h-[2px] bg-white/[0.04] overflow-hidden"
        >
          <div
            className="h-full transition-all duration-1000 ease-out"
            style={{
              width: `${Math.max(4, Math.round(dailyGoalRatio * 100))}%`,
              background: `linear-gradient(90deg, transparent, ${activeScene.colors.secondary}, ${activeScene.colors.primary})`,
            }}
          />
        </div>
      </footer>

      {/* Progressive Disclosure Overlays */}
      <SceneSelectorOverlay
        isOpen={activeOverlay === 'scenes'}
        onClose={() => setActiveOverlay('none')}
        activeSceneId={sceneId}
        onSelectScene={handleSelectScene}
      />

      <ChambersOverlay
        isOpen={activeOverlay === 'chambers'}
        onClose={() => setActiveOverlay('none')}
        primaryChamberId={chamberId}
        onSelectPrimaryChamber={(id) => {
          setChamberId(id);
          if (id !== 'deep-quiet' && settings.ambienceVolume > 0) {
            setIsSoundPlaying(true);
          } else if (id === 'deep-quiet') {
            setIsSoundPlaying(false);
          }
        }}
        secondaryChamberId={secondaryChamberId}
        onSelectSecondaryChamber={(id) => {
          setSecondaryChamberId(id);
          if (id && id !== 'deep-quiet' && settings.ambienceVolume > 0) {
            setIsSoundPlaying(true);
          }
        }}
        isSoundPlaying={isSoundPlaying}
        onToggleSoundPreview={() => setIsSoundPlaying((prev) => !prev)}
        ambienceVolume={settings.ambienceVolume}
        onChangeAmbienceVolume={(val) =>
          updateSettings({ ambienceVolume: val })
        }
        secondaryVolume={settings.secondaryVolume}
        onChangeSecondaryVolume={(val) =>
          updateSettings({ secondaryVolume: val })
        }
        alertVolume={settings.alertVolume}
        onChangeAlertVolume={(val) => updateSettings({ alertVolume: val })}
      />

      <InsightsOverlay
        isOpen={activeOverlay === 'insights'}
        onClose={() => setActiveOverlay('none')}
        sessions={sessions}
        todayIsoDate={todayIsoDate}
      />

      <CalibrationOverlay
        isOpen={activeOverlay === 'calibration'}
        onClose={() => setActiveOverlay('none')}
        settings={settings}
        onUpdateSettings={updateSettings}
        onSelectDuration={handleChangeDuration}
        onSelectScene={handleSelectScene}
        onOpenOverlay={(ov) => setActiveOverlay(ov)}
        isFloatingOpen={isFloatingOpen}
        onToggleFloating={() => setIsFloatingOpen((prev) => !prev)}
        onToggleFullScreen={toggleBrowserFullScreen}
      />

      {/* Always-on-Top Glowing Liquid Droplet Mini Widget */}
      <FloatingMiniWidget
        isOpen={isFloatingOpen}
        onClose={() => setIsFloatingOpen(false)}
        scene={activeScene}
        status={status}
        remainingSeconds={remainingSeconds}
        progress={progress}
        onStartOrPause={handlePrimaryAction}
        onSkipOrComplete={handleCompleteSession}
      />
    </div>
  );
}
