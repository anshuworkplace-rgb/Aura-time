export type FocusSceneId =
  | 'deep-current'
  | 'chromatic-flow'
  | 'night-signal'
  | 'electric-quiet'
  | 'solar-drift';

export type ChamberId =
  | 'rain-chamber'
  | 'low-orbit'
  | 'vinyl-library'
  | 'afterhours-cafe'
  | 'coastal-static'
  | 'forest-2am'
  | 'brown-noise'
  | 'soft-drone'
  | 'deep-quiet';

export type LensMaterialEffect =
  | 'droplets'
  | 'orbital-dust'
  | 'amber-grain'
  | 'warm-murmur'
  | 'tidal-refraction'
  | 'canopy-mist'
  | 'magnetic-velvet'
  | 'harmonic-rings'
  | 'pure-glass';

export interface FocusSceneConfig {
  id: FocusSceneId;
  name: string;
  tagline: string;
  description: string;
  colors: {
    baseBg: string; // Midnight ink / Deep atmospheric violet / Shadow navy
    primary: string;
    secondary: string;
    tertiary: string;
    iridescent: string;
    rimGlow: string;
  };
  motion: {
    flowSpeed: number; // 0.35 to 1.4
    elasticity: number; // 0.3 to 1.3
    refractionDepth: number; // 0.4 to 1.2
  };
  suggestedChamberId: ChamberId;
  completionPhrase: string;
}

export interface ChamberConfig {
  id: ChamberId;
  name: string;
  spaceType: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  materialEffect: LensMaterialEffect;
  materialNote: string;
  waveformBars: number[];
}

export type TimerPhase = 'focus' | 'break';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type FocusImmersionMode = 'standard' | 'deep' | 'minimal';

export type ActiveOverlay =
  | 'none'
  | 'scenes'
  | 'chambers'
  | 'insights'
  | 'calibration';

export interface SessionRecord {
  id: string;
  label: string;
  durationMinutes: number;
  completedAt: string; // ISO string
  isoDate: string; // YYYY-MM-DD
  hourOfDay: number; // 0..23
  sceneId: FocusSceneId;
  chamberId: ChamberId;
}

export interface UserSettings {
  dailyGoalMinutes: number;
  breakMinutes: number;
  ambienceVolume: number;
  secondaryVolume: number;
  alertVolume: number;
  audioReactive: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  timerTextScale: 'default' | 'large' | 'monumental';
  desktopNotifications: boolean;
}
