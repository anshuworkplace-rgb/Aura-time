import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sprout,
  Compass,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Calendar,
  Award,
  Layers,
} from 'lucide-react';
import {
  FocusRoutine,
  FocusSceneConfig,
  FocusSceneId,
  SessionRecord,
  SmartRecommendation,
  TaskBreakdownStep,
  UserSettings,
} from '../types/aura';
import {
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
  calculateMonthlyAnalytics,
  computeAuraGardenAchievements,
  computePreferredSoundscapes,
  computeSmartRecommendations,
  filterVerifiedSessions,
  generateLocalWeeklyReflection,
} from '../utils/auraIntelligence';
import { AuraButton } from './AuraButton';
import { AuraIntelligencePanel } from './AuraIntelligencePanel';

interface ReflectExperienceProps {
  sessions: SessionRecord[];
  scene: FocusSceneConfig;
  settings: UserSettings;
  routines: FocusRoutine[];
  currentDurationMinutes: number;
  currentSceneId: FocusSceneId;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onClearSeedSessions: () => void;
  onRestoreSeedSessions: () => void;
  onNavigateToFocus: () => void;
  onApplyRecommendation: (rec: SmartRecommendation) => void;
  onApplyRoutine: (routine: FocusRoutine) => void;
  onSaveRoutine: (routine: FocusRoutine) => void;
  onDuplicateRoutine: (routine: FocusRoutine) => void;
  onDeleteRoutine: (routineId: string) => void;
  onApplyTaskStep: (step: TaskBreakdownStep) => void;
}

type ReflectSubTab =
  | 'overview'
  | 'intelligence'
  | 'garden'
  | 'history'
  | 'goals';

