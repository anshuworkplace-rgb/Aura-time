import React from 'react';
import { Activity, Shield, Sliders, Waves } from 'lucide-react';
import { mapPrimaryOrganismToOrbDesign } from '../hooks/useAuraRhythmMetrics';
import type {
  AuraContextPanelProps,
  PrimaryOrganismId,
} from '../types/auraConsole.types';

const ORGANISM_DETAILS: Record<
  PrimaryOrganismId,
  { name: string; modeTag: string }
> = {
  'liquid-lens': {
    name: 'Liquid Lens',
    modeTag: 'Restorative Sanctuary (Breathe · Stillness · Soundscape)',
  },
  'celestial-jelly': {
    name: 'Celestial Jelly',
    modeTag: 'Deep Bioluminescent Focus',
  },
  'living-bloom': {
    name: 'Living Bloom',
    modeTag: 'Botanical Harmonic Focus',
  },
};

/**
 * Compact contextual panel displaying the current organism experience,
 * daily/weekly progress, and quick jump actions into Aura Console.
 */
export const AuraContextPanel: React.FC<AuraContextPanelProps> = ({
  activeOrganism,
  activeSceneName = 'Deep Current',
  activeChamberName = 'Ocean Drift',
  todayActualMinutes,
  dailyTargetMinutes,
  weeklyActualMinutes,
  weeklyTargetMinutes,
  onOpenConsole,
  onSelectOrganism,
  className = '',
}) => {
  const info = ORGANISM_DETAILS[activeOrganism];

  return (
    <aside
      aria-label="Current Aura Experience Context"
      className={`p-4 rounded-2xl bg-[#090D1E]/85 border border-white/[0.08] text-[#F5F6FF] flex flex-col gap-3 max-w-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#2FE8FF] font-semibold">
            Active Organism
          </span>
          <h4 className="text-sm font-medium text-[#F5F6FF] mt-0.5">
            {info.name}
          </h4>
          <p className="text-[11px] text-[#A3A1BA]">{info.modeTag}</p>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] text-[#A3A1BA]">
          {activeSceneName} · {activeChamberName}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.06]">
        <span className="text-[#A3A1BA]">Today&apos;s Focus</span>
        <span className="font-mono text-[#F5F6FF]">
          {todayActualMinutes}m / {dailyTargetMinutes}m
          {weeklyActualMinutes !== undefined &&
          weeklyTargetMinutes !== undefined
            ? ` · Week ${weeklyActualMinutes}/${weeklyTargetMinutes}m`
            : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={() => onOpenConsole('my-rhythm')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-[#F5F6FF]"
        >
          <Activity className="w-3 h-3 text-[#2FE8FF]" />
          <span>My Rhythm</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenConsole('preferences')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-[#F5F6FF]"
        >
          <Sliders className="w-3 h-3 text-[#8A5CFF]" />
          <span>Preferences</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenConsole('personal-data')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[11px] text-[#F5F6FF]"
        >
          <Shield className="w-3 h-3 text-[#5EF2C4]" />
          <span>Personal Data</span>
        </button>

        {onSelectOrganism && activeOrganism !== 'liquid-lens' && (
          <button
            type="button"
            onClick={() =>
              onSelectOrganism(
                'liquid-lens',
                mapPrimaryOrganismToOrbDesign('liquid-lens')
              )
            }
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#2FE8FF]/15 border border-[#2FE8FF]/40 text-[11px] text-[#2FE8FF]"
          >
            <Waves className="w-3 h-3" />
            <span>Enter Liquid Lens</span>
          </button>
        )}
      </div>
    </aside>
  );
};
