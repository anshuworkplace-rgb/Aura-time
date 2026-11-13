import { SessionRecord } from '../types/aura';
import { filterVerifiedSessions } from './auraIntelligence';

export type ProductEventType =
  | 'first_visit'
  | 'first_session_started'
  | 'session_completed'
  | 'session_interrupted'
  | 'environment_selected'
  | 'restore_session_started'
  | 'restore_session_completed'
  | 'weekly_goal_reached'
  | 'routine_saved'
  | 'premium_interest'
  | 'upgrade_initiated';

export interface ProductAnalyticsEvent {
  id: string;
  type: ProductEventType;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ProductMetricsSummary {
  activated: boolean;
  genuineSessionsStartedCount: number;
  genuineSessionsCompletedCount: number;
  genuineSessionsInterruptedCount: number;
  sessionCompletionRatePercent: number | null;
  activeDaysCount: number;
  d1Retained: boolean;
  d7Retained: boolean;
  d30Retained: boolean;
  weeklyHabitSessionsCount: number;
  premiumInterestEventsCount: number;
  totalTrackedEvents: number;
}

const ANALYTICS_STORAGE_KEY = 'aura_product_analytics_events_v1';

export function loadProductAnalyticsEvents(): ProductAnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Privacy-conscious event recorder:
 * - Never records session labels, journal contents, or personal identifiers.
 * - No-ops when `consentEnabled` is false.
 */
export function trackProductEvent(
  type: ProductEventType,
  consentEnabled: boolean,
  metadata?: Record<string, string | number | boolean>
): ProductAnalyticsEvent | null {
  if (!consentEnabled || typeof window === 'undefined') return null;

  try {
    const current = loadProductAnalyticsEvents();
    // Deduplicate one-time milestone events
    if (
      (type === 'first_visit' || type === 'first_session_started') &&
      current.some((e) => e.type === type)
    ) {
      return null;
    }

    const nextEvent: ProductAnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      timestamp: new Date().toISOString(),
      metadata,
    };
    const updated = [nextEvent, ...current].slice(0, 250);
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(updated));
    return nextEvent;
  } catch {
    return null;
  }
}

export function clearProductAnalyticsEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

/**
 * Computes transparent Activation, Session Completion, Retention, Habit Formation, and Monetization metrics
 * strictly separating genuine user sessions from initial sample/seed data.
 */
export function computeProductMetricsSummary(
  sessions: SessionRecord[],
  events: ProductAnalyticsEvent[],
  todayIsoDate: string
): ProductMetricsSummary {
  const genuineSessions = filterVerifiedSessions(sessions, true);
  const completed = genuineSessions.filter(
    (s) => (s.completionStatus ?? 'completed') === 'completed'
  );
  const interrupted = genuineSessions.filter(
    (s) => s.completionStatus === 'interrupted'
  );

  const startedFromEvents = events.filter(
    (e) =>
      e.type === 'session_completed' ||
      e.type === 'session_interrupted' ||
      e.type === 'first_session_started'
  ).length;

  const genuineTotal = genuineSessions.length;
  const activated = genuineTotal > 0 || startedFromEvents > 0;

  const sessionCompletionRatePercent =
    genuineTotal > 0 ? Math.round((completed.length / genuineTotal) * 100) : null;

  const distinctGenuineDates = Array.from(
    new Set(genuineSessions.map((s) => s.isoDate))
  ).sort();

  let d1Retained = false;
  let d7Retained = false;
  let d30Retained = false;

  if (distinctGenuineDates.length >= 2) {
    const firstDate = new Date(`${distinctGenuineDates[0]}T12:00:00`);
    const lastDate = new Date(
      `${distinctGenuineDates[distinctGenuineDates.length - 1]}T12:00:00`
    );
    const spanDays = Math.round(
      (lastDate.getTime() - firstDate.getTime()) / 86400000
    );
    d1Retained = spanDays >= 1;
    d7Retained = spanDays >= 7;
    d30Retained = spanDays >= 30;
  }

  // Genuine sessions in the past 7 days
  const anchor = new Date(`${todayIsoDate}T12:00:00`);
  const weeklyHabitSessionsCount = genuineSessions.filter((s) => {
    const d = new Date(`${s.isoDate}T12:00:00`);
    const diff = Math.round((anchor.getTime() - d.getTime()) / 86400000);
    return diff >= 0 && diff < 7 && (s.completionStatus ?? 'completed') === 'completed';
  }).length;

  const premiumInterestEventsCount = events.filter(
    (e) => e.type === 'premium_interest' || e.type === 'upgrade_initiated'
  ).length;

  return {
    activated,
    genuineSessionsStartedCount: genuineTotal,
    genuineSessionsCompletedCount: completed.length,
    genuineSessionsInterruptedCount: interrupted.length,
    sessionCompletionRatePercent,
    activeDaysCount: distinctGenuineDates.length,
    d1Retained,
    d7Retained,
    d30Retained,
    weeklyHabitSessionsCount,
    premiumInterestEventsCount,
    totalTrackedEvents: events.length,
  };
}
