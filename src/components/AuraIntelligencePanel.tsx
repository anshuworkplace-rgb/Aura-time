import React, { useState } from 'react';
import {
  ChamberId,
  FocusRoutine,
  FocusSceneId,
  OrbDesignId,
  SmartRecommendation,
  TaskBreakdownStep,
  UserSettings,
} from '../types/aura';
import {
  CHAMBERS,
  FOCUS_PRESET_MINUTES,
  FOCUS_SCENES,
  ORB_DESIGNS,
} from '../utils/focusEngine';
import { generateLocalTaskBreakdown } from '../utils/auraIntelligence';
import { AuraButton } from './AuraButton';
import {
  Compass,
  Plus,
  Copy,
  Trash2,
  Edit3,
  Check,
  ListChecks,
  Play,
} from 'lucide-react';

interface AuraIntelligencePanelProps {
  recommendations: SmartRecommendation[];
  routines: FocusRoutine[];
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onApplyRecommendation: (rec: SmartRecommendation) => void;
  onApplyRoutine: (routine: FocusRoutine) => void;
  onSaveRoutine: (routine: FocusRoutine) => void;
  onDuplicateRoutine: (routine: FocusRoutine) => void;
  onDeleteRoutine: (routineId: string) => void;
  onApplyTaskStep: (step: TaskBreakdownStep) => void;
}

const SCENE_LIST = Object.values(FOCUS_SCENES);

