import {
  AuraGardenAchievement,
  ChamberId,
  FocusRoutine,
  FocusSceneId,
  MonthlyAnalyticsSummary,
  MonthlyWeekBucket,
  SessionRecord,
  SmartRecommendation,
  TaskBreakdownStep,
  UserSettings,
} from '../types/aura';
import { CHAMBERS, FOCUS_SCENES } from './focusEngine';

/**
 * 5 Signature Personalized Routines (editable, duplicatable, and deletable by the user)
 */
export const DEFAULT_FOCUS_ROUTINES: FocusRoutine[] = [
  {
    id: 'routine-morning-clarity',
    name: 'Morning Clarity',
    description:
      'Crisp 25-minute morning focus block in Electric Quiet with light rain acoustics.',
    focusDurationMinutes: 25,
    sceneId: 'electric-quiet',
    chamberId: 'rain-chamber',
    orbDesign: 'celestial-jelly',
    breakDurationMinutes: 5,
    targetSessionsCount: 2,
    isCustom: false,
  },
  {
    id: 'routine-deep-work',
    name: 'Deep Work',
    description:
      'Extended 50-minute uninterrupted engineering or writing block in Deep Current.',
    focusDurationMinutes: 50,
    sceneId: 'deep-current',
    chamberId: 'ocean-drift',
    orbDesign: 'celestial-jelly',
    breakDurationMinutes: 10,
    targetSessionsCount: 3,
    isCustom: false,
  },
  {
    id: 'routine-study-session',
    name: 'Study Session',
    description:
      'Structured 45-minute study & revision cadence with a 10-minute restorative reset.',
    focusDurationMinutes: 45,
    sceneId: 'chromatic-flow',
    chamberId: 'forest-echo',
    orbDesign: 'living-bloom',
    breakDurationMinutes: 10,
    targetSessionsCount: 4,
    isCustom: false,
  },
  {
    id: 'routine-creative-flow',
    name: 'Creative Flow',
    description:
      ' immersive 60-minute design and exploration sanctuary in Solar Drift.',
    focusDurationMinutes: 60,
    sceneId: 'solar-drift',
    chamberId: 'ember-glow',
    orbDesign: 'living-bloom',
    breakDurationMinutes: 10,
    targetSessionsCount: 2,
    isCustom: false,
  },
  {
    id: 'routine-evening-wind-down',
    name: 'Evening Wind Down',
    description:
      'Gentle 25-minute nocturnal reading or reflection block in Night Signal.',
    focusDurationMinutes: 25,
    sceneId: 'night-signal',
    chamberId: 'celestial-tone',
    orbDesign: 'original',
    breakDurationMinutes: 10,
    targetSessionsCount: 1,
    isCustom: false,
  },
];

/**
 * Deduplicate sessions by unique ID and optionally exclude sample/seed records
 */
export function filterVerifiedSessions(
  sessions: SessionRecord[],
  excludeSeed = false
): SessionRecord[] {
  const seen = new Set<string>();
  const result: SessionRecord[] = [];
  for (const s of sessions) {
    if (!s || !s.id || seen.has(s.id)) continue;
    if (excludeSeed && (s.isSeed || s.id.startsWith('seed-'))) continue;
    seen.add(s.id);
    result.push(s);
  }
  return result;
}

/**
 * Deterministic, transparent rule-based session recommendations (AURA INTELLIGENCE)
 */
