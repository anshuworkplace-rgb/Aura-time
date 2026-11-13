import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  Wind,
  BarChart3,
  User,
  Sparkles,
  BookOpen,
  Play,
} from 'lucide-react';
import {
  ActiveOverlay,
  ChamberId,
  FocusImmersionMode,
  FocusRoutine,
  FocusSceneId,
  NavigationTab,
  RestoreSessionRecord,
  SessionRecord,
  SmartRecommendation,
  TaskBreakdownStep,
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
  ORB_DESIGNS,
  calculateDailyTotal,
  calculateProgress,
  createActualSessionRecord,
  extendTimer,
  formatRemainingTime,
  formatTodaySignal,
  generateSeedSessions,
  getLocalIsoDate,
  normalizeChamberId,
} from './utils/focusEngine';
import {
  DEFAULT_FOCUS_ROUTINES,
  computeSmartRecommendations,
} from './utils/auraIntelligence';
import { trackProductEvent } from './utils/productAnalytics';
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
import { RestoreExperience } from './components/RestoreExperience';
import { ReflectExperience } from './components/ReflectExperience';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingPageOverlay } from './components/LandingPageOverlay';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';

const STORAGE_KEYS = {
  SETTINGS: 'aura_living_lens_settings_v3',
  SESSIONS: 'aura_living_lens_sessions_v2',
  RESTORE_SESSIONS: 'aura_restore_sessions_v1',
  ROUTINES: 'aura_focus_routines_v1',
  STATE: 'aura_living_lens_state_v4',
  SOUNDSCAPE: 'aura_selected_soundscape_v2',
};

