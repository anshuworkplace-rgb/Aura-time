import {
  ActiveOverlay,
  AnimationIntensity,
  BreathingPatternConfig,
  BreathingPresetId,
  ChamberConfig,
  ChamberId,
  FocusImmersionMode,
  FocusRoutine,
  FocusSceneConfig,
  FocusSceneId,
  OrbDesignId,
  PerformanceMode,
  PreferredWorkPeriod,
  QuietMomentConfig,
  QuietMomentPresetId,
  RestoreEnvironmentConfig,
  RestoreEnvironmentId,
  RestoreModeId,
  RestoreSessionRecord,
  SessionRecord,
  SmartRecommendation,
  TaskBreakdownStep,
  TimerPhase,
  TimerStatus,
  UserSettings,
} from './aura';

export type BreathingPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';
export type BreathingPresetConfig = BreathingPatternConfig;
export type QuietMomentPresetConfig = QuietMomentConfig;

/**
 * ============================================================================
 * AURA TIME — AI STUDIO 1 <-> AI STUDIO 2 INTEGRATION CONTRACT TYPES
 * ============================================================================
 *
 * Canonical TypeScript interfaces shared between the Main Sanctuary Shell
 * (`main` branch, owned by AI Studio 1) and the new feature modules developed
 * on `ai-studio-2` (Liquid Lens Restorative Experience & Aura Console).
 *
 * All external state, persistence, audio synthesis, and navigation callbacks
 * are dependency-injected through these props so Studio 2 modules never need
 * to mutate `src/App.tsx` or read `localStorage` directly.
 */

/**
 * Primary organisms in the unified Aura Time sanctuary (ordered):
 * 1. `'original'`        -> Liquid Lens (Restorative experience)
 * 2. `'celestial-jelly'` -> Celestial Jelly (Focus experience)
 * 3. `'living-bloom'`    -> Living Bloom (Focus experience)
 */
export type SanctuaryOrganismId = OrbDesignId;

/**
 * Active experience mode derived from or coordinated with the active organism:
 * - `'restore'` -> Liquid Lens breathing sanctuary (Breathe)
 * - `'focus'`   -> Celestial Jelly & Living Bloom focus sanctuary (and optional Liquid Lens orb focus stage)
 */
export type SanctuaryExperienceMode = 'restore' | 'focus';

/**
 * Top-level sections inside the unified Aura Console personal control center.
 * Replaces legacy separate `Reflect` and `Profile` primary navigation tabs.
 */
export type AuraConsoleSectionId =
  | 'my-rhythm'
  | 'preferences'
  | 'personal-data';

/**
 * Single restorative sub-experience inside Liquid Lens.
 */
export type LiquidLensSubMode = 'breathe';

/**
 * Unified open panel state across the sanctuary shell and persistent Control Dock.
 */
export type SanctuaryOpenPanelState =
  | ActiveOverlay
  | 'aura-console'
  | 'restore-drawer';

/**
 * Navigation target payload for `SharedSanctuaryInteractionContract.onNavigate`.
 */
export type SanctuaryNavigationTarget =
  | {
      destination: 'organism';
      organismId: SanctuaryOrganismId;
      experienceMode?: SanctuaryExperienceMode;
    }
  | {
      destination: 'aura-console';
      section?: AuraConsoleSectionId;
    }
  | {
      destination: 'overlay';
      overlay: ActiveOverlay;
    }
  | {
      destination: 'close-panels';
    };

export type SanctuaryNavigationCallback = (
  target: SanctuaryNavigationTarget
) => void;

/**
 * ============================================================================
 * C. SHARED INTERACTION CONTRACT
 * ============================================================================
 */

export interface SharedAudioControlsContract {
  /** Whether the procedural Web Audio synthesizer is actively playing */
  isPlaying: boolean;
  /** Whether audio output is globally muted (`settings.soundMuted`) */
  muted: boolean;
  /** Currently selected soundscape chamber identifier */
  activeChamberId: ChamberId;
  /** Resolved configuration object for the active chamber */
  activeChamber: ChamberConfig;
  /** Master ambience gain in range `[0, 1]` */
  ambienceVolume: number;
  /** Chime / completion alert gain in range `[0, 1]` */
  alertVolume: number;
  /** Real-time normalized audio energy `[0, 1]` from `soundEngine.getAudioEnergy()` */
  audioEnergy: number;
  /** Whether 3D organisms react to live audio energy (`settings.audioReactive`) */
  audioReactive: boolean;
  /** Toggle ambient soundscape playback on/off */
  onTogglePlay: (forcePlaying?: boolean) => void;
  /** Select and persist a primary soundscape chamber */
  onSelectChamber: (chamberId: ChamberId) => void;
  /** Trigger a short non-destructive audio preview of a chamber */
  onPreviewChamber: (chamberId: ChamberId, volumeOverride?: number) => void;
  /** Update master ambience volume `[0, 1]` */
  onChangeAmbienceVolume: (volume: number) => void;
  /** Update completion chime volume `[0, 1]` */
  onChangeAlertVolume: (volume: number) => void;
  /** Toggle global mute state */
  onToggleMute: () => void;
  /** Play a gentle transition or completion chime */
  onPlayGentleBell: (volumeOverride?: number) => void;
}

