import {
  BreathingPatternConfig,
  ChamberConfig,
  ChamberId,
  FocusSceneConfig,
  FocusSceneId,
  OrbDesignId,
  QuietMomentConfig,
  RestoreEnvironmentConfig,
  SessionCompletionStatus,
  SessionRecord,
  SoundCategory,
  UserSettings,
} from '../types/aura';
import { ORB_DESIGNS } from './organicOrbEngine';
import { CURATED_BREATHING_PRESETS } from './breathingEngine';

export { ORB_DESIGNS };

export const SNAP_PRESET_MINUTES = [25, 45, 60, 90] as const;
export const FOCUS_PRESET_MINUTES: number[] = [15, 25, 45, 50, 60, 90];
export const MIN_SCRUB_MINUTES = 15;
export const MAX_SCRUB_MINUTES = 120;

export const SESSION_INTENTION_SUGGESTIONS = [
  'Complete my physics chapter',
  'Finish my assignment',
  'Build my website',
  'Read 30 pages',
  'Practice programming',
] as const;

export const FOCUS_SCENES: Record<FocusSceneId, FocusSceneConfig> = {
  'deep-current': {
    id: 'deep-current',
    name: 'Deep Current',
    tagline: 'Dense, slow, magnetic liquid motion',
    description:
      'Designed for serious deep work. Refracted indigo, cobalt blue, and ion violet suspended in midnight ink.',
    colors: {
      baseBg: '#070812', // Midnight ink
      primary: '#8A5CFF', // Ion violet
      secondary: '#2FE8FF', // Electric cyan-cobalt
      tertiary: '#4338CA', // Deep indigo
      iridescent: '#F5F6FF', // Soft white
      rimGlow: '#8A5CFF',
    },
    motion: {
      flowSpeed: 0.55,
      elasticity: 0.45,
      refractionDepth: 0.95,
    },
    suggestedChamberId: 'cosmic-silence',
    completionPhrase: 'Focus held.',
  },
  'chromatic-flow': {
    id: 'chromatic-flow',
    name: 'Chromatic Flow',
    tagline: 'Elastic, organic, expressive fluid movement',
    description:
      'Designed for creative synthesis. Electric cyan, signal magenta, coral, and liquid peach in motion.',
    colors: {
      baseBg: '#15112A', // Deep atmospheric violet
      primary: '#FF4FA3', // Signal magenta
      secondary: '#2FE8FF', // Electric cyan
      tertiary: '#FFB08A', // Liquid peach
      iridescent: '#FF5D88', // Signal coral
      rimGlow: '#2FE8FF',
    },
    motion: {
      flowSpeed: 1.05,
      elasticity: 1.15,
      refractionDepth: 1.1,
    },
    suggestedChamberId: 'celestial-tone',
    completionPhrase: 'That session is yours.',
  },
  'night-signal': {
    id: 'night-signal',
    name: 'Night Signal',
    tagline: 'Soft glass motion, low light, nocturnal atmosphere',
    description:
      'Designed for late-night focus. Ink blue, warm liquid peach-amber, and deep atmospheric violet.',
    colors: {
      baseBg: '#070812', // Midnight ink
      primary: '#FFB08A', // Liquid peach-amber
      secondary: '#8A5CFF', // Ion violet
      tertiary: '#1E293B', // Ink blue
      iridescent: '#FF5D88', // Signal coral
      rimGlow: '#FFB08A',
    },
    motion: {
      flowSpeed: 0.42,
      elasticity: 0.4,
      refractionDepth: 0.85,
    },
    suggestedChamberId: 'rain-chamber',
    completionPhrase: 'Quiet momentum recorded.',
  },
  'electric-quiet': {
    id: 'electric-quiet',
    name: 'Electric Quiet',
    tagline: 'Clean, sharp, minimal kinetic energy',
    description:
      'Designed for coding, studying, and reading. Shadow navy, liquid silver, and controlled acid lime.',
    colors: {
      baseBg: '#0B1326', // Shadow navy
      primary: '#D8FF52', // Controlled acid lime
      secondary: '#2FE8FF', // Electric cyan
      tertiary: '#A3A1BA', // Misty lavender gray / silver
      iridescent: '#F5F6FF', // Soft white
      rimGlow: '#D8FF52',
    },
    motion: {
      flowSpeed: 0.72,
      elasticity: 0.65,
      refractionDepth: 0.9,
    },
    suggestedChamberId: 'forest-echo',
    completionPhrase: 'Clarity achieved.',
  },
  'solar-drift': {
    id: 'solar-drift',
    name: 'Solar Drift',
    tagline: 'Spacious, warm, dreamy movement',
    description:
      'Designed for calm and low-energy work. Liquid peach, warm gold, signal coral, and deep plum.',
    colors: {
      baseBg: '#15112A', // Deep atmospheric violet-plum
      primary: '#FFB08A', // Liquid peach
      secondary: '#FF5D88', // Signal coral
      tertiary: '#8A5CFF', // Ion violet
      iridescent: '#F5F6FF', // Soft white
      rimGlow: '#FF5D88',
    },
    motion: {
      flowSpeed: 0.5,
      elasticity: 0.85,
      refractionDepth: 1.0,
    },
    suggestedChamberId: 'ocean-drift',
    completionPhrase: 'Gentle progress held.',
  },
};

/**
 * Six Curated Smart Soundscape Presets:
 * 1. Rain Chamber – Rain ambience.
 * 2. Ocean Drift – Ocean waves.
 * 3. Forest Echo – Forest ambience.
 * 4. Cosmic Silence – Space-inspired ambience.
 * 5. Ember Glow – Fireplace ambience.
 * 6. Celestial Tone – Soft atmospheric tones.
 */