export function computeSmartRecommendations(params: {
  sessions: SessionRecord[];
  todayIsoDate: string;
  currentDurationMinutes: number;
  currentSceneId: FocusSceneId;
  settings: UserSettings;
}): SmartRecommendation[] {
  const {
    sessions,
    todayIsoDate,
    currentDurationMinutes,
    currentSceneId,
    settings,
  } = params;

  const verified = filterVerifiedSessions(
    sessions,
    Boolean(settings.excludeSampleDataInInsights)
  );
  const recommendations: SmartRecommendation[] = [];

  // 1. Check if the user has repeatedly interrupted longer sessions (>= 45m)
  const recentTen = verified.slice(0, 10);
  const interruptedLong = recentTen.filter(
    (s) =>
      (s.completionStatus ?? 'completed') === 'interrupted' &&
      (s.plannedMinutes ?? s.durationMinutes) >= 45
  );

  if (interruptedLong.length >= 2 && currentDurationMinutes >= 45) {
    recommendations.push({
      id: 'rec-step-down-duration',
      category: 'momentum',
      title: 'Step Down to a 25-Minute Session',
      explanation: `You ended ${interruptedLong.length} recent ${
        interruptedLong[0].plannedMinutes ?? 45
      }+ minute sessions early. Starting with a 25-minute session can make it easier to complete a full block without fatigue.`,
      confidenceNote: 'Based on your recent interrupted session history',
      actionLabel: 'Use 25m Duration',
      applyPayload: {
        durationMinutes: 25,
      },
    });
  }

  // 2. Check today's cumulative focus to suggest a Restorative Break after extended work
  const todayActualMinutes = verified
    .filter((s) => s.isoDate === todayIsoDate)
    .reduce((acc, s) => acc + (s.actualMinutes ?? s.durationMinutes), 0);

  if (todayActualMinutes >= 90) {
    recommendations.push({
      id: 'rec-restorative-break',
      category: 'break',
      title: 'Take a 10-Minute Restorative Break',
      explanation: `You have logged ${todayActualMinutes} minutes of actual focused work today. A calm breathing or quiet recovery break helps prevent cognitive fatigue before your next block.`,
      confidenceNote: 'Triggered when daily actual focus exceeds 90 minutes',
      actionLabel: 'Open Restore Sanctuary',
      applyPayload: {
        openRestore: true,
      },
    });
  }

  // 3. Identify the duration with the strongest completion record
  const durationStats = new Map<
    number,
    { completed: number; total: number }
  >();
  for (const s of verified) {
    const targetMins = s.plannedMinutes ?? s.durationMinutes;
    const entry = durationStats.get(targetMins) ?? { completed: 0, total: 0 };
    entry.total += 1;
    if ((s.completionStatus ?? 'completed') === 'completed') {
      entry.completed += 1;
    }
    durationStats.set(targetMins, entry);
  }

  let bestDuration: { mins: number; completed: number; rate: number } | null =
    null;
  for (const [mins, st] of durationStats.entries()) {
    if (st.completed >= 2) {
      const rate = Math.round((st.completed / st.total) * 100);
      if (
        !bestDuration ||
        st.completed > bestDuration.completed ||
        (st.completed === bestDuration.completed && rate > bestDuration.rate)
      ) {
        bestDuration = { mins, completed: st.completed, rate };
      }
    }
  }

  if (bestDuration && bestDuration.mins !== currentDurationMinutes) {
    recommendations.push({
      id: `rec-proven-duration-${bestDuration.mins}`,
      category: 'duration',
      title: `Return to Your ${bestDuration.mins}-Minute Rhythm`,
      explanation: `You have completed ${bestDuration.completed} of your recorded ${bestDuration.mins}-minute sessions (${bestDuration.rate}% completion rate). Would you like to use ${bestDuration.mins} minutes again?`,
      confidenceNote: 'Derived from your completed session lengths',
      actionLabel: `Switch to ${bestDuration.mins}m`,
      applyPayload: {
        durationMinutes: bestDuration.mins,
      },
    });
  } else if (!bestDuration && currentDurationMinutes > 25) {
    recommendations.push({
      id: 'rec-starter-25m',
      category: 'duration',
      title: 'Build Momentum with 25 Minutes',
      explanation:
        'As you build your personal focus history, 25-minute sessions offer a steady, sustainable cadence with a natural stopping point.',
      confidenceNote: 'Baseline starter recommendation',
      actionLabel: 'Set 25m',
      applyPayload: {
        durationMinutes: 25,
      },
    });
  }

  // 4. Suggest the user's most frequently completed environment
  const sceneCounts = new Map<FocusSceneId, number>();
  for (const s of verified) {
    if ((s.completionStatus ?? 'completed') === 'completed') {
      sceneCounts.set(s.sceneId, (sceneCounts.get(s.sceneId) ?? 0) + 1);
    }
  }
  let topScene: { id: FocusSceneId; count: number } | null = null;
  for (const [id, count] of sceneCounts.entries()) {
    if (!topScene || count > topScene.count) {
      topScene = { id, count };
    }
  }

  if (topScene && topScene.count >= 2 && topScene.id !== currentSceneId) {
    const sceneMeta = FOCUS_SCENES[topScene.id];
    if (sceneMeta) {
      recommendations.push({
        id: `rec-scene-${topScene.id}`,
        category: 'environment',
        title: `Enter ${sceneMeta.name} Atmosphere`,
        explanation: `You have completed ${topScene.count} focus sessions in ${sceneMeta.name}. Would you like to return to this environment and its paired soundscape?`,
        confidenceNote: 'Based on your most-completed environment',
        actionLabel: `Select ${sceneMeta.name}`,
        applyPayload: {
          sceneId: topScene.id,
          chamberId: sceneMeta.suggestedChamberId,
        },
      });
    }
  }

  return recommendations.slice(0, 3);
}

