import React from 'react';
import {
  Bell,
  Eye,
  Palette,
  Sliders,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react';
import type {
  ChamberId,
  FocusSceneId,
  OrbDesignId,
  UserSettings,
} from '../../../types/aura';
import {
  mapOrbDesignToPrimaryOrganism,
  mapPrimaryOrganismToOrbDesign,
} from '../hooks/useAuraRhythmMetrics';
import { AURA_CONSOLE_STYLES } from '../styles/auraConsole.styles';
import type { PrimaryOrganismId } from '../types/auraConsole.types';

export interface PreferencesPanelProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onSelectOrganism?: (
    organismId: PrimaryOrganismId,
    mappedOrbDesign: OrbDesignId
  ) => void;
  onSelectScene?: (sceneId: FocusSceneId) => void;
  onSelectChamber?: (chamberId: ChamberId) => void;
}

const ORGANISM_OPTIONS: {
  id: PrimaryOrganismId;
  orbDesign: OrbDesignId;
  name: string;
  role: string;
}[] = [
  {
    id: 'liquid-lens',
    orbDesign: 'original',
    name: 'Liquid Lens',
    role: 'Restorative fluid-glass sanctuary',
  },
  {
    id: 'celestial-jelly',
    orbDesign: 'celestial-jelly',
    name: 'Celestial Jelly',
    role: 'Bioluminescent deep-focus organism',
  },
  {
    id: 'living-bloom',
    orbDesign: 'living-bloom',
    name: 'Living Bloom',
    role: 'Botanical harmonic focus organism',
  },
];

const SCENE_OPTIONS: { id: FocusSceneId; label: string }[] = [
  { id: 'deep-current', label: 'Deep Current' },
  { id: 'chromatic-flow', label: 'Chromatic Flow' },
  { id: 'night-signal', label: 'Night Signal' },
  { id: 'electric-quiet', label: 'Electric Quiet' },
  { id: 'solar-drift', label: 'Solar Drift' },
];

const CHAMBER_OPTIONS: { id: ChamberId; label: string }[] = [
  { id: 'ocean-drift', label: 'Ocean Drift' },
  { id: 'rain-chamber', label: 'Rain Chamber' },
  { id: 'forest-echo', label: 'Forest Echo' },
  { id: 'cosmic-silence', label: 'Cosmic Silence' },
  { id: 'ember-glow', label: 'Ember Glow' },
  { id: 'celestial-tone', label: 'Celestial Tone' },
];