export const CHAMBERS: ChamberConfig[] = [
  {
    id: 'rain-chamber',
    name: 'Rain Chamber',
    shortDescription: 'Rain ambience',
    spaceType: 'Glass Conservatory',
    description:
      'Rain ambience. Soft architectural rainfall refracting across a dark skylight.',
    primaryHex: '#2FE8FF',
    secondaryHex: '#5B8CFF',
    category: 'focus',
    focusLabel: 'Rain Chamber',
    restoreLabel: 'Gentle Rain',
    materialEffect: 'droplets',
    materialNote: 'Adds crystalline cyan droplet ripples & cool rain refraction',
    waveformBars: [0.48, 0.78, 0.54, 0.88, 0.62, 0.74, 0.5, 0.82, 0.56, 0.44],
  },
  {
    id: 'ocean-drift',
    name: 'Ocean Drift',
    shortDescription: 'Ocean waves',
    spaceType: 'Midnight Shoreline',
    description:
      'Ocean waves. Long-period nocturnal swells rolling gently across deep pelagic waters.',
    primaryHex: '#38F2FF',
    secondaryHex: '#3B68FF',
    category: 'focus',
    focusLabel: 'Ocean Drift',
    restoreLabel: 'Ocean Waves',
    materialEffect: 'tidal-refraction',
    materialNote: 'Adds slow tidal expansion & deep pelagic cyan-cobalt luminescence',
    waveformBars: [0.32, 0.58, 0.88, 0.92, 0.64, 0.36, 0.28, 0.54, 0.82, 0.48],
  },
  {
    id: 'forest-echo',
    name: 'Forest Echo',
    shortDescription: 'Forest ambience',
    spaceType: 'High Canopy',
    description:
      'Forest ambience. High-altitude cedar wind and bioluminescent nocturnal canopy stillness.',
    primaryHex: '#5EF2C4',
    secondaryHex: '#2FE8FF',
    category: 'restore',
    focusLabel: 'Forest Canopy',
    restoreLabel: 'Forest Atmosphere',
    materialEffect: 'canopy-mist',
    materialNote: 'Adds organic emerald-cyan bioluminescent canopy mist',
    waveformBars: [0.42, 0.56, 0.7, 0.54, 0.48, 0.66, 0.74, 0.5, 0.4, 0.34],
  },
  {
    id: 'cosmic-silence',
    name: 'Cosmic Silence',
    shortDescription: 'Space-inspired ambience',
    spaceType: 'Deep Orbital Field',
    description:
      'Space-inspired ambience. Weightless sub-orbital harmonics and deep horizon stillness.',
    primaryHex: '#8A5CFF',
    secondaryHex: '#4E33A8',
    category: 'focus',
    focusLabel: 'Deep Current',
    restoreLabel: 'Celestial Stillness',
    materialEffect: 'orbital-dust',
    materialNote: 'Adds deep ion-violet orbital resonance & weightless stardust',
    waveformBars: [0.9, 0.84, 0.72, 0.6, 0.48, 0.42, 0.36, 0.32, 0.28, 0.24],
  },
  {
    id: 'ember-glow',
    name: 'Ember Glow',
    shortDescription: 'Fireplace ambience',
    spaceType: 'Warm Hearth Sanctuary',
    description:
      'Fireplace ambience. Gentle hearth crackle, warm amber embers, and intimate acoustic glow.',
    primaryHex: '#FFB08A',
    secondaryHex: '#FF5D88',
    category: 'restore',
    focusLabel: 'Ember Hearth',
    restoreLabel: 'Soft Night',
    materialEffect: 'amber-grain',
    materialNote: 'Adds warm amber-coral ember luminescence & hearth warmth',
    waveformBars: [0.44, 0.72, 0.52, 0.84, 0.58, 0.78, 0.48, 0.66, 0.54, 0.4],
  },
  {
    id: 'celestial-tone',
    name: 'Celestial Tone',
    shortDescription: 'Soft atmospheric tones',
    spaceType: 'Harmonic Sanctuary',
    description:
      'Soft atmospheric tones. Slow-breathing glass-resonator fifth intervals and ethereal shimmer.',
    primaryHex: '#FF4FA3',
    secondaryHex: '#8A5CFF',
    category: 'focus',
    focusLabel: 'Electric Quiet',
    restoreLabel: 'Harmonic Calm',
    materialEffect: 'harmonic-rings',
    materialNote: 'Adds concentric interferometric light rings & harmonic bloom',
    waveformBars: [0.7, 0.78, 0.86, 0.8, 0.74, 0.68, 0.64, 0.58, 0.54, 0.5],
  },
];

export interface CategorizedSoundOption {
  id: string;
  category: SoundCategory;
  name: string;
  subtitle: string;
  description: string;
  chamberId: ChamberId;
  primaryHex: string;
  secondaryHex: string;
}

/**
 * Organized Focus & Restore Soundscape Catalog required by Stage 2 Section 7:
 * FOCUS: Deep Current, Ocean Drift, Rain Chamber, Electric Quiet
 * RESTORE: Gentle Rain, Forest Atmosphere, Ocean Waves, Soft Night
 */
export const CATEGORIZED_SOUND_OPTIONS: CategorizedSoundOption[] = [
  // FOCUS Category
  {
    id: 'focus-deep-current',
    category: 'focus',
    name: 'Deep Current',
    subtitle: 'Sub-orbital drone & deep focus current',
    description: 'Sub-orbital drone & deep focus current',
    chamberId: 'cosmic-silence',
    primaryHex: '#8A5CFF',
    secondaryHex: '#4E33A8',
  },
  {
    id: 'focus-ocean-drift',
    category: 'focus',
    name: 'Ocean Drift',
    subtitle: 'Long-period pelagic ocean swells',
    description: 'Long-period pelagic ocean swells',
    chamberId: 'ocean-drift',
    primaryHex: '#38F2FF',
    secondaryHex: '#3B68FF',
  },
  {
    id: 'focus-rain-chamber',
    category: 'focus',
    name: 'Rain Chamber',
    subtitle: 'Architectural rainfall on dark glass',
    description: 'Architectural rainfall on dark glass',
    chamberId: 'rain-chamber',
    primaryHex: '#2FE8FF',
    secondaryHex: '#5B8CFF',
  },
  {
    id: 'focus-electric-quiet',
    category: 'focus',
    name: 'Electric Quiet',
    subtitle: 'Minimal harmonic glass intervals',
    description: 'Minimal harmonic glass intervals',
    chamberId: 'celestial-tone',
    primaryHex: '#D8FF52',
    secondaryHex: '#2FE8FF',
  },
  // RESTORE Category
  {
    id: 'restore-gentle-rain',
    category: 'restore',
    name: 'Gentle Rain',
    subtitle: 'Soft conservatory rain mist',
    description: 'Soft conservatory rain mist',
    chamberId: 'rain-chamber',
    primaryHex: '#2FE8FF',
    secondaryHex: '#5EF2C4',
  },
  {
    id: 'restore-forest-atmosphere',
    category: 'restore',
    name: 'Forest Atmosphere',
    subtitle: 'High-canopy cedar breeze & stillness',
    description: 'High-canopy cedar breeze & stillness',
    chamberId: 'forest-echo',
    primaryHex: '#5EF2C4',
    secondaryHex: '#2FE8FF',
  },
  {
    id: 'restore-ocean-waves',
    category: 'restore',
    name: 'Ocean Waves',
    subtitle: 'Restorative nocturnal shoreline tide',
    description: 'Restorative nocturnal shoreline tide',
    chamberId: 'ocean-drift',
    primaryHex: '#38F2FF',
    secondaryHex: '#8A5CFF',
  },
  {
    id: 'restore-soft-night',
    category: 'restore',
    name: 'Soft Night',
    subtitle: 'Warm hearth & nocturnal serenity',
    description: 'Warm hearth & nocturnal serenity',
    chamberId: 'ember-glow',
    primaryHex: '#FFB08A',
    secondaryHex: '#FF5D88',
  },
];