export default function App() {
  const todayIsoDate = getLocalIsoDate();

  // 0. Primary Navigation State (Focus | Restore | Reflect | Profile)
  const [activeNavTab, setActiveNavTab] = useState<NavigationTab>('focus');

  // 1. User Settings (defaults to Celestial Jelly organism)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return DEFAULT_USER_SETTINGS;
  });

  // 2. Session History
  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return generateSeedSessions(todayIsoDate);
  });

  // 2b. Separate Restorative Session History (never mixed into focus totals)
  const [restoreSessions, setRestoreSessions] = useState<
    RestoreSessionRecord[]
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.RESTORE_SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // 2c. Personalized Focus Routines
  const [routines, setRoutines] = useState<FocusRoutine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROUTINES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_FOCUS_ROUTINES;
  });

  const [lastCompletedSession, setLastCompletedSession] =
    useState<SessionRecord | null>(null);

  // 3. Remembered Defaults (defaults to Electric Quiet theme and Ocean Drift soundscape)
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
    return 'electric-quiet';
  });

  const [chamberId, setChamberId] = useState<ChamberId>(() => {
    try {
      const dedicatedSound = localStorage.getItem(STORAGE_KEYS.SOUNDSCAPE);
      if (dedicatedSound) {
        return normalizeChamberId(dedicatedSound);
      }
      const raw = localStorage.getItem(STORAGE_KEYS.STATE);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.chamberId) return normalizeChamberId(parsed.chamberId);
      }
    } catch {
      // ignore
    }
    return 'ocean-drift';
  });

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
  const [stageLayout] = useState<HomeStageLayout>('atelier');
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);
  const [railVisible, setRailVisible] = useState<boolean>(true);
  const [resonancePulseTimestamp, setResonancePulseTimestamp] =
    useState<number>(0);

  const targetEndTimestampRef = useRef<number | null>(null);

  // Track initial visit once per mount
  useEffect(() => {
    trackProductEvent('first_visit', settings.productAnalyticsConsent !== false, {
      nav: activeNavTab,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist user settings, sessions, restore sessions, routines, and remembered defaults
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
        STORAGE_KEYS.RESTORE_SESSIONS,
        JSON.stringify(restoreSessions)
      );
    } catch {
      // ignore
    }
  }, [restoreSessions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    } catch {
      // ignore
    }
  }, [routines]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SOUNDSCAPE, chamberId);
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

  // Sync Web Audio API Smart Soundscape (with 700ms equal-power crossfades & mute awareness)
  useEffect(() => {
    soundEngine.syncChambers({
      playing: isSoundPlaying,
      primaryChamberId: chamberId,
      ambienceVolume: settings.ambienceVolume,
      muted: settings.soundMuted,
    });
  }, [isSoundPlaying, chamberId, settings.ambienceVolume, settings.soundMuted]);

  // Sync document title
  useEffect(() => {
    if (status === 'running' || status === 'paused') {
      document.title = `${formatRemainingTime(remainingSeconds)} · ${
        sessionLabel || 'Focus'
      } — AURA TIME`;
    } else {
      document.title = 'AURA TIME — Digital Focus Environment';
    }
  }, [status, remainingSeconds, sessionLabel]);

  // Auto-hide control dock during active running session until pointer/keyboard activity
  useEffect(() => {
    if (status !== 'running' || activeNavTab !== 'focus') {
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
  }, [status, activeNavTab]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // Immediate Smart Soundscape Switcher handler (independent of timer state)
  const handleSelectSoundscape = useCallback(
    (nextChamberId: ChamberId) => {
      const normalized = normalizeChamberId(nextChamberId);
      setChamberId(normalized);
      if (settings.ambienceVolume <= 0) {
        updateSettings({
          ambienceVolume: 0.75,
          selectedChamberId: normalized,
          soundMuted: false,
        });
      } else {
        updateSettings({ selectedChamberId: normalized, soundMuted: false });
      }
      setIsSoundPlaying(true);
    },
    [settings.ambienceVolume, updateSettings]
  );

  // Honest Session Completion Handler:
  // Credits strictly actual focused time and distinguishes completed vs interrupted
  const handleFinalizeSession = useCallback(
    (endedEarly: boolean) => {
      let currentRem = remainingSeconds;
      if (status === 'running' && targetEndTimestampRef.current) {
        currentRem = Math.max(
          0,
          Math.ceil((targetEndTimestampRef.current - Date.now()) / 1000)
        );
      }

      targetEndTimestampRef.current = null;
      soundEngine.playCompletionChime(settings.alertVolume);

      if (phase === 'focus') {
        const record = createActualSessionRecord({
          label: sessionLabel.trim() || 'Deep work',
          plannedTotalSeconds: totalSeconds,
          remainingSecondsAtEnd: endedEarly ? currentRem : 0,
          endedEarly,
          sceneId,
          chamberId,
          orbDesign: settings.orbDesign ?? 'celestial-jelly',
        });

        setLastCompletedSession(record);

        if (record !== null) {
          setSessions((prev) => [record, ...prev]);
          trackProductEvent(
            endedEarly ? 'session_interrupted' : 'session_completed',
            settings.productAnalyticsConsent !== false,
            {
              plannedMinutes: record.plannedMinutes ?? record.durationMinutes,
              actualMinutes: record.actualMinutes ?? record.durationMinutes,
              sceneId: record.sceneId,
            }
          );
        }
      }

      if (
        settings.desktopNotifications &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification('AURA TIME', {
          body: endedEarly
            ? 'Focus session ended — actual focused time logged.'
            : FOCUS_SCENES[sceneId].completionPhrase,
        });
      }

      setStatus('completed');
      setRemainingSeconds(0);
      setIsSoundPlaying(false);
    },
    [
      chamberId,
      phase,
      remainingSeconds,
      sceneId,
      sessionLabel,
      settings.alertVolume,
      settings.desktopNotifications,
      settings.orbDesign,
      settings.productAnalyticsConsent,
      status,
      totalSeconds,
    ]
  );

  const finalizeSessionRef = useRef(handleFinalizeSession);
  useEffect(() => {
    finalizeSessionRef.current = handleFinalizeSession;
  }, [handleFinalizeSession]);

  // Wall-clock accurate countdown loop (stable interval — does not recreate every second)
  useEffect(() => {
    if (status !== 'running') return;

    const interval = window.setInterval(() => {
      if (!targetEndTimestampRef.current) return;
      const diffMs = targetEndTimestampRef.current - Date.now();
      const nextSecs = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(nextSecs);

      if (nextSecs <= 0) {
        window.clearInterval(interval);
        finalizeSessionRef.current(false);
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [status]);

  // Strict One Primary Action Per State:
  // Idle -> Begin | Running -> Pause | Paused -> Resume | Completed -> Start again
  const handlePrimaryAction = useCallback(() => {
    if (status === 'idle') {
      const startSecs = durationMinutes * 60;
      setPhase('focus');
      setTotalSeconds(startSecs);
      setRemainingSeconds(startSecs);
      setLastCompletedSession(null);
      setScrubberOpen(false);
      targetEndTimestampRef.current = Date.now() + startSecs * 1000;
      setStatus('running');
      trackProductEvent(
        'first_session_started',
        settings.productAnalyticsConsent !== false,
        { durationMinutes, sceneId, chamberId }
      );
      if (settings.ambienceVolume > 0 && !settings.soundMuted) {
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
      if (settings.ambienceVolume > 0 && !settings.soundMuted) {
        setIsSoundPlaying(true);
      }
    } else if (status === 'completed') {
      const startSecs = durationMinutes * 60;
      setPhase('focus');
      setTotalSeconds(startSecs);
      setRemainingSeconds(startSecs);
      setLastCompletedSession(null);
      targetEndTimestampRef.current = Date.now() + startSecs * 1000;
      setStatus('running');
      if (settings.ambienceVolume > 0 && !settings.soundMuted) {
        setIsSoundPlaying(true);
      }
    }
  }, [
    chamberId,
    durationMinutes,
    remainingSeconds,
    sceneId,
    settings.ambienceVolume,
    settings.productAnalyticsConsent,
    settings.soundMuted,
    status,
  ]);

  const handleStartBreak = useCallback(() => {
    const breakSecs = settings.breakMinutes * 60;
    setPhase('break');
    setTotalSeconds(breakSecs);
    setRemainingSeconds(breakSecs);
    setLastCompletedSession(null);
    targetEndTimestampRef.current = Date.now() + breakSecs * 1000;
    setStatus('running');
    if (settings.ambienceVolume > 0 && !settings.soundMuted) {
      setIsSoundPlaying(true);
    }
  }, [settings.ambienceVolume, settings.breakMinutes, settings.soundMuted]);

  const handleReset = useCallback(() => {
    targetEndTimestampRef.current = null;
    setPhase('focus');
    setTotalSeconds(durationMinutes * 60);
    setRemainingSeconds(durationMinutes * 60);
    setLastCompletedSession(null);
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
    setLastCompletedSession(null);
    setStatus('idle');
  }, []);

  const handleSelectScene = useCallback(
    (nextSceneId: FocusSceneId) => {
      setSceneId(nextSceneId);
      trackProductEvent(
        'environment_selected',
        settings.productAnalyticsConsent !== false,
        { sceneId: nextSceneId }
      );
    },
    [settings.productAnalyticsConsent]
  );

  // Stage 3: Smart Recommendations, Personalized Routines & Task Breakdown handlers
  const handleApplyRecommendation = useCallback(
    (rec: SmartRecommendation) => {
      if (rec.applyPayload.openRestore) {
        setActiveNavTab('restore');
        return;
      }
      targetEndTimestampRef.current = null;
      setPhase('focus');
      if (typeof rec.applyPayload.durationMinutes === 'number') {
        const mins = rec.applyPayload.durationMinutes;
        setDurationMinutes(mins);
        setTotalSeconds(mins * 60);
        setRemainingSeconds(mins * 60);
      }
      if (rec.applyPayload.sceneId) {
        setSceneId(rec.applyPayload.sceneId);
      }
      if (rec.applyPayload.chamberId) {
        handleSelectSoundscape(rec.applyPayload.chamberId);
      }
      setStatus('idle');
      setActiveNavTab('focus');
    },
    [handleSelectSoundscape]
  );

  const handleApplyRoutine = useCallback(
    (routine: FocusRoutine) => {
      targetEndTimestampRef.current = null;
      setPhase('focus');
      const mins = routine.focusDurationMinutes;
      setDurationMinutes(mins);
      setTotalSeconds(mins * 60);
      setRemainingSeconds(mins * 60);
      setSceneId(routine.sceneId);
      handleSelectSoundscape(routine.chamberId);
      updateSettings({
        orbDesign: routine.orbDesign ?? 'celestial-jelly',
        breakMinutes: routine.breakDurationMinutes,
      });
      setSessionLabel(routine.name);
      setStatus('idle');
      setActiveNavTab('focus');
    },
    [handleSelectSoundscape, updateSettings]
  );

  const handleSaveRoutine = useCallback(
    (routine: FocusRoutine) => {
      setRoutines((prev) => {
        const exists = prev.some((r) => r.id === routine.id);
        if (exists) {
          return prev.map((r) => (r.id === routine.id ? routine : r));
        }
        return [routine, ...prev];
      });
      trackProductEvent(
        'routine_saved',
        settings.productAnalyticsConsent !== false,
        {
          durationMinutes: routine.focusDurationMinutes,
          sceneId: routine.sceneId,
        }
      );
    },
    [settings.productAnalyticsConsent]
  );

  const handleDuplicateRoutine = useCallback((routine: FocusRoutine) => {
    const copy: FocusRoutine = {
      ...routine,
      id: `routine-copy-${Date.now()}`,
      name: `${routine.name} (Copy)`,
      isCustom: true,
    };
    setRoutines((prev) => [copy, ...prev]);
  }, []);

  const handleDeleteRoutine = useCallback((routineId: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== routineId));
  }, []);

  const handleApplyTaskStep = useCallback(
    (step: TaskBreakdownStep) => {
      targetEndTimestampRef.current = null;
      setPhase('focus');
      const mins = step.durationMinutes;
      setDurationMinutes(mins);
      setTotalSeconds(mins * 60);
      setRemainingSeconds(mins * 60);
      setSceneId(step.recommendedSceneId);
      handleSelectSoundscape(step.recommendedChamberId);
      setSessionLabel(step.title);
      setStatus('idle');
      setActiveNavTab('focus');
    },
    [handleSelectSoundscape]
  );

  const handleClearSeedSessions = useCallback(() => {
    setSessions((prev) => prev.filter((s) => !s.isSeed));
  }, []);

  const handleRestoreSeedSessions = useCallback(() => {
    setSessions((prev) => {
      const nonSeed = prev.filter((s) => !s.isSeed);
      return [...nonSeed, ...generateSeedSessions(todayIsoDate)];
    });
  }, [todayIsoDate]);

  const handleResetAllData = useCallback(() => {
    setSessions([]);
    setRestoreSessions([]);
    setRoutines(DEFAULT_FOCUS_ROUTINES);
    setSettings(DEFAULT_USER_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.RESTORE_SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.ROUTINES);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch {
      // ignore
    }
  }, []);

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

      if (e.code === 'Space' && activeNavTab === 'focus') {
        if (
          target &&
          (target.tagName === 'BUTTON' ||
            target.getAttribute('role') === 'button' ||
            target.getAttribute('role') === 'switch' ||
            target.getAttribute('role') === 'radio' ||
            target.closest(
              'button, [role="button"], [role="switch"], [role="radio"]'
            ))
        ) {
          return;
        }
        e.preventDefault();
        handlePrimaryAction();
      } else if (e.key.toLowerCase() === 'f' && activeNavTab === 'focus') {
        e.preventDefault();
        toggleBrowserFullScreen();
        setImmersionMode((prev) => (prev === 'deep' ? 'standard' : 'deep'));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsSoundPlaying((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r' && activeNavTab === 'focus') {
        e.preventDefault();
        handleReset();
      } else if (e.key.toLowerCase() === 's' && activeNavTab === 'focus') {
        e.preventDefault();
        if (status === 'running' || status === 'paused') {
          handleFinalizeSession(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeNavTab,
    activeOverlay,
    handleFinalizeSession,
    handlePrimaryAction,
    handleReset,
    status,
    toggleBrowserFullScreen,
  ]);

  const activeScene = FOCUS_SCENES[sceneId] || FOCUS_SCENES['electric-quiet'];
  const activeChamber =
    CHAMBERS.find((c) => c.id === chamberId) || CHAMBERS[0];
  const activeOrbMeta =
    ORB_DESIGNS.find(
      (o) => o.id === (settings.orbDesign ?? 'celestial-jelly')
    ) || ORB_DESIGNS[1];
  const progress = calculateProgress(remainingSeconds, totalSeconds);
  const todayMinutes = calculateDailyTotal(sessions, todayIsoDate);
  const dailyGoalRatio = Math.min(
    1,
    settings.dailyGoalMinutes > 0
      ? todayMinutes / settings.dailyGoalMinutes
      : 0
  );

  // Compute top smart recommendation for subtle idle Focus stage pill
  const topRecommendation = useMemo(() => {
    const recs = computeSmartRecommendations({
      sessions,
      todayIsoDate,
      currentDurationMinutes: durationMinutes,
      currentSceneId: sceneId,
      settings,
    });
    return recs[0] || null;
  }, [durationMinutes, sceneId, sessions, settings, todayIsoDate]);

  const isRunningOrPaused = status === 'running' || status === 'paused';

  const primaryActionText =
    status === 'idle'
      ? 'Begin Focus'
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
      className={`min-h-[100dvh] w-full text-[#F5F6FF] relative overflow-x-hidden flex flex-col justify-between transition-colors duration-1000 select-none ${
        activeNavTab === 'focus' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : ''
      } ${settings.highContrast ? 'high-contrast' : ''}`}
    >
      {/* Real-Time 3D Dual Volumetric Aurora × GPU Fluid Dynamics Background Coupled to ORB & Soundscape */}
      <QuantumNebulaBackground
        scene={activeScene}
        chamber={activeChamber}
        activeChamberId={chamberId}
        resonancePulseTimestamp={resonancePulseTimestamp}
        orbDesign={settings.orbDesign ?? 'celestial-jelly'}
        status={status}
        phase={phase}
        remainingSeconds={remainingSeconds}
        totalSeconds={totalSeconds}
        progress={progress}
        audioReactive={settings.audioReactive}
        reducedMotion={
          settings.reducedMotion ||
          settings.animationIntensity === 'calm' ||
          activeOverlay !== 'none' ||
          activeNavTab !== 'focus'
        }
        performanceMode={settings.performanceMode ?? 'auto'}
        backgroundMix={settings.backgroundMix ?? 0.52}
      />

      {/* Sanctuary Top Header: [AURA TIME · Current Environment] | [Focus · Restore · Reflect · Profile] | [Today's Focus · About] */}
      <header
        data-testid="sanctuary-header"
        className={`fixed top-0 left-0 right-0 z-40 w-full px-3 sm:px-8 pt-2 sm:pt-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-1.5 gap-x-2 sm:gap-4 shrink-0 transition-opacity duration-700 ${
          activeNavTab === 'focus' && isRunningOrPaused && !railVisible
            ? 'opacity-70 hover:opacity-100'
            : 'opacity-100'
        }`}
      >
        {/* Zone 1: Brand Wordmark & Current Environment Pill */}
        <div className="order-1 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveNavTab('focus');
            }}
            title="AURA TIME · Digital Sanctuary"
            className="font-display text-[11px] sm:text-xs font-semibold tracking-[0.22em] text-[#F5F6FF]/95 hover:text-[#F5F6FF] transition-colors uppercase py-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            AURA TIME
          </button>

          <button
            type="button"
            data-testid="header-environment-badge"
            onClick={() => setActiveOverlay('scenes')}
            title="Change Focus Organism & Atmosphere"
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full aura-glass text-[11px] text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-[#2FE8FF]" />
            <span>{activeOrbMeta.name}</span>
            <span className="opacity-45">·</span>
            <span className="text-[#F5F6FF] font-medium">
              {activeScene.name}
            </span>
          </button>

          <OfflineIndicator />
        </div>

        {/* Zone 2: Four-Destination Primary Navigation (Focus | Restore | Reflect | Profile) */}
        <nav
          role="navigation"
          aria-label="Primary Sanctuary Navigation"
          data-testid="primary-sanctuary-nav"
          className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-between sm:justify-center gap-0.5 sm:gap-1 p-1 rounded-full aura-glass shadow-xl"
        >
          {(
            [
              { id: 'focus', label: 'Focus', Icon: Compass },
              { id: 'restore', label: 'Restore', Icon: Wind },
              { id: 'reflect', label: 'Reflect', Icon: BarChart3 },
              { id: 'profile', label: 'Profile', Icon: User },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isCurrent = activeNavTab === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`nav-tab-${id}`}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => setActiveNavTab(id)}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50 shadow-[0_0_16px_rgba(47,232,255,0.2)]'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0 text-[#2FE8FF]" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Today's Actual Focus Total, PWA Install & About / Aura Plus */}
        <div className="order-2 sm:order-3 flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton compact />

          <button
            type="button"
            data-testid="header-about-btn"
            onClick={() => setActiveOverlay('landing')}
            title="About Aura Time & Aura Plus"
            className="hidden md:inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full aura-glass text-[11px] text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
          >
            <BookOpen className="w-3 h-3 text-[#2FE8FF]" />
            <span>About</span>
          </button>

          <button
            type="button"
            data-testid="today-signal-btn"
            onClick={() => setActiveNavTab('reflect')}
            title="View Today's Actual Focus in Reflect Journal"
            className="font-mono tabular-nums text-[11px] sm:text-xs text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors py-1 px-2.5 rounded-full aura-glass cursor-pointer whitespace-nowrap shrink-0"
          >
            {formatTodaySignal(todayMinutes)}
          </button>
        </div>
      </header>

      {/* Main Destination Views */}
      {activeNavTab === 'focus' && (
        <main
          data-testid="focus-experience-view"
          className="relative z-20 flex-1 min-h-0 flex flex-col items-center justify-between sm:justify-center pt-24 sm:pt-16 pb-2 sm:pb-3 px-3 sm:px-4"
        >
          {immersionMode === 'minimal' && isRunningOrPaused ? (
            /* Minimal Focus Option: Only the time and a subtle progress edge */
            <div
              data-testid="minimal-focus-stage"
              className="my-auto flex flex-col items-center gap-6 p-8 sm:p-12 rounded-3xl aura-glass-elevated relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 h-[3px] transition-all duration-500"
                style={{
                  width: `${Math.max(4, Math.round((1 - progress) * 100))}%`,
                  background: `linear-gradient(90deg, ${activeScene.colors.secondary}, ${activeScene.colors.primary})`,
                }}
              />
              <span className="font-display text-6xl sm:text-8xl font-semibold text-[#F5F6FF] tabular-nums tracking-tight">
                {formatRemainingTime(remainingSeconds)}
              </span>
              <span className="text-xs text-[#A3A1BA]">
                {sessionLabel || 'Deep work'}
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
            <div className="w-full flex-1 min-h-0 flex flex-col items-center justify-between sm:justify-center">
              <HomeStageOrbitalFrame
                stageLayout={stageLayout}
                orbDesign={settings.orbDesign ?? 'celestial-jelly'}
                onSelectOrbDesign={(orbDesign) => updateSettings({ orbDesign })}
                activeSceneId={sceneId}
                activeScene={activeScene}
                onSelectScene={handleSelectScene}
                activeChamber={activeChamber}
                onSelectChamber={handleSelectSoundscape}
                isSoundPlaying={isSoundPlaying}
                onToggleSound={() => setIsSoundPlaying((prev) => !prev)}
                onCycleChamber={() => {
                  const idx = CHAMBERS.findIndex((c) => c.id === chamberId);
                  const next = CHAMBERS[(idx + 1) % CHAMBERS.length];
                  handleSelectSoundscape(next.id);
                }}
                durationMinutes={durationMinutes}
                onChangeDuration={handleChangeDuration}
                status={status}
                railVisible={railVisible}
              />

              <div className="my-auto flex flex-col items-center justify-center">
                <LivingLens
                  scene={activeScene}
                  chamber={activeChamber}
                  onSelectChamber={handleSelectSoundscape}
                  isSoundPlaying={isSoundPlaying}
                  onToggleSound={() => setIsSoundPlaying((prev) => !prev)}
                  onTriggerResonancePulse={() =>
                    setResonancePulseTimestamp(Date.now())
                  }
                  orbDesign={settings.orbDesign ?? 'celestial-jelly'}
                  completedSessionsCount={
                    sessions.filter(
                      (s) => (s.completionStatus ?? 'completed') === 'completed'
                    ).length
                  }
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
                  reducedMotion={
                    settings.reducedMotion ||
                    settings.animationIntensity === 'calm' ||
                    activeOverlay !== 'none'
                  }
                  performanceMode={settings.performanceMode ?? 'auto'}
                  timerTextScale={settings.timerTextScale}
                  immersionMode={immersionMode}
                  lastCompletedSession={lastCompletedSession}
                  onPrimaryAction={handlePrimaryAction}
                  onStartBreak={handleStartBreak}
                  onOpenRestore={() => setActiveNavTab('restore')}
                  onStartAgain={handlePrimaryAction}
                />

                {/* Subtle Aura Intelligence Smart Recommendation Pill when Idle */}
                {status === 'idle' && topRecommendation && (
                  <div
                    data-testid="focus-stage-recommendation-pill"
                    className="hidden sm:inline-flex items-center gap-2 mt-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-[11px] text-[#A3A1BA] transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-[#2FE8FF] shrink-0" />
                    <span className="truncate max-w-xs">
                      {topRecommendation.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyRecommendation(topRecommendation)}
                      className="inline-flex items-center gap-1 font-mono text-[10px] text-[#2FE8FF] hover:underline cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Apply</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Unified Compact Control Dock */}
              {status !== 'completed' && (
                <div
                  className={`mt-2 sm:mt-3 pb-1 sm:pb-0 flex flex-col items-center shrink-0 transition-opacity duration-500 ${
                    isRunningOrPaused && !railVisible
                      ? 'opacity-80 hover:opacity-100'
                      : 'opacity-100'
                  }`}
                >
                  <ControlDock
                    status={status}
                    primaryActionText={primaryActionText}
                    onPrimaryAction={handlePrimaryAction}
                    durationMinutes={durationMinutes}
                    onChangeDuration={handleChangeDuration}
                    onAddMinutes={handleAddMinutes}
                    scrubberOpen={scrubberOpen}
                    onToggleScrubber={() => setScrubberOpen((prev) => !prev)}
                    primaryChamberId={chamberId}
                    onSelectPrimaryChamber={handleSelectSoundscape}
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
                    onCompleteSession={() => handleFinalizeSession(true)}
                    onResetSession={handleReset}
                    onOpenOverlay={(ov) => setActiveOverlay(ov)}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      )}

      {activeNavTab === 'restore' && (
        <main className="relative z-20 flex-1 overflow-y-auto">
          <RestoreExperience
            settings={settings}
            onUpdateSettings={updateSettings}
            soundscapePlaying={isSoundPlaying}
            onToggleSoundscape={(playing) => setIsSoundPlaying(playing)}
            onSelectEnvironment={(nextSceneId, nextChamberId) => {
              setSceneId(nextSceneId);
              handleSelectSoundscape(nextChamberId);
            }}
            onReturnToFocus={() => setActiveNavTab('focus')}
            onRecordRestoreSession={(rec) => {
              setRestoreSessions((prev) => [rec, ...prev]);
              trackProductEvent(
                'restore_session_completed',
                settings.productAnalyticsConsent !== false,
                {
                  mode: rec.mode,
                  elapsedSeconds: rec.elapsedSeconds ?? rec.durationSeconds ?? 0,
                }
              );
            }}
            restoreSessionsCount={restoreSessions.length}
          />
        </main>
      )}

      {activeNavTab === 'reflect' && (
        <main className="relative z-20 flex-1 overflow-y-auto">
          <ReflectExperience
            sessions={sessions}
            scene={activeScene}
            settings={settings}
            routines={routines}
            currentDurationMinutes={durationMinutes}
            currentSceneId={sceneId}
            onUpdateSettings={updateSettings}
            onClearSeedSessions={handleClearSeedSessions}
            onRestoreSeedSessions={handleRestoreSeedSessions}
            onNavigateToFocus={() => setActiveNavTab('focus')}
            onApplyRecommendation={handleApplyRecommendation}
            onApplyRoutine={handleApplyRoutine}
            onSaveRoutine={handleSaveRoutine}
            onDuplicateRoutine={handleDuplicateRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            onApplyTaskStep={handleApplyTaskStep}
          />
        </main>
      )}

      {activeNavTab === 'profile' && (
        <main className="relative z-20 flex-1 overflow-y-auto">
          <ProfileSettingsView
            settings={settings}
            onUpdateSettings={updateSettings}
            sessions={sessions}
            restoreSessions={restoreSessions}
            routines={routines}
            onSyncSessionsAndRoutines={(
              nextSessions,
              nextRestore,
              nextRoutines
            ) => {
              setSessions(nextSessions);
              setRestoreSessions(nextRestore);
              setRoutines(nextRoutines);
            }}
            soundscapePlaying={isSoundPlaying}
            onToggleSoundscape={(playing) => setIsSoundPlaying(playing)}
            onClearSeedSessions={handleClearSeedSessions}
            onRestoreSeedSessions={handleRestoreSeedSessions}
            onResetAllData={handleResetAllData}
            onOpenLandingPage={() => setActiveOverlay('landing')}
            onOpenOnboarding={() => setActiveOverlay('onboarding')}
          />
        </main>
      )}

      {/* Barely Visible Daily-Progress Ambient Glow Near Bottom Screen Edge */}
      <footer className="relative z-20 w-full flex flex-col items-center pointer-events-none shrink-0">
        <div
          className="w-full max-w-xl h-5 sm:h-6 blur-2xl opacity-35 transition-all duration-1000"
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
        orbDesign={settings.orbDesign ?? 'celestial-jelly'}
        onChangeOrbDesign={(design) => updateSettings({ orbDesign: design })}
        backgroundMix={settings.backgroundMix ?? 0.52}
        onChangeBackgroundMix={(mix) => updateSettings({ backgroundMix: mix })}
      />

      <ChambersOverlay
        isOpen={activeOverlay === 'chambers'}
        onClose={() => setActiveOverlay('none')}
        primaryChamberId={chamberId}
        onSelectPrimaryChamber={handleSelectSoundscape}
        isSoundPlaying={isSoundPlaying}
        onToggleSoundPreview={() => setIsSoundPlaying((prev) => !prev)}
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
        onSelectChamber={handleSelectSoundscape}
        onPrimaryAction={handlePrimaryAction}
        onResetSession={handleReset}
        onOpenOverlay={(ov) => setActiveOverlay(ov)}
        isFloatingOpen={isFloatingOpen}
        onToggleFloating={() => setIsFloatingOpen((prev) => !prev)}
        onToggleFullScreen={toggleBrowserFullScreen}
      />

      {/* Progressive First-Session Onboarding Modal */}
      <OnboardingModal
        isOpen={activeOverlay === 'onboarding'}
        sceneId={sceneId}
        durationMinutes={durationMinutes}
        settings={settings}
        onSelectScene={handleSelectScene}
        onSelectOrbDesign={(orbDesign) => updateSettings({ orbDesign })}
        onChangeDuration={handleChangeDuration}
        onSelectSoundscape={handleSelectSoundscape}
        onDismiss={() => {
          updateSettings({ onboardingCompleted: true });
          setActiveOverlay('none');
        }}
        onCompleteOnboarding={(startFirstSessionNow) => {
          updateSettings({
            onboardingCompleted: true,
            preferredDurationMinutes: durationMinutes,
            preferredSceneId: sceneId,
          });
          setActiveOverlay('none');
          setActiveNavTab('focus');
          if (startFirstSessionNow) {
            const startSecs = durationMinutes * 60;
            setTotalSeconds(startSecs);
            setRemainingSeconds(startSecs);
            targetEndTimestampRef.current = Date.now() + startSecs * 1000;
            setPhase('focus');
            setStatus('running');
            setIsSoundPlaying(true);
          }
        }}
      />

      {/* Public Launch & Product Story Overlay */}
      <LandingPageOverlay
        isOpen={activeOverlay === 'landing'}
        activeSceneId={sceneId}
        activeOrbDesign={settings.orbDesign ?? 'celestial-jelly'}
        onSelectScene={handleSelectScene}
        onSelectOrbDesign={(orbDesign) => updateSettings({ orbDesign })}
        onEnterSanctuary={(targetTab) => {
          setActiveOverlay('none');
          if (targetTab) {
            setActiveNavTab(targetTab);
          }
        }}
        onStartQuickSession={(mins, nextScene) => {
          setDurationMinutes(mins);
          setTotalSeconds(mins * 60);
          setRemainingSeconds(mins * 60);
          setSceneId(nextScene);
          setActiveOverlay('none');
          setActiveNavTab('focus');
        }}
        onRecordPremiumInterest={(plan) => {
          trackProductEvent(
            'premium_interest',
            settings.productAnalyticsConsent !== false,
            { plan }
          );
        }}
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
        onSkipOrComplete={() => handleFinalizeSession(true)}
      />
    </div>
  );
}
