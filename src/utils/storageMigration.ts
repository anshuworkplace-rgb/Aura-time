import {
  BreathingPresetId,
  ChamberId,
  FocusRoutine,
  FocusSceneId,
  OrbDesignId,
  QuietMomentPresetId,
  RestoreEnvironmentId,
  RestoreModeId,
  RestoreSessionRecord,
  SessionRecord,
  UserSettings,
} from '../types/aura';
import {
  DEFAULT_USER_SETTINGS,
  FOCUS_SCENES,
  generateSeedSessions,
  normalizeChamberId,
} from './focusEngine';
import { DEFAULT_FOCUS_ROUTINES } from './auraIntelligence';

export const STORAGE_KEYS = {
  SETTINGS: 'aura_living_lens_settings_v3',
  LEGACY_SETTINGS_V2: 'aura_living_lens_settings_v2',
  LEGACY_SETTINGS_V1: 'aura_living_lens_settings_v1',
  SESSIONS: 'aura_living_lens_sessions_v2',
  LEGACY_SESSIONS_V1: 'aura_living_lens_sessions_v1',
  SEED_CLEARED: 'aura_seed_cleared_v1',
  RESTORE_SESSIONS: 'aura_restore_sessions_v1',
  ROUTINES: 'aura_focus_routines_v1',
  STATE: 'aura_living_lens_state_v4',
  LEGACY_STATE_V3: 'aura_living_lens_state_v3',
  LEGACY_STATE_V2: 'aura_living_lens_state_v2',
  SOUNDSCAPE: 'aura_selected_soundscape_v2',
  SCHEMA_VERSION: 'aura_storage_schema_version',
} as const;

export const CURRENT_STORAGE_SCHEMA_VERSION = 4;

const VALID_ORB_DESIGNS: readonly OrbDesignId[] = [
  'original',
  'celestial-jelly',
  'living-bloom',
];

const VALID_RESTORE_MODES: readonly RestoreModeId[] = [
  'breathing',
  'quiet-moment',
];

const VALID_RESTORE_ENVS: readonly RestoreEnvironmentId[] = [
  'rain-garden',
  'ocean-drift',
  'forest-stillness',
  'celestial-night',
];

const VALID_BREATHING_PRESETS: readonly BreathingPresetId[] = [
  'coherent-5-5',
  'deep-rest-4-7-8',
  'box-4-4-4-4',
  'wave-6-2-7',
  'custom',
];

const VALID_QUIET_PRESETS: readonly QuietMomentPresetId[] = [
  'reset-2m',
  'calm-5m',
  'pause-10m',
];