export const ReflectExperience: React.FC<ReflectExperienceProps> = ({
  sessions,
  scene,
  settings,
  routines,
  currentDurationMinutes,
  currentSceneId,
  onUpdateSettings,
  onClearSeedSessions,
  onRestoreSeedSessions,
  onNavigateToFocus,
  onApplyRecommendation,
  onApplyRoutine,
  onSaveRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
  onApplyTaskStep,
}) => {
  const [subTab, setSubTab] = useState<ReflectSubTab>('overview');
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'completed' | 'interrupted'
  >('all');
  const gardenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const todayIso = useMemo(() => getLocalIsoDate(), []);
  const excludeSeed = Boolean(settings.excludeSampleDataInInsights);

  const activeSessions = useMemo(
    () => filterVerifiedSessions(sessions, excludeSeed),
    [sessions, excludeSeed]
  );

  const todaySummary = useMemo(
    () => calculateTodaySummary(activeSessions, settings.dailyGoalMinutes),
    [activeSessions, settings.dailyGoalMinutes]
  );

  const weeklyOverview = useMemo(
    () =>
      calculateWeeklyOverview(
        activeSessions,
        settings.weeklyGoalMinutes || 600
      ),
    [activeSessions, settings.weeklyGoalMinutes]
  );

  const monthlyAnalytics = useMemo(
    () =>
      calculateMonthlyAnalytics(
        activeSessions,
        todayIso,
        settings.dailyGoalMinutes,
        false
      ),
    [activeSessions, todayIso, settings.dailyGoalMinutes]
  );

  const patterns = useMemo(
    () => calculatePersonalFocusPatterns(activeSessions),
    [activeSessions]
  );

  const preferredSoundscapes = useMemo(
    () => computePreferredSoundscapes(activeSessions, false),
    [activeSessions]
  );

  const gardenState = useMemo(
    () =>
      computeAuraGardenState(
        activeSessions,
        settings.weeklyGoalMinutes || 600
      ),
    [activeSessions, settings.weeklyGoalMinutes]
  );

  const gardenAchievements = useMemo(
    () =>
      computeAuraGardenAchievements(
        activeSessions,
        settings.weeklyGoalMinutes || 600,
        false
      ),
    [activeSessions, settings.weeklyGoalMinutes]
  );

  const recommendations = useMemo(
    () =>
      computeSmartRecommendations({
        sessions: activeSessions,
        todayIsoDate: todayIso,
        currentDurationMinutes,
        currentSceneId,
        settings,
      }),
    [activeSessions, todayIso, currentDurationMinutes, currentSceneId, settings]
  );

  const hasSeedSessions = useMemo(
    () => sessions.some((s) => s.isSeed || s.id.startsWith('seed-')),
    [sessions]
  );

  // Average actual session duration this week
  const weeklyAverageMinutes = useMemo(() => {
    const totalCount =
      weeklyOverview.totalCompletedSessions +
      weeklyOverview.days.reduce((acc, d) => acc + d.interruptedCount, 0);
    if (totalCount <= 0) return 0;
    return Math.round(weeklyOverview.totalActualMinutes / totalCount);
  }, [weeklyOverview]);

  const weeklyInterruptedCount = useMemo(
    () => weeklyOverview.days.reduce((acc, d) => acc + d.interruptedCount, 0),
    [weeklyOverview]
  );

  const defaultReflection = useMemo(() => {
    const envName = weeklyOverview.mostUsedEnvironment
      ? FOCUS_SCENES[weeklyOverview.mostUsedEnvironment]?.name ||
        weeklyOverview.mostUsedEnvironment
      : 'Deep Current';
    return generateLocalWeeklyReflection({
      completedSessions: weeklyOverview.totalCompletedSessions,
      interruptedSessions: weeklyInterruptedCount,
      totalActualMinutes: weeklyOverview.totalActualMinutes,
      mostUsedEnvironment: envName,
      bestDayLabel: weeklyOverview.bestDay?.dayLabel || 'this week',
      averageMinutes: weeklyAverageMinutes,
    });
  }, [weeklyOverview, weeklyInterruptedCount, weeklyAverageMinutes]);

  const [aiReflection, setAiReflection] = useState<{
    summary: string;
    highlights: string[];
    source: 'gemini' | 'deterministic_rule_engine';
  } | null>(null);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);

  const handleRequestAiReflection = async () => {
    setIsGeneratingReflection(true);
    try {
      const envName = weeklyOverview.mostUsedEnvironment
        ? FOCUS_SCENES[weeklyOverview.mostUsedEnvironment]?.name ||
          weeklyOverview.mostUsedEnvironment
        : 'Deep Current';
      const res = await fetch('/api/ai/weekly-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiConsent: Boolean(settings.aiProcessingConsent),
          stats: {
            completedSessions: weeklyOverview.totalCompletedSessions,
            interruptedSessions: weeklyInterruptedCount,
            totalActualMinutes: weeklyOverview.totalActualMinutes,
            mostUsedEnvironment: envName,
            bestDayLabel: weeklyOverview.bestDay?.dayLabel || 'None',
            averageMinutes: weeklyAverageMinutes,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiReflection({
          summary: data.summary || defaultReflection.summary,
          highlights: Array.isArray(data.highlights)
            ? data.highlights
            : defaultReflection.highlights,
          source:
            data.source === 'gemini' ? 'gemini' : 'deterministic_rule_engine',
        });
      }
    } catch {
      setAiReflection({
        ...defaultReflection,
        source: 'deterministic_rule_engine',
      });
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  const filteredHistory = useMemo(() => {
    const sorted = [...activeSessions].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    if (historyFilter === 'all') return sorted;
    return sorted.filter(
      (s) => (s.completionStatus ?? 'completed') === historyFilter
    );
  }, [activeSessions, historyFilter]);

  // Interactive Bioluminescent Canvas Renderer for MY AURA GARDEN
  useEffect(() => {
    if (subTab !== 'garden') return;
    const canvas = gardenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = 760;
    const height = 340;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let animId = 0;
    let t = 0;

    const renderGarden = () => {
      t += 0.018;
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Sanctuary Pelagic & Botanical Horizon
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#070918');
      bgGrad.addColorStop(0.65, '#0C1228');
      bgGrad.addColorStop(1, '#101935');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Weekly Goal Harmony Aurora Ribbon in Upper Sky
      const auroraIntensity = gardenState.weeklyGoalReached ? 0.36 : 0.18;
      const skyGlow = ctx.createRadialGradient(
        width * 0.5,
        height * 0.22,
        12,
        width * 0.5,
        height * 0.25,
        width * 0.52
      );
      skyGlow.addColorStop(0, `${scene.colors.secondary}44`);
      skyGlow.addColorStop(0.5, `${scene.colors.primary}22`);
      skyGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.globalAlpha = auroraIntensity * 2;
      ctx.fillStyle = skyGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      // 3. Soft Undulating Sanctuary Seabed / Botanical Terraces
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 20) {
        const y =
          height -
          38 +
          Math.sin(x * 0.012 + t * 0.4) * 8 +
          Math.cos(x * 0.025) * 6;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = 'rgba(47, 232, 255, 0.07)';
      ctx.fill();

      // 4. Draw Each Earned Flora / Organism Node from Real Completed Sessions
      gardenState.floraNodes.forEach((node, idx) => {
        const nx = node.x * width;
        const ny = node.y * height;
        const sway = Math.sin(t * 1.1 + idx * 0.7) * 5 * node.scale;
        const baseY = height - 24;

        // Translucent stem / tether
        ctx.strokeStyle = `${node.colorHex}55`;
        ctx.lineWidth = 1.6 * node.scale;
        ctx.beginPath();
        ctx.moveTo(nx, baseY);
        ctx.quadraticCurveTo(
          nx + sway * 0.5,
          (baseY + ny) * 0.5,
          nx + sway,
          ny
        );
        ctx.stroke();

        // Bioluminescent Halo
        const r = (node.completed ? 16 : 9) * node.scale;
        const halo = ctx.createRadialGradient(
          nx + sway,
          ny,
          2,
          nx + sway,
          ny,
          r * 2.2
        );
        halo.addColorStop(
          0,
          `${node.colorHex}${node.completed ? 'CC' : '66'}`
        );
        halo.addColorStop(0.5, `${node.secondaryHex}44`);
        halo.addColorStop(1, 'rgba(7,8,18,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(nx + sway, ny, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Core Blossom / Jelly Bell / Lens Pearl
        ctx.fillStyle = node.colorHex;
        ctx.beginPath();
        if (node.species === 'living-bloom') {
          for (let p = 0; p < 6; p++) {
            const ang = (p / 6) * Math.PI * 2 + t * 0.3;
            const px = nx + sway + Math.cos(ang) * (r * 0.65);
            const py = ny + Math.sin(ang) * (r * 0.65);
            ctx.moveTo(px, py);
            ctx.arc(px, py, r * 0.38, 0, Math.PI * 2);
          }
        } else if (node.species === 'celestial-jelly') {
          ctx.arc(nx + sway, ny, r * 0.75, Math.PI, 0);
        } else {
          ctx.arc(nx + sway, ny, r * 0.65, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      if (!settings.reducedMotion) {
        animId = requestAnimationFrame(renderGarden);
      }
    };

    renderGarden();
    return () => cancelAnimationFrame(animId);
  }, [subTab, gardenState, scene, settings.reducedMotion]);

  const activeReflection = aiReflection || {
    ...defaultReflection,
    source: 'deterministic_rule_engine' as const,
  };

  return (
    <section
      data-testid="reflect-experience-view"
      aria-label="Reflect Focus Journal and Aura Garden"
      className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-4 pb-24 flex flex-col"
    >
      {/* Header & Sub-navigation */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="max-w-3xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#2FE8FF]">
            AURA CONSOLE · MY RHYTHM & AURA INTELLIGENCE
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight mt-1">
            My Rhythm, Routines & Aura Garden
          </h1>
          <p className="text-xs sm:text-sm text-[#A3A1BA] mt-0.5">
            Calm, honest reflection and deterministic session recommendations
            built strictly from your actual focused time.
          </p>
        </div>

        {/* Sub-Nav Tabs */}
        <div
          role="tablist"
          aria-label="Reflect sections"
          className="flex flex-wrap items-center gap-1 p-1 rounded-2xl aura-glass self-start"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'overview'}
            data-testid="reflect-tab-overview"
            onClick={() => setSubTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'overview'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Overview & Analytics</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'intelligence'}
            data-testid="reflect-tab-intelligence"
            onClick={() => setSubTab('intelligence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'intelligence'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#38F8A8]" />
            <span>Routines & Planner</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'garden'}
            data-testid="reflect-tab-garden"
            onClick={() => setSubTab('garden')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'garden'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Sprout className="w-3.5 h-3.5 text-[#38F8A8]" />
            <span>My Aura Garden</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'history'}
            data-testid="reflect-tab-history"
            onClick={() => setSubTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'history'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#8A5CFF]" />
            <span>Session History</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === 'goals'}
            data-testid="reflect-tab-goals"
            onClick={() => setSubTab('goals')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'goals'
                ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-[#FFB08A]" />
            <span>Personal Goals</span>
          </button>
        </div>
      </div>

      {/* Seed Data Notice Bar if Demo Sessions are Present */}
      {hasSeedSessions && (
        <div
          data-testid="reflect-seed-banner"
          className="mb-5 px-4 py-2.5 rounded-2xl aura-glass flex flex-wrap items-center justify-between gap-3 border border-[#2FE8FF]/25"
        >
          <div className="flex items-center gap-3 text-xs text-[#A3A1BA]">
            <span>
              Viewing sample sanctuary history alongside your real sessions.
            </span>
            <label className="inline-flex items-center gap-1.5 text-[#D6D8EC] cursor-pointer">
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
              <span>Hide sample data in charts</span>
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

      {/* ==================================================================== */}
      {/* TAB 1: OVERVIEW & ANALYTICS                                          */}
      {/* ==================================================================== */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              data-testid="today-actual-focus-card"
              className="aura-glass rounded-3xl p-5"
            >
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#A3A1BA]">
                TODAY&apos;S ACTUAL FOCUS
              </span>
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-1.5 tabular-nums">
                {formatDurationCompact(todaySummary.actualMinutes)}
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8A5CFF] to-[#2FE8FF]"
                  style={{ width: `${todaySummary.goalProgressPercent}%` }}
                />
              </div>
              <span className="block text-[11px] text-[#A3A1BA] mt-1.5">
                {todaySummary.goalProgressPercent}% of{' '}
                {formatDurationCompact(todaySummary.dailyGoalMinutes)} daily
                goal
              </span>
            </div>

            <div className="aura-glass rounded-3xl p-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#A3A1BA]">
                COMPLETED SESSIONS TODAY
              </span>
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-1.5 tabular-nums">
                {todaySummary.completedCount}
                <span className="text-sm font-normal text-[#A3A1BA] ml-1.5">
                  / {settings.dailySessionsGoal || 4} target
                </span>
              </div>
              <span className="block text-[11px] text-[#A3A1BA] mt-2">
                {todaySummary.interruptedCount > 0
                  ? `${todaySummary.interruptedCount} interrupted session${
                      todaySummary.interruptedCount > 1 ? 's' : ''
                    } recorded`
                  : 'All sessions completed without interruption'}
              </span>
            </div>

            <div className="aura-glass rounded-3xl p-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#A3A1BA]">
                WEEKLY ACTUAL FOCUS
              </span>
              <div className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-1.5 tabular-nums">
                {formatDurationCompact(weeklyOverview.totalActualMinutes)}
              </div>
              <div className="mt-2 w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2FE8FF] to-[#38F8A8]"
                  style={{
                    width: `${weeklyOverview.weeklyGoalProgressPercent}%`,
                  }}
                />
              </div>
              <span className="block text-[11px] text-[#A3A1BA] mt-1.5">
                {weeklyOverview.weeklyGoalProgressPercent}% of{' '}
                {formatDurationCompact(weeklyOverview.weeklyGoalMinutes)} weekly
                goal
              </span>
            </div>

            <div className="aura-glass rounded-3xl p-5">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#A3A1BA]">
                TODAY&apos;S INTENTIONS
              </span>
              {todaySummary.intentions.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {todaySummary.intentions.slice(0, 3).map((intent, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-[#F5F6FF] truncate flex items-center gap-1.5"
                    >
                      <span className="text-[#2FE8FF]">·</span>
                      <span className="truncate">{intent}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#A3A1BA] mt-2">
                  No intentions logged today yet. Set an intention on the Focus
                  stage to begin.
                </p>
              )}
            </div>
          </div>

          {/* Weekly Focus Reflection & Smart Recommendations Row */}
          <div className="aura-glass rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  WEEKLY FOCUS REFLECTION · AURA INTELLIGENCE
                </h2>
                <p className="text-xs text-[#A3A1BA] mt-0.5">
                  Source:{' '}
                  {activeReflection.source === 'gemini'
                    ? 'Server-Side Gemini AI (Opt-In Consent Active)'
                    : 'Deterministic Rule Engine (100% Local Data)'}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto">
                <label className="inline-flex items-center gap-1.5 text-xs text-[#D6D8EC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.aiProcessingConsent)}
                    onChange={(e) =>
                      onUpdateSettings({
                        aiProcessingConsent: e.target.checked,
                      })
                    }
                    className="rounded border-white/20 bg-white/10 text-[#2FE8FF]"
                  />
                  <span>AI Consent</span>
                </label>

                {settings.aiProcessingConsent && (
                  <button
                    type="button"
                    data-testid="refresh-ai-reflection-btn"
                    onClick={handleRequestAiReflection}
                    disabled={isGeneratingReflection}
                    className="px-3 py-1.5 rounded-xl bg-[#2FE8FF]/18 hover:bg-[#2FE8FF]/28 border border-[#2FE8FF]/45 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isGeneratingReflection
                      ? 'Synthesizing…'
                      : 'Generate AI Summary'}
                  </button>
                )}
              </div>
            </div>

            <p
              data-testid="weekly-reflection-summary"
              className="text-xs sm:text-sm text-[#F5F6FF] leading-relaxed"
            >
              {activeReflection.summary}
            </p>

            {/* Quick Smart Recommendations Strip */}
            {recommendations.length > 0 && (
              <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3">
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#F5F6FF]">
                        {rec.title}
                      </div>
                      <p className="text-[11px] text-[#A3A1BA] mt-1 leading-relaxed">
                        {rec.explanation}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#A3A1BA]">
                        {rec.confidenceNote}
                      </span>
                      <button
                        type="button"
                        onClick={() => onApplyRecommendation(rec)}
                        className="text-xs font-medium text-[#2FE8FF] hover:underline cursor-pointer whitespace-nowrap"
                      >
                        {rec.actionLabel} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Overview Chart & Personal Focus Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 aura-glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                    7-DAY FOCUS RHYTHM
                  </h2>
                  <p className="text-xs text-[#A3A1BA] mt-0.5">
                    Actual focused minutes across the past 7 days
                  </p>
                </div>
                <span className="text-xs font-mono text-[#F5F6FF] tabular-nums">
                  {weeklyOverview.totalCompletedSessions} completed sessions
                </span>
              </div>

              <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-4">
                {weeklyOverview.days.map((d) => {
                  const maxMins = Math.max(
                    60,
                    ...weeklyOverview.days.map((item) => item.actualMinutes)
                  );
                  const heightPct = Math.max(
                    8,
                    Math.round((d.actualMinutes / maxMins) * 100)
                  );
                  return (
                    <div
                      key={d.dateStr}
                      className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <span className="text-[10px] font-mono text-[#A3A1BA] tabular-nums">
                        {d.actualMinutes > 0 ? `${d.actualMinutes}m` : '—'}
                      </span>
                      <div className="w-full max-w-[38px] bg-white/[0.04] rounded-2xl h-28 flex items-end p-1">
                        <div
                          className="w-full rounded-xl transition-all duration-500"
                          style={{
                            height: `${heightPct}%`,
                            background:
                              d.actualMinutes > 0
                                ? `linear-gradient(180deg, ${scene.colors.secondary}, ${scene.colors.primary})`
                                : 'rgba(255,255,255,0.06)',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#F5F6FF]">
                        {d.dayLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[#A3A1BA] block">Best Focus Day</span>
                  <span className="text-[#F5F6FF] font-medium">
                    {weeklyOverview.bestDay
                      ? `${weeklyOverview.bestDay.dayLabel} (${formatDurationCompact(
                          weeklyOverview.bestDay.actualMinutes
                        )})`
                      : 'No sessions yet'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A3A1BA] block">
                    Avg Actual Session
                  </span>
                  <span className="text-[#F5F6FF] font-mono font-medium tabular-nums">
                    {weeklyAverageMinutes > 0 ? `${weeklyAverageMinutes}m` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#A3A1BA] block">
                    Most-Used Environment
                  </span>
                  <span className="text-[#F5F6FF] font-medium">
                    {weeklyOverview.mostUsedEnvironment
                      ? FOCUS_SCENES[weeklyOverview.mostUsedEnvironment]?.name ||
                        weeklyOverview.mostUsedEnvironment
                      : 'None yet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Focus Patterns Card */}
            <div
              data-testid="personal-focus-patterns-card"
              className="lg:col-span-5 aura-glass rounded-3xl p-6 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  PERSONAL FOCUS PATTERNS
                </h2>
                <p className="text-xs text-[#A3A1BA] mt-0.5">
                  Honest observations from your actual session history
                </p>

                {!patterns.hasData ? (
                  <div
                    data-testid="patterns-empty-state"
                    className="my-8 text-center py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/8"
                  >
                    <Calendar className="w-7 h-7 text-[#2FE8FF] mx-auto mb-2 opacity-80" />
                    <h3 className="text-sm font-semibold text-[#F5F6FF]">
                      Your Focus Journal is Ready
                    </h3>
                    <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                      Complete your first focus session to reveal your preferred
                      session lengths, natural time-of-day rhythm, and favorite
                      environments.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <AuraButton
                        variant="primary"
                        size="sm"
                        onClick={onNavigateToFocus}
                      >
                        Begin First Session
                      </AuraButton>
                      <button
                        type="button"
                        onClick={onRestoreSeedSessions}
                        className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] px-3 py-1.5 rounded-xl border border-white/10 cursor-pointer"
                      >
                        Load Sample Data
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                      <span className="text-[#A3A1BA] block">
                        Frequently Used Session Lengths
                      </span>
                      <span className="text-[#F5F6FF] font-medium mt-0.5 block">
                        {patterns.frequentLengths
                          .map(
                            (l) =>
                              `${l.minutes} min (${l.count} session${
                                l.count > 1 ? 's' : ''
                              })`
                          )
                          .join(' · ')}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                      <span className="text-[#A3A1BA] block">
                        Preferred Environments
                      </span>
                      <span className="text-[#F5F6FF] font-medium mt-0.5 block">
                        {patterns.preferredEnvironments
                          .map((env) => {
                            const found = FOCUS_SCENES[env.sceneId];
                            return `${found?.name || env.sceneId} (${formatDurationCompact(
                              env.minutes
                            )})`;
                          })
                          .join(' · ')}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                      <span className="text-[#A3A1BA] block">
                        Preferred Soundscapes
                      </span>
                      <span className="text-[#F5F6FF] font-medium mt-0.5 block">
                        {preferredSoundscapes.length > 0
                          ? preferredSoundscapes
                              .slice(0, 3)
                              .map(
                                (c) =>
                                  `${c.name} (${formatDurationCompact(
                                    c.minutes
                                  )})`
                              )
                              .join(' · ')
                          : 'None recorded yet'}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8">
                      <span className="text-[#A3A1BA] block">
                        Peak Focus Time of Day
                      </span>
                      <span className="text-[#F5F6FF] font-medium mt-0.5 block">
                        {patterns.peakTimeOfDay}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8 flex items-center justify-between">
                      <div>
                        <span className="text-[#A3A1BA] block">
                          Weekly Consistency
                        </span>
                        <span className="text-[#F5F6FF] font-medium mt-0.5 block">
                          {patterns.weeklyConsistencyDays} of 7 days active
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#A3A1BA] block">
                          Completion Rate
                        </span>
                        <span className="text-[#2FE8FF] font-mono font-semibold mt-0.5 block tabular-nums">
                          {patterns.completionRatePercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 30-DAY MONTHLY ANALYTICS & WEEKLY TRENDS */}
          <div
            data-testid="monthly-analytics-card"
            className="aura-glass rounded-3xl p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#38F8A8]">
                  30-DAY MONTHLY ANALYTICS & WEEKLY TRENDS
                </h2>
                <p className="text-xs text-[#A3A1BA] mt-0.5">
                  Long-horizon focus totals, 4-week trend progression, and
                  comparison with the prior 30-day period
                </p>
              </div>

              <div className="text-xs text-[#A3A1BA] font-mono tabular-nums">
                {monthlyAnalytics.activeDaysCount} active days in last 30 days
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <span className="text-[11px] text-[#A3A1BA] block">
                  30-Day Actual Focus
                </span>
                <span className="font-display text-xl font-semibold text-[#F5F6FF] mt-1 block tabular-nums">
                  {formatDurationCompact(monthlyAnalytics.totalActualMinutes)}
                </span>
                <span className="text-[11px] text-[#A3A1BA] mt-1 block">
                  {Math.round(monthlyAnalytics.monthlyGoalProgressRatio * 100)}%
                  of {formatDurationCompact(monthlyAnalytics.monthlyGoalMinutes)}{' '}
                  monthly target
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <span className="text-[11px] text-[#A3A1BA] block">
                  30-Day Session Completion
                </span>
                <span className="font-display text-xl font-semibold text-[#F5F6FF] mt-1 block tabular-nums">
                  {monthlyAnalytics.completedSessionsCount} completed
                </span>
                <span className="text-[11px] text-[#A3A1BA] mt-1 block">
                  {monthlyAnalytics.interruptedSessionsCount} interrupted
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <span className="text-[11px] text-[#A3A1BA] block">
                  vs Previous 30 Days
                </span>
                <span className="font-display text-xl font-semibold text-[#2FE8FF] mt-1 block tabular-nums">
                  {monthlyAnalytics.periodDeltaPercent !== null
                    ? `${
                        monthlyAnalytics.periodDeltaPercent >= 0 ? '+' : ''
                      }${monthlyAnalytics.periodDeltaPercent}%`
                    : 'Baseline Period'}
                </span>
                <span className="text-[11px] text-[#A3A1BA] mt-1 block">
                  Prior 30d:{' '}
                  {formatDurationCompact(
                    monthlyAnalytics.previousPeriodActualMinutes
                  )}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8">
                <span className="text-[11px] text-[#A3A1BA] block">
                  Top Monthly Atmosphere
                </span>
                <span className="font-display text-xl font-semibold text-[#F5F6FF] mt-1 block truncate">
                  {monthlyAnalytics.mostUsedSceneId
                    ? FOCUS_SCENES[monthlyAnalytics.mostUsedSceneId]?.name ||
                      monthlyAnalytics.mostUsedSceneId
                    : 'None yet'}
                </span>
                <span className="text-[11px] text-[#A3A1BA] mt-1 block">
                  Verified from completed sessions
                </span>
              </div>
            </div>

            {/* 4-Week Trend Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {monthlyAnalytics.weeklyTrends.map((wb) => {
                const maxWeekMins = Math.max(
                  120,
                  ...monthlyAnalytics.weeklyTrends.map((w) => w.actualMinutes)
                );
                const pct = Math.min(
                  100,
                  Math.round((wb.actualMinutes / maxWeekMins) * 100)
                );
                return (
                  <div
                    key={wb.weekLabel}
                    className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/8"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#F5F6FF]">
                        {wb.weekLabel}
                      </span>
                      <span className="font-mono text-[#2FE8FF] tabular-nums">
                        {formatDurationCompact(wb.actualMinutes)}
                      </span>
                    </div>
                    <div className="mt-2 w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2FE8FF] to-[#38F8A8]"
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-[11px] text-[#A3A1BA] tabular-nums">
                      {wb.completedSessions} completed ·{' '}
                      {wb.interruptedSessions} interrupted
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ROUTINES & PLANNER (AURA INTELLIGENCE)                        */}
      {/* ==================================================================== */}
      {subTab === 'intelligence' && (
        <AuraIntelligencePanel
          recommendations={recommendations}
          routines={routines}
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onApplyRecommendation={onApplyRecommendation}
          onApplyRoutine={onApplyRoutine}
          onSaveRoutine={onSaveRoutine}
          onDuplicateRoutine={onDuplicateRoutine}
          onDeleteRoutine={onDeleteRoutine}
          onApplyTaskStep={onApplyTaskStep}
        />
      )}

      {/* ==================================================================== */}
      {/* TAB 3: MY AURA GARDEN                                                */}
      {/* ==================================================================== */}
      {subTab === 'garden' && (
        <div data-testid="my-aura-garden-view" className="space-y-6">
          <div className="aura-glass rounded-3xl p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-[#38F8A8]" />
                  <span className="text-xs font-mono uppercase tracking-[0.16em] text-[#38F8A8]">
                    STAGE {gardenState.growthStageIndex + 1} ·{' '}
                    {gardenState.growthStageLabel.toUpperCase()}
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] mt-1">
                  Your Living Focus Sanctuary
                </h2>
                <p className="text-xs text-[#A3A1BA] mt-0.5 max-w-2xl">
                  {gardenState.growthStageDescription} Every completed focus
                  session cultivates a new bioluminescent organism in your
                  sanctuary. Interrupted sessions are recorded honestly without
                  full completion bloom rewards, and taking rest days never
                  punishes your garden.
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A1BA] block">
                    REAL COMPLETED
                  </span>
                  <span
                    data-testid="garden-completed-count"
                    className="font-display text-2xl font-semibold text-[#F5F6FF] tabular-nums"
                  >
                    {gardenState.totalCompletedSessions}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A1BA] block">
                    LUMINOUS ENERGY
                  </span>
                  <span className="font-display text-2xl font-semibold text-[#2FE8FF] tabular-nums">
                    {gardenState.luminousEnergy}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Sanctuary Canvas */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#070918]">
              <canvas
                ref={gardenCanvasRef}
                data-testid="aura-garden-canvas"
                className="w-full h-[260px] sm:h-[320px] block"
              />
              {gardenState.floraNodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-[#070812]/60">
                  <p className="text-sm font-medium text-[#F5F6FF]">
                    Still Waters Await Your First Session
                  </p>
                  <p className="text-xs text-[#A3A1BA] mt-1 max-w-md">
                    Complete a focus session to plant your first bioluminescent
                    specimen in the sanctuary.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sanctuary Specimen Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ORB_DESIGNS.map((orb, idx) => {
              const requiredSessions = idx === 0 ? 0 : idx === 1 ? 1 : 3;
              const unlocked =
                gardenState.totalCompletedSessions >= requiredSessions;
              return (
                <div
                  key={orb.id}
                  className="aura-glass rounded-3xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#2FE8FF]">
                        {orb.badge}
                      </span>
                      <span
                        className={
                          unlocked ? 'text-[#38F8A8]' : 'text-[#A3A1BA]'
                        }
                      >
                        {unlocked
                          ? 'Cultivated'
                          : `Unlocks at ${requiredSessions} sessions`}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#F5F6FF] mt-1.5">
                      {orb.name}
                    </h3>
                    <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                      {orb.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Verified Sanctuary Milestones & Achievements (Optional Progression) */}
          {(settings.gardenProgressionEnabled ?? true) && (
            <div
              data-testid="garden-achievements-card"
              className="aura-glass rounded-3xl p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#2FE8FF]" />
                  <h3 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                    SANCTUARY MILESTONES & COLLECTION
                  </h3>
                </div>
                <span className="text-xs text-[#A3A1BA]">
                  Verified strictly from unique completed sessions · No streak
                  penalties
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {gardenAchievements.map((ach) => (
                  <div
                    key={ach.id}
                    data-testid={`garden-achievement-${ach.id}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      ach.unlocked
                        ? 'bg-[#38F8A8]/[0.07] border-[#38F8A8]/40'
                        : 'bg-white/[0.02] border-white/8 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F5F6FF]">
                        {ach.title}
                      </span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          ach.unlocked ? 'text-[#38F8A8]' : 'text-[#A3A1BA]'
                        }`}
                      >
                        {ach.progressText}
                      </span>
                    </div>
                    <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                      {ach.description}
                    </p>
                    <div className="mt-2 pt-2 border-t border-white/8 text-[11px] text-[#2FE8FF]">
                      Effect: {ach.rewardEffect}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SESSION HISTORY                                               */}
      {/* ==================================================================== */}
      {subTab === 'history' && (
        <div
          data-testid="reflect-history-view"
          className="aura-glass rounded-3xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                SESSION ARCHIVE
              </h2>
              <p className="text-xs text-[#A3A1BA] mt-0.5">
                Every session records planned duration, actual focused duration,
                intention, and completion status
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'completed', 'interrupted'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  data-testid={`history-filter-${f}`}
                  onClick={() => setHistoryFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                    historyFilter === f
                      ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border border-[#2FE8FF]/45'
                      : 'bg-white/[0.03] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/8'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-white/8">
              <p className="text-sm font-medium text-[#F5F6FF]">
                No sessions match this filter
              </p>
              <p className="text-xs text-[#A3A1BA] mt-1">
                Complete or log a focus session to see it archived here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {filteredHistory.map((item) => {
                const status = item.completionStatus ?? 'completed';
                const planned = item.plannedMinutes ?? item.durationMinutes;
                const actual = item.actualMinutes ?? item.durationMinutes;
                const sceneMeta =
                  FOCUS_SCENES[item.sceneId] || FOCUS_SCENES['deep-current'];
                const dateObj = new Date(item.completedAt);

                return (
                  <div
                    key={item.id}
                    data-testid="session-history-row"
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-[#38F8A8]" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[#FFB08A]" />
                        )}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#F5F6FF]">
                            {item.label || 'Deep work'}
                          </span>
                          <span className="text-[#A3A1BA]">·</span>
                          <span
                            className={
                              status === 'completed'
                                ? 'text-[#38F8A8]'
                                : 'text-[#FFB08A]'
                            }
                          >
                            {status === 'completed'
                              ? 'Completed'
                              : 'Interrupted'}
                          </span>
                          {item.isSeed && (
                            <>
                              <span className="text-[#A3A1BA]">·</span>
                              <span className="text-[#A3A1BA]">Sample</span>
                            </>
                          )}
                        </div>
                        <div className="text-[11px] text-[#A3A1BA] mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{sceneMeta.name}</span>
                          <span>·</span>
                          <span>
                            {dateObj.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {dateObj.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right pl-7 sm:pl-0 tabular-nums">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#A3A1BA] block">
                          PLANNED
                        </span>
                        <span className="text-xs font-mono text-[#A3A1BA]">
                          {planned}m
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#2FE8FF] block">
                          ACTUAL FOCUSED
                        </span>
                        <span className="text-sm font-mono font-semibold text-[#F5F6FF]">
                          {actual}m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: PERSONAL GOALS                                                */}
      {/* ==================================================================== */}
      {subTab === 'goals' && (
        <div
          data-testid="reflect-goals-view"
          className="aura-glass rounded-3xl p-6 max-w-2xl"
        >
          <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#FFB08A]">
            PERSONAL FOCUS GOALS
          </h2>
          <p className="text-xs text-[#A3A1BA] mt-0.5">
            Set sustainable targets that match your study or creative rhythm.
            Aura Time never uses punitive streak-loss mechanics.
          </p>

          <div className="mt-6 space-y-6">
            {/* Daily Focus Target */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[#F5F6FF]">
                  Daily Focus Target
                </span>
                <span className="font-mono text-[#2FE8FF] tabular-nums">
                  {formatDurationCompact(settings.dailyGoalMinutes)} (
                  {settings.dailyGoalMinutes} min)
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
                aria-label="Daily focus target in minutes"
                className="w-full accent-[#2FE8FF]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#A3A1BA] mt-1">
                <span>30m</span>
                <span>2h</span>
                <span>4h</span>
                <span>6h</span>
              </div>
            </div>

            {/* Weekly Focus Target */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[#F5F6FF]">
                  Weekly Focus Target
                </span>
                <span className="font-mono text-[#2FE8FF] tabular-nums">
                  {formatDurationCompact(settings.weeklyGoalMinutes || 600)} (
                  {settings.weeklyGoalMinutes || 600} min)
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
                aria-label="Weekly focus target in minutes"
                className="w-full accent-[#2FE8FF]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#A3A1BA] mt-1">
                <span>2h</span>
                <span>10h</span>
                <span>20h</span>
                <span>30h</span>
              </div>
            </div>

            {/* Desired Daily Sessions */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[#F5F6FF]">
                  Desired Daily Completed Sessions
                </span>
                <span className="font-mono text-[#2FE8FF] tabular-nums">
                  {settings.dailySessionsGoal || 4} sessions / day
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    data-testid={`daily-sessions-goal-${count}`}
                    onClick={() =>
                      onUpdateSettings({ dailySessionsGoal: count })
                    }
                    className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                      (settings.dailySessionsGoal || 4) === count
                        ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                        : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10 hover:text-[#F5F6FF]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
