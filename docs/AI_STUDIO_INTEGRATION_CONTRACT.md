# AURA TIME — AI STUDIO INTEGRATION CONTRACT (`main` ↔ `ai-studio-2`)

**Branch Ownership:**
- **`main` (AI Studio 1 — Main Branch Foundation & Sanctuary Shell):** Owns `src/App.tsx`, unified sanctuary navigation, existing Focus experience (`Celestial Jelly` & `Living Bloom`), `ControlDock`, shared orchestration, Web Audio engine (`soundEngine`), session persistence (`localStorage` + optional `/api/sync/*` boundary), global styles (`src/index.css`), design tokens, `src/types/aura.ts`, `src/types/integrationContract.ts`, and `package.json`.
- **`ai-studio-2` (AI Studio 2 — Feature Modules Branch):** Owns the new standalone experience modules for **Liquid Lens** (`LiquidLensExperience`, `Breathe`, `Stillness`, `Soundscape`) and **Aura Console** (`AuraConsole`, `MyRhythm`, `Preferences`, `PersonalData`).

---

## 1. Unified Sanctuary Architecture Overview

Aura Time is structured around **one unified immersive sanctuary** with **no separate primary navigation destinations named `Focus`, `Restore`, `Reflect`, or `Profile`**:

1. **Three Primary Organisms (Single Experience Selector in Order):**
   - **`Liquid Lens`** (`orbDesign: 'original'`) — Restorative experience (`Breathe`, `Stillness`, `Soundscape`, contextual tuning, and 3D refractive liquid-glass sculpture).
   - **`Celestial Jelly`** (`orbDesign: 'celestial-jelly'`) — Protected Focus experience (3D pelagic organism, spring-spline tendrils, focus timer, atmospheres, and resonance halo).
   - **`Living Bloom`** (`orbDesign: 'living-bloom'`) — Protected Focus experience (3D botanical flora, veined petals, focus timer, atmospheres, and sound blossom).

2. **One Personal Control Center (`Aura Console`):**
   - Opened via a discreet header entry point (`data-testid="aura-console-trigger"`) or rhythm status pill (`data-testid="aura-console-rhythm-pill"`).
   - Contains three sections:
     - **`My Rhythm`** (`'my-rhythm'`)
     - **`Preferences`** (`'preferences'`)
     - **`Personal Data`** (`'personal-data'`)

3. **Persistent Control Center (`ControlDock`):**
   - Remains consistently accessible at the bottom of the sanctuary stage (`data-testid="aura-control-dock"`).

---

## 2. Canonical Type Imports

All integration contract interfaces are exported from both:
- `src/types/integrationContract.ts`
- `src/types/aura.ts` (re-exported for convenience)

```ts
import type {
  SanctuaryOrganismId,
  SanctuaryExperienceMode,
  AuraConsoleSectionId,
  LiquidLensSubMode,
  SanctuaryOpenPanelState,
  SanctuaryNavigationTarget,
  SanctuaryNavigationCallback,
  SharedAudioControlsContract,
  SharedSanctuaryInteractionContract,
  LiquidLensContextualTuning,
  RestorePreferenceCompatibility,
  LiquidLensBreatheProps,
  LiquidLensStillnessProps,
  LiquidLensSoundscapeProps,
  LiquidLensExperienceProps,
  AuraConsoleMyRhythmProps,
  AuraConsolePreferencesProps,
  AuraConsolePersonalDataProps,
  AuraConsoleProps,
} from '../types/aura';
```

---

## 3. Shared Interaction Contract (`SharedSanctuaryInteractionContract`)

Every AI Studio 2 feature module receives the shared sanctuary state and callbacks via dependency injection (`interaction: SharedSanctuaryInteractionContract`):