export interface SharedSanctuaryInteractionContract {
  /** Currently active organism (`'original'` | `'celestial-jelly'` | `'living-bloom'`) */
  activeOrganism: SanctuaryOrganismId;
  /** Current sanctuary mode (`'restore'` | `'focus'`) */
  experienceMode: SanctuaryExperienceMode;
  /** Current timer / session status (`'idle'` | `'running'` | `'paused'` | `'completed'`) */
  sessionStatus: TimerStatus;
  /** Current timer phase (`'focus'` | `'break'`) */
  sessionPhase: TimerPhase;
  /** Active atmospheric color theme ID */
  activeSceneId: FocusSceneId;
  /** Resolved atmospheric color theme configuration */
  activeScene: FocusSceneConfig;
  /** Shared Web Audio synthesizer controls and reactive telemetry */
  audio: SharedAudioControlsContract;
  /** Currently open modal/drawer/console state (`'none'` when stage is unobstructed) */
  openPanel: SanctuaryOpenPanelState;
  /** Whether Aura Console is currently open */
  isAuraConsoleOpen: boolean;
  /** Active section inside Aura Console */
  activeConsoleSection: AuraConsoleSectionId;
  /** Accessibility reduced-motion flag (`settings.reducedMotion`) */
  reducedMotion: boolean;
  /** Select one of the 3 primary organisms */
  onSelectOrganism: (
    organismId: SanctuaryOrganismId,
    options?: { experienceMode?: SanctuaryExperienceMode }
  ) => void;
  /** Select one of the 5 atmospheric color themes */
  onSelectScene: (sceneId: FocusSceneId) => void;
  /** Open Aura Console to a specific section (`'my-rhythm'` | `'preferences'` | `'personal-data'`) */
  onOpenAuraConsole: (section?: AuraConsoleSectionId) => void;
  /** Close Aura Console or any active overlay panel */
  onClosePanel: () => void;
  /** Unified navigation callback for cross-module routing */
  onNavigate: SanctuaryNavigationCallback;
}

/**
 * ============================================================================
 * A. LIQUID LENS RESTORATIVE EXPERIENCE CONTRACT
 * ============================================================================
 */

/**
 * Contextual tuning parameters for Liquid Lens restorative sessions.
 */
export interface LiquidLensContextualTuning {
  /** Custom or preset inhale duration in seconds (2–10s) */
  inhaleSeconds: number;
  /** Custom or preset top breath-hold duration in seconds (0–10s) */
  holdInSeconds: number;
  /** Custom or preset exhale duration in seconds (2–12s) */
  exhaleSeconds: number;
  /** Custom or preset bottom breath-hold duration in seconds (0–8s) */
  holdOutSeconds: number;
  /** Whether breath-hold phases (`hold-in`, `hold-out`) are enabled */
  enableBreathHold: boolean;
  /** Target duration in seconds for Stillness / Quiet Moment sessions */
  stillnessDurationSeconds: number;
  /** Active restorative environment palette and chamber mapping */
  environmentId: RestoreEnvironmentId;
  /** Ambient soundscape volume `[0, 1]` */
  ambienceVolume: number;
  /** Accessibility reduced-motion flag */
  reducedMotion: boolean;
}

/**
 * Full backward- and forward-compatibility contract with existing Restore
 * preferences, presets, environments, and session records.
 */
export interface RestorePreferenceCompatibility {
  /** Persisted user settings (`settings.defaultRestoreMode`, `settings.defaultBreathingPresetId`, etc.) */
  settings: UserSettings;
  /** Partial updater for `UserSettings` (persists to `aura_living_lens_settings_v3`) */
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  /** Completed restorative sessions (`aura_restore_sessions_v1`) */
  restoreSessions: RestoreSessionRecord[];
  /** Callback invoked when a Breathe session finishes */
  onCompleteRestoreSession: (
    record: Omit<RestoreSessionRecord, 'id' | 'completedAt' | 'isoDate'>
  ) => void;
  /** Available restorative environments (`RESTORE_ENVIRONMENTS`) */
  availableEnvironments: readonly RestoreEnvironmentConfig[];
  /** Available breathing cadence presets (`BREATHING_PRESETS`) */
  availableBreathingPresets: readonly BreathingPresetConfig[];
  /** Optional legacy stillness presets kept unused for external type compatibility */
  availableStillnessPresets?: readonly QuietMomentPresetConfig[];
}