export const RESTORE_ENVIRONMENTS: RestoreEnvironmentConfig[] = [
  {
    id: 'rain-garden',
    name: 'Rain Garden',
    tagline: 'Crystalline rainfall & botanical stillness',
    soundLabel: 'Gentle Rain',
    description:
      'A quiet conservatory where soft rain settles over translucent leaves and cool cyan water.',
    sceneId: 'night-signal',
    chamberId: 'rain-chamber',
    accentHex: '#2FE8FF',
    primaryHex: '#2FE8FF',
    secondaryHex: '#5EF2C4',
  },
  {
    id: 'ocean-drift',
    name: 'Ocean Drift',
    tagline: 'Slow pelagic swells & horizon breath',
    soundLabel: 'Ocean Waves',
    description:
      'Weightless midnight waters with gentle tidal rhythm for releasing cognitive tension.',
    sceneId: 'deep-current',
    chamberId: 'ocean-drift',
    accentHex: '#38F2FF',
    primaryHex: '#38F2FF',
    secondaryHex: '#8A5CFF',
  },
  {
    id: 'forest-stillness',
    name: 'Forest Stillness',
    tagline: 'High-canopy breeze & bioluminescent calm',
    soundLabel: 'Forest Atmosphere',
    description:
      'Ancient cedar stillness bathed in soft turquoise mist and restorative natural acoustics.',
    sceneId: 'electric-quiet',
    chamberId: 'forest-echo',
    accentHex: '#5EF2C4',
    primaryHex: '#5EF2C4',
    secondaryHex: '#D8FF52',
  },
  {
    id: 'celestial-night',
    name: 'Celestial Night',
    tagline: 'Starlit quietude & warm nocturnal glow',
    soundLabel: 'Soft Night',
    description:
      'Deep nocturnal sanctuary with gentle harmonic resonance and unhurried atmospheric drift.',
    sceneId: 'solar-drift',
    chamberId: 'ember-glow',
    accentHex: '#FFB08A',
    primaryHex: '#FFB08A',
    secondaryHex: '#8A5CFF',
  },
];

export const BREATHING_PRESETS: BreathingPatternConfig[] =
  CURATED_BREATHING_PRESETS;

export const QUIET_MOMENT_PRESETS: QuietMomentConfig[] = [
  {
    id: 'reset-2m',
    name: '2-Minute Reset',
    durationMinutes: 2,
    durationSeconds: 120,
    subtitle: 'Brief visual & acoustic release',
    guidance:
      'Step back from the screen edge, soften your gaze on the organism, and let your shoulders drop.',
    guidanceText:
      'Step back from the screen edge, soften your gaze on the organism, and let your shoulders drop.',
  },
  {
    id: 'calm-5m',
    name: '5-Minute Calm Break',
    durationMinutes: 5,
    durationSeconds: 300,
    subtitle: 'Between-chapter recovery',
    guidance:
      'Allow thoughts from your previous task to settle without rushing into the next block.',
    guidanceText:
      'Allow thoughts from your previous task to settle without rushing into the next block.',
  },
  {
    id: 'pause-10m',
    name: '10-Minute Mindful Pause',
    durationMinutes: 10,
    durationSeconds: 600,
    subtitle: 'Deep restorative sanctuary',
    guidance:
      'Rest in the ambient soundscape and let mental fatigue dissolve at its own pace.',
    guidanceText:
      'Rest in the ambient soundscape and let mental fatigue dissolve at its own pace.',
  },
];

const VALID_CHAMBER_IDS = new Set<ChamberId>(CHAMBERS.map((c) => c.id));

const LEGACY_CHAMBER_MAP: Record<string, ChamberId> = {
  'rain-chamber': 'rain-chamber',
  'ocean-drift': 'ocean-drift',
  'coastal-static': 'ocean-drift',
  'forest-echo': 'forest-echo',
  'forest-2am': 'forest-echo',
  'cosmic-silence': 'cosmic-silence',
  'low-orbit': 'cosmic-silence',
  'brown-noise': 'cosmic-silence',
  'ember-glow': 'ember-glow',
  'vinyl-library': 'ember-glow',
  'afterhours-cafe': 'ember-glow',
  'celestial-tone': 'celestial-tone',
  'soft-drone': 'celestial-tone',
  'deep-quiet': 'cosmic-silence',
};

export const DEFAULT_CHAMBER_ID: ChamberId = 'ocean-drift';

/**
 * Normalizes any persisted or legacy chamber identifier to one of the 6 curated
 * Smart Soundscape Switcher presets (`rain-chamber`, `ocean-drift`, `forest-echo`,
 * `cosmic-silence`, `ember-glow`, `celestial-tone`).
 */
export function normalizeChamberId(rawId?: string | null): ChamberId {
  if (!rawId) return DEFAULT_CHAMBER_ID;
  if (VALID_CHAMBER_IDS.has(rawId as ChamberId)) {
    return rawId as ChamberId;
  }
  return LEGACY_CHAMBER_MAP[rawId] || DEFAULT_CHAMBER_ID;
}

export function getChamberById(id?: string | null): ChamberConfig {
  const normalized = normalizeChamberId(id);
  return CHAMBERS.find((c) => c.id === normalized) || CHAMBERS[1] || CHAMBERS[0];
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dailyGoalMinutes: 180,
  weeklyGoalMinutes: 900,
  dailySessionsGoal: 4,
  breakMinutes: 10,
  ambienceVolume: 0.75,
  secondaryVolume: 0,
  alertVolume: 0.7,
  soundMuted: false,
  selectedChamberId: 'ocean-drift',
  audioReactive: true,
  reducedMotion: false,
  highContrast: false,
  timerTextScale: 'large',
  desktopNotifications: false,
  backgroundMix: 0.52,
  orbDesign: 'celestial-jelly',
  performanceMode: 'auto',
  preferredDurationMinutes: 45,
  preferredSceneId: 'electric-quiet',
  preferredWorkPeriod: 'morning',
  animationIntensity: 'standard',
  gardenProgressionEnabled: true,
  excludeSampleDataInInsights: false,
  aiProcessingConsent: false,
  productAnalyticsConsent: true,
  onboardingCompleted: false,
  syncAccountEmail: null,
  lastCloudSyncAt: null,
};

/**
 * Returns YYYY-MM-DD in local time for the given Date (or now).
 */
export function getLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats seconds into MM:SS or H:MM:SS.
 */
