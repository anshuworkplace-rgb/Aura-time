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
  MAX_SCRUB_MINUTES,
  MIN_SCRUB_MINUTES,
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
import { ControlDock } from './components/ControlDock';
import { AuraButton } from './components/AuraButton';
import {
  HomeStageLayout,
  HomeStageOrbitalFrame,
} from './components/HomeStageAtelier';

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
  const [stageLayout] = useState<HomeStageLayout>(() => {
    try {
      const saved = localStorage.getItem('aura_home_stage_layout_v1');
      if (
        saved === 'atelier' ||
        saved === 'horizon' ||
        saved === 'sculpture'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'atelier';
  });
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);
  const [railVisible, setRailVisible] = useState<boolean>(true);

  const targetEndTimestampRef = useRef<number | null>(null);

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

  useEffect(() => {
    try {
      localStorage.setItem('aura_home_stage_layout_v1', stageLayout);
    } catch {
      // ignore
    }
  }, [stageLayout]);

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

  // Auto-hide control dock during active running session until pointer/keyboard activity
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
      }, 4200);
    };
    reveal();
    window.addEventListener('pointermove', reveal);
    window.addEventListener('keydown', reveal);
    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener('pointermove', reveal);
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

  // Unified Time Extension / Adjustment (+1m, +5m, +10m) in Idle, Running, or Paused states
  const handleAddMinutes = useCallback(
    (deltaMins: number) => {
      if (status === 'idle') {
        const nextMins = Math.max(
          MIN_SCRUB_MINUTES,
          Math.min(MAX_SCRUB_MINUTES, durationMinutes + deltaMins)
        );
        setDurationMinutes(nextMins);
        setTotalSeconds(nextMins * 60);
        setRemainingSeconds(nextMins * 60);
      } else {
        const next = extendTimer(remainingSeconds, totalSeconds, deltaMins);
        setRemainingSeconds(next.remainingSeconds);
        setTotalSeconds(next.totalSeconds);
        setDurationMinutes(Math.round(next.totalSeconds / 60));
        if (status === 'running' && targetEndTimestampRef.current) {
          targetEndTimestampRef.current += deltaMins * 60 * 1000;
        }
      }
    },
    [durationMinutes, remainingSeconds, status, totalSeconds]
  );

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

  // Safe Global Keyboard Shortcuts: Space, F, M, R, S, Cmd/Ctrl+K
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
        // Do not hijack Space if an interactive button or control is focused
        if (
          target &&
          (target.tagName === 'BUTTON' ||
            target.getAttribute('role') === 'button' ||
            target.getAttribute('role') === 'switch' ||
            target.closest('button, [role="button"], [role="switch"]'))
        ) {
          return;
        }
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
      {/* Real-Time 3D Dual Volumetric Aurora × GPU Fluid Dynamics Background Coupled to ORB */}
      <QuantumNebulaBackground
        scene={activeScene}
        orbDesign={settings.orbDesign ?? 'original'}
        status={status}
        phase={phase}
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        progress={progress}
        audioReactive={settings.audioReactive}
        reducedMotion={settings.reducedMotion || activeOverlay !== 'none'}
        backgroundMix={settings.backgroundMix ?? 0.52}
      />

      {/* Minimal Gallery Top Edge: [AURA TIME] ... [2h 20m today] */}
      <header
        className={`relative z-30 w-full px-6 sm:px-12 pt-5 flex items-center justify-between transition-opacity duration-700 ${
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
            className="font-display text-xs font-semibold tracking-[0.22em] text-[#F5F6FF] hover:text-[#2FE8FF] transition-colors uppercase px-3.5 py-1.5 rounded-full aura-glass cursor-pointer"
          >
            AURA TIME
          </button>
        </div>

        {/* Upper-Right: Minimal "today" signal ("2h 20m today") */}
        <div className="flex items-center gap-2.5 aura-glass px-3.5 py-1.5 rounded-full">
          <button
            type="button"
            data-testid="today-signal-btn"
            onClick={() => setActiveOverlay('insights')}
            title="Open Visual Focus Journal"
            className="font-mono tabular-nums text-xs text-[#F5F6FF]/90 hover:text-[#2FE8FF] transition-colors cursor-pointer"
          >
            {formatTodaySignal(todayMinutes)}
          </button>
        </div>
      </header>

      {/* Main Digital Gallery Stage */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center pt-2 pb-4 px-4">
        {immersionMode === 'minimal' && isRunningOrPaused ? (
          /* Minimal Focus Option: Only the time and a subtle progress edge */
          <div className="flex flex-col items-center gap-6 p-12 rounded-3xl aura-glass-elevated relative overflow-hidden">
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
            <div className="flex items-center gap-3">
              <AuraButton
                variant="secondary"
                size="md"
                reducedMotion={settings.reducedMotion}
                onClick={handlePrimaryAction}
              >
                {primaryActionText}
              </AuraButton>
              <AuraButton
                variant="subtle"
                size="md"
                reducedMotion={settings.reducedMotion}
                onClick={() => setImmersionMode('standard')}
              >
                Exit Minimal
              </AuraButton>
            </div>
          </div>
        ) : (
          /* Central Living Lens + Home Stage Orbital Frame + Single Primary Action + 4-Group Dock */
          <div className="flex flex-col items-center">
            <HomeStageOrbitalFrame
              stageLayout={stageLayout}
              orbDesign={settings.orbDesign ?? 'original'}
              onSelectOrbDesign={(orbDesign) => updateSettings({ orbDesign })}
              activeSceneId={sceneId}
              activeScene={activeScene}
              onSelectScene={handleSelectScene}
              activeChamber={activeChamber}
              onCycleChamber={() => {
                const idx = CHAMBERS.findIndex((c) => c.id === chamberId);
                const next = CHAMBERS[(idx + 1) % CHAMBERS.length];
                setChamberId(next.id);
                if (next.id !== 'deep-quiet' && settings.ambienceVolume > 0) {
                  setIsSoundPlaying(true);
                } else if (next.id === 'deep-quiet') {
                  setIsSoundPlaying(false);
                }
              }}
              durationMinutes={durationMinutes}
              onChangeDuration={handleChangeDuration}
              status={status}
              railVisible={railVisible}
            />

            <LivingLens
              scene={activeScene}
              chamber={activeChamber}
              orbDesign={settings.orbDesign ?? 'original'}
              completedSessionsCount={sessions.length}
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

            {/* Single Dominant Primary Action + Discreet 4-Group Control Dock */}
            {status !== 'completed' && (
              <div
                className={`mt-2 flex flex-col items-center gap-3.5 transition-opacity duration-500 ${
                  isRunningOrPaused && !railVisible
                    ? 'opacity-0 pointer-events-none'
                    : 'opacity-100'
                }`}
              >
                <AuraButton
                  data-testid="primary-action-btn"
                  variant={status === 'running' ? 'secondary' : 'primary'}
                  size="lg"
                  magnetic={!settings.reducedMotion}
                  reducedMotion={settings.reducedMotion}
                  accentColor={activeScene.colors.primary}
                  secondaryColor={activeScene.colors.secondary}
                  onClick={handlePrimaryAction}
                  className="min-w-[144px]"
                >
                  {primaryActionText}
                </AuraButton>

                {/* Intelligent Four-Group Control Dock: SOUND | TIME | FOCUS | MORE */}
                <ControlDock
                  status={status}
                  durationMinutes={durationMinutes}
                  onChangeDuration={handleChangeDuration}
                  onAddMinutes={handleAddMinutes}
                  scrubberOpen={scrubberOpen}
                  onToggleScrubber={() => setScrubberOpen((prev) => !prev)}
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
                    if (
                      id &&
                      id !== 'deep-quiet' &&
                      settings.ambienceVolume > 0
                    ) {
                      setIsSoundPlaying(true);
                    }
                  }}
                  isSoundPlaying={isSoundPlaying}
                  onToggleSound={() => setIsSoundPlaying((prev) => !prev)}
                  activeSceneId={sceneId}
                  onSelectScene={handleSelectScene}
                  immersionMode={immersionMode}
                  onChangeImmersionMode={setImmersionMode}
                  settings={settings}
                  onUpdateSettings={updateSettings}
                  isFloatingOpen={isFloatingOpen}
                  onToggleFloating={() => setIsFloatingOpen((prev) => !prev)}
                  onToggleFullScreen={toggleBrowserFullScreen}
                  onCompleteSession={handleCompleteSession}
                  onResetSession={handleReset}
                  onOpenOverlay={(ov) => setActiveOverlay(ov)}
                />
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
        orbDesign={settings.orbDesign ?? 'original'}
        onChangeOrbDesign={(design) => updateSettings({ orbDesign: design })}
        backgroundMix={settings.backgroundMix ?? 0.52}
        onChangeBackgroundMix={(mix) => updateSettings({ backgroundMix: mix })}
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
        onSelectChamber={(id) => {
          setChamberId(id);
          if (id !== 'deep-quiet' && settings.ambienceVolume > 0) {
            setIsSoundPlaying(true);
          }
        }}
        onPrimaryAction={handlePrimaryAction}
        onResetSession={handleReset}
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