/**
 * Sub-component contract: `Breathe` (Three-purpose guided breathing inside Liquid Lens).
 */
export interface LiquidLensBreatheProps {
  activePresetId: BreathingPresetId;
  activePreset: BreathingPresetConfig;
  availablePresets: readonly BreathingPresetConfig[];
  durationSeconds: number;
  availableDurations: readonly number[];
  isRunning: boolean;
  currentPhase: BreathingPhase;
  phaseRemainingSeconds: number;
  elapsedSeconds: number;
  completedCycles: number;
  accentHex: string;
  secondaryHex: string;
  reducedMotion: boolean;
  onSelectPreset: (presetId: BreathingPresetId) => void;
  onSelectDurationSeconds: (seconds: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onCompleteSession: () => void;
}

/**
 * Primary module contract: `LiquidLensExperience`.
 */
export interface LiquidLensExperienceProps {
  /** Shared sanctuary state, organism switcher, and audio contract */
  interaction: SharedSanctuaryInteractionContract;
  /** Restore preference & session history compatibility layer */
  restoreCompatibility: RestorePreferenceCompatibility;
  /** Optional callback to return to a Focus organism (`'celestial-jelly'` or `'living-bloom'`) */
  onReturnToFocusOrganism?: (targetOrganism?: SanctuaryOrganismId) => void;
}

/**
 * ============================================================================
 * B. AURA CONSOLE PERSONAL CONTROL CENTER CONTRACT
 * ============================================================================
 */

/**
 * Sub-component contract: `MyRhythm` (Personal rhythm, analytics, Aura Intelligence,
 * My Aura Garden, routines, and focus planner).
 */
export interface AuraConsoleMyRhythmProps {
  sessions: SessionRecord[];
  restoreSessions: RestoreSessionRecord[];
  routines: FocusRoutine[];
  settings: UserSettings;
  scene: FocusSceneConfig;
  currentDurationMinutes: number;
  currentSceneId: FocusSceneId;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onApplyRecommendation: (recommendation: SmartRecommendation) => void;
  onApplyRoutine: (routine: FocusRoutine) => void;
  onSaveRoutine: (routine: FocusRoutine) => void;
  onDuplicateRoutine: (routine: FocusRoutine) => void;
  onDeleteRoutine: (routineId: string) => void;
  onApplyTaskStep: (step: TaskBreakdownStep) => void;
  onClearSeedSessions: () => void;
  onRestoreSeedSessions: () => void;
  onReturnToSanctuary: () => void;
}

/**
 * Sub-component contract: `Preferences` (Personal Focus Profile, Soundscape & Audio,
 * Organism & Visual Engine, and Focus Goal Targets).
 */
export interface AuraConsolePreferencesProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  audio: SharedAudioControlsContract;
  onOpenOnboarding?: () => void;
  onOpenLandingPage?: () => void;
}

/**
 * Sub-component contract: `PersonalData` (Optional Cloud Sync boundary, DPDP consent
 * toggles, local product health metrics, JSON export, and data reset).
 */
export interface AuraConsolePersonalDataProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  sessions: SessionRecord[];
  restoreSessions: RestoreSessionRecord[];
  routines: FocusRoutine[];
  onSyncSessionsAndRoutines: (
    nextSessions: SessionRecord[],
    nextRestore: RestoreSessionRecord[],
    nextRoutines: FocusRoutine[]
  ) => void;
  onClearSeedSessions: () => void;
  onRestoreSeedSessions: () => void;
  onResetAllData: () => void;
}

/**
 * Primary module contract: `AuraConsole` (Developed by AI Studio 2).
 */
export interface AuraConsoleProps {
  /** Whether the Aura Console drawer/modal/view is open */
  isOpen: boolean;
  /** Currently active section (`'my-rhythm'` | `'preferences'` | `'personal-data'`) */
  activeSection: AuraConsoleSectionId;
  /** Switch between `My Rhythm`, `Preferences`, and `Personal Data` */
  onSelectSection: (section: AuraConsoleSectionId) => void;
  /** Close Aura Console and return to the active organism stage */
  onClose: () => void;
  /** Shared sanctuary interaction contract */
  interaction: SharedSanctuaryInteractionContract;
  /** Props for `MyRhythm` section */
  myRhythmProps: AuraConsoleMyRhythmProps;
  /** Props for `Preferences` section */
  preferencesProps: AuraConsolePreferencesProps;
  /** Props for `PersonalData` section */
  personalDataProps: AuraConsolePersonalDataProps;
}

export type {
  AnimationIntensity,
  PerformanceMode,
  PreferredWorkPeriod,
  FocusImmersionMode,
};
