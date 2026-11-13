import { useMemo } from 'react';
import type {
  OrbDesignId,
  RestoreSessionRecord,
  SessionRecord,
  UserSettings,
} from '../../../types/aura';
import type {
  AuraDataExportBundle,
  CompactGardenNode,
  EvidenceBasedObservation,
  MyRhythmSummary,
  PrimaryOrganismId,
} from '../types/auraConsole.types';

export function mapOrbDesignToPrimaryOrganism(
  orbDesign?: OrbDesignId
): PrimaryOrganismId {
  if (orbDesign === 'celestial-jelly') return 'celestial-jelly';
  if (orbDesign === 'living-bloom') return 'living-bloom';
  return 'liquid-lens';
}

export function mapPrimaryOrganismToOrbDesign(
  organismId: PrimaryOrganismId
): OrbDesignId {
  if (organismId === 'celestial-jelly') return 'celestial-jelly';
  if (organismId === 'living-bloom') return 'living-bloom';
  return 'original';
}

export function getActualSessionMinutes(session: SessionRecord): number {
  if (
    typeof session.actualMinutes === 'number' &&
    Number.isFinite(session.actualMinutes)
  ) {
    return Math.max(0, Math.round(session.actualMinutes));
  }
  if (
    typeof session.actualFocusedSeconds === 'number' &&
    Number.isFinite(session.actualFocusedSeconds)
  ) {
    return Math.max(1, Math.round(session.actualFocusedSeconds / 60));
  }
  return Math.max(0, Math.round(session.durationMinutes || 0));
}

