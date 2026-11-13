import React, { useMemo, useState } from 'react';
import { SessionRecord } from '../types/aura';
import {
  CHAMBERS,
  FOCUS_SCENES,
  calculateDailyTotal,
  calculateFavorites,
  calculateStreak,
  calculateTimeOfDayRhythm,
  calculateWeeklyRhythm,
  formatTodaySignal,
} from '../utils/focusEngine';
import { X } from 'lucide-react';

interface InsightsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionRecord[];
  todayIsoDate: string;
}

export const InsightsOverlay: React.FC<InsightsOverlayProps> = ({
  isOpen,
  onClose,
  sessions,
  todayIsoDate,
}) => {
  const [selectedStar, setSelectedStar] = useState<SessionRecord | null>(
    sessions[0] || null
  );

  const todayMinutes = useMemo(
    () => calculateDailyTotal(sessions, todayIsoDate),
    [sessions, todayIsoDate]
  );

  const streak = useMemo(
    () => calculateStreak(sessions, todayIsoDate),
    [sessions, todayIsoDate]
  );

  const weeklyRhythm = useMemo(
    () => calculateWeeklyRhythm(sessions, todayIsoDate),
    [sessions, todayIsoDate]
  );

  const timeOfDay = useMemo(
    () => calculateTimeOfDayRhythm(sessions),
    [sessions]
  );

  const favorites = useMemo(() => calculateFavorites(sessions), [sessions]);

  // 28-Day Weekly Heat Map Cells
  const heatmapCells = useMemo(() => {
    const [y, m, d] = todayIsoDate.split('-').map(Number);
    const baseUtc = Date.UTC(y, m - 1, d);
    return Array.from({ length: 28 }, (_, idx) => {
      const offset = 27 - idx;
      const dt = new Date(baseUtc - offset * 86400000);
      const yyyy = dt.getUTCFullYear();
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const iso = `${yyyy}-${mm}-${dd}`;
      const dayEntries = sessions.filter((s) => s.isoDate === iso);
      const mins = dayEntries.reduce((acc, s) => acc + s.durationMinutes, 0);
      const scene =
        FOCUS_SCENES[dayEntries[0]?.sceneId || 'deep-current'] ||
        FOCUS_SCENES['deep-current'];
      return {
        isoDate: iso,
        dayNum: dt.getUTCDate(),
        minutes: mins,
        color: scene.colors.primary,
        secondary: scene.colors.secondary,
      };
    });
  }, [sessions, todayIsoDate]);

  // Constellation coordinates mapped onto a 240x100 aspect-preserved field
  const constellationNodes = useMemo(() => {
    return sessions.slice(0, 12).map((s, idx) => {
      const angle = idx * 0.92 + 0.5;
      const radiusRatio = 0.22 + (idx / Math.max(1, sessions.length)) * 0.65;
      const x = 120 + Math.cos(angle) * radiusRatio * 94;
      const y = 50 + Math.sin(angle * 1.3) * radiusRatio * 34;
      const sc = FOCUS_SCENES[s.sceneId] || FOCUS_SCENES['deep-current'];
      return {
        session: s,
        x: Math.max(22, Math.min(218, x)),
        y: Math.max(16, Math.min(84, y)),
        r: Math.max(5.5, Math.min(12, s.durationMinutes / 7.5)),
        color: sc.colors.primary,
        secondary: sc.colors.secondary,
      };
    });
  }, [sessions]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visual Focus Journal"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-3xl bg-[#0C0F20]/95 border border-white/12 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#2FE8FF]">
              Visual Focus Journal
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] mt-0.5">
              How am I building a rhythm?
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Visual Journal"
            className="p-2 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 1: 6 Quiet Typographic Signals (Today, Streaks, Completed, Favorite Scene, Favorite Chamber) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Today&apos;s Focus</span>
            <span className="font-display text-xl font-semibold text-[#F5F6FF] tabular-nums">
              {formatTodaySignal(todayMinutes).replace(' today', '')}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Completed Sessions</span>
            <span className="font-display text-xl font-semibold text-[#F5F6FF] tabular-nums">
              {sessions.length}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Current Streak</span>
            <span className="font-display text-xl font-semibold text-[#2FE8FF] tabular-nums">
              {streak.currentStreak} days
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Longest Streak</span>
            <span className="font-display text-xl font-semibold text-[#F5F6FF] tabular-nums">
              {streak.longestStreak} days
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Favorite Focus Scene</span>
            <span className="font-display text-base font-semibold text-[#FF4FA3] truncate">
              {favorites.favoriteScene.scene.name}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] text-[#A3A1BA]">Favorite Chamber</span>
            <span className="font-display text-base font-semibold text-[#FFB08A] truncate">
              {favorites.favoriteChamber.chamber.name}
            </span>
          </div>
        </div>

        {/* Row 2: Weekly Rhythm Fluid Color Cells + Constellation Field of Completed Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Fluid Color Cells (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl bg-white/[0.025] border border-white/8 p-4 flex flex-col justify-between gap-2.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
                Weekly Rhythm Fluid Cells
              </h3>
              <p className="text-[11px] text-[#A3A1BA]">
                Each day&apos;s liquid saturation reflects focus depth and active
                Focus Scene.
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-1">
              {weeklyRhythm.map((day) => {
                const scene = FOCUS_SCENES[day.dominantScene];
                const intensity = Math.min(1, day.minutes / 140);
                return (
                  <div
                    key={day.isoDate}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-full h-24 rounded-2xl border border-white/10 relative overflow-hidden flex items-end justify-center p-1.5"
                      style={{
                        background:
                          day.minutes > 0
                            ? `radial-gradient(circle at 50% ${
                                100 - Math.round(intensity * 65)
                              }%, ${scene.colors.primary}CC, ${
                                scene.colors.secondary
                              }66 55%, rgba(7,8,18,0.85))`
                            : 'rgba(255, 255, 255, 0.03)',
                      }}
                    >
                      <span className="font-mono tabular-nums text-[10px] font-medium text-[#F5F6FF] z-10">
                        {day.minutes > 0 ? `${day.minutes}m` : '—'}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#A3A1BA]">
                      {day.dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Constellation Field of Completed Sessions (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl bg-white/[0.025] border border-white/8 p-4 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
                  Constellation of Completed Sessions
                </h3>
                <p className="text-[11px] text-[#A3A1BA]">
                  Select any luminous node to revisit that session&apos;s focus
                  state.
                </p>
              </div>
            </div>

            <div className="w-full h-24 rounded-xl bg-[#070812]/80 border border-white/8 overflow-hidden">
              <svg
                viewBox="0 0 240 100"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                aria-label="Constellation of completed sessions"
              >
                {constellationNodes.map((node, i) => {
                  if (i === 0) return null;
                  const prev = constellationNodes[i - 1];
                  return (
                    <line
                      key={`edge-${node.session.id}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={node.x}
                      y2={node.y}
                      stroke="rgba(245, 246, 255, 0.16)"
                      strokeWidth="0.6"
                      strokeDasharray="2 2"
                    />
                  );
                })}

                {constellationNodes.map((node) => {
                  const active = selectedStar?.id === node.session.id;
                  return (
                    <g
                      key={node.session.id}
                      onClick={() => setSelectedStar(node.session)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.r}
                        fill={node.color}
                        opacity={active ? 0.42 : 0.2}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={active ? 3.8 : 2.5}
                        fill={active ? '#F5F6FF' : node.secondary}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {selectedStar && (
              <div className="flex items-center justify-between gap-3 text-xs px-3 py-1.5 rounded-xl bg-white/[0.04]">
                <span className="font-medium text-[#F5F6FF] truncate">
                  {selectedStar.label} ·{' '}
                  <span className="text-[#2FE8FF]">
                    {FOCUS_SCENES[selectedStar.sceneId]?.name}
                  </span>
                </span>
                <span className="font-mono tabular-nums text-[#A3A1BA] shrink-0">
                  {selectedStar.durationMinutes}m ·{' '}
                  {
                    CHAMBERS.find((c) => c.id === selectedStar.chamberId)
                      ?.name
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Focus by Time of Day & 28-Day Weekly Heat Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Focus by Time of Day (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white/[0.025] border border-white/8 p-4 flex flex-col justify-between gap-2.5">
            <div>
              <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
                Focus by Time of Day
              </h3>
              <p className="text-[11px] text-[#A3A1BA]">
                When your creative energy naturally peaks.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {timeOfDay.map((slot) => (
                <div
                  key={slot.id}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/8 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: slot.color }}
                    />
                    <span className="font-mono tabular-nums text-xs text-[#F5F6FF]">
                      {slot.percentage}%
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[#F5F6FF]">
                    {slot.label}
                  </span>
                  <span className="font-mono tabular-nums text-[10px] text-[#A3A1BA]">
                    {slot.minutes}m · {slot.window}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Heat Map (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-white/[0.025] border border-white/8 p-4 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
                  28-Day Rhythm Heat Map
                </h3>
                <p className="text-[11px] text-[#A3A1BA]">
                  Four-week horizon of sustained creative presence.
                </p>
              </div>
              <span className="text-xs text-[#A3A1BA]">Last 4 Weeks</span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {heatmapCells.map((cell) => {
                const ratio = Math.min(1, cell.minutes / 120);
                return (
                  <div
                    key={cell.isoDate}
                    title={`${cell.isoDate}: ${cell.minutes} minutes`}
                    style={{
                      background:
                        cell.minutes > 0
                          ? `radial-gradient(circle at 35% 35%, ${cell.color}${Math.round(
                              40 + ratio * 55
                            )
                              .toString(16)
                              .padStart(2, '0')}, ${cell.secondary}22)`
                          : 'rgba(255, 255, 255, 0.03)',
                    }}
                    className="h-8 rounded-xl border border-white/8 px-2 py-1 flex items-center justify-between"
                  >
                    <span className="font-mono tabular-nums text-[10px] text-[#A3A1BA]">
                      {cell.dayNum}
                    </span>
                    {cell.minutes > 0 && (
                      <span className="font-mono tabular-nums text-[10px] font-medium text-[#F5F6FF]">
                        {cell.minutes}m
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
