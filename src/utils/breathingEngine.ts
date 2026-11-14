import {
  BreathingPatternConfig,
  BreathingPresetId,
  ChamberId,
  FocusSceneId,
} from '../types/aura';

export type CuratedBreathingPresetId =
  | 'coherent-5-5'
  | 'deep-rest-4-7-8'
  | 'wave-6-2-7';

export type IntelligentBreathingPresetId =
  | 'coherent-5-5'
  | 'box-4-4-4-4'
  | 'deep-rest-4-7-8'
  | 'wave-6-2-7'
  | 'custom';

export interface CustomBreathingTiming {
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}

export const DEFAULT_CUSTOM_BREATHING_TIMING: CustomBreathingTiming = {
  inhaleSeconds: 5,
  holdInSeconds: 2,
  exhaleSeconds: 6,
  holdOutSeconds: 2,
};

export const BREATHING_DURATION_OPTIONS: readonly number[] = [
  120,
  180,
  240,
  300,
  600,
];

/**
 * Retained 3-purpose zero-hold presets for backward compatibility with existing tests & callers.
 */
export const CURATED_BREATHING_PRESETS: BreathingPatternConfig[] = [
  {
    id: 'coherent-5-5',
    name: 'Find Your Balance',
    subtitle: '5s Inhale · 5s Exhale',
    description:
      'A steady, balanced breathing rhythm to help you reset, regain composure, and find a moment of clarity.',
    inhaleSeconds: 5,
    holdInSeconds: 0,
    exhaleSeconds: 5,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 180,
  },
  {
    id: 'deep-rest-4-7-8',
    name: 'Release Tension',
    subtitle: '4s Inhale · 6s Exhale',
    description:
      'A gentle breathing rhythm with a longer exhale to help you slow down and release the tension of a demanding day.',
    inhaleSeconds: 4,
    holdInSeconds: 0,
    exhaleSeconds: 6,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 240,
  },
  {
    id: 'wave-6-2-7',
    name: 'Prepare for Rest',
    subtitle: '5s Inhale · 7s Exhale',
    description:
      'A slower breathing rhythm designed to create a peaceful transition into your evening rest.',
    inhaleSeconds: 5,
    holdInSeconds: 0,
    exhaleSeconds: 7,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 300,
  },
];

/**
 * Feature 1C: Intelligent Breathing Patterns Catalog
 * Supports Balanced, Box, Relaxing (4-7-8), Restorative, and Custom user-configured patterns.
 */
export const INTELLIGENT_BREATHING_PATTERNS: BreathingPatternConfig[] = [
  {
    id: 'coherent-5-5',
    name: 'Balanced',
    subtitle: '5s In · 5s Out',
    description:
      'Coherent 5-5 resonance breathing to restore equilibrium, heart-mind coherence, and calm clarity.',
    inhaleSeconds: 5,
    holdInSeconds: 0,
    exhaleSeconds: 5,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 180,
  },
  {
    id: 'box-4-4-4-4',
    name: 'Box Breathing',
    subtitle: '4s In · 4s Hold · 4s Out · 4s Rest',
    description:
      'Four-phase symmetrical cadence used to anchor attention, steady the nervous system, and clear mental noise.',
    inhaleSeconds: 4,
    holdInSeconds: 4,
    exhaleSeconds: 4,
    holdOutSeconds: 4,
    recommendedDurationSeconds: 240,
  },
  {
    id: 'deep-rest-4-7-8',
    name: 'Relaxing 4·7·8',
    subtitle: '4s In · 7s Hold · 8s Out',
    description:
      'Classic tranquilizing breath ratio with an extended hold and slow release to dissolve deep tension.',
    inhaleSeconds: 4,
    holdInSeconds: 7,
    exhaleSeconds: 8,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 240,
  },
  {
    id: 'wave-6-2-7',
    name: 'Evening Rest',
    subtitle: '5s In · 7s Out',
    description:
      'Unhurried, effortless exhale wave designed for transitioning into deep evening stillness.',
    inhaleSeconds: 5,
    holdInSeconds: 0,
    exhaleSeconds: 7,
    holdOutSeconds: 0,
    recommendedDurationSeconds: 300,
  },
  {
    id: 'custom',
    name: 'Custom Rhythm',
    subtitle: 'Configurable 4-Phase Cadence',
    description:
      'Tailor your own Inhale, Hold, Exhale, and Rest durations to match your personal lung capacity and state.',
    inhaleSeconds: DEFAULT_CUSTOM_BREATHING_TIMING.inhaleSeconds,
    holdInSeconds: DEFAULT_CUSTOM_BREATHING_TIMING.holdInSeconds,
    exhaleSeconds: DEFAULT_CUSTOM_BREATHING_TIMING.exhaleSeconds,
    holdOutSeconds: DEFAULT_CUSTOM_BREATHING_TIMING.holdOutSeconds,
    recommendedDurationSeconds: 180,
  },
];