export function sanitizeUserSettings(raw: unknown): UserSettings {
  const defaultsWithRestore: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    defaultRestoreMode: 'breathing',
    defaultRestoreEnvironmentId: 'rain-garden',
    defaultBreathingPresetId: 'coherent-5-5',
    defaultQuietMomentPresetId: 'reset-2m',
  };

  if (!raw || typeof raw !== 'object') {
    return defaultsWithRestore;
  }

  const candidate = raw as Partial<UserSettings>;
  const orbDesign: OrbDesignId =
    candidate.orbDesign && VALID_ORB_DESIGNS.includes(candidate.orbDesign)
      ? candidate.orbDesign
      : defaultsWithRestore.orbDesign;

  const defaultRestoreMode: RestoreModeId =
    candidate.defaultRestoreMode &&
    VALID_RESTORE_MODES.includes(candidate.defaultRestoreMode)
      ? candidate.defaultRestoreMode
      : 'breathing';

  const defaultRestoreEnvironmentId: RestoreEnvironmentId =
    candidate.defaultRestoreEnvironmentId &&
    VALID_RESTORE_ENVS.includes(candidate.defaultRestoreEnvironmentId)
      ? candidate.defaultRestoreEnvironmentId
      : 'rain-garden';

  const defaultBreathingPresetId: BreathingPresetId =
    candidate.defaultBreathingPresetId &&
    VALID_BREATHING_PRESETS.includes(candidate.defaultBreathingPresetId)
      ? candidate.defaultBreathingPresetId
      : 'coherent-5-5';

  const defaultQuietMomentPresetId: QuietMomentPresetId =
    candidate.defaultQuietMomentPresetId &&
    VALID_QUIET_PRESETS.includes(candidate.defaultQuietMomentPresetId)
      ? candidate.defaultQuietMomentPresetId
      : 'reset-2m';

  const VALID_SCENES = new Set<FocusSceneId>(
    Object.keys(FOCUS_SCENES) as FocusSceneId[]
  );
  const VALID_PERF = new Set(['auto', 'high', 'balanced']);
  const VALID_TEXT_SCALE = new Set(['default', 'large', 'monumental']);
  const VALID_ANIM = new Set(['subtle', 'standard', 'fluid']);

  return {
    ...defaultsWithRestore,
    ...candidate,
    orbDesign,
    defaultRestoreMode,
    defaultRestoreEnvironmentId,
    defaultBreathingPresetId,
    defaultQuietMomentPresetId,
    selectedChamberId: candidate.selectedChamberId
      ? normalizeChamberId(candidate.selectedChamberId)
      : defaultsWithRestore.selectedChamberId,
    preferredSceneId:
      candidate.preferredSceneId && VALID_SCENES.has(candidate.preferredSceneId)
        ? candidate.preferredSceneId
        : defaultsWithRestore.preferredSceneId,
    performanceMode:
      candidate.performanceMode && VALID_PERF.has(candidate.performanceMode)
        ? candidate.performanceMode
        : defaultsWithRestore.performanceMode,
    timerTextScale:
      candidate.timerTextScale && VALID_TEXT_SCALE.has(candidate.timerTextScale)
        ? candidate.timerTextScale
        : defaultsWithRestore.timerTextScale,
    animationIntensity:
      candidate.animationIntensity && VALID_ANIM.has(candidate.animationIntensity)
        ? candidate.animationIntensity
        : defaultsWithRestore.animationIntensity,
    preferredWorkPeriod:
      candidate.preferredWorkPeriod === 'morning' ||
      candidate.preferredWorkPeriod === 'afternoon' ||
      candidate.preferredWorkPeriod === 'evening' ||
      candidate.preferredWorkPeriod === 'night'
        ? candidate.preferredWorkPeriod
        : defaultsWithRestore.preferredWorkPeriod,
    preferredDurationMinutes:
      typeof candidate.preferredDurationMinutes === 'number' &&
      Number.isFinite(candidate.preferredDurationMinutes) &&
      candidate.preferredDurationMinutes >= 5 &&
      candidate.preferredDurationMinutes <= 180
        ? Math.round(candidate.preferredDurationMinutes)
        : defaultsWithRestore.preferredDurationMinutes,
    dailySessionsGoal:
      typeof candidate.dailySessionsGoal === 'number' &&
      Number.isFinite(candidate.dailySessionsGoal) &&
      candidate.dailySessionsGoal > 0
        ? Math.round(candidate.dailySessionsGoal)
        : defaultsWithRestore.dailySessionsGoal,
    dailyGoalMinutes:
      typeof candidate.dailyGoalMinutes === 'number' &&
      Number.isFinite(candidate.dailyGoalMinutes) &&
      candidate.dailyGoalMinutes > 0
        ? candidate.dailyGoalMinutes
        : defaultsWithRestore.dailyGoalMinutes,
    weeklyGoalMinutes:
      typeof candidate.weeklyGoalMinutes === 'number' &&
      Number.isFinite(candidate.weeklyGoalMinutes) &&
      candidate.weeklyGoalMinutes > 0
        ? candidate.weeklyGoalMinutes
        : defaultsWithRestore.weeklyGoalMinutes,
    breakMinutes:
      typeof candidate.breakMinutes === 'number' &&
      Number.isFinite(candidate.breakMinutes) &&
      candidate.breakMinutes > 0
        ? candidate.breakMinutes
        : defaultsWithRestore.breakMinutes,
    ambienceVolume:
      typeof candidate.ambienceVolume === 'number' &&
      Number.isFinite(candidate.ambienceVolume)
        ? Math.max(0, Math.min(1, candidate.ambienceVolume))
        : defaultsWithRestore.ambienceVolume,
    secondaryVolume:
      typeof candidate.secondaryVolume === 'number' &&
      Number.isFinite(candidate.secondaryVolume)
        ? Math.max(0, Math.min(1, candidate.secondaryVolume))
        : defaultsWithRestore.secondaryVolume,
    alertVolume:
      typeof candidate.alertVolume === 'number' &&
      Number.isFinite(candidate.alertVolume)
        ? Math.max(0, Math.min(1, candidate.alertVolume))
        : defaultsWithRestore.alertVolume,
    backgroundMix:
      typeof candidate.backgroundMix === 'number' &&
      Number.isFinite(candidate.backgroundMix)
        ? Math.max(0, Math.min(1, candidate.backgroundMix))
        : defaultsWithRestore.backgroundMix,
  };
}

