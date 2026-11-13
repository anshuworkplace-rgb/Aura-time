import React from 'react';
import {
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Sparkles,
  Sprout,
} from 'lucide-react';
import type { UserSettings } from '../../../types/aura';
import { getActualSessionMinutes } from '../hooks/useAuraRhythmMetrics';
import { AURA_CONSOLE_STYLES } from '../styles/auraConsole.styles';
import type { MyRhythmSummary } from '../types/auraConsole.types';

export interface MyRhythmPanelProps {
  summary: MyRhythmSummary;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onClearSampleData?: () => void;
}

function formatDurationReadable(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  if (safe < 60) return `${safe}m`;
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export const MyRhythmPanel: React.FC<MyRhythmPanelProps> = ({
  summary,
  settings,
  onUpdateSettings,
  onClearSampleData,
}) => {
  const showGarden = settings.gardenProgressionEnabled !== false;

  return (
    <div className="flex flex-col gap-4" aria-label="My Rhythm focus analytics">
      {/* Primary Metrics Grid: Today, Weekly, Completed Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Today's Actual Focus */}
        <div className={AURA_CONSOLE_STYLES.metricTile}>
          <div className="flex items-center justify-between text-[11px] text-[#A3A1BA]">
            <span>Today&apos;s Focus</span>
            <Clock className="w-3.5 h-3.5 text-[#2FE8FF]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-light text-[#F5F6FF] tabular-nums">
              {formatDurationReadable(summary.todayActualMinutes)}
            </span>
            <span className="text-[11px] text-[#A3A1BA]">
              / {formatDurationReadable(summary.dailyTargetMinutes)}
            </span>
          </div>
          <div className="mt-2.5 w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2FE8FF] to-[#5EF2C4] transition-all"
              style={{
                width: `${Math.round(summary.dailyProgressRatio * 100)}%`,
              }}
            />
          </div>
          <span className="mt-1.5 text-[10px] text-[#A3A1BA]">
            {Math.round(summary.dailyProgressRatio * 100)}% of daily target
          </span>
        </div>

        {/* Weekly Actual Focus */}
        <div className={AURA_CONSOLE_STYLES.metricTile}>
          <div className="flex items-center justify-between text-[11px] text-[#A3A1BA]">
            <span>7-Day Actual</span>
            <Flame className="w-3.5 h-3.5 text-[#8A5CFF]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-light text-[#F5F6FF] tabular-nums">
              {formatDurationReadable(summary.weeklyActualMinutes)}
            </span>
            <span className="text-[11px] text-[#A3A1BA]">
              / {formatDurationReadable(summary.weeklyTargetMinutes)}
            </span>
          </div>
          <div className="mt-2.5 w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8A5CFF] to-[#2FE8FF] transition-all"
              style={{
                width: `${Math.round(summary.weeklyProgressRatio * 100)}%`,
              }}
            />
          </div>
          <span className="mt-1.5 text-[10px] text-[#A3A1BA]">
            {summary.weeklyCompletedCount} completed this week
          </span>
        </div>

        {/* Completed Session Count */}
        <div className={AURA_CONSOLE_STYLES.metricTile}>
          <div className="flex items-center justify-between text-[11px] text-[#A3A1BA]">
            <span>Completed Sessions</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5EF2C4]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-light text-[#F5F6FF] tabular-nums">
              {summary.totalCompletedCount}
            </span>
            {summary.totalInterruptedCount > 0 && (
              <span className="text-[11px] text-[#A3A1BA]">
                ({summary.totalInterruptedCount} early)
              </span>
            )}
          </div>
          <span className="mt-2 text-[10px] text-[#A3A1BA]">
            {summary.restorativeSessionsCount > 0
              ? `${summary.restorativeSessionsCount} Liquid Lens restorative (${summary.restorativeMinutesTotal}m)`
              : 'Credited from actual elapsed time'}
          </span>
        </div>
      </div>

      {/* Single Evidence-Based Observation */}
      <div
        className={`${AURA_CONSOLE_STYLES.sectionCard} border-[#2FE8FF]/20 bg-gradient-to-br from-[#2FE8FF]/[0.06] to-transparent`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[#2FE8FF] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Evidence-Based Observation</span>
          </div>
          {summary.observation.metricBadge && (
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.09] text-[10px] font-mono text-[#F5F6FF]">
              {summary.observation.metricBadge}
            </span>
          )}
        </div>
        <h3 className="text-sm font-medium text-[#F5F6FF]">
          {summary.observation.headline}
        </h3>
        <p className="text-xs text-[#A3A1BA] leading-relaxed">
          {summary.observation.detail}
        </p>
      </div>

      {/* Compact Optional Aura Garden Visualization */}
      {showGarden && (
        <div className={AURA_CONSOLE_STYLES.sectionCard}>
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F5F6FF]">
              <Sprout className="w-3.5 h-3.5 text-[#5EF2C4]" />
              <span>Aura Sanctuary Garden</span>
            </div>
            <span className="text-[11px] text-[#A3A1BA]">
              {summary.gardenNodes.length} living nodes
            </span>
          </div>

          {summary.gardenNodes.length === 0 ? (
            <p className="text-xs text-[#A3A1BA] py-2">
              Your sanctuary garden grows organically as you complete focus and
              Liquid Lens restorative sessions.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {summary.gardenNodes.map((node) => (
                <div
                  key={node.id}
                  title={`${node.label} (${node.minutes}m · ${node.isoDate})`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px]"
                >
                  <span
                    className={`w-2 h-2 ${
                      node.kind === 'focus-bloom'
                        ? 'rounded-full'
                        : 'rounded-sm rotate-45'
                    }`}
                    style={{
                      backgroundColor: node.accentHex,
                      boxShadow: `0 0 10px ${node.accentHex}`,
                    }}
                  />
                  <span className="text-[#F5F6FF] truncate max-w-[110px]">
                    {node.label}
                  </span>
                  <span className="font-mono text-[10px] text-[#A3A1BA]">
                    {node.minutes}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Session History */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
              Recent Session History
            </h3>
            <p className="text-[11px] text-[#A3A1BA]">
              Showing actual focused duration credited per session
            </p>
          </div>

          {summary.seedSessionsCount > 0 && (
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#A3A1BA] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.excludeSampleDataInInsights)}
                  onChange={(e) =>
                    onUpdateSettings({
                      excludeSampleDataInInsights: e.target.checked,
                    })
                  }
                  className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
                />
                <span>Hide sample records</span>
              </label>
              {onClearSampleData && (
                <button
                  type="button"
                  onClick={onClearSampleData}
                  className="text-[11px] text-[#2FE8FF] hover:underline"
                >
                  Clear samples
                </button>
              )}
            </div>
          )}
        </div>

        {summary.recentSessions.length === 0 ? (
          <div className="py-6 text-center flex flex-col items-center gap-2 border border-dashed border-white/[0.08] rounded-xl">
            <Compass className="w-5 h-5 text-[#A3A1BA]" />
            <p className="text-xs font-medium text-[#F5F6FF]">
              No recorded focus sessions yet
            </p>
            <p className="text-[11px] text-[#A3A1BA] max-w-xs">
              Start a Focus session with Celestial Jelly or Living Bloom, or
              enter Liquid Lens to begin building your personal history.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {summary.recentSessions.map((session) => {
              const actualMins = getActualSessionMinutes(session);
              const plannedMins =
                session.plannedMinutes ?? session.durationMinutes;
              const isInterrupted = session.completionStatus === 'interrupted';

              return (
                <li
                  key={session.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#F5F6FF] truncate">
                        {session.label || 'Focus Session'}
                      </span>
                      {session.isSeed && (
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] uppercase tracking-wider text-[#A3A1BA]">
                          Sample
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#A3A1BA]">
                      {session.isoDate} ·{' '}
                      {isInterrupted ? 'Ended early' : 'Completed'}
                    </span>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-mono text-xs text-[#2FE8FF] font-medium">
                      {actualMins}m actual
                    </span>
                    {plannedMins !== actualMins && (
                      <span className="font-mono text-[10px] text-[#A3A1BA]">
                        of {plannedMins}m planned
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