export function sanitizeCustomBreathingPattern(
  raw?: Partial<CustomBreathingTiming> | null
): CustomBreathingTiming {
  const clampInt = (val: unknown, fallback: number, min: number, max: number) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, Math.round(num)));
  };
  return {
    inhaleSeconds: clampInt(
      raw?.inhaleSeconds,
      DEFAULT_CUSTOM_BREATHING_TIMING.inhaleSeconds,
      2,
      12
    ),
    holdInSeconds: clampInt(
      raw?.holdInSeconds,
      DEFAULT_CUSTOM_BREATHING_TIMING.holdInSeconds,
      0,
      12
    ),
    exhaleSeconds: clampInt(
      raw?.exhaleSeconds,
      DEFAULT_CUSTOM_BREATHING_TIMING.exhaleSeconds,
      2,
      15
    ),
    holdOutSeconds: clampInt(
      raw?.holdOutSeconds,
      DEFAULT_CUSTOM_BREATHING_TIMING.holdOutSeconds,
      0,
      12
    ),
  };
}

export function formatPatternCadenceSummary(pattern: {
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}): string {
  const parts: string[] = [`${pattern.inhaleSeconds}s in`];
  if (pattern.holdInSeconds > 0) {
    parts.push(`${pattern.holdInSeconds}s hold`);
  }
  parts.push(`${pattern.exhaleSeconds}s out`);
  if (pattern.holdOutSeconds > 0) {
    parts.push(`${pattern.holdOutSeconds}s rest`);
  }
  return parts.join(' · ');
}

export function resolveIntelligentBreathingPattern(
  rawId?: string | null,
  customTiming?: Partial<CustomBreathingTiming> | null
): BreathingPatternConfig {
  const safeCustom = sanitizeCustomBreathingPattern(customTiming);
  if (rawId === 'custom') {
    const subtitle = formatPatternCadenceSummary(safeCustom);
    return {
      id: 'custom',
      name: 'Custom Rhythm',
      subtitle,
      description:
        'Tailor your own Inhale, Hold, Exhale, and Rest durations to match your personal lung capacity and state.',
      inhaleSeconds: safeCustom.inhaleSeconds,
      holdInSeconds: safeCustom.holdInSeconds,
      exhaleSeconds: safeCustom.exhaleSeconds,
      holdOutSeconds: safeCustom.holdOutSeconds,
      recommendedDurationSeconds: 180,
    };
  }

  if (rawId === 'box-4-4-4-4' || rawId === 'box-breath') {
    return INTELLIGENT_BREATHING_PATTERNS[1];
  }
  if (rawId === 'deep-rest-4-7-8' || rawId === 'deep-rest') {
    return INTELLIGENT_BREATHING_PATTERNS[2];
  }
  if (rawId === 'wave-6-2-7' || rawId === 'simple-flow') {
    return INTELLIGENT_BREATHING_PATTERNS[3];
  }
  return INTELLIGENT_BREATHING_PATTERNS[0];
}

