import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChamberId,
  FocusSceneId,
  RestoreEnvironmentId,
  RestoreSessionRecord,
  UserSettings,
} from '../../../types/aura';
import type {
  LiquidLensAudioAdapter,
  LiquidLensBreathingCadence,
  LiquidLensBreathingPresetId,
  LiquidLensCompletedSessionPayload,
  LiquidLensCustomCadenceInput,
  LiquidLensMode,
  LiquidLensSessionStatus,
  LiquidLensSoundscapeEnvironment,
  StillnessPresetConfig,
  StillnessSettlingSnapshot,
  StillnessVisualIntensity,
  SynchronizedBreathingSnapshot,
} from '../types/liquidLens.types';
import { soundEngine } from '../../../utils/soundSynthesizer';

/**
 * Four core breathing presets + custom cadence migrated and preserved from Restore:
 * 1. Coherent Calm (5-0-5-0)
 * 2. Deep Rest (4-7-8-0)
 * 3. Equilibrium Box (4-4-4-4)
 * 4. Unhurried Wave (6-2-7-0)
 * 5. Custom Cadence
 */
export const BREATHING_CADENCE_PRESETS: LiquidLensBreathingCadence[] = [
  {
    id: 'coherent-calm',
    name: 'Coherent Calm',
    subtitle: '5s Inhale · 5s Exhale',
    description:
      'Balances attention and gently slows nervous-system rhythm after deep focus.',
    inhaleSeconds: 5,
    holdSeconds: 0,
    exhaleSeconds: 5,
    pauseSeconds: 0,
    defaultSessionMinutes: 3,
  },
  {
    id: 'deep-rest',
    name: 'Deep Rest',
    subtitle: '4s Inhale · 7s Hold · 8s Exhale',
    description:
      'Extended exhale cadence designed for quiet cognitive decompression.',
    inhaleSeconds: 4,
    holdSeconds: 7,
    exhaleSeconds: 8,
    pauseSeconds: 0,
    defaultSessionMinutes: 4,
  },
  {
    id: 'equilibrium-box',
    name: 'Equilibrium Box',
    subtitle: '4s Inhale · 4s Hold · 4s Exhale · 4s Pause',
    description:
      'Four symmetrical stages to steady clarity between study or engineering blocks.',
    inhaleSeconds: 4,
    holdSeconds: 4,
    exhaleSeconds: 4,
    pauseSeconds: 4,
    defaultSessionMinutes: 4,
  },
  {
    id: 'unhurried-wave',
    name: 'Unhurried Wave',
    subtitle: '6s Inhale · 2s Hold · 7s Exhale',
    description:
      'Slow pelagic tide cadence for releasing accumulated shoulder and eye tension.',
    inhaleSeconds: 6,
    holdSeconds: 2,
    exhaleSeconds: 7,
    pauseSeconds: 0,
    defaultSessionMinutes: 5,
  },
  {
    id: 'custom',
    name: 'Custom Cadence',
    subtitle: 'Personalized Inhale · Hold · Exhale · Pause',
    description:
      'Tune each stage of the breathing cycle to match your natural resting cadence.',
    inhaleSeconds: 4,
    holdSeconds: 4,
    exhaleSeconds: 6,
    pauseSeconds: 2,
    defaultSessionMinutes: 3,
  },
];

export const BREATHE_SESSION_DURATION_MINUTES = [2, 3, 5, 10] as const;

export const STILLNESS_PRESETS: StillnessPresetConfig[] = [
  {
    id: 'stillness-2m',
    label: '2-Minute Reset',
    durationMinutes: 2,
    subtitle: 'Brief optical & acoustic release',
    guidance:
      'Soften your gaze on the Liquid Lens and allow visual tension from the screen to dissolve.',
  },
  {
    id: 'stillness-5m',
    label: '5-Minute Stillness',
    durationMinutes: 5,
    subtitle: 'Between-block sanctuary pause',
    guidance:
      'Let thoughts from your previous session settle without rushing toward the next task.',
  },
  {
    id: 'stillness-10m',
    label: '10-Minute Deep Quiet',
    durationMinutes: 10,
    subtitle: 'Unhurried restorative immersion',
    guidance:
      'Rest within the ambient soundscape as the lens gradually settles into complete stillness.',
  },
  {
    id: 'stillness-15m',
    label: '15-Minute Sanctuary',
    durationMinutes: 15,
    subtitle: 'Extended non-goal recovery',
    guidance:
      'Remain in quiet observation with zero timers, targets, or performance pressure.',
  },
];