export function formatRemainingTime(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Formats daily minutes into the minimal upper-right signal, e.g., "2h 20m today" or "45m today".
 */
export function formatTodaySignal(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m today`;
  if (m === 0) return `${h}h today`;
  return `${h}h ${m}m today`;
}

/**
 * Formats minutes into a readable duration string, e.g., "2h 20m", "45m", or "0m".
 */
export function formatDurationCompact(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Converts a normalized radial progress (0..1 around top-clockwise circle)
 * into focus duration minutes (15..120) with magnetic snap at 25, 45, 60, 90.
 */
export function radialFractionToMinutes(fraction: number): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  const raw =
    MIN_SCRUB_MINUTES + clamped * (MAX_SCRUB_MINUTES - MIN_SCRUB_MINUTES);

  for (const snap of SNAP_PRESET_MINUTES) {
    if (Math.abs(raw - snap) <= 3.2) {
      return snap;
    }
  }
  return Math.round(raw);
}

/**
 * Converts minutes (15..120) into a normalized radial fraction (0..1).
 */
export function minutesToRadialFraction(minutes: number): number {
  const clamped = Math.max(
    MIN_SCRUB_MINUTES,
    Math.min(MAX_SCRUB_MINUTES, minutes)
  );
  return (
    (clamped - MIN_SCRUB_MINUTES) / (MAX_SCRUB_MINUTES - MIN_SCRUB_MINUTES)
  );
}

/**
 * Calculates session progress as a normalized float between 0 and 1.
 */
export function calculateProgress(
  remainingSeconds: number,
  totalSeconds: number
): number {
  if (totalSeconds <= 0) return 0;
  const elapsed = totalSeconds - remainingSeconds;
  const ratio = elapsed / totalSeconds;
  return Math.max(0, Math.min(1, Number(ratio.toFixed(4))));
}

/**
 * Determines whether the session is in its final near-completion window.
 */
export function isNearCompletion(
  remainingSeconds: number,
  totalSeconds: number
): boolean {
  if (remainingSeconds <= 0 || totalSeconds <= 0) return false;
  const threshold = Math.min(180, Math.max(60, totalSeconds * 0.12));
  return remainingSeconds <= threshold;
}

/**
 * Extends an active or paused timer by `addMinutes`.
 */
export function extendTimer(
  remainingSeconds: number,
  totalSeconds: number,
  addMinutes: number
): { remainingSeconds: number; totalSeconds: number } {
  const delta = Math.max(1, Math.floor(addMinutes)) * 60;
  return {
    remainingSeconds: Math.max(0, remainingSeconds) + delta,
    totalSeconds: Math.max(0, totalSeconds) + delta,
  };
}

/**
 * Creates an accurate SessionRecord that NEVER awards planned time when actual
 * focused time was lower. Discards accidental stops under 15 seconds.
 */
export function createActualSessionRecord(params: {
  id?: string;
  label: string;
  plannedTotalSeconds?: number;
  plannedSeconds?: number;
  remainingSecondsAtEnd?: number;
  remainingSeconds?: number;
  endedEarly: boolean;
  sceneId: FocusSceneId;
  chamberId: ChamberId;
  orbDesign?: OrbDesignId;
  nowDate?: Date;
  now?: Date;
  isoDate?: string;
}): SessionRecord | null {
  const now = params.nowDate || params.now || new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const isoDate = params.isoDate || `${y}-${m}-${d}`;

  const rawPlanned = params.plannedTotalSeconds ?? params.plannedSeconds ?? 2700;
  const rawRemaining =
    params.remainingSecondsAtEnd ?? params.remainingSeconds ?? 0;

  const safePlannedSecs = Math.max(60, Math.round(rawPlanned));
  const safeRemainingSecs = params.endedEarly
    ? Math.max(0, Math.min(safePlannedSecs, Math.round(rawRemaining)))
    : 0;
  const actualFocusedSeconds = Math.max(0, safePlannedSecs - safeRemainingSecs);

  // If ended early with fewer than 15 seconds elapsed, discard accidental click
  if (params.endedEarly && actualFocusedSeconds < 15) {
    return null;
  }

  const plannedMinutes = Math.max(1, Math.round(safePlannedSecs / 60));
  const completionStatus: SessionCompletionStatus =
    params.endedEarly && safeRemainingSecs > 0 ? 'interrupted' : 'completed';

  // Never credit plannedMinutes when actualFocusedSeconds is lower
  const actualMinutes =
    completionStatus === 'completed'
      ? plannedMinutes
      : Math.min(
          plannedMinutes,
          Math.max(1, Math.round(actualFocusedSeconds / 60))
        );

  return {
    id:
      params.id ||
      `session-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    label: params.label.trim() || 'Deep work',
    durationMinutes: actualMinutes,
    plannedMinutes,
    actualMinutes,
    actualFocusedSeconds,
    completionStatus,
    orbDesign: params.orbDesign || 'celestial-jelly',
    isSeed: false,
    completedAt: now.toISOString(),
    isoDate,
    hourOfDay: now.getHours(),
    sceneId: params.sceneId,
    chamberId: normalizeChamberId(params.chamberId),
  };
}

/**
 * Calculates total actual focus minutes for a specific YYYY-MM-DD date.
 */
export function calculateDailyTotal(
  sessions: SessionRecord[],
  isoDate: string
): number {
  return sessions
    .filter((s) => s.isoDate === isoDate)
    .reduce((acc, s) => acc + (s.actualMinutes ?? s.durationMinutes), 0);
}

/**
 * Computes Today's Summary for the REFLECT experience.
 */
export function calculateTodaySummary(
  sessions: SessionRecord[],
  arg2: number | string = 180,
  arg3?: string | number
): {
  actualMinutes: number;
  actualFocusedMinutes: number;
  completedCount: number;
  completedSessionsCount: number;
  interruptedCount: number;
  interruptedSessionsCount: number;
  dailyGoalMinutes: number;
  goalProgressPercent: number;
  dailyGoalProgress: number;
  intentions: string[];
} {
  const now = new Date();
  const defaultIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;

  const dailyGoalMinutes =
    typeof arg2 === 'number'
      ? arg2
      : typeof arg3 === 'number'
      ? arg3
      : 180;
  const todayIsoDate =
    typeof arg2 === 'string'
      ? arg2
      : typeof arg3 === 'string'
      ? arg3
      : defaultIso;

  const todaySessions = sessions.filter((s) => s.isoDate === todayIsoDate);
  let actualFocusedMinutes = 0;
  let completedSessionsCount = 0;
  let interruptedSessionsCount = 0;
  const intentions: string[] = [];

  for (const s of todaySessions) {
    const actual = s.actualMinutes ?? s.durationMinutes;
    const st: SessionCompletionStatus = s.completionStatus || 'completed';
    actualFocusedMinutes += actual;
    if (st === 'completed') completedSessionsCount += 1;
    else interruptedSessionsCount += 1;
    if (s.label && !intentions.includes(s.label)) {
      intentions.push(s.label);
    }
  }

  const safeGoal = Math.max(15, dailyGoalMinutes);
  const dailyGoalProgress = Math.min(1, actualFocusedMinutes / safeGoal);
  const goalProgressPercent = Math.min(
    100,
    Math.round((actualFocusedMinutes / safeGoal) * 100)
  );

  return {
    actualMinutes: actualFocusedMinutes,
    actualFocusedMinutes,
    completedCount: completedSessionsCount,
    completedSessionsCount,
    interruptedCount: interruptedSessionsCount,
    interruptedSessionsCount,
    dailyGoalMinutes: safeGoal,
    goalProgressPercent,
    dailyGoalProgress: Number(dailyGoalProgress.toFixed(4)),
    intentions,
  };
}

/**
 * Calculates current and longest daily focus streaks.
 */
