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
  | 'coherent-5-5'
  | 'deep-rest-4-7-8'
  | 'box-4-4-4-4'
  | 'wave-6-2-7'
  | 'coherent-calm'
  | 'deep-rest'
  | 'box-breath'
  | 'simple-flow'
  | 'custom';

export type QuietMomentPresetId =
  | 'reset-2m'
  | 'calm-5m'
  | 'pause-10m'
  | 'mindful-10m';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TimerPhase = 'focus' | 'break';

export type SessionCompletionStatus = 'completed' | 'interrupted';

export type ActiveOverlay =
  | 'none'
  | 'scenes'
  | 'chambers'
  | 'insights'
  | 'calibration'
  | 'landing'
  | 'onboarding';

export type FocusImmersionMode = 'standard' | 'balanced' | 'deep' | 'minimal';

export type PreferredWorkPeriod =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'flexible';

export type AnimationIntensity = 'calm' | 'standard' | 'vivid';

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
  presetName?: string;
  title?: string;
  durationSeconds?: number;
  elapsedSeconds?: number;
  environmentId: RestoreEnvironmentId;
  completedAt: string; // ISO timestamp
  isoDate?: string; // YYYY-MM-DD
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
  recommendedDurationSeconds: number;
}

export interface QuietMomentConfig {
  id: QuietMomentPresetId;
  name: string;
  durationMinutes: number;
  durationSeconds: number;
  subtitle: string;
  guidance: string;
  guidanceText: string;
}

export interface RestoreEnvironmentConfig {
  id: RestoreEnvironmentId;
  name: string;
  tagline: string;
  soundLabel: string;
  description: string;
  sceneId: FocusSceneId;
  chamberId: ChamberId;
  accentHex: string;
  primaryHex: string;
  secondaryHex: string;
}

export interface FocusRoutine {
  id: string;
  name: string;
  description: string;
  focusDurationMinutes: number;
  sceneId: FocusSceneId;
  chamberId: ChamberId;
  orbDesign?: OrbDesignId;
  breakDurationMinutes: number;
  targetSessionsCount: number;
  isCustom?: boolean;
}

export interface SmartRecommendation {
  id: string;
  category: 'duration' | 'environment' | 'break' | 'momentum';
  title: string;
  explanation: string;
  actionLabel: string;
  confidenceNote: string;
  applyPayload: {
    durationMinutes?: number;
    sceneId?: FocusSceneId;
    chamberId?: ChamberId;
    openRestore?: boolean;
  };
}

export interface TaskBreakdownStep {
  stepNumber: number;
  title: string;
  durationMinutes: number;
  recommendedSceneId: FocusSceneId;
  recommendedChamberId: ChamberId;
  rationale: string;
}

export interface AuraGardenAchievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progressText: string;
  rewardEffect: string;
}

export interface MonthlyWeekBucket {
  weekLabel: string;
  startDateIso: string;
  endDateIso: string;
  actualMinutes: number;
  completedSessions: number;
  interruptedSessions: number;
}

export interface MonthlyAnalyticsSummary {
  totalActualMinutes: number;
  completedSessionsCount: number;
  interruptedSessionsCount: number;
  activeDaysCount: number;
  monthlyGoalMinutes: number;
  monthlyGoalProgressRatio: number;
  previousPeriodActualMinutes: number;
  periodDeltaPercent: number | null;
  weeklyTrends: MonthlyWeekBucket[];
  mostUsedSceneId: FocusSceneId | null;
  mostUsedChamberId: ChamberId | null;
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
  selectedChamberId?: ChamberId;
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
  /** Stage 3: Personal Focus Profile & Privacy Preferences */
  preferredDurationMinutes?: number;
  preferredSceneId?: FocusSceneId;
  preferredWorkPeriod?: PreferredWorkPeriod;
  animationIntensity?: AnimationIntensity;
  gardenProgressionEnabled?: boolean;
  excludeSampleDataInInsights?: boolean;
  aiProcessingConsent?: boolean;
  productAnalyticsConsent?: boolean;
  onboardingCompleted?: boolean;
  syncAccountEmail?: string | null;
  lastCloudSyncAt?: string | null;
  /** Optional Liquid Lens / Restore default preferences */
  defaultRestoreMode?: RestoreModeId;
  defaultRestoreEnvironmentId?: RestoreEnvironmentId;
  defaultBreathingPresetId?: BreathingPresetId;
  defaultQuietMomentPresetId?: QuietMomentPresetId;
}

export * from './integrationContract';