export const SOUNDSCAPE_ENVIRONMENTS: LiquidLensSoundscapeEnvironment[] = [
  {
    id: 'rain-garden',
    name: 'Rain Garden',
    tagline: 'Crystalline rainfall & botanical stillness',
    soundLabel: 'Gentle Rain',
    description:
      'Soft architectural rainfall refracting across dark glass and cool cyan water.',
    sceneId: 'night-signal',
    chamberId: 'rain-chamber',
    primaryHex: '#2FE8FF',
    secondaryHex: '#5EF2C4',
    harmonicLayerLabel: 'Conservatory glass resonance',
  },
  {
    id: 'ocean-drift',
    name: 'Ocean Drift',
    tagline: 'Slow pelagic swells & horizon breath',
    soundLabel: 'Ocean Waves',
    description:
      'Long-period nocturnal swells rolling across deep midnight waters.',
    sceneId: 'deep-current',
    chamberId: 'ocean-drift',
    primaryHex: '#38F2FF',
    secondaryHex: '#8A5CFF',
    harmonicLayerLabel: 'Sub-pelagic harmonic tide',
  },
  {
    id: 'forest-stillness',
    name: 'Forest Stillness',
    tagline: 'High-canopy breeze & bioluminescent calm',
    soundLabel: 'Forest Atmosphere',
    description:
      'High-altitude cedar wind and bioluminescent nocturnal canopy stillness.',
    sceneId: 'electric-quiet',
    chamberId: 'forest-echo',
    primaryHex: '#5EF2C4',
    secondaryHex: '#2FE8FF',
    harmonicLayerLabel: 'Canopy wind overtones',
  },
  {
    id: 'celestial-night',
    name: 'Celestial Night',
    tagline: 'Starlit quietude & warm nocturnal glow',
    soundLabel: 'Soft Night',
    description:
      'Warm hearth acoustics and unhurried harmonic intervals in deep night.',
    sceneId: 'solar-drift',
    chamberId: 'ember-glow',
    primaryHex: '#FFB08A',
    secondaryHex: '#8A5CFF',
    harmonicLayerLabel: 'Warm fifth-interval glass drone',
  },
];

/**
 * Pure helper: resolves the active breathing cadence from preset + custom sliders + breath-hold toggle.
 */
export function resolveActiveBreathingCadence(
  presetId: LiquidLensBreathingPresetId,
  customInput: LiquidLensCustomCadenceInput,
  includeBreathHolds: boolean
): LiquidLensBreathingCadence {
  const base =
    BREATHING_CADENCE_PRESETS.find((p) => p.id === presetId) ||
    BREATHING_CADENCE_PRESETS[0];

  const rawInhale =
    presetId === 'custom' ? customInput.inhaleSeconds : base.inhaleSeconds;
  const rawHold =
    presetId === 'custom' ? customInput.holdSeconds : base.holdSeconds;
  const rawExhale =
    presetId === 'custom' ? customInput.exhaleSeconds : base.exhaleSeconds;
  const rawPause =
    presetId === 'custom' ? customInput.pauseSeconds : base.pauseSeconds;

  const inhaleSeconds = Math.max(2, Math.min(12, Math.round(rawInhale)));
  const holdSeconds = includeBreathHolds
    ? Math.max(0, Math.min(12, Math.round(rawHold)))
    : 0;
  const exhaleSeconds = Math.max(2, Math.min(14, Math.round(rawExhale)));
  const pauseSeconds = includeBreathHolds
    ? Math.max(0, Math.min(12, Math.round(rawPause)))
    : 0;

  return {
    ...base,
    inhaleSeconds,
    holdSeconds,
    exhaleSeconds,
    pauseSeconds,
  };
}