export function calculateStreak(
  sessions: SessionRecord[],
  todayIsoDate: string
): { currentStreak: number; longestStreak: number } {
  const focusDates = Array.from(
    new Set(
      sessions
        .filter((s) => (s.actualMinutes ?? s.durationMinutes) > 0)
        .map((s) => s.isoDate)
    )
  ).sort();

  if (focusDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateToDayNum = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  };

  const dayNums = focusDates.map(dateToDayNum);
  let longest = 1;
  let currentRun = 1;

  for (let i = 1; i < dayNums.length; i++) {
    if (dayNums[i] === dayNums[i - 1] + 1) {
      currentRun += 1;
      if (currentRun > longest) longest = currentRun;
    } else if (dayNums[i] > dayNums[i - 1] + 1) {
      currentRun = 1;
    }
  }

  const todayNum = dateToDayNum(todayIsoDate);
  const lastDayNum = dayNums[dayNums.length - 1];

  if (todayNum - lastDayNum > 1) {
    return { currentStreak: 0, longestStreak: longest };
  }

  let activeRun = 1;
  for (let i = dayNums.length - 1; i > 0; i--) {
    if (dayNums[i] - dayNums[i - 1] === 1) {
      activeRun += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak: activeRun,
    longestStreak: Math.max(longest, activeRun),
  };
}

export interface DailyRhythmCell {
  isoDate: string;
  dateStr: string;
  dayLabel: string;
  minutes: number;
  actualMinutes: number;
  sessionsCount: number;
  completedCount: number;
  interruptedCount: number;
  dominantScene: FocusSceneId;
}

/**
 * Generates a 7-day focus rhythm array ending on `todayIsoDate`.
 */
export function calculateWeeklyRhythm(
  sessions: SessionRecord[],
  todayIsoDate: string
): DailyRhythmCell[] {
  const [y, m, d] = todayIsoDate.split('-').map(Number);
  const baseUtc = Date.UTC(y, m - 1, d);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const result: DailyRhythmCell[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const dt = new Date(baseUtc - offset * 86400000);
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const dayLabel = dayNames[dt.getUTCDay()];

    const daySessions = sessions.filter((s) => s.isoDate === isoDate);
    const minutes = daySessions.reduce(
      (sum, s) => sum + (s.actualMinutes ?? s.durationMinutes),
      0
    );
    const completedCount = daySessions.filter(
      (s) => (s.completionStatus || 'completed') === 'completed'
    ).length;
    const interruptedCount = daySessions.filter(
      (s) => s.completionStatus === 'interrupted'
    ).length;

    const sceneTotals: Partial<Record<FocusSceneId, number>> = {};
    let topScene: FocusSceneId = 'deep-current';
    let topSceneMin = -1;
    for (const s of daySessions) {
      const mVal = s.actualMinutes ?? s.durationMinutes;
      sceneTotals[s.sceneId] = (sceneTotals[s.sceneId] || 0) + mVal;
      if ((sceneTotals[s.sceneId] || 0) > topSceneMin) {
        topSceneMin = sceneTotals[s.sceneId] || 0;
        topScene = s.sceneId;
      }
    }

    result.push({
      isoDate,
      dateStr: isoDate,
      dayLabel,
      minutes,
      actualMinutes: minutes,
      sessionsCount: daySessions.length,
      completedCount,
      interruptedCount,
      dominantScene: topScene,
    });
  }

  return result;
}

/**
 * Computes Weekly Overview for the REFLECT experience.
 */
export function calculateWeeklyOverview(
  sessions: SessionRecord[],
  arg2: number | string = 600,
  arg3?: string | number
): {
  days: DailyRhythmCell[];
  totalActualMinutes: number;
  totalWeeklyMinutes: number;
  totalCompletedSessions: number;
  completedSessionsCount: number;
  interruptedSessionsCount: number;
  weeklyGoalMinutes: number;
  weeklyGoalProgressPercent: number;
  weeklyGoalProgress: number;
  bestDay: { dayLabel: string; isoDate: string; actualMinutes: number; minutes: number } | null;
  bestFocusDay: { dayLabel: string; isoDate: string; actualMinutes: number; minutes: number } | null;
  mostUsedEnvironment: FocusSceneId | null;
} {
  const now = new Date();
  const defaultIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;

  const weeklyGoalMinutes =
    typeof arg2 === 'number'
      ? arg2
      : typeof arg3 === 'number'
      ? arg3
      : 600;
  const todayIsoDate =
    typeof arg2 === 'string'
      ? arg2
      : typeof arg3 === 'string'
      ? arg3
      : defaultIso;

  const days = calculateWeeklyRhythm(sessions, todayIsoDate);
  const weekIsoSet = new Set(days.map((d) => d.isoDate));
  const weekSessions = sessions.filter((s) => weekIsoSet.has(s.isoDate));

  const totalWeeklyMinutes = days.reduce((acc, d) => acc + d.minutes, 0);
  const completedSessionsCount = days.reduce(
    (acc, d) => acc + d.completedCount,
    0
  );
  const interruptedSessionsCount = days.reduce(
    (acc, d) => acc + d.interruptedCount,
    0
  );

  let bestFocusDay: {
    dayLabel: string;
    isoDate: string;
    actualMinutes: number;
    minutes: number;
  } | null = null;
  for (const d of days) {
    if (d.minutes > 0 && (!bestFocusDay || d.minutes > bestFocusDay.minutes)) {
      bestFocusDay = {
        dayLabel: d.dayLabel,
        isoDate: d.isoDate,
        actualMinutes: d.minutes,
        minutes: d.minutes,
      };
    }
  }

  const favs = calculateFavorites(
    weekSessions.length > 0 ? weekSessions : sessions
  );
  const safeWeeklyGoal = Math.max(60, weeklyGoalMinutes);
  const weeklyGoalProgressPercent = Math.min(
    100,
    Math.round((totalWeeklyMinutes / safeWeeklyGoal) * 100)
  );

  return {
    days,
    totalActualMinutes: totalWeeklyMinutes,
    totalWeeklyMinutes,
    totalCompletedSessions: completedSessionsCount,
    completedSessionsCount,
    interruptedSessionsCount,
    weeklyGoalMinutes: safeWeeklyGoal,
    weeklyGoalProgressPercent,
    weeklyGoalProgress: Math.min(
      1,
      Number((totalWeeklyMinutes / safeWeeklyGoal).toFixed(4))
    ),
    bestDay: bestFocusDay,
    bestFocusDay,
    mostUsedEnvironment:
      sessions.length > 0 ? favs.favoriteScene.scene.id : null,
  };
}

/**
 * Calculates Focus by Time of Day (Morning, Afternoon, Evening, Late Night).
 */
export function calculateTimeOfDayRhythm(sessions: SessionRecord[]): Array<{
  id: string;
  label: string;
  window: string;
  minutes: number;
  percentage: number;
  color: string;
}> {
  const buckets = [
    {
      id: 'morning',
      label: 'Morning Clarity',
      window: '05:00 – 11:59',
      minutes: 0,
      color: '#2FE8FF',
    },
    {
      id: 'afternoon',
      label: 'Afternoon Synthesis',
      window: '12:00 – 16:59',
      minutes: 0,
      color: '#FF4FA3',
    },
    {
      id: 'evening',
      label: 'Evening Depth',
      window: '17:00 – 20:59',
      minutes: 0,
      color: '#8A5CFF',
    },
    {
      id: 'night',
      label: 'Late Night Signal',
      window: '21:00 – 04:59',
      minutes: 0,
      color: '#FFB08A',
    },
  ];

  const total = sessions.reduce(
    (acc, s) => acc + (s.actualMinutes ?? s.durationMinutes),
    0
  );

  for (const s of sessions) {
    const h = s.hourOfDay;
    const mins = s.actualMinutes ?? s.durationMinutes;
    if (h >= 5 && h < 12) buckets[0].minutes += mins;
    else if (h >= 12 && h < 17) buckets[1].minutes += mins;
    else if (h >= 17 && h < 21) buckets[2].minutes += mins;
    else buckets[3].minutes += mins;
  }

  return buckets.map((b) => ({
    ...b,
    percentage: total > 0 ? Math.round((b.minutes / total) * 100) : 0,
  }));
}

/**
 * Finds the user's Favorite Focus Scene and Favorite Chamber.
 */
export function calculateFavorites(sessions: SessionRecord[]): {
  favoriteScene: { scene: FocusSceneConfig; minutes: number };
  favoriteChamber: { chamber: ChamberConfig; minutes: number };
} {
  const sceneMinutes: Partial<Record<FocusSceneId, number>> = {};
  const chamberMinutes: Partial<Record<ChamberId, number>> = {};

  for (const s of sessions) {
    const mins = s.actualMinutes ?? s.durationMinutes;
    sceneMinutes[s.sceneId] = (sceneMinutes[s.sceneId] || 0) + mins;
    const normChamber = normalizeChamberId(s.chamberId);
    chamberMinutes[normChamber] = (chamberMinutes[normChamber] || 0) + mins;
  }

  let bestSceneId: FocusSceneId = 'deep-current';
  let maxSceneMin = -1;
  for (const id of Object.keys(FOCUS_SCENES) as FocusSceneId[]) {
    const m = sceneMinutes[id] || 0;
    if (m > maxSceneMin) {
      maxSceneMin = m;
      bestSceneId = id;
    }
  }

  let bestChamberId: ChamberId = 'rain-chamber';
  let maxChamberMin = -1;
  for (const ch of CHAMBERS) {
    const m = chamberMinutes[ch.id] || 0;
    if (m > maxChamberMin) {
      maxChamberMin = m;
      bestChamberId = ch.id;
    }
  }

  return {
    favoriteScene: {
      scene: FOCUS_SCENES[bestSceneId],
      minutes: Math.max(0, maxSceneMin),
    },
    favoriteChamber: {
      chamber: CHAMBERS.find((c) => c.id === bestChamberId) || CHAMBERS[0],
      minutes: Math.max(0, maxChamberMin),
    },
  };
}

/**
 * Computes Personal Focus Patterns for the REFLECT experience.
 * Never fabricates data; returns `hasData: false` when sessions are empty.
 */
export function calculatePersonalFocusPatterns(
  sessions: SessionRecord[],
  todayIsoDate?: string
): {
  hasData: boolean;
  hasEnoughData: boolean;
  frequentLengths: Array<{ minutes: number; durationMinutes: number; count: number }>;
  frequentSessionLengths: Array<{ minutes: number; durationMinutes: number; count: number }>;
  preferredEnvironments: Array<{
    sceneId: FocusSceneId;
    scene: FocusSceneConfig;
    minutes: number;
    sessionsCount: number;
  }>;
  peakTimeOfDay: string;
  timeOfDay: ReturnType<typeof calculateTimeOfDayRhythm>;
  weeklyConsistencyDays: number;
  completionRatePercent: number;
} {
  const now = new Date();
  const iso =
    todayIsoDate ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(now.getDate()).padStart(2, '0')}`;

  const validSessions = sessions.filter(
    (s) => (s.actualMinutes ?? s.durationMinutes) > 0
  );
  if (validSessions.length === 0) {
    return {
      hasData: false,
      hasEnoughData: false,
      frequentLengths: [],
      frequentSessionLengths: [],
      preferredEnvironments: [],
      peakTimeOfDay: 'No sessions recorded yet',
      timeOfDay: calculateTimeOfDayRhythm([]),
      weeklyConsistencyDays: 0,
      completionRatePercent: 0,
    };
  }

  // 1. Frequently used session lengths
  const lengthCounts = new Map<number, number>();
  for (const s of validSessions) {
    const len = s.plannedMinutes ?? s.durationMinutes;
    lengthCounts.set(len, (lengthCounts.get(len) || 0) + 1);
  }
  const frequentSessionLengths = Array.from(lengthCounts.entries())
    .map(([durationMinutes, count]) => ({
      minutes: durationMinutes,
      durationMinutes,
      count,
    }))
    .sort((a, b) => b.count - a.count || b.durationMinutes - a.durationMinutes)
    .slice(0, 4);

  // 2. Preferred environments
  const envMap = new Map<
    FocusSceneId,
    { minutes: number; sessionsCount: number }
  >();
  for (const s of validSessions) {
    const prev = envMap.get(s.sceneId) || { minutes: 0, sessionsCount: 0 };
    prev.minutes += s.actualMinutes ?? s.durationMinutes;
    prev.sessionsCount += 1;
    envMap.set(s.sceneId, prev);
  }
  const preferredEnvironments = Array.from(envMap.entries())
    .map(([sceneId, stats]) => ({
      sceneId,
      scene: FOCUS_SCENES[sceneId] || FOCUS_SCENES['deep-current'],
      minutes: stats.minutes,
      sessionsCount: stats.sessionsCount,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // 3. Time of day
  const tod = calculateTimeOfDayRhythm(validSessions);
  const topTod = [...tod].sort((a, b) => b.minutes - a.minutes)[0];
  const peakTimeOfDay =
    topTod && topTod.minutes > 0
      ? `${topTod.label} (${topTod.window})`
      : 'Balanced across day';

  // 4. Weekly consistency (active days out of last 7 days)
  const weekly = calculateWeeklyRhythm(validSessions, iso);
  const weeklyConsistencyDays = weekly.filter((d) => d.minutes > 0).length;

  // 5. Completion rate
  const completedCount = sessions.filter(
    (s) => (s.completionStatus || 'completed') === 'completed'
  ).length;
  const completionRatePercent =
    sessions.length > 0
      ? Math.round((completedCount / sessions.length) * 100)
      : 0;

  return {
    hasData: true,
    hasEnoughData: true,
    frequentLengths: frequentSessionLengths,
    frequentSessionLengths,
    preferredEnvironments,
    peakTimeOfDay,
    timeOfDay: tod,
    weeklyConsistencyDays,
    completionRatePercent,
  };
}

export interface AuraGardenFloraNode {
  id: string;
  sessionId: string;
  label: string;
  species: OrbDesignId;
  x: number; // normalized 0.12 .. 0.88
  y: number; // normalized 0.22 .. 0.82
  scale: number; // 0.6 .. 1.35
  colorHex: string;
  secondaryHex: string;
  primaryColor: string;
  secondaryColor: string;
  minutes: number;
  isoDate: string;
  completed: boolean;
  isFullBloom: boolean;
}

export interface AuraGardenSpecimen {
  id: string;
  name: string;
  category: 'organism' | 'atmosphere';
  description: string;
  unlocked: boolean;
  sessionsCompleted: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface AuraGardenState {
  stageLevel: 1 | 2 | 3 | 4 | 5;
  growthStageIndex: number;
  stageTitle: string;
  growthStageLabel: string;
  stageDescription: string;
  growthStageDescription: string;
  totalCompletedSessions: number;
  completedSessionsCount: number;
  interruptedSessionsCount: number;
  totalFocusedMinutes: number;
  luminousEnergy: number;
  weeklyGoalReached: boolean;
  activeDaysThisWeek: number;
  floraNodes: AuraGardenFloraNode[];
  specimens: AuraGardenSpecimen[];
}

/**
 * Computes the user's personal MY AURA GARDEN state from genuine session records.
 * Rules:
 * - Completed sessions grant full luminous growth and spawn a full-bloom flora node (`completed: true`).
 * - Interrupted sessions grant only partial light motes (`completed: false`, smaller bud scale).
 * - Reaching weekly goals or consistent activity reveals environmental details without punitive streak loss.
 */
export function computeAuraGardenState(
  sessions: SessionRecord[],
  weeklyGoalMinutes = 900,
  todayIsoDate = '2026-11-12'
): AuraGardenState {
  const completedSessions = sessions.filter(
    (s) =>
      (s.completionStatus || 'completed') === 'completed' &&
      (s.actualMinutes ?? s.durationMinutes) > 0
  );
  const interruptedSessions = sessions.filter(
    (s) => s.completionStatus === 'interrupted'
  );

  const totalFocusedMinutes = sessions.reduce(
    (acc, s) => acc + (s.actualMinutes ?? s.durationMinutes),
    0
  );

  const completedEnergy = completedSessions.reduce(
    (acc, s) => acc + 100 + (s.actualMinutes ?? s.durationMinutes),
    0
  );
  const partialEnergy = interruptedSessions.reduce(
    (acc, s) => acc + Math.round((s.actualMinutes ?? s.durationMinutes) * 0.25),
    0
  );
  const luminousEnergy = completedEnergy + partialEnergy;

  const weekly = calculateWeeklyOverview(
    sessions,
    todayIsoDate,
    weeklyGoalMinutes
  );
  const weeklyGoalReached =
    weekly.totalWeeklyMinutes >= weekly.weeklyGoalMinutes;
  const activeDaysThisWeek = weekly.days.filter((d) => d.minutes > 0).length;

  const count = completedSessions.length;
  let stageLevel: 1 | 2 | 3 | 4 | 5 = 1;
  let stageTitle = 'Still Waters';
  let stageDescription =
    'Your sanctuary rests in calm stillness. Complete your first focus session to awaken bioluminescent life.';

  if (count >= 15) {
    stageLevel = 5;
    stageTitle = 'Luminous Archipelago';
    stageDescription =
      'A thriving ecosystem of bioluminescent flora, pelagic bells, and harmonic light currents nourished by your sustained focus.';
  } else if (count >= 10) {
    stageLevel = 4;
    stageTitle = 'Botanical Reef';
    stageDescription =
      'Multiple living organisms and refracted light streams resonate across the deep sanctuary floor.';
  } else if (count >= 5) {
    stageLevel = 3;
    stageTitle = 'Pelagic Sanctuary';
    stageDescription =
      'Translucent petals and drifting plankton clusters have taken root from your completed focus blocks.';
  } else if (count >= 1) {
    stageLevel = 2;
    stageTitle = 'First Luminescence';
    stageDescription =
      'Gentle filaments of cyan and violet light are unfolding with each completed session.';
  }

  // Generate deterministic flora nodes for up to 18 most recent sessions (completed = full bloom, interrupted = small bud)
  const validSessions = sessions.filter(
    (s) => (s.actualMinutes ?? s.durationMinutes) > 0
  );
  const floraNodes: AuraGardenFloraNode[] = validSessions
    .slice(0, 18)
    .map((s, idx) => {
      const scene = FOCUS_SCENES[s.sceneId] || FOCUS_SCENES['deep-current'];
      const isCompleted = (s.completionStatus || 'completed') === 'completed';
      const goldenAngle = idx * 2.399963229728653;
      const radius = 0.14 + Math.sqrt((idx + 0.5) / 18) * 0.31;
      const x = Number(
        Math.max(
          0.12,
          Math.min(0.88, 0.5 + Math.cos(goldenAngle) * radius)
        ).toFixed(4)
      );
      const y = Number(
        Math.max(
          0.22,
          Math.min(0.82, 0.54 + Math.sin(goldenAngle) * radius * 0.72)
        ).toFixed(4)
      );
      const mins = s.actualMinutes ?? s.durationMinutes;
      const species: OrbDesignId =
        s.orbDesign ||
        (idx % 3 === 1
          ? 'living-bloom'
          : idx % 3 === 2
          ? 'original'
          : 'celestial-jelly');

      return {
        id: `flora-${s.id}`,
        sessionId: s.id,
        label: s.label,
        species,
        x,
        y,
        scale: isCompleted
          ? Number(Math.max(0.72, Math.min(1.32, mins / 55)).toFixed(2))
          : 0.48,
        colorHex: scene.colors.primary,
        secondaryHex: scene.colors.secondary,
        primaryColor: scene.colors.primary,
        secondaryColor: scene.colors.secondary,
        minutes: mins,
        isoDate: s.isoDate,
        completed: isCompleted,
        isFullBloom: isCompleted,
      };
    });

  // Specimen collection based on real completed sessions
  const sceneCounts: Partial<Record<FocusSceneId, number>> = {};
  const orbCounts: Partial<Record<OrbDesignId, number>> = {};
  for (const s of completedSessions) {
    sceneCounts[s.sceneId] = (sceneCounts[s.sceneId] || 0) + 1;
    const orb = s.orbDesign || 'celestial-jelly';
    orbCounts[orb] = (orbCounts[orb] || 0) + 1;
  }

  const specimens: AuraGardenSpecimen[] = [
    {
      id: 'spec-celestial-jelly',
      name: 'Celestial Jelly',
      category: 'organism',
      description:
        'Bioluminescent pelagic medusa with 16-lobe crystalline bell.',
      unlocked: (orbCounts['celestial-jelly'] || 0) > 0 || count >= 1,
      sessionsCompleted: orbCounts['celestial-jelly'] || Math.min(count, 1),
      primaryColor: '#2FE8FF',
      secondaryColor: '#8A5CFF',
    },
    {
      id: 'spec-living-bloom',
      name: 'Living Bloom',
      category: 'organism',
      description:
        '44-petal translucent botanical life form with golden anthers.',
      unlocked: (orbCounts['living-bloom'] || 0) > 0 || count >= 3,
      sessionsCompleted: orbCounts['living-bloom'] || 0,
      primaryColor: '#FF4FA3',
      secondaryColor: '#FFB08A',
    },
    {
      id: 'spec-liquid-lens',
      name: 'Liquid Lens',
      category: 'organism',
      description: 'Refractive optical vessel with internal caustic waves.',
      unlocked: (orbCounts['original'] || 0) > 0 || count >= 5,
      sessionsCompleted: orbCounts['original'] || 0,
      primaryColor: '#38F2FF',
      secondaryColor: '#D8FF52',
    },
    ...Object.values(FOCUS_SCENES).map((sc) => ({
      id: `spec-scene-${sc.id}`,
      name: sc.name,
      category: 'atmosphere' as const,
      description: sc.tagline,
      unlocked: (sceneCounts[sc.id] || 0) > 0,
      sessionsCompleted: sceneCounts[sc.id] || 0,
      primaryColor: sc.colors.primary,
      secondaryColor: sc.colors.secondary,
    })),
  ];

  return {
    stageLevel,
    growthStageIndex: stageLevel - 1,
    stageTitle,
    growthStageLabel: stageTitle,
    stageDescription,
    growthStageDescription: stageDescription,
    totalCompletedSessions: count,
    completedSessionsCount: count,
    interruptedSessionsCount: interruptedSessions.length,
    totalFocusedMinutes,
    luminousEnergy,
    weeklyGoalReached,
    activeDaysThisWeek,
    floraNodes,
    specimens,
  };
}

export type BreathingPhaseName = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

export interface BreathingMomentState {
  phase: BreathingPhaseName;
  label: string;
  instruction: string;
  phaseRemainingSeconds: number;
  phaseProgress: number; // 0..1 within current phase
  expansion: number; // 0..1 normalized expansion factor
  orbScale: number; // 0.58 .. 1.15 smooth expansion/contraction factor
  cycleNumber: number;
}

/**
 * Pure, deterministic breathing guide state calculator for RESTORE -> Breathing Space.
 * Accepts either `(pattern, elapsedSeconds)` or `(elapsedSeconds, pattern)`.
 */
export function calculateBreathingPhaseAtTime(
  arg1:
    | number
    | {
        inhaleSeconds: number;
        holdInSeconds: number;
        exhaleSeconds: number;
        holdOutSeconds: number;
      },
  arg2:
    | number
    | {
        inhaleSeconds: number;
        holdInSeconds: number;
        exhaleSeconds: number;
        holdOutSeconds: number;
      }
): BreathingMomentState {
  const elapsedSeconds = typeof arg1 === 'number' ? arg1 : (arg2 as number);
  const pattern =
    typeof arg1 === 'object'
      ? arg1
      : (arg2 as {
          inhaleSeconds: number;
          holdInSeconds: number;
          exhaleSeconds: number;
          holdOutSeconds: number;
        });

  const inhale = Math.max(1, pattern.inhaleSeconds);
  const holdIn = Math.max(0, pattern.holdInSeconds);
  const exhale = Math.max(1, pattern.exhaleSeconds);
  const holdOut = Math.max(0, pattern.holdOutSeconds);

  const cycleTotal = inhale + holdIn + exhale + holdOut;
  const safeElapsed = Math.max(0, elapsedSeconds);
  const cycleNumber = Math.floor(safeElapsed / cycleTotal) + 1;
  const inCycle = safeElapsed % cycleTotal;

  const minScale = 0.58;
  const maxScale = 1.14;

  if (inCycle < inhale) {
    const p = inCycle / inhale;
    const eased = Number((0.5 - 0.5 * Math.cos(p * Math.PI)).toFixed(4));
    return {
      phase: 'inhale',
      label: 'Inhale Gently',
      instruction: 'Inhale gently',
      phaseRemainingSeconds: Math.max(1, Math.ceil(inhale - inCycle)),
      phaseProgress: Number(p.toFixed(4)),
      expansion: eased,
      orbScale: Number((minScale + (maxScale - minScale) * eased).toFixed(4)),
      cycleNumber,
    };
  }

  if (inCycle < inhale + holdIn) {
    const intoHold = inCycle - inhale;
    const p = holdIn > 0 ? intoHold / holdIn : 1;
    return {
      phase: 'hold-in',
      label: 'Hold Softly',
      instruction: 'Hold softly',
      phaseRemainingSeconds: Math.max(1, Math.ceil(holdIn - intoHold)),
      phaseProgress: Number(p.toFixed(4)),
      expansion: 1,
      orbScale: maxScale,
      cycleNumber,
    };
  }

  if (inCycle < inhale + holdIn + exhale) {
    const intoExhale = inCycle - inhale - holdIn;
    const p = intoExhale / exhale;
    const eased = 0.5 - 0.5 * Math.cos(p * Math.PI);
    const expansion = Number((1 - eased).toFixed(4));
    return {
      phase: 'exhale',
      label: 'Exhale Slowly',
      instruction: 'Exhale slowly',
      phaseRemainingSeconds: Math.max(1, Math.ceil(exhale - intoExhale)),
      phaseProgress: Number(p.toFixed(4)),
      expansion,
      orbScale: Number((maxScale - (maxScale - minScale) * eased).toFixed(4)),
      cycleNumber,
    };
  }

  const intoHoldOut = inCycle - inhale - holdIn - exhale;
  const p = holdOut > 0 ? intoHoldOut / holdOut : 1;
  return {
    phase: 'hold-out',
    label: 'Rest in Stillness',
    instruction: 'Rest in stillness',
    phaseRemainingSeconds: Math.max(1, Math.ceil(holdOut - intoHoldOut)),
    phaseProgress: Number(p.toFixed(4)),
    expansion: 0,
    orbScale: minScale,
    cycleNumber,
  };
}

/**
 * Generates deterministic seed sessions so "2h 20m today" and the Visual Journal
 * are immediately rich and verifiable on first launch. Marks `isSeed: true`
 * so users can inspect or clear sample data at any time.
 */
export function generateSeedSessions(todayIsoDate: string): SessionRecord[] {
  const [y, m, d] = todayIsoDate.split('-').map(Number);
  const baseUtc = Date.UTC(y, m - 1, d);

  const items: Array<{
    daysAgo: number;
    label: string;
    durationMinutes: number;
    sceneId: FocusSceneId;
    chamberId: ChamberId;
    orbDesign: OrbDesignId;
    hour: number;
  }> = [
    {
      daysAgo: 0,
      label: 'Deep work',
      durationMinutes: 90,
      sceneId: 'deep-current',
      chamberId: 'rain-chamber',
      orbDesign: 'celestial-jelly',
      hour: 10,
    },
    {
      daysAgo: 0,
      label: 'Spatial Shader Exploration',
      durationMinutes: 50,
      sceneId: 'chromatic-flow',
      chamberId: 'celestial-tone',
      orbDesign: 'living-bloom',
      hour: 14,
    },
    {
      daysAgo: 1,
      label: 'Core Engine Architecture',
      durationMinutes: 60,
      sceneId: 'electric-quiet',
      chamberId: 'forest-echo',
      orbDesign: 'celestial-jelly',
      hour: 11,
    },
    {
      daysAgo: 1,
      label: 'Late Night Typography Pass',
      durationMinutes: 45,
      sceneId: 'night-signal',
      chamberId: 'rain-chamber',
      orbDesign: 'original',
      hour: 22,
    },
    {
      daysAgo: 2,
      label: 'Product Narrative & Flows',
      durationMinutes: 60,
      sceneId: 'chromatic-flow',
      chamberId: 'ember-glow',
      orbDesign: 'living-bloom',
      hour: 15,
    },
    {
      daysAgo: 2,
      label: 'Protocol Spec Review',
      durationMinutes: 45,
      sceneId: 'deep-current',
      chamberId: 'cosmic-silence',
      orbDesign: 'celestial-jelly',
      hour: 9,
    },
    {
      daysAgo: 3,
      label: 'Refractive Lens Physics',
      durationMinutes: 90,
      sceneId: 'deep-current',
      chamberId: 'cosmic-silence',
      orbDesign: 'original',
      hour: 21,
    },
    {
      daysAgo: 4,
      label: 'Sound Synthesis Calibration',
      durationMinutes: 60,
      sceneId: 'solar-drift',
      chamberId: 'ocean-drift',
      orbDesign: 'living-bloom',
      hour: 16,
    },
    {
      daysAgo: 5,
      label: 'Motion Curves & Springs',
      durationMinutes: 45,
      sceneId: 'electric-quiet',
      chamberId: 'forest-echo',
      orbDesign: 'celestial-jelly',
      hour: 10,
    },
    {
      daysAgo: 6,
      label: 'Sunday Synthesis Journal',
      durationMinutes: 60,
      sceneId: 'solar-drift',
      chamberId: 'ember-glow',
      orbDesign: 'living-bloom',
      hour: 18,
    },
  ];

  return items.map((item, idx) => {
    const dt = new Date(
      baseUtc - item.daysAgo * 86400000 + item.hour * 3600000
    );
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    return {
      id: `seed-${idx + 1}`,
      label: item.label,
      durationMinutes: item.durationMinutes,
      plannedMinutes: item.durationMinutes,
      actualMinutes: item.durationMinutes,
      actualFocusedSeconds: item.durationMinutes * 60,
      completionStatus: 'completed',
      orbDesign: item.orbDesign,
      isSeed: true,
      completedAt: dt.toISOString(),
      isoDate,
      hourOfDay: item.hour,
      sceneId: item.sceneId,
      chamberId: item.chamberId,
    };
  });
}
