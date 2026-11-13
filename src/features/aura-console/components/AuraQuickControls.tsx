import React from 'react';
import {
  Activity,
  Shield,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { OrbDesignId } from '../../../types/aura';
import { mapPrimaryOrganismToOrbDesign } from '../hooks/useAuraRhythmMetrics';
import type {
  AuraQuickControlsProps,
  PrimaryOrganismId,
} from '../types/auraConsole.types';

const PRIMARY_ORGANISMS: {
  id: PrimaryOrganismId;
  label: string;
  orbDesign: OrbDesignId;
}[] = [
  { id: 'liquid-lens', label: 'Liquid Lens', orbDesign: 'original' },
  {
    id: 'celestial-jelly',
    label: 'Celestial Jelly',
    orbDesign: 'celestial-jelly',
  },
  { id: 'living-bloom', label: 'Living Bloom', orbDesign: 'living-bloom' },
];

/**
 * Reusable quick-control bar that Main can mount alongside or inside ControlDock.
 * Exposes direct triggers for Aura Console, My Rhythm, Preferences, Personal Data,
 * and the three primary organisms (Liquid Lens, Celestial Jelly, Living Bloom).
 */
export const AuraQuickControls: React.FC<AuraQuickControlsProps> = ({
  onOpenConsole,
  onOpenMyRhythm,
  onOpenPreferences,
  onOpenPersonalData,
  activeOrganism = 'celestial-jelly',
  onSelectOrganism,
  todayActualMinutes = 0,
  dailyTargetMinutes = 120,
  isMuted = false,
  onToggleMute,
  className = '',
}) => {
  const handleMyRhythm = () => {
    if (onOpenMyRhythm) {
      onOpenMyRhythm();
    } else {
      onOpenConsole('my-rhythm');
    }
  };

  const handlePreferences = () => {
    if (onOpenPreferences) {
      onOpenPreferences();
    } else {
      onOpenConsole('preferences');
    }
  };

  const handlePersonalData = () => {
    if (onOpenPersonalData) {
      onOpenPersonalData();
    } else {
      onOpenConsole('personal-data');
    }
  };

  return (
    <div
      aria-label="Aura Quick Controls"
      className={`inline-flex flex-wrap items-center gap-2 p-2 rounded-2xl bg-[#090D1E]/85 border border-white/[0.09] text-[#F5F6FF] shadow-xl ${className}`}
    >
      {/* 3 Primary Organisms Selector */}
      {onSelectOrganism && (
        <div
          className="flex items-center gap-1 pr-2 border-r border-white/[0.08]"
          role="group"
          aria-label="Switch primary organism"
        >
          {PRIMARY_ORGANISMS.map((org) => {
            const selected = activeOrganism === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() =>
                  onSelectOrganism(
                    org.id,
                    mapPrimaryOrganismToOrbDesign(org.id)
                  )
                }
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-[#2FE8FF]/18 border border-[#2FE8FF]/45 text-[#F5F6FF]'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                {org.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Direct Destination Triggers */}
      <button
        type="button"
        onClick={handleMyRhythm}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-[#F5F6FF]"
      >
        <Activity className="w-3.5 h-3.5 text-[#2FE8FF]" />
        <span>My Rhythm</span>
        <span className="font-mono text-[10px] text-[#A3A1BA]">
          {todayActualMinutes}/{dailyTargetMinutes}m
        </span>
      </button>

      <button
        type="button"
        onClick={handlePreferences}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-[#F5F6FF]"
      >
        <Sliders className="w-3.5 h-3.5 text-[#8A5CFF]" />
        <span>Preferences</span>
      </button>

      <button
        type="button"
        onClick={handlePersonalData}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-xs font-medium text-[#F5F6FF]"
      >
        <Shield className="w-3.5 h-3.5 text-[#5EF2C4]" />
        <span>Personal Data</span>
      </button>

      {onToggleMute && (
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-[#A3A1BA] hover:text-[#F5F6FF]"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-300" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
          )}
        </button>
      )}

      <button
        type="button"
        onClick={() => onOpenConsole('my-rhythm')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2FE8FF]/15 border border-[#2FE8FF]/40 text-xs font-semibold text-[#F5F6FF]"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#2FE8FF]" />
        <span>Open Aura Console</span>
      </button>
    </div>
  );
};