/**
 * 30-Day Monthly Analytics with 4-week breakdown and previous 30-day period comparison
 */
export function calculateMonthlyAnalytics(
  sessions: SessionRecord[],
  todayIsoDate: string,
  dailyGoalMinutes = 180,
  excludeSeed = false
): MonthlyAnalyticsSummary {
  const verified = filterVerifiedSessions(sessions, excludeSeed);
  const anchor = new Date(`${todayIsoDate}T12:00:00`);

  const dateToOffsetDays = (isoDate: string): number => {
    const d = new Date(`${isoDate}T12:00:00`);
    return Math.round((anchor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  };

  const current30 = verified.filter((s) => {
    const diff = dateToOffsetDays(s.isoDate);
    return diff >= 0 && diff < 30;
  });

  const previous30 = verified.filter((s) => {
    const diff = dateToOffsetDays(s.isoDate);
    return diff >= 30 && diff < 60;
  });

  let totalActualMinutes = 0;
  let completedSessionsCount = 0;
  let interruptedSessionsCount = 0;
  const activeDaysSet = new Set<string>();
  const sceneMinutes = new Map<FocusSceneId, number>();
  const chamberMinutes = new Map<ChamberId, number>();

  for (const s of current30) {
    const mins = s.actualMinutes ?? s.durationMinutes;
    totalActualMinutes += mins;
    if (mins > 0) activeDaysSet.add(s.isoDate);
    if ((s.completionStatus ?? 'completed') === 'completed') {
      completedSessionsCount += 1;
    } else {
      interruptedSessionsCount += 1;
    }
    sceneMinutes.set(s.sceneId, (sceneMinutes.get(s.sceneId) ?? 0) + mins);
    chamberMinutes.set(
      s.chamberId,
      (chamberMinutes.get(s.chamberId) ?? 0) + mins
    );
  }

  const previousPeriodActualMinutes = previous30.reduce(
    (acc, s) => acc + (s.actualMinutes ?? s.durationMinutes),
    0
  );

  const periodDeltaPercent =
    previousPeriodActualMinutes > 0
      ? Math.round(
          ((totalActualMinutes - previousPeriodActualMinutes) /
            previousPeriodActualMinutes) *
            100
        )
      : null;

  // Build 4 weekly buckets across the last 28 days (Week -3, Week -2, Last Week, This Week)
  const weeklyTrends: MonthlyWeekBucket[] = [];
  const bucketLabels = ['3 Weeks Ago', '2 Weeks Ago', 'Last Week', 'This Week'];
  for (let b = 3; b >= 0; b--) {
    const maxDiff = b * 7 + 6;
    const minDiff = b * 7;
    const startObj = new Date(anchor.getTime() - maxDiff * 86400000);
    const endObj = new Date(anchor.getTime() - minDiff * 86400000);
    const startIso = startObj.toISOString().slice(0, 10);
    const endIso = endObj.toISOString().slice(0, 10);

    let bucketMinutes = 0;
    let bucketCompleted = 0;
    let bucketInterrupted = 0;

    for (const s of current30) {
      const diff = dateToOffsetDays(s.isoDate);
      if (diff >= minDiff && diff <= maxDiff) {
        bucketMinutes += s.actualMinutes ?? s.durationMinutes;
        if ((s.completionStatus ?? 'completed') === 'completed') {
          bucketCompleted += 1;
        } else {
          bucketInterrupted += 1;
        }
      }
    }

    weeklyTrends.push({
      weekLabel: bucketLabels[3 - b],
      startDateIso: startIso,
      endDateIso: endIso,
      actualMinutes: bucketMinutes,
      completedSessions: bucketCompleted,
      interruptedSessions: bucketInterrupted,
    });
  }

  let mostUsedSceneId: FocusSceneId | null = null;
  let maxSceneMins = 0;
  for (const [id, m] of sceneMinutes.entries()) {
    if (m > maxSceneMins) {
      maxSceneMins = m;
      mostUsedSceneId = id;
    }
  }

  let mostUsedChamberId: ChamberId | null = null;
  let maxChamberMins = 0;
  for (const [id, m] of chamberMinutes.entries()) {
    if (m > maxChamberMins) {
      maxChamberMins = m;
      mostUsedChamberId = id;
    }
  }

  const monthlyGoalMinutes = Math.max(300, dailyGoalMinutes * 20);
  const monthlyGoalProgressRatio = Math.min(
    1,
    totalActualMinutes / monthlyGoalMinutes
  );

  return {
    totalActualMinutes,
    completedSessionsCount,
    interruptedSessionsCount,
    activeDaysCount: activeDaysSet.size,
    monthlyGoalMinutes,
    monthlyGoalProgressRatio,
    previousPeriodActualMinutes,
    periodDeltaPercent,
    weeklyTrends,
    mostUsedSceneId,
    mostUsedChamberId,
  };
}

/**
 * Verified Aura Garden Milestones & Collection Achievements
 * Based strictly on unique completed session records; zero punishment for missed days.
 */
export function computeAuraGardenAchievements(
  sessions: SessionRecord[],
  weeklyGoalMinutes = 900,
  excludeSeed = false
): AuraGardenAchievement[] {
  const verified = filterVerifiedSessions(sessions, excludeSeed);
  const completed = verified.filter(
    (s) => (s.completionStatus ?? 'completed') === 'completed'
  );
  const totalActualMinutes = completed.reduce(
    (acc, s) => acc + (s.actualMinutes ?? s.durationMinutes),
    0
  );
  const distinctScenes = new Set(completed.map((s) => s.sceneId));
  const distinctOrbs = new Set(
    completed.map((s) => s.orbDesign ?? 'celestial-jelly')
  );

  return [
    {
      id: 'ach-first-session',
      title: 'First Intentional Session',
      description: 'Complete your first full focus session without interruption.',
      unlocked: completed.length >= 1,
      progressText: `${Math.min(1, completed.length)} / 1 session`,
      rewardEffect: 'Awakens primary bioluminescent seed in your sanctuary',
    },
    {
      id: 'ach-steady-five',
      title: 'Steady Sanctuary Rhythm',
      description: 'Complete 5 verified focus sessions at your own pace.',
      unlocked: completed.length >= 5,
      progressText: `${Math.min(5, completed.length)} / 5 sessions`,
      rewardEffect: 'Unlocks dual-ring pelagic spores in My Aura Garden',
    },
    {
      id: 'ach-atmosphere-explorer',
      title: 'Atmosphere Collector',
      description:
        'Complete focus sessions across at least 3 distinct atmospheric worlds.',
      unlocked: distinctScenes.size >= 3,
      progressText: `${ Math.min(3, distinctScenes.size)} / 3 environments`,
      rewardEffect: 'Reveals chromatic aurora floor caustics in the garden',
    },
    {
      id: 'ach-organism-trinity',
      title: 'Living Organism Trinity',
      description:
        'Cultivate sessions with Liquid Lens, Celestial Jelly, and Living Bloom.',
      unlocked: distinctOrbs.size >= 3,
      progressText: `${Math.min(3, distinctOrbs.size)} / 3 organisms`,
      rewardEffect: 'Harmonizes all three organism species in your garden',
    },
    {
      id: 'ach-deep-immersion',
      title: 'Deep Focus Milestone',
      description: `Accumulate ${Math.round(
        weeklyGoalMinutes / 60
      )} hours (${weeklyGoalMinutes}m) of verified completed focus time.`,
      unlocked: totalActualMinutes >= weeklyGoalMinutes,
      progressText: `${Math.min(
        weeklyGoalMinutes,
        totalActualMinutes
      )}m / ${weeklyGoalMinutes}m`,
      rewardEffect: 'Unlocks golden pollen & zenith canopy luminescence',
    },
  ];
}

/**
 * Local Deterministic Task Breakdown (used when AI is disabled/unconsented or offline)
 */
export function generateLocalTaskBreakdown(
  task: string,
  preferredMinutes = 25
): TaskBreakdownStep[] {
  const clean = task.trim() || 'Focused project work';
  const stepMins =
    preferredMinutes >= 15 && preferredMinutes <= 90 ? preferredMinutes : 25;

  return [
    {
      stepNumber: 1,
      title: `Outline & Core Scope: ${clean}`,
      durationMinutes: Math.min(25, stepMins),
      recommendedSceneId: 'deep-current',
      recommendedChamberId: 'ocean-drift',
      rationale:
        'Define clear boundaries and gather essential references before deep execution.',
    },
    {
      stepNumber: 2,
      title: `Primary Deep Block: ${clean}`,
      durationMinutes: stepMins,
      recommendedSceneId: 'electric-quiet',
      recommendedChamberId: 'rain-chamber',
      rationale:
        'Focus on the highest-priority problem or section with zero context switching.',
    },
    {
      stepNumber: 3,
      title: `Application & Problem Solving: ${clean}`,
      durationMinutes: stepMins,
      recommendedSceneId: 'chromatic-flow',
      recommendedChamberId: 'forest-echo',
      rationale:
        'Complete exercises, implementation details, or draft refinement.',
    },
    {
      stepNumber: 4,
      title: `Verification & Next-Session Notes`,
      durationMinutes: 15,
      recommendedSceneId: 'night-signal',
      recommendedChamberId: 'celestial-tone',
      rationale:
        'Review key takeaways and write a clear prompt for your next session.',
    },
  ];
}

/**
 * Local Deterministic Weekly Reflection (used when AI is disabled or offline)
 */
export function generateLocalWeeklyReflection(stats: {
  completedSessions: number;
  interruptedSessions: number;
  totalActualMinutes: number;
  mostUsedEnvironment: string;
  bestDayLabel: string;
  averageMinutes: number;
}): { summary: string; highlights: string[] } {
  if (stats.completedSessions === 0 && stats.interruptedSessions === 0) {
    return {
      summary:
        'No focus sessions have been recorded in this 7-day window yet. Begin with a single 25-minute session in your preferred atmosphere to establish your baseline rhythm.',
      highlights: [
        '0 sessions recorded this week.',
        'All reflections are computed strictly from real completed and interrupted sessions.',
      ],
    };
  }

  const hrs = Math.floor(stats.totalActualMinutes / 60);
  const mins = stats.totalActualMinutes % 60;
  const durLabel =
    hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  return {
    summary: `You completed ${stats.completedSessions} focus session${
      stats.completedSessions === 1 ? '' : 's'
    } (${durLabel} of actual focused time) this week. Your most-used environment was ${
      stats.mostUsedEnvironment || 'Deep Current'
    }, and your strongest focus day was ${
      stats.bestDayLabel || 'this week'
    } with an average session duration of ${stats.averageMinutes || 25} minutes.`,
    highlights: [
      `${stats.completedSessions} completed and ${stats.interruptedSessions} interrupted session${
        stats.interruptedSessions === 1 ? '' : 's'
      } logged honestly.`,
      `Average actual session duration: ${stats.averageMinutes || 25}m.`,
      `Primary focus atmosphere: ${stats.mostUsedEnvironment || 'Deep Current'}.`,
    ],
  };
}

/**
 * Preferred Soundscape helper for Focus Patterns
 */
export function computePreferredSoundscapes(
  sessions: SessionRecord[],
  excludeSeed = false
): Array<{ chamberId: ChamberId; name: string; minutes: number; count: number }> {
  const verified = filterVerifiedSessions(sessions, excludeSeed);
  const map = new Map<ChamberId, { minutes: number; count: number }>();

  for (const s of verified) {
    const mins = s.actualMinutes ?? s.durationMinutes;
    const prev = map.get(s.chamberId) ?? { minutes: 0, count: 0 };
    prev.minutes += mins;
    prev.count += 1;
    map.set(s.chamberId, prev);
  }

  return Array.from(map.entries())
    .map(([chamberId, val]) => {
      const found = CHAMBERS.find((c) => c.id === chamberId);
      return {
        chamberId,
        name: found?.name || chamberId,
        minutes: val.minutes,
        count: val.count,
      };
    })
    .sort((a, b) => b.minutes - a.minutes);
}