```ts
export type SanctuaryOrganismId = 'original' | 'celestial-jelly' | 'living-bloom';
export type SanctuaryExperienceMode = 'restore' | 'focus';
export type AuraConsoleSectionId = 'my-rhythm' | 'preferences' | 'personal-data';
export type LiquidLensSubMode = 'breathe' | 'stillness' | 'soundscape';

export interface SharedAudioControlsContract {
  isPlaying: boolean;
  muted: boolean;
  activeChamberId: ChamberId;
  activeChamber: ChamberConfig;
  ambienceVolume: number; // 0..1
  alertVolume: number; // 0..1
  audioEnergy: number; // 0..1 live energy from soundEngine.getAudioEnergy()
  audioReactive: boolean;
  onTogglePlay: (forcePlaying?: boolean) => void;
  onSelectChamber: (chamberId: ChamberId) => void;
  onPreviewChamber: (chamberId: ChamberId, volumeOverride?: number) => void;
  onChangeAmbienceVolume: (volume: number) => void;
  onChangeAlertVolume: (volume: number) => void;
  onToggleMute: () => void;
  onPlayGentleBell: (volumeOverride?: number) => void;
}

export interface SharedSanctuaryInteractionContract {
  activeOrganism: SanctuaryOrganismId;
  experienceMode: SanctuaryExperienceMode;
  sessionStatus: TimerStatus; // 'idle' | 'running' | 'paused' | 'completed'
  sessionPhase: TimerPhase;   // 'focus' | 'break'
  activeSceneId: FocusSceneId; // 'deep-current' | 'chromatic-flow' | 'night-signal' | 'electric-quiet' | 'solar-drift'
  activeScene: FocusSceneConfig;
  audio: SharedAudioControlsContract;
  openPanel: SanctuaryOpenPanelState;
  isAuraConsoleOpen: boolean;
  activeConsoleSection: AuraConsoleSectionId;
  reducedMotion: boolean;
  onSelectOrganism: (
    organismId: SanctuaryOrganismId,
    options?: { experienceMode?: SanctuaryExperienceMode }
  ) => void;
  onSelectScene: (sceneId: FocusSceneId) => void;
  onOpenAuraConsole: (section?: AuraConsoleSectionId) => void;
  onClosePanel: () => void;
  onNavigate: SanctuaryNavigationCallback;
}
```

---

## 4. Module Contract A: Liquid Lens (`LiquidLensExperience`)

### Expected Exports from AI Studio 2
AI Studio 2 should export the following components (from `src/components/LiquidLensExperience.tsx` or `src/components/liquid-lens/index.ts`):
- `LiquidLensExperience: React.FC<LiquidLensExperienceProps>`
- `Breathe: React.FC<LiquidLensBreatheProps>` (optional sub-module export)
- `Stillness: React.FC<LiquidLensStillnessProps>` (optional sub-module export)
- `Soundscape: React.FC<LiquidLensSoundscapeProps>` (optional sub-module export)

### Interface Definitions

```ts
export interface LiquidLensContextualTuning {
  inhaleSeconds: number;           // 2..10
  holdInSeconds: number;           // 0..10
  exhaleSeconds: number;           // 2..12
  holdOutSeconds: number;          // 0..8
  enableBreathHold: boolean;
  stillnessDurationSeconds: number; // e.g. 120, 300, 600
  environmentId: RestoreEnvironmentId; // 'rain-garden' | 'ocean-drift' | 'forest-stillness' | 'celestial-night'
  ambienceVolume: number;          // 0..1
  reducedMotion: boolean;
}

export interface RestorePreferenceCompatibility {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  restoreSessions: RestoreSessionRecord[];
  onCompleteRestoreSession: (
    record: Omit<RestoreSessionRecord, 'id' | 'completedAt' | 'isoDate'>
  ) => void;
  availableEnvironments: readonly RestoreEnvironmentConfig[];
  availableBreathingPresets: readonly BreathingPresetConfig[];
  availableStillnessPresets: readonly QuietMomentPresetConfig[];
}

export interface LiquidLensBreatheProps {
  activePresetId: BreathingPresetId;
  availablePresets: readonly BreathingPresetConfig[];
  tuning: LiquidLensContextualTuning;
  isRunning: boolean;
  currentPhase: BreathingPhase; // 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
  phaseProgress: number;        // 0..1
  phaseRemainingSeconds: number;
  elapsedSeconds: number;
  completedCycles: number;
  environment: RestoreEnvironmentConfig;
  reducedMotion: boolean;
  onSelectPreset: (presetId: BreathingPresetId) => void;
  onUpdateTuning: (partial: Partial<LiquidLensContextualTuning>) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onCompleteSession: () => void;
}

export interface LiquidLensStillnessProps {
  activePresetId: QuietMomentPresetId; // 'reset-2m' | 'calm-5m' | 'pause-10m' | 'mindful-10m'
  availablePresets: readonly QuietMomentPresetConfig[];
  durationSeconds: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  isRunning: boolean;
  environment: RestoreEnvironmentConfig;
  reducedMotion: boolean;
  onSelectPreset: (presetId: QuietMomentPresetId) => void;
  onChangeDurationSeconds: (seconds: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onCompleteSession: () => void;
}

export interface LiquidLensSoundscapeProps {
  activeEnvironmentId: RestoreEnvironmentId;
  availableEnvironments: readonly RestoreEnvironmentConfig[];
  audio: SharedAudioControlsContract;
  reducedMotion: boolean;
  onSelectEnvironment: (environmentId: RestoreEnvironmentId) => void;
}

export interface LiquidLensExperienceProps {
  interaction: SharedSanctuaryInteractionContract;
  restoreCompatibility: RestorePreferenceCompatibility;
  activeSubMode?: LiquidLensSubMode;
  onSubModeChange?: (subMode: LiquidLensSubMode) => void;
  onReturnToFocusOrganism?: (targetOrganism?: SanctuaryOrganismId) => void;
}
```