function getTodayIsoDate(referenceIsoDate?: string): string {
  if (referenceIsoDate && /^\d{4}-\d{2}-\d{2}$/.test(referenceIsoDate)) {
    return referenceIsoDate;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTrailingDaysIsoSet(
  todayIso: string,
  daysCount: number
): Set<string> {
  const [y, m, d] = todayIso.split('-').map(Number);
  const base = new Date(y, (m || 1) - 1, d || 1);
  const set = new Set<string>();
  for (let i = 0; i < daysCount; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() - i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(dt.getDate()).padStart(2, '0')}`;
    set.add(iso);
  }
  return set;
}

/**
 * Pure helper: derives a single, honest, evidence-based observation strictly from
 * real focus session records. Never fabricates AI claims or unverified metrics.
 */
export function computeEvidenceBasedObservation(
  sessions: SessionRecord[]
): EvidenceBasedObservation {
  const realSessions = sessions.filter((s) => !s.isSeed);
  const sourceSessions = realSessions.length > 0 ? realSessions : sessions;

  if (sourceSessions.length === 0) {
    return {
      hasSufficientData: false,
      headline: 'No focus sessions recorded yet',
      detail:
        'Complete at least two focus sessions to unlock evidence-based observations about your most consistent time of day and session duration.',
      sampleSize: 0,
    };
  }

  if (sourceSessions.length === 1) {
    const only = sourceSessions[0];
    const mins = getActualSessionMinutes(only);
    return {
      hasSufficientData: false,
      headline: 'First focus session recorded',
      detail: `You logged ${mins}m in "${only.label}". Complete one more session to compare time-of-day and completion consistency.`,
      sampleSize: 1,
      metricBadge: `${mins}m logged`,
    };
  }

  // Group by time-of-day period and calculate actual minutes & completion rate
  const buckets: Record<
    'Morning (05–11h)' | 'Afternoon (12–16h)' | 'Evening (17–21h)' | 'Night (22–04h)',
    { minutes: number; count: number; completed: number }
  > = {
    'Morning (05–11h)': { minutes: 0, count: 0, completed: 0 },
    'Afternoon (12–16h)': { minutes: 0, count: 0, completed: 0 },
    'Evening (17–21h)': { minutes: 0, count: 0, completed: 0 },
    'Night (22–04h)': { minutes: 0, count: 0, completed: 0 },
  };

  let totalMinutes = 0;
  let completedCount = 0;

  for (const s of sourceSessions) {
    const mins = getActualSessionMinutes(s);
    totalMinutes += mins;
    const isCompleted = s.completionStatus !== 'interrupted';
    if (isCompleted) completedCount += 1;

    const hr = typeof s.hourOfDay === 'number' ? s.hourOfDay : 10;
    const key =
      hr >= 5 && hr < 12
        ? 'Morning (05–11h)'
        : hr >= 12 && hr < 17
        ? 'Afternoon (12–16h)'
        : hr >= 17 && hr < 22
        ? 'Evening (17–21h)'
        : 'Night (22–04h)';

    buckets[key].minutes += mins;
    buckets[key].count += 1;
    if (isCompleted) buckets[key].completed += 1;
  }

  const topBucket = Object.entries(buckets).sort(
    (a, b) => b[1].minutes - a[1].minutes
  )[0];
  const avgMinutes = Math.round(totalMinutes / sourceSessions.length);
  const completionRate = Math.round(
    (completedCount / sourceSessions.length) * 100
  );

  return {
    hasSufficientData: true,
    headline: `Strongest rhythm in the ${topBucket[0]}`,
    detail: `Across ${sourceSessions.length} recorded sessions, you accumulated ${topBucket[1].minutes}m during ${topBucket[0]} with an average session length of ${avgMinutes}m and ${completionRate}% natural completion.`,
    sampleSize: sourceSessions.length,
    metricBadge: `${avgMinutes}m avg · ${completionRate}% completed`,
  };
}

/**
 * Pure helper: builds compact Aura Garden nodes from genuine focus & restorative sessions.
 */
export function computeCompactGardenNodes(
  sessions: SessionRecord[],
  restoreSessions: RestoreSessionRecord[] = [],
  limit = 14
): CompactGardenNode[] {
  const focusNodes: CompactGardenNode[] = sessions
    .slice(0, limit)
    .map((s) => ({
      id: `garden-focus-${s.id}`,
      kind: 'focus-bloom',
      label: s.label || 'Focus Session',
      minutes: getActualSessionMinutes(s),
      isoDate: s.isoDate,
      accentHex:
        s.orbDesign === 'living-bloom'
          ? '#5EF2C4'
          : s.orbDesign === 'celestial-jelly'
          ? '#8A5CFF'
          : '#2FE8FF',
    }));

  const restoreNodes: CompactGardenNode[] = restoreSessions
    .slice(0, Math.max(4, Math.floor(limit / 3)))
    .map((r) => ({
      id: `garden-restore-${r.id}`,
      kind: 'restorative-drop',
      label: r.presetName || r.title || 'Liquid Lens Restore',
      minutes: Math.max(
        1,
        Math.round((r.elapsedSeconds ?? r.durationSeconds ?? 180) / 60)
      ),
      isoDate: r.isoDate || r.completedAt.slice(0, 10),
      accentHex: '#38F2FF',
    }));

  return [...focusNodes, ...restoreNodes].slice(0, limit);
}

/**
 * Pure helper: computes the complete My Rhythm summary from session records and user settings.
 */
export function computeMyRhythmSummary(
  sessions: SessionRecord[] = [],
  restoreSessions: RestoreSessionRecord[] = [],
  settings?: Partial<UserSettings>,
  referenceIsoDate?: string
): MyRhythmSummary {
  const todayIso = getTodayIsoDate(referenceIsoDate);
  const weekIsoSet = getTrailingDaysIsoSet(todayIso, 7);

  const excludeSeed = Boolean(settings?.excludeSampleDataInInsights);
  const seedSessionsCount = sessions.filter((s) => Boolean(s.isSeed)).length;
  const filteredSessions = excludeSeed
    ? sessions.filter((s) => !s.isSeed)
    : sessions;

  const sortedSessions = [...filteredSessions].sort((a, b) =>
    (b.completedAt || '').localeCompare(a.completedAt || '')
  );

  let todayActualMinutes = 0;
  let todayCompletedCount = 0;
  let todayInterruptedCount = 0;

  let weeklyActualMinutes = 0;
  let weeklyCompletedCount = 0;

  let totalCompletedCount = 0;
  let totalInterruptedCount = 0;

  for (const s of sortedSessions) {
    const mins = getActualSessionMinutes(s);
    const isInterrupted = s.completionStatus === 'interrupted';

    if (isInterrupted) {
      totalInterruptedCount += 1;
    } else {
      totalCompletedCount += 1;
    }

    if (s.isoDate === todayIso) {
      todayActualMinutes += mins;
      if (isInterrupted) {
        todayInterruptedCount += 1;
      } else {
        todayCompletedCount += 1;
      }
    }

    if (weekIsoSet.has(s.isoDate)) {
      weeklyActualMinutes += mins;
      if (!isInterrupted) {
        weeklyCompletedCount += 1;
      }
    }
  }

  const dailyTargetMinutes = Math.max(15, settings?.dailyGoalMinutes ?? 120);
  const weeklyTargetMinutes = Math.max(
    60,
    settings?.weeklyGoalMinutes ?? dailyTargetMinutes * 5
  );

  const dailyProgressRatio = Math.min(
    1,
    Number((todayActualMinutes / dailyTargetMinutes).toFixed(4))
  );
  const weeklyProgressRatio = Math.min(
    1,
    Number((weeklyActualMinutes / weeklyTargetMinutes).toFixed(4))
  );

  const restorativeMinutesTotal = restoreSessions.reduce((acc, r) => {
    const secs = r.elapsedSeconds ?? r.durationSeconds ?? 0;
    return acc + Math.max(1, Math.round(secs / 60));
  }, 0);

  return {
    todayActualMinutes,
    todayCompletedCount,
    todayInterruptedCount,
    dailyTargetMinutes,
    dailyProgressRatio,
    weeklyActualMinutes,
    weeklyCompletedCount,
    weeklyTargetMinutes,
    weeklyProgressRatio,
    totalCompletedCount,
    totalInterruptedCount,
    restorativeSessionsCount: restoreSessions.length,
    restorativeMinutesTotal,
    recentSessions: sortedSessions.slice(0, 8),
    seedSessionsCount,
    observation: computeEvidenceBasedObservation(sortedSessions),
    gardenNodes: computeCompactGardenNodes(sortedSessions, restoreSessions, 12),
  };
}

/**
 * Pure helper: constructs a clean JSON-serializable export bundle for Personal Data.
 */
export function buildAuraDataExportBundle(
  settings: Partial<UserSettings>,
  sessions: SessionRecord[] = [],
  restoreSessions: RestoreSessionRecord[] = []
): AuraDataExportBundle {
  const totalActualFocusMinutes = sessions.reduce(
    (sum, s) => sum + getActualSessionMinutes(s),
    0
  );
  return {
    exportedAt: new Date().toISOString(),
    version: '2.0.0',
    product: 'AURA TIME',
    settings,
    focusSessions: sessions,
    restoreSessions,
    summary: {
      totalFocusSessions: sessions.length,
      totalActualFocusMinutes,
      totalRestoreSessions: restoreSessions.length,
    },
  };
}

export function useAuraRhythmMetrics(
  sessions: SessionRecord[] = [],
  restoreSessions: RestoreSessionRecord[] = [],
  settings?: Partial<UserSettings>,
  referenceIsoDate?: string
): MyRhythmSummary {
  return useMemo(
    () =>
      computeMyRhythmSummary(
        sessions,
        restoreSessions,
        settings,
        referenceIsoDate
      ),
    [sessions, restoreSessions, settings, referenceIsoDate]
  );
}
