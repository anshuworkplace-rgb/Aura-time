import React from 'react';
import { Sliders } from 'lucide-react';
import type {
  AuraConsoleTriggerProps,
  PrimaryOrganismId,
} from '../types/auraConsole.types';

const ORGANISM_LABELS: Record<PrimaryOrganismId, string> = {
  'liquid-lens': 'Liquid Lens',
  'celestial-jelly': 'Celestial Jelly',
  'living-bloom': 'Living Bloom',
};

/**
 * Reusable trigger button for Main to place in headers or ControlDock
 * to open Aura Console without adding primary navigation tabs.
 */
export const AuraConsoleTrigger: React.FC<AuraConsoleTriggerProps> = ({
  onOpenConsole,
  isOpen = false,
  todayActualMinutes = 0,
  dailyTargetMinutes = 120,
  activeOrganism = 'celestial-jelly',
  className = '',
}) => {
  const ratio =
    dailyTargetMinutes > 0
      ? Math.min(100, Math.round((todayActualMinutes / dailyTargetMinutes) * 100))
      : 0;

  return (
    <button
      type="button"
      onClick={() => onOpenConsole('my-rhythm')}
      aria-expanded={isOpen}
      aria-label="Open Aura Console"
      className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#090D1E]/85 hover:bg-[#0E142C] border transition-all ${
        isOpen
          ? 'border-[#2FE8FF]/55 text-[#F5F6FF] shadow-[0_0_24px_rgba(47,232,255,0.18)]'
          : 'border-white/[0.09] text-[#F5F6FF]'
      } ${className}`}
    >
      <Sliders className="w-3.5 h-3.5 text-[#2FE8FF]" />
      <span className="text-xs font-medium tracking-wide">Aura Console</span>
      <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#A3A1BA]">
        {ORGANISM_LABELS[activeOrganism]} · {todayActualMinutes}m ({ratio}%)
      </span>
    </button>
  );
};