const LEGACY_BREATHING_PRESET_MAP: Record<string, CuratedBreathingPresetId> = {
  'coherent-5-5': 'coherent-5-5',
  'coherent-calm': 'coherent-5-5',
  'box-4-4-4-4': 'coherent-5-5',
  'box-breath': 'coherent-5-5',
  custom: 'coherent-5-5',
  'deep-rest-4-7-8': 'deep-rest-4-7-8',
  'deep-rest': 'deep-rest-4-7-8',
  'wave-6-2-7': 'wave-6-2-7',
  'simple-flow': 'wave-6-2-7',
};

/**
 * Safely migrates legacy breathing preset identifiers to the default curated ID.
 */
export function normalizeBreathingPresetId(
  rawId?: string | null
): CuratedBreathingPresetId {
  if (!rawId) return 'coherent-5-5';
  return LEGACY_BREATHING_PRESET_MAP[rawId] ?? 'coherent-5-5';
}

export function getBreathingPresetById(
  rawId?: string | null
): BreathingPatternConfig {
  const normalized = normalizeBreathingPresetId(rawId);
  return (
    CURATED_BREATHING_PRESETS.find((preset) => preset.id === normalized) ??
    CURATED_BREATHING_PRESETS[0]
  );
}

export interface ClockElapsedInput {
  accumulatedSeconds: number;
  segmentStartPerfMs: number | null;
  nowPerfMs: number;
  targetDurationSeconds: number;
}

export interface ClockElapsedSnapshot {
  elapsedFloatSeconds: number;
  elapsedWholeSeconds: number;
  remainingSeconds: number;
  progressRatio: number;
  isComplete: boolean;
}

/**
 * Computes drift-corrected wall-clock session progress using monotonic timestamps.
 */
export function computeClockElapsed(
  input: ClockElapsedInput
): ClockElapsedSnapshot {
  const safeTarget = Math.max(1, input.targetDurationSeconds);
  const runningDeltaSec =
    input.segmentStartPerfMs !== null
      ? Math.max(0, (input.nowPerfMs - input.segmentStartPerfMs) / 1000)
      : 0;
  const rawElapsed = Math.max(0, input.accumulatedSeconds + runningDeltaSec);
  const elapsedFloatSeconds = Math.min(safeTarget, rawElapsed);
  const elapsedWholeSeconds = Math.min(
    safeTarget,
    Math.floor(elapsedFloatSeconds)
  );
  const remainingSeconds = Math.max(0, safeTarget - elapsedWholeSeconds);
  const progressRatio = Math.min(1, elapsedFloatSeconds / safeTarget);
  const isComplete = elapsedFloatSeconds >= safeTarget;

  return {
    elapsedFloatSeconds,
    elapsedWholeSeconds,
    remainingSeconds,
    progressRatio,
    isComplete,
  };
}

/**
 * Frame-rate-independent exponential smoothing used when transitioning between
 * breathing presets, idle waves, and active guidance without visual jumps.
 */
export function dampValue(
  current: number,
  target: number,
  lambda: number,
  dtSeconds: number
): number {
  const safeDt = Math.max(0, Math.min(0.25, dtSeconds));
  const factor = 1 - Math.exp(-Math.max(0.1, lambda) * safeDt);
  return current + (target - current) * factor;
}

export interface DiscreteBreathingUiState {
  elapsedSeconds: number;
  phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
  phaseRemainingSeconds: number;
  completedCycles: number;
}

/**
 * Prevents redundant React re-renders at 60fps by updating UI state only when
 * user-visible integer counters or phase labels actually change.
 */
export function hasDiscreteBreathingStateChanged(
  prev: DiscreteBreathingUiState,
  next: DiscreteBreathingUiState
): boolean {
  return (
    prev.elapsedSeconds !== next.elapsedSeconds ||
    prev.phase !== next.phase ||
    prev.phaseRemainingSeconds !== next.phaseRemainingSeconds ||
    prev.completedCycles !== next.completedCycles
  );
}