export const AuraIntelligencePanel: React.FC<AuraIntelligencePanelProps> = ({
  recommendations,
  routines,
  settings,
  onUpdateSettings,
  onApplyRecommendation,
  onApplyRoutine,
  onSaveRoutine,
  onDuplicateRoutine,
  onDeleteRoutine,
  onApplyTaskStep,
}) => {
  const [editingRoutine, setEditingRoutine] = useState<FocusRoutine | null>(
    null
  );
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);

  // Task Breakdown state
  const [taskInput, setTaskInput] = useState('');
  const [taskSteps, setTaskSteps] = useState<TaskBreakdownStep[]>([]);
  const [taskSource, setTaskSource] = useState<
    'gemini' | 'deterministic_rule_engine' | null
  >(null);
  const [isBreakingDown, setIsBreakingDown] = useState(false);

  const startNewRoutine = () => {
    setEditingRoutine({
      id: `routine-custom-${Date.now()}`,
      name: 'Custom Focus Routine',
      description: 'Personal focus, atmosphere, and break cadence.',
      focusDurationMinutes: settings.preferredDurationMinutes ?? 45,
      sceneId: settings.preferredSceneId ?? 'deep-current',
      chamberId: settings.selectedChamberId ?? 'ocean-drift',
      orbDesign: settings.orbDesign ?? 'celestial-jelly',
      breakDurationMinutes: settings.breakMinutes ?? 10,
      targetSessionsCount: 2,
      isCustom: true,
    });
    setIsCreatingRoutine(true);
  };

  const handleTaskBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = taskInput.trim();
    if (!clean) return;

    setIsBreakingDown(true);
    try {
      const response = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: clean,
          preferredMinutes: settings.preferredDurationMinutes ?? 25,
          aiConsent: Boolean(settings.aiProcessingConsent),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setTaskSteps(
          Array.isArray(data.steps) && data.steps.length > 0
            ? data.steps
            : generateLocalTaskBreakdown(
                clean,
                settings.preferredDurationMinutes ?? 25
              )
        );
        setTaskSource(
          data.source === 'gemini' ? 'gemini' : 'deterministic_rule_engine'
        );
      } else {
        setTaskSteps(
          generateLocalTaskBreakdown(
            clean,
            settings.preferredDurationMinutes ?? 25
          )
        );
        setTaskSource('deterministic_rule_engine');
      }
    } catch {
      setTaskSteps(
        generateLocalTaskBreakdown(
          clean,
          settings.preferredDurationMinutes ?? 25
        )
      );
      setTaskSource('deterministic_rule_engine');
    } finally {
      setIsBreakingDown(false);
    }
  };

  return (
    <div data-testid="aura-intelligence-panel" className="space-y-6">
      {/* 1. SMART SESSION RECOMMENDATIONS */}
      <div className="aura-glass rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
              AURA INTELLIGENCE · SMART RECOMMENDATIONS
            </h2>
            <p className="text-xs text-[#A3A1BA] mt-0.5">
              Transparent, deterministic suggestions from your verified session
              history—never guesses disguised as clinical science.
            </p>
          </div>
          <span className="text-[11px] text-[#A3A1BA] whitespace-nowrap">
            Rule-Based Personalization Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              data-testid={`smart-rec-${rec.id}`}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
            >
              <div>
                <div className="text-[11px] text-[#2FE8FF] font-medium">
                  {rec.confidenceNote}
                </div>
                <h3 className="text-sm font-semibold text-[#F5F6FF] mt-1">
                  {rec.title}
                </h3>
                <p className="text-xs text-[#A3A1BA] mt-1.5 leading-relaxed">
                  {rec.explanation}
                </p>
              </div>
              <div className="pt-2 border-t border-white/8 flex justify-end">
                <button
                  type="button"
                  data-testid={`apply-rec-${rec.id}`}
                  onClick={() => onApplyRecommendation(rec)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2FE8FF]/18 hover:bg-[#2FE8FF]/28 border border-[#2FE8FF]/45 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-[#2FE8FF]" />
                  <span>{rec.actionLabel}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. PERSONALIZED ROUTINES (MORNING CLARITY, DEEP WORK, STUDY SESSION, CREATIVE FLOW, EVENING WIND DOWN) */}
      <div className="aura-glass rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#38F8A8]">
              PERSONALIZED ROUTINES
            </h2>
            <p className="text-xs text-[#A3A1BA] mt-0.5">
              Save, edit, duplicate, or launch complete focus + environment +
              soundscape + break configurations.
            </p>
          </div>
          <button
            type="button"
            data-testid="create-routine-btn"
            onClick={startNewRoutine}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#38F8A8]/16 hover:bg-[#38F8A8]/25 border border-[#38F8A8]/45 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#38F8A8]" />
            <span>New Routine</span>
          </button>
        </div>

        {/* Routine Editor Drawer */}
        {editingRoutine && (
          <div
            data-testid="routine-editor-form"
            className="mb-6 p-5 rounded-2xl bg-[#070915]/90 border border-[#2FE8FF]/45 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#F5F6FF]">
                {isCreatingRoutine ? 'Create Custom Routine' : 'Edit Routine'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingRoutine(null);
                  setIsCreatingRoutine(false);
                }}
                className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Routine Name
                </label>
                <input
                  type="text"
                  aria-label="Routine Name"
                  data-testid="routine-name-input"
                  value={editingRoutine.name}
                  onChange={(e) =>
                    setEditingRoutine({
                      ...editingRoutine,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-[#F5F6FF] focus:outline-none focus:border-[#2FE8FF]"
                />
              </div>

              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  aria-label="Routine Description"
                  value={editingRoutine.description}
                  onChange={(e) =>
                    setEditingRoutine({
                      ...editingRoutine,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-[#F5F6FF] focus:outline-none focus:border-[#2FE8FF]"
                />
              </div>

              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Focus Duration
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {FOCUS_PRESET_MINUTES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setEditingRoutine({
                          ...editingRoutine,
                          focusDurationMinutes: m,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-mono ${
                        editingRoutine.focusDurationMinutes === m
                          ? 'bg-[#2FE8FF]/25 text-[#2FE8FF] border border-[#2FE8FF]/55'
                          : 'bg-white/[0.04] text-[#A3A1BA] border border-white/10'
                      } cursor-pointer`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Break Duration & Target Sessions
                </label>
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Routine Break Duration"
                    value={editingRoutine.breakDurationMinutes}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        breakDurationMinutes: Number(e.target.value),
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#0A0D1D] border border-white/15 text-[#F5F6FF]"
                  >
                    <option value={2}>2m break</option>
                    <option value={5}>5m break</option>
                    <option value={10}>10m break</option>
                    <option value={15}>15m break</option>
                  </select>
                  <select
                    aria-label="Routine Target Sessions"
                    value={editingRoutine.targetSessionsCount}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        targetSessionsCount: Number(e.target.value),
                      })
                    }
                    className="px-2.5 py-1.5 rounded-xl bg-[#0A0D1D] border border-white/15 text-[#F5F6FF]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((cnt) => (
                      <option key={cnt} value={cnt}>
                        {cnt} session{cnt > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Focus Atmosphere
                </label>
                <select
                  aria-label="Routine Atmosphere"
                  value={editingRoutine.sceneId}
                  onChange={(e) =>
                    setEditingRoutine({
                      ...editingRoutine,
                      sceneId: e.target.value as FocusSceneId,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0D1D] border border-white/15 text-[#F5F6FF]"
                >
                  {SCENE_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.tagline}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#A3A1BA] mb-1">
                  Paired Soundscape & Organism
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Routine Soundscape"
                    value={editingRoutine.chamberId}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        chamberId: e.target.value as ChamberId,
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#0A0D1D] border border-white/15 text-[#F5F6FF]"
                  >
                    {CHAMBERS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Routine Organism"
                    value={editingRoutine.orbDesign ?? 'celestial-jelly'}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        orbDesign: e.target.value as OrbDesignId,
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#0A0D1D] border border-white/15 text-[#F5F6FF]"
                  >
                    {ORB_DESIGNS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <AuraButton
                variant="primary"
                size="sm"
                data-testid="save-routine-btn"
                onClick={() => {
                  if (!editingRoutine.name.trim()) return;
                  onSaveRoutine({
                    ...editingRoutine,
                    name: editingRoutine.name.trim(),
                  });
                  setEditingRoutine(null);
                  setIsCreatingRoutine(false);
                }}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save Routine
              </AuraButton>
            </div>
          </div>
        )}

        {/* Routines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map((routine) => {
            const sceneMeta =
              FOCUS_SCENES[routine.sceneId] || FOCUS_SCENES['deep-current'];
            const chamberMeta =
              CHAMBERS.find((c) => c.id === routine.chamberId) || CHAMBERS[0];

            return (
              <div
                key={routine.id}
                data-testid={`routine-card-${routine.id}`}
                className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#F5F6FF]">
                      {routine.name}
                    </h3>
                    <span className="font-mono text-xs text-[#2FE8FF] shrink-0">
                      {routine.focusDurationMinutes}m · {routine.targetSessionsCount}x
                    </span>
                  </div>
                  <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                    {routine.description}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#D6D8EC]">
                    <span>{sceneMeta.name}</span>
                    <span>·</span>
                    <span>{chamberMeta.name}</span>
                    <span>·</span>
                    <span>{routine.breakDurationMinutes}m break</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/8 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Edit routine"
                      aria-label={`Edit ${routine.name}`}
                      onClick={() => {
                        setEditingRoutine(routine);
                        setIsCreatingRoutine(false);
                      }}
                      className="p-1.5 rounded-lg text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Duplicate routine"
                      aria-label={`Duplicate ${routine.name}`}
                      onClick={() => onDuplicateRoutine(routine)}
                      className="p-1.5 rounded-lg text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {routines.length > 1 && (
                      <button
                        type="button"
                        title="Delete routine"
                        aria-label={`Delete ${routine.name}`}
                        onClick={() => onDeleteRoutine(routine.id)}
                        className="p-1.5 rounded-lg text-[#A3A1BA] hover:text-[#FFB08A] hover:bg-[#FFB08A]/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid={`launch-routine-${routine.id}`}
                    onClick={() => onApplyRoutine(routine)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2FE8FF]/20 hover:bg-[#2FE8FF]/30 border border-[#2FE8FF]/50 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-[#2FE8FF]" />
                    <span>Use Routine</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TASK BREAKDOWN PLANNER (OPTIONAL AI + DETERMINISTIC FALLBACK) */}
      <div className="aura-glass rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#8A5CFF]">
              TASK BREAKDOWN · MANAGEABLE SESSION PLANNER
            </h2>
            <p className="text-xs text-[#A3A1BA] mt-0.5">
              Enter an assignment, exam topic, or project milestone to break it
              into structured focus sessions.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#D6D8EC] cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={Boolean(settings.aiProcessingConsent)}
              onChange={(e) =>
                onUpdateSettings({ aiProcessingConsent: e.target.checked })
              }
              className="rounded border-white/20 bg-white/10 text-[#2FE8FF]"
            />
            <span>Allow Optional Server-Side AI Breakdown</span>
          </label>
        </div>

        <form
          onSubmit={handleTaskBreakdown}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            type="text"
            aria-label="Enter task to break into focus sessions"
            data-testid="task-breakdown-input"
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            placeholder="e.g., Prepare my physics examination, Build authentication module..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/14 text-xs sm:text-sm text-[#F5F6FF] placeholder:text-[#A3A1BA]/60 focus:outline-none focus:border-[#2FE8FF]"
          />
          <AuraButton
            variant="primary"
            size="md"
            type="submit"
            data-testid="task-breakdown-submit-btn"
            disabled={isBreakingDown}
          >
            <ListChecks className="w-4 h-4 mr-1.5" />
            {isBreakingDown ? 'Structuring Plan…' : 'Break Into Sessions'}
          </AuraButton>
        </form>

        {/* Quick Example Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#A3A1BA]">
          <span>Examples:</span>
          {[
            'Prepare my physics examination',
            'Complete frontend architecture refactor',
            'Write 1,500-word research essay',
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setTaskInput(sample)}
              className="px-2.5 py-0.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-[#D6D8EC] transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {taskSteps.length > 0 && (
          <div
            data-testid="task-breakdown-results"
            className="mt-5 space-y-3 pt-4 border-t border-white/10"
          >
            <div className="flex items-center justify-between text-xs text-[#A3A1BA]">
              <span>Suggested 4-Session Sequence</span>
              <span>
                Engine:{' '}
                <strong className="text-[#F5F6FF] font-normal">
                  {taskSource === 'gemini'
                    ? 'Server-Side Gemini AI (Consent Active)'
                    : 'Deterministic Rule Engine (Local Privacy Mode)'}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {taskSteps.map((step) => {
                const sceneMeta =
                  FOCUS_SCENES[step.recommendedSceneId] ||
                  FOCUS_SCENES['deep-current'];
                return (
                  <div
                    key={step.stepNumber}
                    data-testid={`task-step-${step.stepNumber}`}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#2FE8FF]">
                          Session 0{step.stepNumber} · {step.durationMinutes}m
                        </span>
                        <span className="text-[#A3A1BA]">{sceneMeta.name}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-[#F5F6FF] mt-1">
                        {step.title}
                      </h4>
                      <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                        {step.rationale}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        data-testid={`start-task-step-${step.stepNumber}`}
                        onClick={() => onApplyTaskStep(step)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2FE8FF]/18 hover:bg-[#2FE8FF]/28 border border-[#2FE8FF]/45 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 text-[#2FE8FF]" />
                        <span>Load into Focus Timer</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
