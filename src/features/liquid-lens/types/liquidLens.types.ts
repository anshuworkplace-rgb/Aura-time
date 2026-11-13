import type {
  ChamberId,
  FocusSceneId,
  RestoreEnvironmentId,
  RestoreModeId,
  RestoreSessionRecord,
  UserSettings,
} from '../../../types/aura';

/**
 * The three unified experiences inside the continuous Liquid Lens restorative environment.
 */
export type LiquidLensMode = 'breathe' | 'stillness' | 'soundscape';

/**
 * Active session lifecycle status for Breathe and Stillness sessions.
 */
export type LiquidLensSessionStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed';

/**
 * Four physiological phases of a synchronized breathing cycle, plus 'idle'.
 */
export type LiquidLensBreathingPhase =
  | 'idle'
  | 'inhale'
  | 'hold'
  | 'exhale'
  | 'pause';

/**
 * Curated breathing cadence preset identifiers.
 */
export type LiquidLensBreathingPresetId =
  | 'coherent-calm'
  | 'deep-rest'
  | 'equilibrium-box'
  | 'unhurried-wave'
  | 'custom';

export interface LiquidLensBreathingCadence {
  id: LiquidLensBreathingPresetId;
  name: string;
  subtitle: string;
  description: string;
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  pauseSeconds: number;
  defaultSessionMinutes: number;
}

export interface LiquidLensCustomCadenceInput {
  inhaleSeconds: number;
  holdSeconds: number;
  exhaleSeconds: number;
  pauseSeconds: number;
}

/**
 * Real-time synchronized breathing state derived directly from the session clock.
 */
export interface SynchronizedBreathingSnapshot {
  phase: LiquidLensBreathingPhase;
  phaseLabel: string;
  instruction: string;
  /** 0..1 progress within the current phase */
  phaseProgress: number;
  /** Whole seconds remaining in the current phase (ceil) */
  phaseRemainingSeconds: number;
  /** Total duration of one full breathing cycle in seconds */
  cycleDurationSeconds: number;
  /** Number of full breathing cycles completed in this session */
  completedCycles: number;
  /**
   * 0..1 organic expansion factor:
   * - Inhale: smoothly rises 0 -> 1
   * - Hold: stabilizes at 1
   * - Exhale: smoothly contracts 1 -> 0
   * - Pause: settles at 0
   */
  expansion: number;
  /** 0..1 controlled luminous intensity of the Liquid Lens core */
  luminousIntensity: number;
  /** 0..1 geometric stability (1.0 during Hold and Pause, dynamic during Inhale/Exhale) */
  geometryStability: number;
  /** 0..1 surface ripple modulation */
  rippleAmplitude: number;
}

export type StillnessVisualIntensity = 'subtle' | 'balanced' | 'deep-calm';

export interface StillnessPresetConfig {
  id: string;
  label: string;
  durationMinutes: number;
  subtitle: string;
  guidance: string;
}

export interface StillnessSettlingSnapshot {
  /** 0..1 overall session progress */
  sessionProgress: number;
  /** 0..1 how settled/calm the Liquid Lens geometry has become */
  settlingFactor: number;
  /** Effective motion multiplier after applying visualIntensity & settling */
  motionScale: number;
  /** Effective luminous glow multiplier */
  luminousScale: number;
  /** Calm status label for minimal UI feedback */
  calmStateLabel: string;
}

export interface LiquidLensSoundscapeEnvironment {
  id: RestoreEnvironmentId;
  name: string;
  tagline: string;
  soundLabel: string;
  description: string;
  sceneId: FocusSceneId;
  chamberId: ChamberId;
  primaryHex: string;
  secondaryHex: string;
  harmonicLayerLabel: string;
}

/**
 * Optional dependency-injected audio adapter so Main can wire any audio engine
 * without duplicating audio synthesis.
 */
export interface LiquidLensAudioAdapter {
  isPlaying: boolean;
  isMuted: boolean;
  ambienceVolume: number; // 0..1
  harmonicVolume?: number; // 0..1
  activeChamberId: ChamberId;
  onTogglePlay: (playing: boolean) => void;
  onToggleMute?: (muted: boolean) => void;
  onChangeAmbienceVolume: (volume01: number) => void;
  onChangeHarmonicVolume?: (volume01: number) => void;
  onSelectChamber: (chamberId: ChamberId, sceneId?: FocusSceneId) => void;
  onPreviewChamber?: (chamberId: ChamberId, volume01?: number) => void;
  onPlayCompletionChime?: (volume01?: number) => void;
}

export interface LiquidLensCompletedSessionPayload {
  id: string;
  mode: 'breathe' | 'stillness';
  legacyMode: RestoreModeId;
  presetName: string;
  environmentId: RestoreEnvironmentId;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  completedNaturally: boolean;
  completedAt: string;
  isoDate: string;
}

export interface LiquidLensExperienceProps {
  /** Initial active mode within the Liquid Lens environment (defaults to 'breathe') */
  initialMode?: LiquidLensMode;
  /** Optional user settings from Main */
  settings?: Partial<UserSettings>;
  /** Callback when Liquid Lens updates a user setting (e.g., volume, mute, reducedMotion) */
  onUpdateSettings?: (partial: Partial<UserSettings>) => void;
  /** Optional injected audio adapter; falls back to existing soundEngine if omitted */
  audioAdapter?: LiquidLensAudioAdapter;
  /** Callback fired when a Breathe or Stillness session finishes (>= 10s elapsed) */
  onSessionComplete?: (session: LiquidLensCompletedSessionPayload) => void;
  /** Compatible callback matching existing RestoreExperience signature */
  onRecordRestoreSession?: (record: RestoreSessionRecord) => void;
  /** Optional callback to return to a Focus organism (Celestial Jelly / Living Bloom) */
  onReturnToFocus?: () => void;
  /** Optional callback to open Aura Console from within Liquid Lens */
  onOpenAuraConsole?: (
    destination?: 'my-rhythm' | 'preferences' | 'personal-data'
  ) => void;
  /** Optional count of restorative sessions taken today/total */
  restoreSessionsCount?: number;
  /** Optional className for outer container */
  className?: string;
}