/**
 * Pure helper: computes the exact synchronized breathing phase and Liquid Lens physical parameters
 * at `elapsedSeconds` into a session.
 *
 * Guarantees zero drift between the session timer and the organism animation:
 * - INHALE: Organic expansion (0 -> 1) and controlled luminous intensity rise.
 * - HOLD: Geometry stabilizes at full expansion (1.0), minimal surface ripple.
 * - EXHALE: Organic contraction (1 -> 0) and softening of luminous intensity.
 * - PAUSE: Organism settles at resting radius (0.0) in quiet equilibrium.
 */
export function computeSynchronizedBreathingPhase(
  cadence: Pick<
    LiquidLensBreathingCadence,
    'inhaleSeconds' | 'holdSeconds' | 'exhaleSeconds' | 'pauseSeconds'
  >,
  elapsedSeconds: number
): SynchronizedBreathingSnapshot {
  const inhale = Math.max(1, cadence.inhaleSeconds);
  const hold = Math.max(0, cadence.holdSeconds);
  const exhale = Math.max(1, cadence.exhaleSeconds);
  const pause = Math.max(0, cadence.pauseSeconds);

  const cycleDurationSeconds = inhale + hold + exhale + pause;
  const safeElapsed = Math.max(0, elapsedSeconds);
  const completedCycles = Math.floor(safeElapsed / cycleDurationSeconds);
  const cyclePos = safeElapsed % cycleDurationSeconds;

  // Smooth cosine easing 0..1
  const easeCosine = (t01: number): number => {
    const clamped = Math.max(0, Math.min(1, t01));
    return 0.5 - 0.5 * Math.cos(clamped * Math.PI);
  };

  if (cyclePos < inhale) {
    const progress = cyclePos / inhale;
    const expansion = easeCosine(progress);
    return {
      phase: 'inhale',
      phaseLabel: 'Inhale',
      instruction: 'Breathe in gently through your nose',
      phaseProgress: Number(progress.toFixed(4)),
      phaseRemainingSeconds: Math.max(1, Math.ceil(inhale - cyclePos)),
      cycleDurationSeconds,
      completedCycles,
      expansion: Number(expansion.toFixed(4)),
      luminousIntensity: Number((0.35 + 0.65 * expansion).toFixed(4)),
      geometryStability: Number((0.55 + 0.25 * expansion).toFixed(4)),
      rippleAmplitude: Number((0.45 + 0.4 * Math.sin(progress * Math.PI)).toFixed(4)),
    };
  }

  const afterInhale = cyclePos - inhale;
  if (hold > 0 && afterInhale < hold) {
    const progress = afterInhale / hold;
    return {
      phase: 'hold',
      phaseLabel: 'Hold',
      instruction: 'Hold softly in stillness',
      phaseProgress: Number(progress.toFixed(4)),
      phaseRemainingSeconds: Math.max(1, Math.ceil(hold - afterInhale)),
      cycleDurationSeconds,
      completedCycles,
      expansion: 1,
      luminousIntensity: 0.92,
      geometryStability: 1,
      rippleAmplitude: 0.12,
    };
  }

  const afterHold = afterInhale - hold;
  if (afterHold < exhale) {
    const progress = afterHold / exhale;
    const contraction = 1 - easeCosine(progress);
    return {
      phase: 'exhale',
      phaseLabel: 'Exhale',
      instruction: 'Release slowly and soften your shoulders',
      phaseProgress: Number(progress.toFixed(4)),
      phaseRemainingSeconds: Math.max(1, Math.ceil(exhale - afterHold)),
      cycleDurationSeconds,
      completedCycles,
      expansion: Number(contraction.toFixed(4)),
      luminousIntensity: Number((0.28 + 0.64 * contraction).toFixed(4)),
      geometryStability: Number((0.65 + 0.2 * (1 - contraction)).toFixed(4)),
      rippleAmplitude: Number((0.32 * contraction + 0.15).toFixed(4)),
    };
  }

  const afterExhale = afterHold - exhale;
  const progress = pause > 0 ? afterExhale / pause : 1;
  return {
    phase: 'pause',
    phaseLabel: 'Pause',
    instruction: 'Rest in quiet equilibrium before the next breath',
    phaseProgress: Number(Math.max(0, Math.min(1, progress)).toFixed(4)),
    phaseRemainingSeconds: Math.max(1, Math.ceil(Math.max(0.1, pause - afterExhale))),
    cycleDurationSeconds,
    completedCycles,
    expansion: 0,
    luminousIntensity: 0.25,
    geometryStability: 0.96,
    rippleAmplitude: 0.08,
  };
}