export function sanitizeSessionRecords(
  raw: unknown,
  fallbackIsoDate: string,
  allowSeedFallback = true
): SessionRecord[] {
  if (!Array.isArray(raw)) {
    return allowSeedFallback ? generateSeedSessions(fallbackIsoDate) : [];
  }

  const valid: SessionRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<SessionRecord>;
    if (
      typeof rec.id !== 'string' ||
      typeof rec.isoDate !== 'string' ||
      typeof rec.durationMinutes !== 'number' ||
      !Number.isFinite(rec.durationMinutes)
    ) {
      continue;
    }

    const sceneId: FocusSceneId =
      rec.sceneId && rec.sceneId in FOCUS_SCENES
        ? rec.sceneId
        : 'electric-quiet';
    const chamberId: ChamberId = normalizeChamberId(rec.chamberId);
    const actualMinutes =
      typeof rec.actualMinutes === 'number' &&
      Number.isFinite(rec.actualMinutes)
        ? Math.max(1, Math.round(rec.actualMinutes))
        : Math.max(1, Math.round(rec.durationMinutes));

    const safeIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(rec.isoDate)
      ? rec.isoDate
      : fallbackIsoDate;

    valid.push({
      id: rec.id,
      label: typeof rec.label === 'string' ? rec.label : 'Deep work',
      durationMinutes: Math.max(1, Math.round(rec.durationMinutes)),
      plannedMinutes:
        typeof rec.plannedMinutes === 'number' && Number.isFinite(rec.plannedMinutes)
          ? rec.plannedMinutes
          : Math.max(1, Math.round(rec.durationMinutes)),
      actualMinutes,
      actualFocusedSeconds:
        typeof rec.actualFocusedSeconds === 'number' &&
        Number.isFinite(rec.actualFocusedSeconds)
          ? rec.actualFocusedSeconds
          : actualMinutes * 60,
      completionStatus:
        rec.completionStatus === 'interrupted' ? 'interrupted' : 'completed',
      orbDesign:
        rec.orbDesign && VALID_ORB_DESIGNS.includes(rec.orbDesign)
          ? rec.orbDesign
          : undefined,
      isSeed: Boolean(rec.isSeed),
      completedAt:
        typeof rec.completedAt === 'string'
          ? rec.completedAt
          : new Date().toISOString(),
      isoDate: safeIsoDate,
      hourOfDay:
        typeof rec.hourOfDay === 'number' &&
        Number.isFinite(rec.hourOfDay) &&
        rec.hourOfDay >= 0 &&
        rec.hourOfDay <= 23
          ? Math.floor(rec.hourOfDay)
          : 10,
      sceneId,
      chamberId,
    });
  }

  return valid;
}

export function sanitizeRestoreSessions(raw: unknown): RestoreSessionRecord[] {
  if (!Array.isArray(raw)) return [];
  const valid: RestoreSessionRecord[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<RestoreSessionRecord>;
    if (typeof rec.id !== 'string' || typeof rec.completedAt !== 'string') {
      continue;
    }
    const mode: RestoreModeId =
      rec.mode === 'quiet-moment' ? 'quiet-moment' : 'breathing';
    const environmentId: RestoreEnvironmentId =
      rec.environmentId && VALID_RESTORE_ENVS.includes(rec.environmentId)
        ? rec.environmentId
        : 'rain-garden';
    valid.push({
      id: rec.id,
      mode,
      presetName:
        typeof rec.presetName === 'string' ? rec.presetName : 'Restorative Pause',
      title: typeof rec.title === 'string' ? rec.title : undefined,
      durationSeconds:
        typeof rec.durationSeconds === 'number' ? rec.durationSeconds : 120,
      elapsedSeconds:
        typeof rec.elapsedSeconds === 'number'
          ? rec.elapsedSeconds
          : typeof rec.durationSeconds === 'number'
          ? rec.durationSeconds
          : 120,
      environmentId,
      completedAt: rec.completedAt,
      isoDate:
        typeof rec.isoDate === 'string'
          ? rec.isoDate
          : rec.completedAt.slice(0, 10),
    });
  }
  return valid;
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Runs non-destructive versioned migration across localStorage keys on startup.
 * Preserves existing v1/v2 settings and session records without resetting user data.
 */
export function loadAndMigrateSettings(storage?: StorageLike): UserSettings {
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return sanitizeUserSettings(null);

  try {
    const v3Raw = store.getItem(STORAGE_KEYS.SETTINGS);
    if (v3Raw) {
      return sanitizeUserSettings(JSON.parse(v3Raw));
    }

    // Migrate from v2 or v1 if present
    const legacyRaw =
      store.getItem(STORAGE_KEYS.LEGACY_SETTINGS_V2) ??
      store.getItem(STORAGE_KEYS.LEGACY_SETTINGS_V1);
    if (legacyRaw) {
      const migrated = sanitizeUserSettings(JSON.parse(legacyRaw));
      store.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(migrated));
      store.setItem(
        STORAGE_KEYS.SCHEMA_VERSION,
        String(CURRENT_STORAGE_SCHEMA_VERSION)
      );
      return migrated;
    }
  } catch {
    // Ignore storage read errors
  }

  return sanitizeUserSettings(null);
}