### Restore Preference & Preset Compatibility Constants (`src/utils/focusEngine.ts`)
- **Environments (`RESTORE_ENVIRONMENTS`):**
  - `'rain-garden'` → chamber `'rain-chamber'`
  - `'ocean-drift'` → chamber `'ocean-drift'`
  - `'forest-stillness'` → chamber `'forest-echo'`
  - `'celestial-night'` → chamber `'cosmic-silence'`
- **Breathing Presets (`BREATHING_PRESETS`):**
  - `'coherent-5-5'` (`5s` inhale / `5s` exhale)
  - `'deep-rest-4-7-8'` (`4s` inhale / `7s` hold / `8s` exhale)
  - `'box-4-4-4-4'` (`4s` inhale / `4s` hold-in / `4s` exhale / `4s` hold-out)
  - `'wave-6-2-7'` (`6s` inhale / `2s` hold-in / `7s` exhale)
  - `'custom'` (user-defined contextual tuning)
- **Stillness Presets (`QUIET_MOMENT_PRESETS`):**
  - `'reset-2m'` (`120s`)
  - `'calm-5m'` (`300s`)
  - `'pause-10m'` (`600s`)

---

## 5. Module Contract B: Aura Console (`AuraConsole`)

### Expected Exports from AI Studio 2
AI Studio 2 should export the following components (from `src/components/AuraConsole.tsx` or `src/components/aura-console/index.ts`):
- `AuraConsole: React.FC<AuraConsoleProps>`
- `MyRhythm: React.FC<AuraConsoleMyRhythmProps>` (optional sub-module export)
- `Preferences: React.FC<AuraConsolePreferencesProps>` (optional sub-module export)
- `PersonalData: React.FC<AuraConsolePersonalDataProps>` (optional sub-module export)

### Interface Definitions

```ts
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

export interface AuraConsolePreferencesProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  audio: SharedAudioControlsContract;
  onOpenOnboarding?: () => void;
  onOpenLandingPage?: () => void;
}

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

export interface AuraConsoleProps {
  isOpen: boolean;
  activeSection: AuraConsoleSectionId; // 'my-rhythm' | 'preferences' | 'personal-data'
  onSelectSection: (section: AuraConsoleSectionId) => void;
  onClose: () => void;
  interaction: SharedSanctuaryInteractionContract;
  myRhythmProps: AuraConsoleMyRhythmProps;
  preferencesProps: AuraConsolePreferencesProps;
  personalDataProps: AuraConsolePersonalDataProps;
}
```

---

## 6. State Ownership & Persistence Boundaries

`src/App.tsx` owns all top-level persistence keys and passes read/write callbacks to child experiences:

| Domain | `localStorage` Key | Owner |
| --- | --- | --- |
| User Settings & Profile | `aura_living_lens_settings_v3` | `src/App.tsx` (`settings`, `updateSettings`) |
| Focus Session Records | `aura_living_lens_sessions_v2` | `src/App.tsx` (`sessions`, `setSessions`) |
| Restore Session Records | `aura_restore_sessions_v1` | `src/App.tsx` (`restoreSessions`, `handleCompleteRestoreSession`) |
| Focus Routines | `aura_focus_routines_v1` | `src/App.tsx` (`routines`, `handleSaveRoutine`, etc.) |
| Active Timer Recovery State | `aura_living_lens_state_v4` | `src/App.tsx` |
| Selected Soundscape ID | `aura_selected_soundscape_v2` | `src/App.tsx` (`chamberId`, `handleSelectSoundscape`) |

**Strict Boundary Rule for AI Studio 2:**
- Do **not** read or write `localStorage` directly inside `LiquidLensExperience` or `AuraConsole`.
- Always invoke the injected callbacks (`onUpdateSettings`, `onCompleteRestoreSession`, `onSaveRoutine`, `onResetAllData`, etc.).
- Do **not** instantiate a second `SoundSynthesizer`; use `interaction.audio.*` callbacks which delegate to the singleton `soundEngine` owned by `src/App.tsx`.
- Do **not** modify `Celestial Jelly` (`celestial-jelly`) or `Living Bloom` (`living-bloom`) 3D organism shaders, geometry, or focus timer logic in `LivingLens.tsx` / `LiquidLens3DScene.ts`.
