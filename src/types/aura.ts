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

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';
export type TimerPhase = 'focus' | 'break';

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
  durationMinutes: number;
  completedAt: string; // ISO timestamp
  isoDate: string; // YYYY-MM-DD
  hourOfDay: number; // 0..23
  sceneId: FocusSceneId;
  chamberId: ChamberId;
}

export interface UserSettings {
  dailyGoalMinutes: number;
  breakMinutes: number;
  ambienceVolume: number; // 0..1
  secondaryVolume: number; // 0..1
  alertVolume: number; // 0..1
  audioReactive: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  timerTextScale: 'default' | 'large' | 'monumental';
  desktopNotifications: boolean;
  /** 0 = Pure GPU Fluid Dynamics, 0.5 = Balanced Synthesis, 1 = Pure Quantum Nebula Atmosphere */
  backgroundMix: number;
  /** Selected central Living ORB organism design (3 total: original, celestial-jelly, living-bloom) */
  orbDesign: OrbDesignId;
}
