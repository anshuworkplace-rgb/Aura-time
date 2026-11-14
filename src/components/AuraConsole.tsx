import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Sliders,
  ShieldCheck,
  X,
  Play,
  Sprout,
  Clock,
  Target,
  Trash2,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Bell,
  Check,
  Cloud,
  UserCheck,
  LogOut,
  Lock,
  Compass,
  BookOpen,
  Plus,
  Copy,
} from 'lucide-react';
import {
  AuraConsoleMyRhythmProps,
  AuraConsolePersonalDataProps,
  AuraConsolePreferencesProps,
  AuraConsoleProps,
  BreathingPresetId,
  ChamberId,
  FocusRoutine,
  FocusSceneId,
  OrbDesignId,
  PerformanceMode,
  PreferredWorkPeriod,
} from '../types/aura';
import {
  BREATHING_PRESETS,
  CHAMBERS,
  FOCUS_SCENES,
  ORB_DESIGNS,
  calculatePersonalFocusPatterns,
  calculateTodaySummary,
  calculateWeeklyOverview,
  computeAuraGardenState,
  formatDurationCompact,
  getLocalIsoDate,
} from '../utils/focusEngine';
import {
  computeSmartRecommendations,
  generateLocalTaskBreakdown,
} from '../utils/auraIntelligence';
import {
  clearProductAnalyticsEvents,
  computeProductMetricsSummary,
  loadProductAnalyticsEvents,
} from '../utils/productAnalytics';
import { AuraButton } from './AuraButton';
import { PWAInstallButton } from './PWAInstallButton';

/**
 * ============================================================================
 * 1. MY RHYTHM — Actual Focus Data, Evidence Observation, History, Goals & Garden
 * ============================================================================
 */