const FOCUS_DURATION_OPTIONS = [15, 25, 45, 50, 60, 90] as const;
const RESTORE_DURATION_OPTIONS = [2, 5, 10, 15] as const;

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  settings,
  onUpdateSettings,
  onSelectOrganism,
  onSelectScene,
  onSelectChamber,
}) => {
  const currentOrganism = mapOrbDesignToPrimaryOrganism(settings.orbDesign);

  const handleOrganismSelect = (organismId: PrimaryOrganismId) => {
    const orbDesign = mapPrimaryOrganismToOrbDesign(organismId);
    onUpdateSettings({ orbDesign });
    onSelectOrganism?.(organismId, orbDesign);
  };

  const handleSceneSelect = (sceneId: FocusSceneId) => {
    onUpdateSettings({ preferredSceneId: sceneId });
    onSelectScene?.(sceneId);
  };

  const handleChamberSelect = (chamberId: ChamberId) => {
    onUpdateSettings({ selectedChamberId: chamberId, soundMuted: false });
    onSelectChamber?.(chamberId);
  };

  return (
    <div className="flex flex-col gap-4" aria-label="Preferences configuration">
      {/* 1. Primary Organism Preference */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2FE8FF]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Primary Organism</span>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          role="radiogroup"
          aria-label="Primary organism selection"
        >
          {ORGANISM_OPTIONS.map((org) => {
            const active = currentOrganism === org.id;
            return (
              <button
                key={org.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleOrganismSelect(org.id)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  active
                    ? 'bg-[#2FE8FF]/14 border-[#2FE8FF]/45 text-[#F5F6FF]'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07] text-[#A3A1BA]'
                }`}
              >
                <div className="text-xs font-semibold text-[#F5F6FF]">
                  {org.name}
                </div>
                <div className="text-[10px] text-[#A3A1BA] mt-0.5">
                  {org.role}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Atmosphere Selection */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
          <Palette className="w-3.5 h-3.5 text-[#8A5CFF]" />
          <span>Atmosphere & Visual Field</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SCENE_OPTIONS.map((scene) => {
            const active =
              (settings.preferredSceneId ?? 'deep-current') === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSceneSelect(scene.id)}
                className={
                  active
                    ? AURA_CONSOLE_STYLES.pillButtonActive
                    : AURA_CONSOLE_STYLES.pillButton
                }
              >
                {scene.label}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1 pt-2 border-t border-white/[0.06]">
          <div className="flex justify-between text-xs">
            <span className="text-[#A3A1BA]">
              Atmospheric Depth Mix (Fluid ↔ Nebula)
            </span>
            <span className="font-mono text-[#F5F6FF]">
              {Math.round((settings.backgroundMix ?? 0.5) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round((settings.backgroundMix ?? 0.5) * 100)}
            onChange={(e) =>
              onUpdateSettings({ backgroundMix: Number(e.target.value) / 100 })
            }
            className="accent-[#2FE8FF] w-full"
          />
        </label>
      </div>

      {/* 3. Default Focus & Restorative Durations + Daily/Weekly Targets */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
          <Target className="w-3.5 h-3.5 text-[#5EF2C4]" />
          <span>Default Durations & Focus Targets</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] text-[#A3A1BA] block mb-1.5">
              Default Focus Duration
            </span>
            <div className="flex flex-wrap gap-1">
              {FOCUS_DURATION_OPTIONS.map((mins) => {
                const active = (settings.preferredDurationMinutes ?? 25) === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ preferredDurationMinutes: mins })
                    }
                    className={
                      active
                        ? AURA_CONSOLE_STYLES.pillButtonActive
                        : AURA_CONSOLE_STYLES.pillButton
                    }
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-[#A3A1BA] block mb-1.5">
              Default Restorative Break
            </span>
            <div className="flex flex-wrap gap-1">
              {RESTORE_DURATION_OPTIONS.map((mins) => {
                const active = (settings.breakMinutes ?? 5) === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onUpdateSettings({ breakMinutes: mins })}
                    className={
                      active
                        ? AURA_CONSOLE_STYLES.pillButtonActive
                        : AURA_CONSOLE_STYLES.pillButton
                    }
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-[#A3A1BA]">Daily Focus Target</span>
              <span className="font-mono text-[#F5F6FF]">
                {settings.dailyGoalMinutes}m
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={360}
              step={15}
              value={settings.dailyGoalMinutes}
              onChange={(e) =>
                onUpdateSettings({ dailyGoalMinutes: Number(e.target.value) })
              }
              className="accent-[#2FE8FF] w-full"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-xs">
              <span className="text-[#A3A1BA]">Weekly Focus Target</span>
              <span className="font-mono text-[#F5F6FF]">
                {settings.weeklyGoalMinutes ?? settings.dailyGoalMinutes * 5}m
              </span>
            </div>
            <input
              type="range"
              min={120}
              max={1800}
              step={60}
              value={settings.weeklyGoalMinutes ?? settings.dailyGoalMinutes * 5}
              onChange={(e) =>
                onUpdateSettings({ weeklyGoalMinutes: Number(e.target.value) })
              }
              className="accent-[#8A5CFF] w-full"
            />
          </label>
        </div>
      </div>

      {/* 4. Audio Preferences */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
            <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Audio & Acoustic Chambers</span>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-[#A3A1BA] cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(settings.soundMuted)}
              onChange={(e) =>
                onUpdateSettings({ soundMuted: e.target.checked })
              }
              className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
            />
            <span>Mute All</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CHAMBER_OPTIONS.map((ch) => {
            const active =
              (settings.selectedChamberId ?? 'ocean-drift') === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChamberSelect(ch.id)}
                className={
                  active
                    ? AURA_CONSOLE_STYLES.pillButtonActive
                    : AURA_CONSOLE_STYLES.pillButton
                }
              >
                {ch.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A3A1BA]">Ambience</span>
              <span className="font-mono text-[#F5F6FF]">
                {Math.round(settings.ambienceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.ambienceVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({
                  ambienceVolume: Number(e.target.value) / 100,
                })
              }
              className="accent-[#2FE8FF]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A3A1BA]">Harmonic Layer</span>
              <span className="font-mono text-[#F5F6FF]">
                {Math.round(settings.secondaryVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.secondaryVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({
                  secondaryVolume: Number(e.target.value) / 100,
                })
              }
              className="accent-[#8A5CFF]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#A3A1BA]">Completion Chime</span>
              <span className="font-mono text-[#F5F6FF]">
                {Math.round(settings.alertVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.alertVolume * 100)}
              onChange={(e) =>
                onUpdateSettings({ alertVolume: Number(e.target.value) / 100 })
              }
              className="accent-[#5EF2C4]"
            />
          </label>
        </div>
      </div>

      {/* 5. Appearance, Motion, Notifications & Interface Behavior */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
          <Sliders className="w-3.5 h-3.5 text-[#2FE8FF]" />
          <span>Interface, Accessibility & Notifications</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
            <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
              <Eye className="w-3.5 h-3.5 text-[#2FE8FF]" />
              <span>Reduced Motion</span>
            </span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) =>
                onUpdateSettings({ reducedMotion: e.target.checked })
              }
              className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
            <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
              <Bell className="w-3.5 h-3.5 text-[#5EF2C4]" />
              <span>Session Notifications</span>
            </span>
            <input
              type="checkbox"
              checked={settings.desktopNotifications}
              onChange={(e) =>
                onUpdateSettings({ desktopNotifications: e.target.checked })
              }
              className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
            <span className="text-[#F5F6FF]">High Contrast Surfaces</span>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) =>
                onUpdateSettings({ highContrast: e.target.checked })
              }
              className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
            <span className="text-[#F5F6FF]">Audio-Reactive Organism</span>
            <input
              type="checkbox"
              checked={settings.audioReactive}
              onChange={(e) =>
                onUpdateSettings({ audioReactive: e.target.checked })
              }
              className="rounded border-white/20 bg-white/5 text-[#2FE8FF]"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