/**
 * Pure helper: computes how the Liquid Lens organism gradually settles into a calm state
 * during Stillness sessions.
 */
export function computeStillnessSettlingState(
  elapsedSeconds: number,
  totalDurationSeconds: number,
  visualIntensity: StillnessVisualIntensity,
  reducedMotion = false
): StillnessSettlingSnapshot {
  const safeTotal = Math.max(1, totalDurationSeconds);
  const sessionProgress = Math.max(
    0,
    Math.min(1, elapsedSeconds / safeTotal)
  );

  // Smooth exponential settling curve: approaches 1.0 as session progresses
  const settlingFactor = Number(
    (1 - Math.exp(-3.2 * sessionProgress)).toFixed(4)
  );

  const baseIntensityScale =
    visualIntensity === 'subtle'
      ? 0.42
      : visualIntensity === 'deep-calm'
      ? 0.22
      : 0.68;

  const motionScale = reducedMotion
    ? 0
    : Number(
        (baseIntensityScale * (1 - 0.72 * settlingFactor)).toFixed(4)
      );

  const luminousScale = Number(
    (
      (visualIntensity === 'subtle' ? 0.55 : 0.78) *
      (1 - 0.28 * settlingFactor)
    ).toFixed(4)
  );

  let calmStateLabel = 'Entering Stillness';
  if (sessionProgress >= 0.75) {
    calmStateLabel = 'Deep Optical Stillness';
  } else if (sessionProgress >= 0.35) {
    calmStateLabel = 'Settling into Equilibrium';
  }

  return {
    sessionProgress: Number(sessionProgress.toFixed(4)),
    settlingFactor,
    motionScale,
    luminousScale,
    calmStateLabel,
  };
}

/**
 * Pure helper: computes equal-power audio crossfade weights (fromWeight, toWeight)
 * for normalized transition progress `t01` in [0, 1] so power sum (w1^2 + w2^2) === 1.
 */
export function computeEqualPowerCrossfadeWeights(t01: number): {
  fromWeight: number;
  toWeight: number;
  powerSum: number;
} {
  const clamped = Math.max(0, Math.min(1, t01));
  const angle = clamped * (Math.PI / 2);
  const fromWeight = Math.cos(angle);
  const toWeight = Math.sin(angle);
  return {
    fromWeight: Number(fromWeight.toFixed(5)),
    toWeight: Number(toWeight.toFixed(5)),
    powerSum: Number((fromWeight * fromWeight + toWeight * toWeight).toFixed(5)),
  };
}

export interface UseLiquidLensEngineOptions {
  initialMode?: LiquidLensMode;
  settings?: Partial<UserSettings>;
  onUpdateSettings?: (partial: Partial<UserSettings>) => void;
  audioAdapter?: LiquidLensAudioAdapter;
  onSessionComplete?: (session: LiquidLensCompletedSessionPayload) => void;
  onRecordRestoreSession?: (record: RestoreSessionRecord) => void;
}

