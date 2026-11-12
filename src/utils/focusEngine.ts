import {
  ChamberConfig,
  ChamberId,
  FocusSceneConfig,
  FocusSceneId,
  SessionRecord,
  UserSettings,
} from '../types/aura';

export const SNAP_PRESET_MINUTES = [25, 45, 60, 90] as const;
export const MIN_SCRUB_MINUTES = 15;
export const MAX_SCRUB_MINUTES = 120;

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
    materialEffect: 'harmonic-rings',
    materialNote: 'Adds concentric interferometric light rings & harmonic bloom',
    waveformBars: [0.7, 0.78, 0.86, 0.8, 0.74, 0.68, 0.64, 0.58, 0.54, 0.5],
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

/**
 * Normalizes any persisted or legacy chamber identifier to one of the 6 curated
 * Smart Soundscape Switcher presets (`rain-chamber`, `ocean-drift`, `forest-echo`,
 * `cosmic-silence`, `ember-glow`, `celestial-tone`).
 */
export function normalizeChamberId(rawId?: string | null): ChamberId {
  if (!rawId) return 'rain-chamber';
  if (VALID_CHAMBER_IDS.has(rawId as ChamberId)) {
    return rawId as ChamberId;
  }
  return LEGACY_CHAMBER_MAP[rawId] || 'rain-chamber';
}

export function getChamberById(id?: string | null): ChamberConfig {
  const normalized = normalizeChamberId(id);
  return CHAMBERS.find((c) => c.id === normalized) || CHAMBERS[0];
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  dailyGoalMinutes: 180,
  breakMinutes: 10,
  ambienceVolume: 0.75,
  secondaryVolume: 0,
  alertVolume: 0.7,
  audioReactive: true,
  reducedMotion: false,
  highContrast: false,
  timerTextScale: 'large',
  desktopNotifications: false,
  backgroundMix: 0.52,
  orbDesign: 'original',
};

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
 * Calculates total focus minutes for a specific YYYY-MM-DD date.
 */
export function calculateDailyTotal(
  sessions: SessionRecord[],
  isoDate: string
): number {
  return sessions
    .filter((s) => s.isoDate === isoDate)
    .reduce((acc, s) => acc + s.durationMinutes, 0);
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
      sessions.filter((s) => s.durationMinutes > 0).map((s) => s.isoDate)
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

  return { currentStreak: activeRun, longestStreak: Math.max(longest, activeRun) };
}

export interface DailyRhythmCell {
  isoDate: string;
  dayLabel: string;
  minutes: number;
  sessionsCount: number;
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
    const minutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

    const sceneTotals: Partial<Record<FocusSceneId, number>> = {};
    let topScene: FocusSceneId = 'deep-current';
    let topSceneMin = -1;
    for (const s of daySessions) {
      sceneTotals[s.sceneId] = (sceneTotals[s.sceneId] || 0) + s.durationMinutes;
      if ((sceneTotals[s.sceneId] || 0) > topSceneMin) {
        topSceneMin = sceneTotals[s.sceneId] || 0;
        topScene = s.sceneId;
      }
    }

    result.push({
      isoDate,
      dayLabel,
      minutes,
      sessionsCount: daySessions.length,
      dominantScene: topScene,
    });
  }

  return result;
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

  const total = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

  for (const s of sessions) {
    const h = s.hourOfDay;
    if (h >= 5 && h < 12) buckets[0].minutes += s.durationMinutes;
    else if (h >= 12 && h < 17) buckets[1].minutes += s.durationMinutes;
    else if (h >= 17 && h < 21) buckets[2].minutes += s.durationMinutes;
    else buckets[3].minutes += s.durationMinutes;
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
    sceneMinutes[s.sceneId] =
      (sceneMinutes[s.sceneId] || 0) + s.durationMinutes;
    const normChamber = normalizeChamberId(s.chamberId);
    chamberMinutes[normChamber] =
      (chamberMinutes[normChamber] || 0) + s.durationMinutes;
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
      chamber:
        CHAMBERS.find((c) => c.id === bestChamberId) || CHAMBERS[0],
      minutes: Math.max(0, maxChamberMin),
    },
  };
}

/**
 * Generates deterministic seed sessions so "2h 20m today" and the Visual Journal
 * are immediately rich and verifiable on first launch.
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
    hour: number;
  }> = [
    {
      daysAgo: 0,
      label: 'Deep work',
      durationMinutes: 90,
      sceneId: 'deep-current',
      chamberId: 'rain-chamber',
      hour: 10,
    },
    {
      daysAgo: 0,
      label: 'Spatial Shader Exploration',
      durationMinutes: 50,
      sceneId: 'chromatic-flow',
      chamberId: 'celestial-tone',
      hour: 14,
    },
    {
      daysAgo: 1,
      label: 'Core Engine Architecture',
      durationMinutes: 60,
      sceneId: 'electric-quiet',
      chamberId: 'forest-echo',
      hour: 11,
    },
    {
      daysAgo: 1,
      label: 'Late Night Typography Pass',
      durationMinutes: 45,
      sceneId: 'night-signal',
      chamberId: 'rain-chamber',
      hour: 22,
    },
    {
      daysAgo: 2,
      label: 'Product Narrative & Flows',
      durationMinutes: 60,
      sceneId: 'chromatic-flow',
      chamberId: 'ember-glow',
      hour: 15,
    },
    {
      daysAgo: 2,
      label: 'Protocol Spec Review',
      durationMinutes: 45,
      sceneId: 'deep-current',
      chamberId: 'cosmic-silence',
      hour: 9,
    },
    {
      daysAgo: 3,
      label: 'Refractive Lens Physics',
      durationMinutes: 90,
      sceneId: 'deep-current',
      chamberId: 'cosmic-silence',
      hour: 21,
    },
    {
      daysAgo: 4,
      label: 'Sound Synthesis Calibration',
      durationMinutes: 60,
      sceneId: 'solar-drift',
      chamberId: 'ocean-drift',
      hour: 16,
    },
    {
      daysAgo: 5,
      label: 'Motion Curves & Springs',
      durationMinutes: 45,
      sceneId: 'electric-quiet',
      chamberId: 'forest-echo',
      hour: 10,
    },
    {
      daysAgo: 6,
      label: 'Sunday Synthesis Journal',
      durationMinutes: 60,
      sceneId: 'solar-drift',
      chamberId: 'ember-glow',
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
      completedAt: dt.toISOString(),
      isoDate,
      hourOfDay: item.hour,
      sceneId: item.sceneId,
      chamberId: item.chamberId,
    };
  });
}
