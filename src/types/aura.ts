export type FocusSceneId =
  | 'deep-current'
  | 'chromatic-flow'
  | 'night-signal'
  | 'electric-quiet'
  | 'solar-drift';

export type ChamberId =
  | 'rain-chamber'
  | 'ocean-drift'
  | 'forest-echo'
  | 'cosmic-silence'
  | 'ember-glow'
  | 'celestial-tone';

export type LegacyChamberId =
  | ChamberId
  | 'low-orbit'
  | 'vinyl-library'
  | 'afterhours-cafe'
  | 'coastal-static'
  | 'forest-2am'
  | 'brown-noise'
  | 'soft-drone'
  | 'deep-quiet';

export type OrbDesignId = 'original' | 'celestial-jelly' | 'living-bloom';

export type NavigationTab = 'focus' | 'restore' | 'reflect' | 'profile';

export type SoundCategory = 'focus' | 'restore';

export type RestoreModeId = 'breathing' | 'quiet-moment';

export type RestoreEnvironmentId =
  | 'rain-garden'
  | 'ocean-drift'
  | 'forest-stillness'
  | 'celestial-night';

export type BreathingPresetId =
  | 'coherent-calm'
  | 'deep-rest'
  | 'box-breath'
  | 'simple-flow'
  | 'custom';

export type QuietMomentPresetId = 'reset-2m' | 'calm-5m' | 'pause-10m';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TimerPhase = 'focus' | 'break';

export type SessionCompletionStatus = 'completed' | 'interrupted';

export type ActiveOverlay =
  | 'none'
  | 'scenes'
  | 'chambers'
  | 'insights'
  | 'calibration';

export type FocusImmersionMode = 'standard' | 'deep' | 'minimal';

export interface FocusSceneConfig {
  id: FocusSceneId;
  name: string;
  tagline: string;
  description: string;
  colors: {
    baseBg: string;
    primary: string;
    secondary: string;
    tertiary: string;
    iridescent: string;
    rimGlow: string;
  };
  motion: {
    flowSpeed: number;
    elasticity: number;
    refractionDepth: number;
  };
  suggestedChamberId: ChamberId;
  completionPhrase: string;
}

export interface ChamberConfig {
  id: ChamberId;
  name: string;
  /** Short, clean subtitle displayed in the Smart Soundscape Switcher */
  shortDescription: string;
  spaceType: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  category?: SoundCategory;
  restoreLabel?: string;
  focusLabel?: string;
  materialEffect:
    | 'droplets'
    | 'tidal-refraction'
    | 'canopy-mist'
    | 'orbital-dust'
    | 'amber-grain'
    | 'harmonic-rings';
  materialNote: string;
  waveformBars: number[];
}

export interface SessionRecord {
  id: string;
  label: string;
  /** Actual focused duration in minutes credited toward daily and weekly totals */
  durationMinutes: number;
  /** Planned target duration in minutes when the session began */
  plannedMinutes?: number;
  /** Explicit actual focused duration in minutes */
  actualMinutes?: number;
  /** Measured elapsed focused time in seconds */
  actualFocusedSeconds?: number;
  /** Whether the session reached natural completion or was ended early */
  completionStatus?: SessionCompletionStatus;
  /** Selected organism during the session */
  orbDesign?: OrbDesignId;
  /** Marks initial deterministic demo records so users can distinguish or clear them */
  isSeed?: boolean;
  completedAt: string; // ISO timestamp
  isoDate: string; // YYYY-MM-DD
  hourOfDay: number; // 0..23
  sceneId: FocusSceneId;
  chamberId: ChamberId;
}

export interface RestoreSessionRecord {
  id: string;
  mode: RestoreModeId;
  title: string;
  elapsedSeconds: number;
  environmentId: RestoreEnvironmentId;
  completedAt: string; // ISO timestamp
  isoDate: string; // YYYY-MM-DD
}

export interface BreathingPatternConfig {
  id: BreathingPresetId;
  name: string;
  subtitle: string;
  description: string;
  inhaleSeconds: number;
  holdInSeconds: number;
  exhaleSeconds: number;
  holdOutSeconds: number;
}

export interface QuietMomentConfig {
  id: QuietMomentPresetId;
  name: string;
  durationMinutes: number;
  subtitle: string;
  guidance: string;
}

export interface RestoreEnvironmentConfig {
  id: RestoreEnvironmentId;
  name: string;
  tagline: string;
  description: string;
  sceneId: FocusSceneId;
  chamberId: ChamberId;
  primaryHex: string;
  secondaryHex: string;
}

export type PerformanceMode = 'auto' | 'balanced' | 'ultra';
export type PerformanceProfileTier = 'ultra' | 'balanced';

export interface UserSettings {
  dailyGoalMinutes: number;
  weeklyGoalMinutes?: number;
  dailySessionsGoal?: number;
  breakMinutes: number;
  ambienceVolume: number; // 0..1
  secondaryVolume: number; // 0..1
  alertVolume: number; // 0..1
  soundMuted?: boolean;
  audioReactive: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  timerTextScale: 'default' | 'large' | 'monumental';
  desktopNotifications: boolean;
  /** 0 = Pure GPU Fluid Dynamics, 0.5 = Balanced Synthesis, 1 = Pure Quantum Nebula Atmosphere */
  backgroundMix: number;
  /** Selected central Living ORB organism design (3 total: original, celestial-jelly, living-bloom) */
  orbDesign: OrbDesignId;
  /** Intelligent Mobile Performance Engine mode: 'auto' (default), 'balanced', or 'ultra' */
  performanceMode?: PerformanceMode;
}