/**
 * Loads and migrates focus session records.
 * Never overwrites genuine user history or intentionally cleared history with demo seed data.
 */
export function loadAndMigrateSessions(
  todayIsoDate: string,
  storage?: StorageLike
): SessionRecord[] {
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return generateSeedSessions(todayIsoDate);

  try {
    const seedCleared = store.getItem(STORAGE_KEYS.SEED_CLEARED) === 'true';
    const v2Raw = store.getItem(STORAGE_KEYS.SESSIONS);
    if (v2Raw !== null) {
      const parsed = JSON.parse(v2Raw);
      if (Array.isArray(parsed)) {
        return sanitizeSessionRecords(parsed, todayIsoDate, false);
      }
    }

    const legacyV1Raw = store.getItem(STORAGE_KEYS.LEGACY_SESSIONS_V1);
    if (legacyV1Raw !== null) {
      const parsed = JSON.parse(legacyV1Raw);
      if (Array.isArray(parsed)) {
        const migrated = sanitizeSessionRecords(parsed, todayIsoDate, false);
        store.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(migrated));
        return migrated;
      }
    }

    if (seedCleared) {
      return [];
    }
  } catch {
    // Ignore storage parse errors
  }

  return generateSeedSessions(todayIsoDate);
}

export function loadAndMigrateRestoreSessions(
  storage?: StorageLike
): RestoreSessionRecord[] {
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return [];

  try {
    const raw = store.getItem(STORAGE_KEYS.RESTORE_SESSIONS);
    if (raw) {
      return sanitizeRestoreSessions(JSON.parse(raw));
    }
  } catch {
    // Ignore
  }
  return [];
}

export function sanitizeRoutines(raw: unknown): FocusRoutine[] {
  if (!Array.isArray(raw)) return DEFAULT_FOCUS_ROUTINES;
  const valid: FocusRoutine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<FocusRoutine>;
    if (typeof rec.id !== 'string' || typeof rec.name !== 'string') continue;
    const focusDurationMinutes =
      typeof rec.focusDurationMinutes === 'number' &&
      Number.isFinite(rec.focusDurationMinutes) &&
      rec.focusDurationMinutes >= 5 &&
      rec.focusDurationMinutes <= 180
        ? Math.round(rec.focusDurationMinutes)
        : 25;
    const breakDurationMinutes =
      typeof rec.breakDurationMinutes === 'number' &&
      Number.isFinite(rec.breakDurationMinutes) &&
      rec.breakDurationMinutes >= 1 &&
      rec.breakDurationMinutes <= 60
        ? Math.round(rec.breakDurationMinutes)
        : 5;
    const sceneId: FocusSceneId =
      rec.sceneId && rec.sceneId in FOCUS_SCENES
        ? rec.sceneId
        : 'electric-quiet';
    const orbDesign: OrbDesignId =
      rec.orbDesign && VALID_ORB_DESIGNS.includes(rec.orbDesign)
        ? rec.orbDesign
        : 'celestial-jelly';

    valid.push({
      id: rec.id,
      name: rec.name.trim() || 'Focus Routine',
      description:
        typeof rec.description === 'string'
          ? rec.description
          : 'Personalized sanctuary focus routine.',
      focusDurationMinutes,
      sceneId,
      chamberId: normalizeChamberId(rec.chamberId),
      orbDesign,
      breakDurationMinutes,
      targetSessionsCount:
        typeof rec.targetSessionsCount === 'number' &&
        Number.isFinite(rec.targetSessionsCount) &&
        rec.targetSessionsCount >= 1
          ? Math.round(rec.targetSessionsCount)
          : 2,
      isCustom: Boolean(rec.isCustom),
    });
  }
  return valid.length > 0 ? valid : DEFAULT_FOCUS_ROUTINES;
}

export function loadAndMigrateRoutines(storage?: StorageLike): FocusRoutine[] {
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return DEFAULT_FOCUS_ROUTINES;

  try {
    const raw = store.getItem(STORAGE_KEYS.ROUTINES);
    if (raw) {
      return sanitizeRoutines(JSON.parse(raw));
    }
  } catch {
    // Ignore
  }
  return DEFAULT_FOCUS_ROUTINES;
}