export const MyRhythm: React.FC<AuraConsoleMyRhythmProps> = ({
  sessions,
  restoreSessions,
  routines,
  settings,
  scene,
  currentDurationMinutes,
  currentSceneId,
  onUpdateSettings,
  onApplyRecommendation,
  onApplyRoutine,
  onSaveRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
  onApplyTaskStep,
  onClearSeedSessions,
  onReturnToSanctuary,
}) => {
  const todayIso = getLocalIsoDate();
  const excludeSeed = Boolean(settings.excludeSampleDataInInsights);
  const hasSeedSessions = useMemo(
    () => sessions.some((s) => Boolean(s.isSeed)),
    [sessions]
  );

  const filteredSessions = useMemo(
    () => (excludeSeed ? sessions.filter((s) => !s.isSeed) : sessions),
    [excludeSeed, sessions]
  );

  const todaySummary = useMemo(
    () =>
      calculateTodaySummary(
        filteredSessions,
        settings.dailyGoalMinutes,
        todayIso
      ),
    [filteredSessions, settings.dailyGoalMinutes, todayIso]
  );

  const weeklyOverview = useMemo(
    () =>
      calculateWeeklyOverview(
        filteredSessions,
        settings.weeklyGoalMinutes || 600,
        todayIso
      ),
    [filteredSessions, settings.weeklyGoalMinutes, todayIso]
  );

  const patterns = useMemo(
    () => calculatePersonalFocusPatterns(filteredSessions),
    [filteredSessions]
  );

  const gardenState = useMemo(
    () =>
      computeAuraGardenState(
        filteredSessions,
        settings.weeklyGoalMinutes || 600,
        todayIso
      ),
    [filteredSessions, settings.weeklyGoalMinutes, todayIso]
  );

  // Single meaningful evidence-based observation
  const primaryObservation = useMemo(() => {
    const recs = computeSmartRecommendations({
      sessions: filteredSessions,
      todayIsoDate: todayIso,
      currentDurationMinutes,
      currentSceneId,
      settings,
    });
    return recs[0] || null;
  }, [
    currentDurationMinutes,
    currentSceneId,
    filteredSessions,
    settings,
    todayIso,
  ]);

  const [showGarden, setShowGarden] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [taskGoalInput, setTaskGoalInput] = useState('');
  const [taskTotalMins, setTaskTotalMins] = useState(90);
  const [taskSteps, setTaskSteps] = useState(() =>
    generateLocalTaskBreakdown('Deep architecture & review', 30)
  );

  const gardenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!showGarden) return;
    const canvas = gardenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 560;
    const height = 200;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#070918');
    bg.addColorStop(1, '#0E152E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Draw organic flora nodes representing completed focus sessions
    const count = Math.max(1, Math.min(16, gardenState.totalCompletedSessions));
    for (let i = 0; i < count; i++) {
      const x = 45 + ((width - 90) * i) / Math.max(1, count - 1 || 1);
      const stemH = 38 + (i % 4) * 18;
      const topY = height - 24 - stemH;

      ctx.strokeStyle = 'rgba(56, 248, 168, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, height - 18);
      ctx.quadraticCurveTo(
        x + (i % 2 === 0 ? 8 : -8),
        height - 18 - stemH * 0.5,
        x,
        topY
      );
      ctx.stroke();

      const bloom = ctx.createRadialGradient(x, topY, 2, x, topY, 14);
      bloom.addColorStop(0, scene.colors.secondary);
      bloom.addColorStop(0.6, `${scene.colors.primary}66`);
      bloom.addColorStop(1, 'rgba(7,8,18,0)');
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(x, topY, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [gardenState.totalCompletedSessions, scene.colors, showGarden]);

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) return;
    const created: FocusRoutine = {
      id: `routine-${Date.now()}`,
      name: newRoutineName.trim(),
      description: `${currentDurationMinutes}m focus in ${scene.name}`,
      focusDurationMinutes: currentDurationMinutes,
      sceneId: currentSceneId,
      chamberId: settings.selectedChamberId || 'ocean-drift',
      orbDesign: settings.orbDesign ?? 'celestial-jelly',
      breakDurationMinutes: settings.breakMinutes,
      targetSessionsCount: 2,
      isCustom: true,
    };
    onSaveRoutine(created);
    setNewRoutineName('');
  };

  return (
    <div
      data-testid="aura-console-my-rhythm"
      className="space-y-6 pb-8"
    >
      {/* Sample Data Banner */}
      {hasSeedSessions && (
        <div
          data-testid="reflect-seed-banner"
          className="px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-3 text-[#A3A1BA]">
            <span>Sample history is included alongside your sessions.</span>
            <label className="inline-flex items-center gap-1.5 text-[#F5F6FF] cursor-pointer">
              <input
                type="checkbox"
                checked={excludeSeed}
                onChange={(e) =>
                  onUpdateSettings({
                    excludeSampleDataInInsights: e.target.checked,
                  })
                }
                className="rounded border-white/20 bg-white/10 text-[#2FE8FF]"
              />
              <span>Hide sample data</span>
            </label>
          </div>
          <button
            type="button"
            data-testid="clear-seed-sessions-btn"
            onClick={onClearSeedSessions}
            className="text-xs font-medium text-[#2FE8FF] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Sample Data</span>
          </button>
        </div>
      )}

      {/* 1. Primary Metrics Strip: Actual Focus, Weekly Summary, Completed Sessions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          data-testid="today-actual-focus-card"
          className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"
        >
          <span className="text-[11px] text-[#A3A1BA] block">
            Today&apos;s Actual Focus
          </span>
          <div className="font-display text-2xl font-semibold text-[#F5F6FF] tabular-nums mt-1">
            {formatDurationCompact(todaySummary.actualMinutes)}
          </div>
          <span className="text-[11px] font-mono text-[#A3A1BA] tabular-nums mt-1 block">
            Goal {formatDurationCompact(settings.dailyGoalMinutes)} (
            {todaySummary.goalProgressPercent}%)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[11px] text-[#A3A1BA] block">
            7-Day Weekly Total
          </span>
          <div className="font-display text-2xl font-semibold text-[#F5F6FF] tabular-nums mt-1">
            {formatDurationCompact(weeklyOverview.totalActualMinutes)}
          </div>
          <span className="text-[11px] font-mono text-[#A3A1BA] tabular-nums mt-1 block">
            {weeklyOverview.days.filter((d) => d.minutes > 0).length}/7 active days
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[11px] text-[#A3A1BA] block">
            Completed Sessions
          </span>
          <div className="font-display text-2xl font-semibold text-[#F5F6FF] tabular-nums mt-1">
            {weeklyOverview.completedSessionsCount}
          </div>
          <span className="text-[11px] font-mono text-[#A3A1BA] tabular-nums mt-1 block">
            {weeklyOverview.interruptedSessionsCount} early ends (7d)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
          <span className="text-[11px] text-[#A3A1BA] block">
            Restorative Pauses
          </span>
          <div className="font-display text-2xl font-semibold text-[#38F8A8] tabular-nums mt-1">
            {restoreSessions.length}
          </div>
          <span className="text-[11px] font-mono text-[#A3A1BA] mt-1 block">
            Kept separate from focus
          </span>
        </div>
      </div>

      {/* 2. Single Meaningful Evidence-Based Observation */}
      {primaryObservation && (
        <div
          data-testid="my-rhythm-observation-card"
          className="p-4 sm:p-5 rounded-2xl bg-white/[0.035] border border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#2FE8FF] font-medium">
              <span>Evidence-Based Observation</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#A3A1BA] font-normal">
                {primaryObservation.confidenceNote}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-[#F5F6FF]">
              {primaryObservation.title}
            </h3>
            <p className="text-xs text-[#A3A1BA] leading-relaxed max-w-xl">
              {primaryObservation.explanation}
            </p>
          </div>
          <AuraButton
            variant="secondary"
            size="sm"
            data-testid="apply-observation-btn"
            onClick={() => onApplyRecommendation(primaryObservation)}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{primaryObservation.actionLabel}</span>
          </AuraButton>
        </div>
      )}

      {/* 3. 7-Day Rhythm Bars */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#F5F6FF]">
            Weekly Rhythm (Last 7 Days)
          </h3>
          <span className="text-xs font-mono text-[#A3A1BA] tabular-nums">
            Frequent {formatDurationCompact(patterns.frequentLengths[0]?.minutes || 45)} /
            session
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-28 pt-4">
          {weeklyOverview.days.map((day) => {
            const maxMins = Math.max(
              60,
              ...weeklyOverview.days.map((d) => d.minutes)
            );
            const heightPct = Math.max(
              6,
              Math.round((day.minutes / maxMins) * 100)
            );
            return (
              <div
                key={day.isoDate}
                className="flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <span className="font-mono text-[10px] text-[#A3A1BA] tabular-nums">
                  {day.minutes > 0 ? `${day.minutes}m` : '—'}
                </span>
                <div className="w-full max-w-[28px] h-16 bg-white/[0.04] rounded-lg overflow-hidden flex items-end">
                  <div
                    className="w-full rounded-lg transition-all duration-500"
                    style={{
                      height: `${heightPct}%`,
                      background:
                        day.minutes > 0
                          ? `linear-gradient(180deg, ${scene.colors.secondary}, ${scene.colors.primary})`
                          : 'rgba(255,255,255,0.08)',
                    }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#A3A1BA]">
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Goals & Personal Routines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Focus Goal Calibration */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#F5F6FF] flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#2FE8FF]" />
              <span>Focus Goals</span>
            </h3>
            <span className="font-mono text-xs text-[#2FE8FF] tabular-nums">
              {formatDurationCompact(settings.dailyGoalMinutes)} / day
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="block">
              <div className="flex justify-between text-[#A3A1BA] mb-1">
                <span>Daily Focus Target</span>
                <span className="font-mono text-[#F5F6FF] tabular-nums">
                  {formatDurationCompact(settings.dailyGoalMinutes)}
                </span>
              </div>
              <input
                type="range"
                min={30}
                max={360}
                step={15}
                value={settings.dailyGoalMinutes}
                onChange={(e) =>
                  onUpdateSettings({
                    dailyGoalMinutes: Number(e.target.value),
                  })
                }
                aria-label="Daily focus goal in minutes"
                className="w-full accent-[#2FE8FF]"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-[#A3A1BA] mb-1">
                <span>Weekly Focus Target</span>
                <span className="font-mono text-[#F5F6FF] tabular-nums">
                  {formatDurationCompact(settings.weeklyGoalMinutes || 600)}
                </span>
              </div>
              <input
                type="range"
                min={120}
                max={1800}
                step={60}
                value={settings.weeklyGoalMinutes || 600}
                onChange={(e) =>
                  onUpdateSettings({
                    weeklyGoalMinutes: Number(e.target.value),
                  })
                }
                aria-label="Weekly focus goal in minutes"
                className="w-full accent-[#2FE8FF]"
              />
            </label>
          </div>

          {/* Quick Task Breakdown */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="text-xs font-medium text-[#F5F6FF] block">
              Session Planner
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={taskGoalInput}
                onChange={(e) => setTaskGoalInput(e.target.value)}
                placeholder="Objective (e.g. Write design spec)"
                aria-label="Session objective to break down"
                className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#F5F6FF] placeholder:text-[#A3A1BA]/50"
              />
              <select
                value={taskTotalMins}
                onChange={(e) => setTaskTotalMins(Number(e.target.value))}
                aria-label="Total minutes for objective"
                className="px-2.5 py-1.5 rounded-xl bg-[#0D1022] border border-white/10 text-xs text-[#F5F6FF] font-mono"
              >
                <option value={60}>60m</option>
                <option value={90}>90m</option>
                <option value={120}>120m</option>
              </select>
              <button
                type="button"
                data-testid="generate-task-steps-btn"
                onClick={() =>
                  setTaskSteps(
                    generateLocalTaskBreakdown(
                      taskGoalInput || 'Focused work block',
                      Math.max(15, Math.round(taskTotalMins / 3))
                    )
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/45 text-xs font-medium cursor-pointer"
              >
                Plan
              </button>
            </div>
            <div className="space-y-1.5 pt-1">
              {taskSteps.slice(0, 3).map((step) => (
                <div
                  key={step.stepNumber}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] border border-white/8 text-xs"
                >
                  <div className="truncate pr-2">
                    <span className="font-mono text-[#2FE8FF] mr-1.5">
                      0{step.stepNumber}.
                    </span>
                    <span className="text-[#F5F6FF]">{step.title}</span>
                    <span className="text-[#A3A1BA] font-mono ml-1.5">
                      ({step.durationMinutes}m)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onApplyTaskStep(step)}
                    className="text-[11px] font-mono text-[#2FE8FF] hover:underline shrink-0 cursor-pointer"
                  >
                    Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Focus Routines */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10 flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-[#F5F6FF] mb-2">
              Saved Sanctuary Routines
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {routines.map((rt) => (
                <div
                  key={rt.id}
                  data-testid={`routine-card-${rt.id}`}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#F5F6FF] truncate">
                      {rt.name}
                    </div>
                    <div className="text-[11px] font-mono text-[#A3A1BA] tabular-nums">
                      {rt.focusDurationMinutes}m ·{' '}
                      {FOCUS_SCENES[rt.sceneId]?.name || rt.sceneId}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      data-testid={`apply-routine-${rt.id}`}
                      onClick={() => onApplyRoutine(rt)}
                      className="px-2.5 py-1 rounded-lg bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/40 text-xs font-medium cursor-pointer"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateRoutine(rt)}
                      aria-label={`Duplicate ${rt.name}`}
                      className="p-1.5 text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {rt.isCustom && (
                      <button
                        type="button"
                        onClick={() => onDeleteRoutine(rt.id)}
                        aria-label={`Delete ${rt.name}`}
                        className="p-1.5 text-[#A3A1BA] hover:text-[#FF4FA3] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateRoutine} className="flex gap-2 pt-2">
            <input
              type="text"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="Save current setup as routine…"
              aria-label="New routine name"
              className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-[#F5F6FF] placeholder:text-[#A3A1BA]/50"
            />
            <button
              type="submit"
              data-testid="save-routine-btn"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-[#F5F6FF] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </form>
        </div>
      </div>

      {/* 5. Recent Session History */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[#F5F6FF] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8A5CFF]" />
            <span>Recent Focus History</span>
          </h3>
          <span className="font-mono text-xs text-[#A3A1BA] tabular-nums">
            {filteredSessions.length}{' '}
            {filteredSessions.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div
            data-testid="empty-history-state"
            className="py-6 text-center text-xs text-[#A3A1BA]"
          >
            No focus sessions recorded yet. Start a session in the sanctuary to
            build your personal rhythm.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {filteredSessions.slice(0, 12).map((sess) => {
              const actual =
                sess.actualMinutes ?? sess.durationMinutes;
              const isInterrupted = sess.completionStatus === 'interrupted';
              return (
                <div
                  key={sess.id}
                  data-testid="session-history-row"
                  className="px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/6 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#F5F6FF] truncate">
                        {sess.label || 'Deep work'}
                      </span>
                      <span className="text-[11px] text-[#A3A1BA]">·</span>
                      <span
                        className={`text-[11px] ${
                          isInterrupted ? 'text-[#FFB08A]' : 'text-[#38F8A8]'
                        }`}
                      >
                        {isInterrupted ? 'Ended early' : 'Completed'}
                      </span>
                      {sess.isSeed && (
                        <span className="text-[10px] font-mono text-[#A3A1BA]">
                          (Sample)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#A3A1BA] font-mono mt-0.5">
                      {sess.isoDate} ·{' '}
                      {FOCUS_SCENES[sess.sceneId]?.name || sess.sceneId}
                    </div>
                  </div>
                  <div className="font-mono text-xs font-semibold text-[#F5F6FF] tabular-nums shrink-0">
                    {actual}m
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Optional Aura Garden Disclosure */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[#38F8A8]" />
            <div>
              <h3 className="text-xs font-semibold text-[#F5F6FF]">
                Optional Aura Garden
              </h3>
              <p className="text-[11px] text-[#A3A1BA]">
                Stage: {gardenState.stageTitle} ({gardenState.totalCompletedSessions}{' '}
                verified sessions)
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="reflect-tab-garden"
            onClick={() => setShowGarden((v) => !v)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            {showGarden ? 'Hide Garden' : 'View Aura Garden'}
          </button>
        </div>

        {showGarden && (
          <div className="mt-4 space-y-2">
            <canvas
              ref={gardenCanvasRef}
              className="w-full h-44 rounded-2xl border border-white/10"
              aria-label="My Aura Garden visualization"
            />
            <div className="flex items-center justify-between text-xs text-[#A3A1BA]">
              <span>{gardenState.stageDescription}</span>
              <button
                type="button"
                onClick={onReturnToSanctuary}
                className="text-[#2FE8FF] hover:underline cursor-pointer"
              >
                Return to Sanctuary
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * 2. PREFERENCES — Appearance, Organisms, Sound, Focus & Restore Defaults
 * ============================================================================
 */
export const Preferences: React.FC<AuraConsolePreferencesProps> = ({
  settings,
  onUpdateSettings,
  audio,
  onOpenOnboarding,
  onOpenLandingPage,
}) => {
  const [notifStatus, setNotifStatus] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unavailable';
    }
    return Notification.permission;
  });

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifStatus('unavailable');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm === 'granted') {
        onUpdateSettings({ desktopNotifications: true });
      }
    } catch {
      setNotifStatus('denied');
    }
  };

  return (
    <div
      data-testid="aura-console-preferences"
      className="space-y-5 pb-8"
    >
      {/* Quick Guides & Install Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-white/[0.025] border border-white/10">
        <span className="text-xs text-[#A3A1BA]">
          Instrument calibration for appearance, organisms, sound, and defaults.
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton compact />
          {onOpenOnboarding && (
            <button
              type="button"
              data-testid="open-onboarding-btn"
              onClick={onOpenOnboarding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] text-[#F5F6FF] border border-white/10 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[#2FE8FF]" />
              <span>First-Session Guide</span>
            </button>
          )}
          {onOpenLandingPage && (
            <button
              type="button"
              data-testid="open-landing-page-btn"
              onClick={onOpenLandingPage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] text-[#F5F6FF] border border-white/10 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#2FE8FF]" />
              <span>About Aura Time</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Organisms & Appearance */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-xs font-semibold text-[#F5F6FF]">
          01. Organisms & Appearance
        </h3>

        {/* 3 Primary Organisms */}
        <div>
          <span className="text-xs text-[#A3A1BA] block mb-2">
            Active Sanctuary Organism
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ORB_DESIGNS.map((orb) => {
              const isSelected = (settings.orbDesign ?? 'celestial-jelly') === orb.id;
              const label = orb.id === 'original' ? 'Liquid Lens' : orb.name;
              const roleText =
                orb.id === 'original' ? 'Restorative' : 'Focus Sanctuary';
              return (
                <button
                  key={orb.id}
                  type="button"
                  data-testid={`pref-organism-${orb.id}`}
                  onClick={() => onUpdateSettings({ orbDesign: orb.id as OrbDesignId })}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2FE8FF]/16 border-[#2FE8FF]/55 text-[#F5F6FF]'
                      : 'bg-white/[0.02] border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[#F5F6FF]">
                    {label}
                  </div>
                  <div className="text-[11px] text-[#2FE8FF] font-mono mt-0.5">
                    {roleText}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Midnight Atmospheric Environments */}
        <div>
          <span className="text-xs text-[#A3A1BA] block mb-2">
            Preferred Midnight Atmosphere
          </span>
          <div className="flex flex-wrap gap-2">
            {Object.values(FOCUS_SCENES).map((sc) => {
              const isSelected =
                (settings.preferredSceneId ?? 'electric-quiet') === sc.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ preferredSceneId: sc.id as FocusSceneId })
                  }
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white/[0.1] border-[#2FE8FF]/50 text-[#F5F6FF] font-medium'
                      : 'bg-white/[0.02] border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${sc.colors.primary}, ${sc.colors.secondary})`,
                    }}
                  />
                  <span>{sc.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Mix, Text Scale & High Contrast */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
          <label className="block">
            <div className="flex justify-between text-[#A3A1BA] mb-1">
              <span>Volumetric Background Mix</span>
              <span className="font-mono text-[#F5F6FF] tabular-nums">
                {Math.round((settings.backgroundMix ?? 0.52) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round((settings.backgroundMix ?? 0.52) * 100)}
              onChange={(e) =>
                onUpdateSettings({
                  backgroundMix: Number(e.target.value) / 100,
                })
              }
              aria-label="Volumetric background mix"
              className="w-full accent-[#2FE8FF]"
            />
          </label>

          <div>
            <span className="text-[#A3A1BA] block mb-1">Timer Typography Scale</span>
            <div className="flex gap-1.5">
              {(['default', 'large', 'monumental'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onUpdateSettings({ timerTextScale: scale })}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] capitalize cursor-pointer ${
                    settings.timerTextScale === scale
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sound & Acoustic Synthesis */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#F5F6FF]">
            02. Sound & Procedural Audio
          </h3>
          <button
            type="button"
            onClick={() => audio.onTogglePlay()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white/[0.05] text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            {audio.isPlaying ? (
              <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#A3A1BA]" />
            )}
            <span>{audio.isPlaying ? 'Sound Active' : 'Preview Off'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CHAMBERS.map((ch) => {
            const active = audio.activeChamberId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  audio.onSelectChamber(ch.id as ChamberId);
                  audio.onPreviewChamber(ch.id as ChamberId);
                }}
                className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  active
                    ? 'bg-[#2FE8FF]/16 border-[#2FE8FF]/50 text-[#F5F6FF]'
                    : 'bg-white/[0.02] border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                <div className="font-medium text-[#F5F6FF] truncate">
                  {ch.name}
                </div>
                <div className="text-[10px] text-[#A3A1BA] truncate">
                  {ch.shortDescription}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
          <label className="block">
            <div className="flex justify-between text-[#A3A1BA] mb-1">
              <span>Ambience Volume</span>
              <span className="font-mono text-[#F5F6FF] tabular-nums">
                {Math.round(audio.ambienceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.ambienceVolume * 100)}
              onChange={(e) =>
                audio.onChangeAmbienceVolume(Number(e.target.value) / 100)
              }
              aria-label="Ambience volume"
              className="w-full accent-[#2FE8FF]"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[#A3A1BA] mb-1">
              <span>Completion Bell Volume</span>
              <span className="font-mono text-[#F5F6FF] tabular-nums">
                {Math.round(audio.alertVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(audio.alertVolume * 100)}
              onChange={(e) =>
                audio.onChangeAlertVolume(Number(e.target.value) / 100)
              }
              aria-label="Completion bell volume"
              className="w-full accent-[#2FE8FF]"
            />
          </label>
        </div>
      </div>

      {/* 3. Focus Defaults & Restorative Defaults */}
      <div
        data-testid="personal-focus-profile-card"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Focus Defaults */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
          <h3 className="text-xs font-semibold text-[#F5F6FF]">
            03. Focus Defaults
          </h3>

          <div>
            <span className="text-[#A3A1BA] block mb-1.5">
              Default Focus Duration
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[25, 45, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ preferredDurationMinutes: mins })
                  }
                  className={`px-3 py-1.5 rounded-xl font-mono cursor-pointer ${
                    (settings.preferredDurationMinutes ?? 45) === mins
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[#A3A1BA] block mb-1.5">
              Preferred Work Period
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'morning', label: 'Morning' },
                  { id: 'afternoon', label: 'Afternoon' },
                  { id: 'evening', label: 'Evening' },
                  { id: 'night', label: 'Night' },
                  { id: 'flexible', label: 'Flexible' },
                ] as Array<{ id: PreferredWorkPeriod; label: string }>
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdateSettings({ preferredWorkPeriod: p.id })}
                  className={`px-2.5 py-1 rounded-xl cursor-pointer ${
                    (settings.preferredWorkPeriod ?? 'morning') === p.id
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[#A3A1BA] block mb-1.5">
              Default Break Duration
            </span>
            <div className="flex gap-1.5">
              {[2, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onUpdateSettings({ breakMinutes: mins })}
                  className={`px-3 py-1 rounded-xl font-mono cursor-pointer ${
                    settings.breakMinutes === mins
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liquid Lens Breathing Defaults */}
        <div
          data-testid="restorative-defaults-card"
          className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs"
        >
          <h3 className="text-xs font-semibold text-[#F5F6FF]">
            04. Liquid Lens Breathing Defaults
          </h3>

          <div>
            <span className="text-[#A3A1BA] block mb-1.5">
              Default Breathing Purpose
            </span>
            <div className="flex flex-wrap gap-1.5">
              {BREATHING_PRESETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      defaultBreathingPresetId: pr.id as BreathingPresetId,
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl cursor-pointer ${
                    (settings.defaultBreathingPresetId ?? 'coherent-5-5') ===
                    pr.id
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                  }`}
                >
                  {pr.name}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#A3A1BA] mt-2">
              All breathing sessions pair seamlessly with your active ambient sound without forced breath holds.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Notifications, Reduced Motion & Accessibility */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
        <h3 className="text-xs font-semibold text-[#F5F6FF]">
          05. Accessibility, Motion & Notifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#F5F6FF] font-medium block">
                Reduced Motion
              </span>
              <span className="text-[11px] text-[#A3A1BA]">
                Calm static organisms & instant panel transitions
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.reducedMotion}
              data-testid="pref-reduced-motion-toggle"
              onClick={() =>
                onUpdateSettings({ reducedMotion: !settings.reducedMotion })
              }
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.reducedMotion ? 'bg-[#2FE8FF]' : 'bg-white/15'
              }`}
            >
              <span
                className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                  settings.reducedMotion ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#F5F6FF] font-medium block">
                High Contrast Surfaces
              </span>
              <span className="text-[11px] text-[#A3A1BA]">
                Sharper borders and deeper panel opacity
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrast}
              onClick={() =>
                onUpdateSettings({ highContrast: !settings.highContrast })
              }
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.highContrast ? 'bg-[#2FE8FF]' : 'bg-white/15'
              }`}
            >
              <span
                className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                  settings.highContrast ? 'translate-x-4.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#2FE8FF]" />
            <span>
              Desktop Completion Notifications:{' '}
              <strong className="text-[#F5F6FF]">{notifStatus}</strong>
            </span>
          </div>
          {notifStatus === 'granted' ? (
            <span className="inline-flex items-center gap-1 text-[#38F8A8] font-medium">
              <Check className="w-3.5 h-3.5" /> Enabled
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequestNotifications}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#F5F6FF] border border-white/10 cursor-pointer"
            >
              Enable Gentle Notifications
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[#A3A1BA]">GPU Mode:</span>
            {(['auto', 'balanced', 'ultra'] as PerformanceMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateSettings({ performanceMode: mode })}
                className={`px-2 py-1 rounded-lg font-mono text-[10px] uppercase cursor-pointer ${
                  (settings.performanceMode ?? 'auto') === mode
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                    : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * 3. PERSONAL DATA — Privacy, AI Consent, Honest Sync Status, Export & Deletion
 * ============================================================================
 */
export const PersonalData: React.FC<AuraConsolePersonalDataProps> = ({
  settings,
  onUpdateSettings,
  sessions,
  restoreSessions,
  routines,
  onSyncSessionsAndRoutines,
  onClearSeedSessions,
  onRestoreSeedSessions,
  onResetAllData,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [syncMode, setSyncMode] = useState<'login' | 'register'>('login');
  const [syncEmail, setSyncEmail] = useState(settings.syncAccountEmail || '');
  const [syncPassword, setSyncPassword] = useState('');
  const [syncToken, setSyncToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('aura_sync_token_v1');
    } catch {
      return null;
    }
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [analyticsTick, setAnalyticsTick] = useState(0);

  const analyticsEvents = loadProductAnalyticsEvents();
  const todayIso = getLocalIsoDate();
  const productMetrics = computeProductMetricsSummary(
    sessions,
    analyticsEvents,
    todayIso
  );
  void analyticsTick;

  const handleExportSessions = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 4,
      settings,
      routines,
      sessions,
      restoreSessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-time-journal-${todayIso}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSyncAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncEmail.trim() || syncPassword.length < 6) {
      setSyncStatusMsg(
        'Enter a valid email and a password of at least 6 characters.'
      );
      return;
    }
    setSyncBusy(true);
    setSyncStatusMsg(null);
    try {
      const endpoint =
        syncMode === 'register' ? '/api/sync/register' : '/api/sync/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: syncEmail.trim(),
          password: syncPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatusMsg(data.error || 'Local server sync authentication failed.');
      } else {
        setSyncToken(data.token);
        localStorage.setItem('aura_sync_token_v1', data.token);
        onUpdateSettings({ syncAccountEmail: data.email });
        setSyncPassword('');
        setSyncStatusMsg(
          'Connected to local server session snapshot (in-memory only; external cloud database is not configured).'
        );
      }
    } catch {
      setSyncStatusMsg('Local sync endpoint is unreachable.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePushSync = async () => {
    if (!syncToken) return;
    setSyncBusy(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${syncToken}`,
        },
        body: JSON.stringify({
          settings,
          sessions: sessions.filter((s) => !s.isSeed),
          restoreSessions,
          routines,
        }),
      });
      const data = await res.json();
      if (res.ok && data.snapshot) {
        onSyncSessionsAndRoutines(
          data.snapshot.sessions || sessions,
          data.snapshot.restoreSessions || restoreSessions,
          data.snapshot.routines || routines
        );
        onUpdateSettings({ lastCloudSyncAt: data.syncedAt });
        setSyncStatusMsg('Synchronized with local server session memory.');
      } else {
        setSyncStatusMsg(data.error || 'Sync failed.');
      }
    } catch {
      setSyncStatusMsg('Sync request failed.');
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div
      data-testid="aura-console-personal-data"
      className="space-y-5 pb-8 text-xs"
    >
      {/* 1. Privacy, AI Consent & Local Ownership */}
      <div
        data-testid="privacy-data-sanctuary-card"
        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#38F8A8]" />
          <h3 className="text-xs font-semibold text-[#F5F6FF]">
            01. Privacy, AI Consent & Data Ownership
          </h3>
        </div>
        <p className="text-[#A3A1BA] leading-relaxed">
          Your focus history, restorative pauses, and preferences are stored
          locally in this browser (`localStorage`). Server-side AI features are
          strictly opt-in and never transmit data without your consent.
        </p>

        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[#F5F6FF] font-medium block">
                Server-Side AI Reflection Consent
              </span>
              <span className="text-[11px] text-[#A3A1BA]">
                Allow sending anonymized session summaries to `/api/ai/*` when
                requested
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(settings.aiProcessingConsent)}
              data-testid="profile-ai-consent-toggle"
              onClick={() =>
                onUpdateSettings({
                  aiProcessingConsent: !settings.aiProcessingConsent,
                })
              }
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.aiProcessingConsent ? 'bg-[#2FE8FF]' : 'bg-white/15'
              }`}
            >
              <span
                className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                  settings.aiProcessingConsent
                    ? 'translate-x-4.5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-[#F5F6FF] font-medium block">
                Local Product Telemetry
              </span>
              <span className="text-[11px] text-[#A3A1BA]">
                Record non-PII session completion events locally on this device
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.productAnalyticsConsent !== false}
              data-testid="profile-analytics-consent-toggle"
              onClick={() =>
                onUpdateSettings({
                  productAnalyticsConsent:
                    settings.productAnalyticsConsent === false,
                })
              }
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                settings.productAnalyticsConsent !== false
                  ? 'bg-[#2FE8FF]'
                  : 'bg-white/15'
              }`}
            >
              <span
                className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                  settings.productAnalyticsConsent !== false
                    ? 'translate-x-4.5'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Local Metrics Summary */}
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-4 tabular-nums">
            <span>
              Completion Rate:{' '}
              <strong className="text-[#F5F6FF]">
                {productMetrics.sessionCompletionRatePercent ?? 0}%
              </strong>
            </span>
            <span>·</span>
            <span>
              Weekly Habit:{' '}
              <strong className="text-[#F5F6FF]">
                {productMetrics.weeklyHabitSessionsCount} sessions
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearProductAnalyticsEvents();
              setAnalyticsTick((t) => t + 1);
            }}
            className="text-[11px] font-mono text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
          >
            Clear Events ({productMetrics.totalTrackedEvents})
          </button>
        </div>
      </div>

      {/* 2. Sync Status & Optional Local Server Account Boundary */}
      <div
        data-testid="cloud-sync-boundary-card"
        className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#2FE8FF]" />
            <h3 className="text-xs font-semibold text-[#F5F6FF]">
              02. Sync Status & Account Boundary
            </h3>
          </div>
          <span className="font-mono text-[11px] text-[#FFB08A]">
            Local-First · Ephemeral Server Boundary
          </span>
        </div>
        <p className="text-[#A3A1BA] leading-relaxed">
          Aura Time operates 100% locally in your browser without requiring an
          account. The optional `/api/sync` boundary below stores snapshots in
          local server process memory only—no external cloud database is
          connected in this environment.
        </p>

        {syncToken && settings.syncAccountEmail ? (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#38F8A8]" />
                <span className="text-[#F5F6FF] font-medium">
                  {settings.syncAccountEmail}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSyncToken(null);
                  localStorage.removeItem('aura_sync_token_v1');
                  onUpdateSettings({ syncAccountEmail: null });
                }}
                className="flex items-center gap-1 text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
            <AuraButton
              variant="secondary"
              size="sm"
              onClick={handlePushSync}
              disabled={syncBusy}
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{syncBusy ? 'Syncing…' : 'Sync Snapshot Now'}</span>
            </AuraButton>
          </div>
        ) : (
          <form onSubmit={handleSyncAuth} className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSyncMode('login')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer ${
                  syncMode === 'login'
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                    : 'text-[#A3A1BA]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setSyncMode('register')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer ${
                  syncMode === 'register'
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                    : 'text-[#A3A1BA]'
                }`}
              >
                Register Local Sync
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="email"
                data-testid="sync-email-input"
                value={syncEmail}
                onChange={(e) => setSyncEmail(e.target.value)}
                placeholder="Email for local sync"
                aria-label="Email for local sync"
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-xs text-[#F5F6FF]"
              />
              <input
                type="password"
                data-testid="sync-password-input"
                value={syncPassword}
                onChange={(e) => setSyncPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                aria-label="Password for local sync"
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-xs text-[#F5F6FF]"
              />
            </div>
            <AuraButton
              type="submit"
              variant="secondary"
              size="sm"
              disabled={syncBusy}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>
                {syncMode === 'register'
                  ? 'Create Local Sync Account'
                  : 'Connect Local Sync'}
              </span>
            </AuraButton>
          </form>
        )}

        {syncStatusMsg && (
          <p className="text-[11px] text-[#2FE8FF]">{syncStatusMsg}</p>
        )}
      </div>

      {/* 3. Export & Data Deletion */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-xs font-semibold text-[#F5F6FF]">
          03. Export & Data Deletion
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="export-journal-btn"
            onClick={handleExportSessions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#F5F6FF] border border-white/10 font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Export Journal JSON</span>
          </button>

          <button
            type="button"
            data-testid="personal-data-clear-seed-btn"
            onClick={onClearSeedSessions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Sample Data</span>
          </button>

          <button
            type="button"
            data-testid="personal-data-restore-seed-btn"
            onClick={onRestoreSeedSessions}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Sample Data</span>
          </button>
        </div>

        <div className="pt-3 border-t border-white/10">
          {!confirmReset ? (
            <button
              type="button"
              data-testid="reset-all-data-trigger"
              onClick={() => setConfirmReset(true)}
              className="text-xs text-[#FF4FA3] hover:underline cursor-pointer"
            >
              Delete & Reset All Local Sanctuary Data…
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-[#FFB08A]">
                Permanently erase all sessions, restore records, and settings?
              </span>
              <button
                type="button"
                data-testid="confirm-reset-all-data-btn"
                onClick={() => {
                  onResetAllData();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#FF4FA3]/20 text-[#FF4FA3] border border-[#FF4FA3]/40 text-xs font-medium cursor-pointer"
              >
                Confirm Erase
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ============================================================================
 * PRIMARY MODULE: AURA CONSOLE (Private Instrument Panel Side-Sheet / Drawer)
 * ============================================================================
 */
export const AuraConsole: React.FC<AuraConsoleProps> = ({
  isOpen,
  activeSection,
  onSelectSection,
  onClose,
  myRhythmProps,
  preferencesProps,
  personalDataProps,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="aura-console-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-black/55 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aura-console-title"
        data-testid="aura-console-view"
        className="relative w-full max-w-3xl h-[100dvh] aura-glass-elevated border-l border-white/15 flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Top Instrument Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#2FE8FF] block">
              PERSONAL CONTROL CENTER
            </span>
            <h2
              id="aura-console-title"
              className="font-display text-base sm:text-lg font-semibold text-[#F5F6FF]"
            >
              Aura Console
            </h2>
          </div>

          {/* 3 Primary Internal Destinations: My Rhythm | Preferences | Personal Data */}
          <div
            role="tablist"
            aria-label="Aura Console Sections"
            data-testid="aura-console-tabs"
            className="flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/10"
          >
            {(
              [
                {
                  id: 'my-rhythm',
                  label: 'My Rhythm',
                  Icon: BarChart3,
                },
                {
                  id: 'preferences',
                  label: 'Preferences',
                  Icon: Sliders,
                },
                {
                  id: 'personal-data',
                  label: 'Personal Data',
                  Icon: ShieldCheck,
                },
              ] as const
            ).map(({ id, label, Icon }) => {
              const isSelected = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`aura-console-tab-${id}`}
                  onClick={() => onSelectSection(id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                      : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#2FE8FF] shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            data-testid="aura-console-close-btn"
            aria-label="Close Aura Console"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Scrollable Instrument Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5">
          {activeSection === 'my-rhythm' && <MyRhythm {...myRhythmProps} />}
          {activeSection === 'preferences' && (
            <Preferences {...preferencesProps} />
          )}
          {activeSection === 'personal-data' && (
            <PersonalData {...personalDataProps} />
          )}
        </div>
      </div>
    </div>
  );
};