export function useLiquidLensEngine(options: UseLiquidLensEngineOptions = {}) {
  const {
    initialMode = 'breathe',
    settings,
    onUpdateSettings,
    audioAdapter,
    onSessionComplete,
    onRecordRestoreSession,
  } = options;

  const [mode, setMode] = useState<LiquidLensMode>(initialMode);
  const [status, setStatus] = useState<LiquidLensSessionStatus>('idle');

  // Breathe configuration
  const [selectedPresetId, setSelectedPresetId] =
    useState<LiquidLensBreathingPresetId>('coherent-calm');
  const [customCadence, setCustomCadence] =
    useState<LiquidLensCustomCadenceInput>({
      inhaleSeconds: 4,
      holdSeconds: 4,
      exhaleSeconds: 6,
      pauseSeconds: 2,
    });
  const [includeBreathHolds, setIncludeBreathHolds] = useState<boolean>(true);
  const [breatheDurationMinutes, setBreatheDurationMinutes] =
    useState<number>(3);
  const [isTuningOpen, setIsTuningOpen] = useState<boolean>(false);

  // Stillness configuration
  const [stillnessDurationMinutes, setStillnessDurationMinutes] =
    useState<number>(() => settings?.breakMinutes ?? 5);
  const [stillnessVisualIntensity, setStillnessVisualIntensity] =
    useState<StillnessVisualIntensity>('balanced');
  const [stillnessAmbientSoundEnabled, setStillnessAmbientSoundEnabled] =
    useState<boolean>(true);

  // Soundscape configuration
  const [selectedEnvironmentId, setSelectedEnvironmentId] =
    useState<RestoreEnvironmentId>('ocean-drift');
  const [localSoundPlaying, setLocalSoundPlaying] = useState<boolean>(
    () => audioAdapter?.isPlaying ?? false
  );
  const [localAmbienceVolume, setLocalAmbienceVolume] = useState<number>(
    () => audioAdapter?.ambienceVolume ?? settings?.ambienceVolume ?? 0.75
  );
  const [localHarmonicVolume, setLocalHarmonicVolume] = useState<number>(
    () => audioAdapter?.harmonicVolume ?? settings?.secondaryVolume ?? 0.35
  );
  const [localMuted, setLocalMuted] = useState<boolean>(
    () => audioAdapter?.isMuted ?? Boolean(settings?.soundMuted)
  );
  const [crossfadeStatusText, setCrossfadeStatusText] = useState<string>(
    '700ms equal-power crossfade ready'
  );

  // Synchronized high-precision session clock
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [elapsedFloatSeconds, setElapsedFloatSeconds] = useState<number>(0);
  const [lastCompletedPayload, setLastCompletedPayload] =
    useState<LiquidLensCompletedSessionPayload | null>(null);

  const rafRef = useRef<number>(0);
  const lastTickMsRef = useRef<number>(0);

  const activeEnvironment = useMemo(
    () =>
      SOUNDSCAPE_ENVIRONMENTS.find((e) => e.id === selectedEnvironmentId) ||
      SOUNDSCAPE_ENVIRONMENTS[1],
    [selectedEnvironmentId]
  );

  const activeCadence = useMemo(
    () =>
      resolveActiveBreathingCadence(
        selectedPresetId,
        customCadence,
        includeBreathHolds
      ),
    [selectedPresetId, customCadence, includeBreathHolds]
  );

  const targetDurationSeconds = useMemo(() => {
    if (mode === 'breathe') {
      return Math.max(60, breatheDurationMinutes * 60);
    }
    return Math.max(60, stillnessDurationMinutes * 60);
  }, [mode, breatheDurationMinutes, stillnessDurationMinutes]);

  const remainingSeconds = Math.max(0, targetDurationSeconds - elapsedSeconds);

  const breathingSnapshot = useMemo(
    () => computeSynchronizedBreathingPhase(activeCadence, elapsedFloatSeconds),
    [activeCadence, elapsedFloatSeconds]
  );

  const stillnessSnapshot = useMemo(
    () =>
      computeStillnessSettlingState(
        elapsedFloatSeconds,
        targetDurationSeconds,
        stillnessVisualIntensity,
        Boolean(settings?.reducedMotion)
      ),
    [
      elapsedFloatSeconds,
      targetDurationSeconds,
      stillnessVisualIntensity,
      settings?.reducedMotion,
    ]
  );

  const isAudioPlaying = audioAdapter
    ? audioAdapter.isPlaying
    : localSoundPlaying;
  const isAudioMuted = audioAdapter ? audioAdapter.isMuted : localMuted;
  const ambienceVolume = audioAdapter
    ? audioAdapter.ambienceVolume
    : localAmbienceVolume;
  const harmonicVolume =
    audioAdapter?.harmonicVolume !== undefined
      ? audioAdapter.harmonicVolume
      : localHarmonicVolume;

  // Sync audio helper that uses injected adapter or falls back cleanly to soundEngine
  const syncAudioPlayback = useCallback(
    (nextPlaying: boolean, nextChamberId?: ChamberId, nextVol?: number, nextMuted?: boolean) => {
      const targetChamber = nextChamberId ?? activeEnvironment.chamberId;
      const targetVol = nextVol ?? ambienceVolume;
      const targetMuted = nextMuted ?? isAudioMuted;

      if (audioAdapter) {
        audioAdapter.onTogglePlay(nextPlaying);
        if (nextChamberId) {
          audioAdapter.onSelectChamber(nextChamberId, activeEnvironment.sceneId);
        }
        if (nextVol !== undefined) {
          audioAdapter.onChangeAmbienceVolume(nextVol);
        }
        if (nextMuted !== undefined && audioAdapter.onToggleMute) {
          audioAdapter.onToggleMute(nextMuted);
        }
      } else {
        setLocalSoundPlaying(nextPlaying);
        soundEngine.syncChambers({
          playing: nextPlaying,
          primaryChamberId: targetChamber,
          ambienceVolume: targetVol,
          muted: targetMuted,
        });
      }
    },
    [
      activeEnvironment.chamberId,
      activeEnvironment.sceneId,
      ambienceVolume,
      audioAdapter,
      isAudioMuted,
    ]
  );

  const finalizeSession = useCallback(
    (actualSecs: number, completedNaturally: boolean) => {
      const now = new Date();
      const isoDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const sessionMode: 'breathe' | 'stillness' =
        mode === 'stillness' ? 'stillness' : 'breathe';
      const legacyMode = sessionMode === 'breathe' ? 'breathing' : 'quiet-moment';
      const presetName =
        sessionMode === 'breathe'
          ? activeCadence.name
          : `${stillnessDurationMinutes}-Minute Stillness`;

      const payload: LiquidLensCompletedSessionPayload = {
        id: `liquid-lens-${now.getTime()}`,
        mode: sessionMode,
        legacyMode,
        presetName,
        environmentId: selectedEnvironmentId,
        plannedDurationSeconds: targetDurationSeconds,
        actualDurationSeconds: Math.max(1, Math.round(actualSecs)),
        completedNaturally,
        completedAt: now.toISOString(),
        isoDate,
      };

      setLastCompletedPayload(payload);
      setStatus('completed');

      const alertVol = settings?.alertVolume ?? 0.7;
      if (audioAdapter?.onPlayCompletionChime) {
        audioAdapter.onPlayCompletionChime(alertVol);
      } else {
        soundEngine.playRestoreCompletionChime(alertVol);
      }

      onSessionComplete?.(payload);
      onRecordRestoreSession?.({
        id: payload.id,
        mode: legacyMode,
        presetName: payload.presetName,
        title: payload.presetName,
        environmentId: payload.environmentId,
        durationSeconds: payload.plannedDurationSeconds,
        elapsedSeconds: payload.actualDurationSeconds,
        completedAt: payload.completedAt,
        isoDate: payload.isoDate,
      });
    },
    [
      mode,
      activeCadence.name,
      stillnessDurationMinutes,
      selectedEnvironmentId,
      targetDurationSeconds,
      settings?.alertVolume,
      audioAdapter,
      onSessionComplete,
      onRecordRestoreSession,
    ]
  );

  const finalizeSessionRef = useRef(finalizeSession);
  useEffect(() => {
    finalizeSessionRef.current = finalizeSession;
  }, [finalizeSession]);

  // High-precision wall-clock delta loop for Breathe & Stillness
  useEffect(() => {
    if (status !== 'running') {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickMsRef.current = performance.now();

    const step = (nowMs: number) => {
      const dtSeconds = Math.min(
        0.25,
        Math.max(0, (nowMs - lastTickMsRef.current) / 1000)
      );
      lastTickMsRef.current = nowMs;

      setElapsedFloatSeconds((prev) => {
        const nextFloat = prev + dtSeconds;
        const nextWhole = Math.floor(nextFloat);
        setElapsedSeconds(nextWhole);

        if (nextWhole >= targetDurationSeconds) {
          finalizeSessionRef.current(targetDurationSeconds, true);
          return targetDurationSeconds;
        }
        return nextFloat;
      });

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, targetDurationSeconds]);

  const handleStart = useCallback(() => {
    if (status === 'completed' || status === 'idle') {
      setElapsedSeconds(0);
      setElapsedFloatSeconds(0);
      setLastCompletedPayload(null);
    }
    setStatus('running');

    const shouldPlayAudio =
      mode === 'stillness' ? stillnessAmbientSoundEnabled : true;
    if (shouldPlayAudio && !isAudioMuted) {
      syncAudioPlayback(true);
    }
  }, [
    status,
    mode,
    stillnessAmbientSoundEnabled,
    isAudioMuted,
    syncAudioPlayback,
  ]);

  const handlePause = useCallback(() => {
    if (status === 'running') {
      setStatus('paused');
    }
  }, [status]);

  const handleResume = useCallback(() => {
    if (status === 'paused') {
      lastTickMsRef.current = performance.now();
      setStatus('running');
    }
  }, [status]);

  const handleEndSession = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (elapsedSeconds >= 10) {
      finalizeSession(elapsedSeconds, false);
    } else {
      setStatus('idle');
      setElapsedSeconds(0);
      setElapsedFloatSeconds(0);
      setLastCompletedPayload(null);
    }
  }, [elapsedSeconds, finalizeSession]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setStatus('idle');
    setElapsedSeconds(0);
    setElapsedFloatSeconds(0);
    setLastCompletedPayload(null);
  }, []);

  const handleSwitchMode = useCallback(
    (nextMode: LiquidLensMode) => {
      if (nextMode === mode) return;
      if (status === 'running' || status === 'paused') {
        // Preserve audio continuity while resetting timer when switching between Breathe and Stillness
        if (nextMode !== 'soundscape') {
          setStatus('idle');
          setElapsedSeconds(0);
          setElapsedFloatSeconds(0);
          setLastCompletedPayload(null);
        }
      }
      setMode(nextMode);
    },
    [mode, status]
  );

  const handleSelectBreathingPreset = useCallback(
    (presetId: LiquidLensBreathingPresetId) => {
      setSelectedPresetId(presetId);
      const found = BREATHING_CADENCE_PRESETS.find((p) => p.id === presetId);
      if (found) {
        setBreatheDurationMinutes(found.defaultSessionMinutes);
      }
      handleReset();
    },
    [handleReset]
  );

  const handleUpdateCustomCadence = useCallback(
    (partial: Partial<LiquidLensCustomCadenceInput>) => {
      setSelectedPresetId('custom');
      setCustomCadence((prev) => ({ ...prev, ...partial }));
    },
    []
  );

  const handleSelectEnvironment = useCallback(
    (envId: RestoreEnvironmentId) => {
      setSelectedEnvironmentId(envId);
      const env = SOUNDSCAPE_ENVIRONMENTS.find((e) => e.id === envId);
      if (!env) return;

      setCrossfadeStatusText(
        `Crossfading to ${env.soundLabel} (700ms equal-power)`
      );
      if (audioAdapter) {
        audioAdapter.onSelectChamber(env.chamberId, env.sceneId);
      } else {
        setLocalSoundPlaying(true);
        setLocalMuted(false);
        soundEngine.syncChambers({
          playing: true,
          primaryChamberId: env.chamberId,
          ambienceVolume,
          muted: false,
        });
      }
      onUpdateSettings?.({
        selectedChamberId: env.chamberId,
        soundMuted: false,
      });
    },
    [ambienceVolume, audioAdapter, onUpdateSettings]
  );

  const handlePreviewEnvironment = useCallback(
    (envId: RestoreEnvironmentId) => {
      const env = SOUNDSCAPE_ENVIRONMENTS.find((e) => e.id === envId);
      if (!env) return;
      setSelectedEnvironmentId(envId);
      setCrossfadeStatusText(`Previewing ${env.soundLabel}`);
      if (audioAdapter?.onPreviewChamber) {
        audioAdapter.onPreviewChamber(env.chamberId, ambienceVolume);
      } else if (audioAdapter) {
        audioAdapter.onSelectChamber(env.chamberId, env.sceneId);
        audioAdapter.onTogglePlay(true);
      } else {
        setLocalSoundPlaying(true);
        setLocalMuted(false);
        soundEngine.previewSoundscape(env.chamberId, ambienceVolume);
      }
    },
    [ambienceVolume, audioAdapter]
  );

  const handleChangeAmbienceVolume = useCallback(
    (nextVol01: number) => {
      const clamped = Math.max(0, Math.min(1, nextVol01));
      setLocalAmbienceVolume(clamped);
      setLocalMuted(false);
      onUpdateSettings?.({ ambienceVolume: clamped, soundMuted: false });
      if (audioAdapter) {
        audioAdapter.onChangeAmbienceVolume(clamped);
      } else if (localSoundPlaying) {
        soundEngine.syncChambers({
          playing: true,
          primaryChamberId: activeEnvironment.chamberId,
          ambienceVolume: clamped,
          muted: false,
        });
      }
    },
    [activeEnvironment.chamberId, audioAdapter, localSoundPlaying, onUpdateSettings]
  );

  const handleChangeHarmonicVolume = useCallback(
    (nextVol01: number) => {
      const clamped = Math.max(0, Math.min(1, nextVol01));
      setLocalHarmonicVolume(clamped);
      onUpdateSettings?.({ secondaryVolume: clamped });
      audioAdapter?.onChangeHarmonicVolume?.(clamped);
    },
    [audioAdapter, onUpdateSettings]
  );

  const handleToggleAudioPlay = useCallback(() => {
    const next = !isAudioPlaying;
    syncAudioPlayback(next);
  }, [isAudioPlaying, syncAudioPlayback]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !isAudioMuted;
    setLocalMuted(nextMuted);
    onUpdateSettings?.({ soundMuted: nextMuted });
    syncAudioPlayback(!nextMuted && isAudioPlaying, undefined, undefined, nextMuted);
  }, [isAudioMuted, isAudioPlaying, onUpdateSettings, syncAudioPlayback]);

  return {
    mode,
    status,
    elapsedSeconds,
    elapsedFloatSeconds,
    remainingSeconds,
    targetDurationSeconds,
    lastCompletedPayload,
    // Breathe state
    selectedPresetId,
    activeCadence,
    customCadence,
    includeBreathHolds,
    breatheDurationMinutes,
    isTuningOpen,
    breathingSnapshot,
    // Stillness state
    stillnessDurationMinutes,
    stillnessVisualIntensity,
    stillnessAmbientSoundEnabled,
    stillnessSnapshot,
    // Soundscape state
    selectedEnvironmentId,
    activeEnvironment,
    isAudioPlaying,
    isAudioMuted,
    ambienceVolume,
    harmonicVolume,
    crossfadeStatusText,
    // Actions
    setMode: handleSwitchMode,
    startSession: handleStart,
    pauseSession: handlePause,
    resumeSession: handleResume,
    endSession: handleEndSession,
    resetSession: handleReset,
    selectBreathingPreset: handleSelectBreathingPreset,
    updateCustomCadence: handleUpdateCustomCadence,
    setIncludeBreathHolds,
    setBreatheDurationMinutes: (mins: number) => {
      setBreatheDurationMinutes(mins);
      handleReset();
    },
    setIsTuningOpen,
    setStillnessDurationMinutes: (mins: number) => {
      setStillnessDurationMinutes(mins);
      handleReset();
    },
    setStillnessVisualIntensity,
    setStillnessAmbientSoundEnabled,
    selectEnvironment: handleSelectEnvironment,
    previewEnvironment: handlePreviewEnvironment,
    changeAmbienceVolume: handleChangeAmbienceVolume,
    changeHarmonicVolume: handleChangeHarmonicVolume,
    toggleAudioPlay: handleToggleAudioPlay,
    toggleMute: handleToggleMute,
  };
}