export function isValidCuratedPresetId(
  id: BreathingPresetId
): id is CuratedBreathingPresetId {
  return (
    id === 'coherent-5-5' ||
    id === 'deep-rest-4-7-8' ||
    id === 'wave-6-2-7'
  );
}

/**
 * Maps internal breathing phase to the exact user-facing instruction required by Feature 1B:
 * - INHALE -> "Breathe In"
 * - HOLD -> "Hold"
 * - EXHALE -> "Breathe Out"
 * - REST -> "Rest"
 */
export function getBreathingPhaseInstruction(
  phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
): 'Breathe In' | 'Hold' | 'Breathe Out' | 'Rest' {
  if (phase === 'inhale') return 'Breathe In';
  if (phase === 'hold-in') return 'Hold';
  if (phase === 'exhale') return 'Breathe Out';
  return 'Rest';
}

export interface BreathingOrbKinematics {
  instruction: 'Breathe In' | 'Hold' | 'Breathe Out' | 'Rest';
  targetExpansion: number; // 0..1
  coreBrightness: number; // 0.45..1.05
  outerGlowAlpha: number; // 0.18..0.62
  outerGlowScale: number; // 1.32..1.65
  /** Positive = outward radial particle drift (Inhale), 0 = still (Hold/Rest), Negative = inward drift (Exhale) */
  radialDriftVelocity: number;
  /** Controls organic surface wave amplitude: calm/still during Hold, expressive during Inhale/Exhale */
  surfaceElasticityScale: number;
  /** Controls orbital tangential drift speed of internal particles */
  tangentialSpeedScale: number;
}

/**
 * Feature 1B: Computes synchronized 4-state orb physics (INHALE, HOLD, EXHALE, REST)
 * directly from the breathing timer state and Web Audio energy.
 */
export function computeBreathingOrbKinematics(params: {
  sessionState: 'idle' | 'running' | 'paused' | 'completed';
  phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
  phaseProgress: number; // 0..1
  expansion: number; // 0..1
  ambientTimeSec: number;
  audioEnergy?: number; // 0..1
  reducedMotion?: boolean;
}): BreathingOrbKinematics {
  const {
    sessionState,
    phase,
    phaseProgress,
    expansion,
    ambientTimeSec,
    audioEnergy = 0,
    reducedMotion = false,
  } = params;

  const safeAudio = Math.max(0, Math.min(1, audioEnergy));
  const instruction = getBreathingPhaseInstruction(phase);

  // Idle or Paused resting state: gentle ambient floating animation
  if (sessionState === 'idle' || sessionState === 'completed') {
    const restWave = reducedMotion
      ? 0.38
      : 0.36 + 0.12 * Math.sin(ambientTimeSec * 1.15);
    return {
      instruction: 'Rest',
      targetExpansion: Number(restWave.toFixed(4)),
      coreBrightness: Number((0.64 + safeAudio * 0.12).toFixed(4)),
      outerGlowAlpha: Number((0.28 + restWave * 0.12 + safeAudio * 0.08).toFixed(4)),
      outerGlowScale: Number((1.42 + restWave * 0.1).toFixed(4)),
      radialDriftVelocity: 0,
      surfaceElasticityScale: reducedMotion ? 0.15 : 0.62,
      tangentialSpeedScale: reducedMotion ? 0.1 : 0.65,
    };
  }

  if (sessionState === 'paused') {
    return {
      instruction,
      targetExpansion: Number(expansion.toFixed(4)),
      coreBrightness: 0.6,
      outerGlowAlpha: 0.24,
      outerGlowScale: Number((1.38 + expansion * 0.12).toFixed(4)),
      radialDriftVelocity: 0,
      surfaceElasticityScale: 0.2,
      tangentialSpeedScale: 0.15,
    };
  }

  // Active running states
  if (phase === 'inhale') {
    // INHALE: Orb expands, internal light brightens, outer glow increases, particles move outward slowly
    const envelope = Math.sin(Math.max(0, Math.min(1, phaseProgress)) * Math.PI);
    return {
      instruction: 'Breathe In',
      targetExpansion: Number(expansion.toFixed(4)),
      coreBrightness: Number((0.66 + 0.34 * expansion + safeAudio * 0.08).toFixed(4)),
      outerGlowAlpha: Number((0.28 + 0.26 * expansion + safeAudio * 0.08).toFixed(4)),
      outerGlowScale: Number((1.4 + 0.22 * expansion).toFixed(4)),
      radialDriftVelocity: reducedMotion
        ? 0
        : Number((0.22 + 0.65 * envelope).toFixed(4)),
      surfaceElasticityScale: reducedMotion ? 0.18 : 0.88,
      tangentialSpeedScale: reducedMotion ? 0.12 : 0.85,
    };
  }

  if (phase === 'hold-in') {
    // HOLD: Orb maintains expanded state, movement becomes almost still, light remains stable
    return {
      instruction: 'Hold',
      targetExpansion: 1.0,
      coreBrightness: Number((0.98 + safeAudio * 0.04).toFixed(4)),
      outerGlowAlpha: Number((0.52 + safeAudio * 0.05).toFixed(4)),
      outerGlowScale: 1.62,
      radialDriftVelocity: 0,
      surfaceElasticityScale: reducedMotion ? 0.08 : 0.16,
      tangentialSpeedScale: reducedMotion ? 0.05 : 0.14,
    };
  }

  if (phase === 'exhale') {
    // EXHALE: Orb contracts, light becomes softer, particles gently move inward, outer glow decreases
    const envelope = Math.sin(Math.max(0, Math.min(1, phaseProgress)) * Math.PI);
    return {
      instruction: 'Breathe Out',
      targetExpansion: Number(expansion.toFixed(4)),
      coreBrightness: Number((0.52 + 0.44 * expansion + safeAudio * 0.06).toFixed(4)),
      outerGlowAlpha: Number((0.2 + 0.3 * expansion + safeAudio * 0.06).toFixed(4)),
      outerGlowScale: Number((1.34 + 0.26 * expansion).toFixed(4)),
      radialDriftVelocity: reducedMotion
        ? 0
        : Number((-0.2 - 0.62 * envelope).toFixed(4)),
      surfaceElasticityScale: reducedMotion ? 0.16 : 0.72,
      tangentialSpeedScale: reducedMotion ? 0.1 : 0.68,
    };
  }

  // REST (hold-out): Orb enters a natural resting state, gentle ambient floating animation continues
  return {
    instruction: 'Rest',
    targetExpansion: 0.0,
    coreBrightness: Number((0.54 + safeAudio * 0.06).toFixed(4)),
    outerGlowAlpha: Number((0.22 + safeAudio * 0.05).toFixed(4)),
    outerGlowScale: 1.34,
    radialDriftVelocity: 0,
    surfaceElasticityScale: reducedMotion ? 0.12 : 0.36,
    tangentialSpeedScale: reducedMotion ? 0.08 : 0.38,
  };
}

/**
 * Feature 2: Adaptive Atmosphere Engine Profiles for the 5 Themes
 */
export interface AdaptiveAtmosphereProfile {
  id: FocusSceneId;
  name: string;
  subtitle: string;
  /** Smoothly crossfaded radial atmosphere overlay behind the orb */
  radialGradientCss: string;
  /** Lavender / Pink / Cyan / Violet volumetric diffusion tint RGB [0..255] */
  lavenderTintRgb: [number, number, number];
  /** Particle shimmer speed multiplier */
  shimmerFrequency: number;
  /** Ambient floating buoyancy amplitude */
  buoyancyAmplitude: number;
}

export const ADAPTIVE_ATMOSPHERE_PROFILES: Record<
  FocusSceneId,
  AdaptiveAtmosphereProfile
> = {
  'deep-current': {
    id: 'deep-current',
    name: 'Deep Current',
    subtitle: 'Midnight Cobalt & Ion Violet',
    radialGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(47, 232, 255, 0.14) 0%, rgba(138, 92, 255, 0.12) 34%, rgba(7, 8, 18, 0) 72%)',
    lavenderTintRgb: [196, 181, 253],
    shimmerFrequency: 1.1,
    buoyancyAmplitude: 6.5,
  },
  'chromatic-flow': {
    id: 'chromatic-flow',
    name: 'Chromatic Flow',
    subtitle: 'Iridescent Cyan, Lavender & Rose',
    radialGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(255, 79, 163, 0.16) 0%, rgba(47, 232, 255, 0.12) 38%, rgba(21, 17, 42, 0) 74%)',
    lavenderTintRgb: [244, 180, 255],
    shimmerFrequency: 1.45,
    buoyancyAmplitude: 8.0,
  },
  'night-signal': {
    id: 'night-signal',
    name: 'Night Signal',
    subtitle: 'Nocturnal Violet, Lavender & Soft Peach',
    radialGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(138, 92, 255, 0.16) 0%, rgba(255, 176, 138, 0.11) 36%, rgba(7, 8, 18, 0) 72%)',
    lavenderTintRgb: [221, 190, 255],
    shimmerFrequency: 0.92,
    buoyancyAmplitude: 5.5,
  },
  'electric-quiet': {
    id: 'electric-quiet',
    name: 'Electric Quiet',
    subtitle: 'Shadow Navy, Bioluminescent Cyan & Mist',
    radialGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(47, 232, 255, 0.15) 0%, rgba(216, 255, 82, 0.09) 36%, rgba(11, 19, 38, 0) 72%)',
    lavenderTintRgb: [186, 230, 253],
    shimmerFrequency: 1.25,
    buoyancyAmplitude: 6.0,
  },
  'solar-drift': {
    id: 'solar-drift',
    name: 'Solar Drift',
    subtitle: 'Warm Rose, Lavender & Horizon Gold',
    radialGradientCss:
      'radial-gradient(circle at 50% 42%, rgba(255, 93, 136, 0.15) 0%, rgba(255, 176, 138, 0.12) 38%, rgba(21, 17, 42, 0) 74%)',
    lavenderTintRgb: [251, 207, 232],
    shimmerFrequency: 1.0,
    buoyancyAmplitude: 7.0,
  },
};

/**
 * Feature 3: Spatial Sound Experience Catalog
 * Maps the 6 requested wellness soundscapes (Ocean, Rain, Forest, Wind, Singing Bowls, Deep Ambient)
 * directly to the Web Audio synthesizer chambers with equal-power crossfading.
 */
export interface SpatialSoundOption {
  chamberId: ChamberId;
  label: 'Ocean' | 'Rain' | 'Forest' | 'Wind' | 'Singing Bowls' | 'Deep Ambient';
  subtitle: string;
  accentHex: string;
}

export const SPATIAL_SOUND_CATALOG: readonly SpatialSoundOption[] = [
  {
    chamberId: 'ocean-drift',
    label: 'Ocean',
    subtitle: 'Deep pelagic swells & shoreline tide',
    accentHex: '#38F2FF',
  },
  {
    chamberId: 'rain-chamber',
    label: 'Rain',
    subtitle: 'Soft conservatory rain on skylight glass',
    accentHex: '#2FE8FF',
  },
  {
    chamberId: 'forest-echo',
    label: 'Forest',
    subtitle: 'Nocturnal canopy stillness & cedar air',
    accentHex: '#5EF2C4',
  },
  {
    chamberId: 'ember-glow',
    label: 'Wind',
    subtitle: 'Warm high-altitude breeze & gentle air',
    accentHex: '#FFB08A',
  },
  {
    chamberId: 'celestial-tone',
    label: 'Singing Bowls',
    subtitle: 'Crystalline harmonic fifth intervals',
    accentHex: '#F492F0',
  },
  {
    chamberId: 'cosmic-silence',
    label: 'Deep Ambient',
    subtitle: 'Weightless sub-orbital drone & horizon',
    accentHex: '#8A5CFF',
  },
] as const;
