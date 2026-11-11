import React from 'react';
import {
  FocusImmersionMode,
  FocusSceneId,
  OrbDesignId,
} from '../types/aura';
import { FOCUS_SCENES } from '../utils/focusEngine';
import { ORB_DESIGNS } from '../utils/organicOrbEngine';
import {
  BACKGROUND_MIX_PRESETS,
  computeBackgroundMixWeights,
} from '../utils/quantumNebulaShaders';
import { AuraButton } from './AuraButton';
import {
  Eye,
  Sparkles,
  Maximize2,
  Minimize2,
  Layers,
  Waves,
  Orbit,
} from 'lucide-react';

interface FocusControlPanelProps {
  immersionMode: FocusImmersionMode;
  onChangeImmersionMode: (mode: FocusImmersionMode) => void;
  orbDesign: OrbDesignId;
  onChangeOrbDesign: (design: OrbDesignId) => void;
  activeSceneId: FocusSceneId;
  onSelectScene: (sceneId: FocusSceneId) => void;
  backgroundMix: number;
  onChangeBackgroundMix: (mix: number) => void;
  onOpenScenesGallery: () => void;
  reducedMotion?: boolean;
}

const IMMERSION_MODES: {
  id: FocusImmersionMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: 'Full ORB & signals',
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  {
    id: 'deep',
    label: 'Deep Focus',
    description: 'Expanded spatial lens',
    icon: <Maximize2 className="w-3.5 h-3.5" />,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Pure countdown numerals',
    icon: <Minimize2 className="w-3.5 h-3.5" />,
  },
];

export const FocusControlPanel: React.FC<FocusControlPanelProps> = ({
  immersionMode,
  onChangeImmersionMode,
  orbDesign,
  onChangeOrbDesign,
  activeSceneId,
  onSelectScene,
  backgroundMix,
  onChangeBackgroundMix,
  onOpenScenesGallery,
  reducedMotion = false,
}) => {
  const activeScene =
    FOCUS_SCENES[activeSceneId] || FOCUS_SCENES['deep-current'];
  const activeOrbInfo =
    ORB_DESIGNS.find((d) => d.id === orbDesign) || ORB_DESIGNS[0];
  const mixWeights = computeBackgroundMixWeights(backgroundMix);

  return (
    <div
      role="dialog"
      aria-label="Focus Mode, ORB Design, and Colour Theme Controls"
      data-testid="focus-control-panel"
      className="w-80 sm:w-96 rounded-3xl aura-glass-elevated p-5 flex flex-col gap-3.5 text-xs text-[#F5F6FF] max-h-[82vh] overflow-y-auto"
    >
      {/* Top Header: Active ORB & Colour Theme + Gallery Trigger */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full shrink-0"
            style={{
              background: `linear-gradient(135deg, ${activeScene.colors.primary}, ${activeScene.colors.secondary})`,
              boxShadow: `0 0 12px ${activeScene.colors.primary}88`,
            }}
          />
          <div className="truncate">
            <span className="text-[10px] uppercase tracking-wider text-[#A3A1BA] block">
              {activeOrbInfo.name} · {activeScene.name}
            </span>
            <span className="font-display text-sm font-semibold text-[#F5F6FF] truncate block">
              {activeOrbInfo.subtitle}
            </span>
          </div>
        </div>

        <AuraButton
          variant="secondary"
          size="sm"
          reducedMotion={reducedMotion}
          onClick={onOpenScenesGallery}
          icon={<Layers className="w-3.5 h-3.5" />}
        >
          Scene Gallery
        </AuraButton>
      </div>

      {/* Strictly 3 Selectable ORB Designs: Original | Celestial Jelly | Living Bloom */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#A3A1BA] inline-flex items-center gap-1.5">
          <Orbit className="w-3.5 h-3.5 text-[#2FE8FF]" />
          <span>ORB Design (3 Organisms)</span>
        </span>
        <div
          role="radiogroup"
          aria-label="Select ORB Design"
          className="grid grid-cols-3 gap-1.5"
        >
          {ORB_DESIGNS.map((design) => {
            const isSelected = orbDesign === design.id;
            return (
              <button
                key={design.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`orb-design-${design.id}`}
                onClick={() => onChangeOrbDesign(design.id)}
                title={design.description}
                className={`p-2.5 rounded-2xl flex flex-col items-start gap-1 text-left transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border-[#2FE8FF]/60 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                <span className="font-display text-xs font-semibold text-[#F5F6FF] truncate w-full">
                  {design.name}
                </span>
                <span className="text-[10px] text-[#A3A1BA] leading-tight truncate w-full">
                  {design.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strictly 5 Existing Colour Themes (Focus Scenes) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#A3A1BA] inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#2FE8FF]" />
          <span>Colour Theme (5 Atmospheric Palettes)</span>
        </span>
        <div
          role="radiogroup"
          aria-label="Select Colour Theme"
          className="flex flex-col gap-1"
        >
          {Object.values(FOCUS_SCENES).map((sc) => {
            const id = sc.id;
            const isSelected = id === activeSceneId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                data-testid={`quick-scene-${id}`}
                onClick={() => onSelectScene(id)}
                className={`px-3 py-1.5 rounded-xl flex items-center justify-between gap-3 transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.11] text-[#F5F6FF] border-white/28'
                    : 'bg-white/[0.025] hover:bg-white/[0.07] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${sc.colors.primary}, ${sc.colors.secondary})`,
                    }}
                  />
                  <div className="text-left truncate">
                    <span className="font-display text-xs font-medium text-[#F5F6FF] block">
                      {sc.name}
                    </span>
                    <span className="text-[10px] text-[#A3A1BA] truncate block">
                      {sc.tagline}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${sc.colors.primary}22`,
                      color: sc.colors.primary,
                    }}
                  >
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Background Mix: GPU Fluid Dynamics ↔ Quantum Nebula Atmosphere */}
      <div className="flex flex-col gap-2 bg-black/28 rounded-2xl p-3 border border-white/8">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-[#F5F6FF] font-medium inline-flex items-center gap-1.5 whitespace-nowrap">
            <Waves className="w-3.5 h-3.5 text-[#2FE8FF] shrink-0" />
            <span>Fluid × Nebula Mix</span>
          </span>
          <span
            data-testid="background-mix-readout"
            className="font-mono tabular-nums text-[10px] text-[#2FE8FF] whitespace-nowrap"
          >
            {mixWeights.fluidPercentage}% Fluid · {mixWeights.nebulaPercentage}% Nebula
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {BACKGROUND_MIX_PRESETS.map((preset) => {
            const isSelected = Math.abs(backgroundMix - preset.mix) < 0.08;
            return (
              <button
                key={preset.id}
                type="button"
                data-testid={`bg-mix-preset-${preset.id}`}
                onClick={() => onChangeBackgroundMix(preset.mix)}
                title={preset.description}
                className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-colors border cursor-pointer truncate ${
                  isSelected
                    ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/55 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                {preset.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 pt-0.5">
          <label htmlFor="background-mix-slider" className="sr-only">
            Background Mix between GPU Fluid Dynamics and Quantum Nebula Atmosphere
          </label>
          <input
            id="background-mix-slider"
            data-testid="background-mix-slider"
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={backgroundMix}
            onChange={(e) => onChangeBackgroundMix(parseFloat(e.target.value))}
            className="w-full accent-[#2FE8FF] cursor-pointer"
          />
        </div>
      </div>

      {/* Focus Immersion Mode Switcher: Standard / Deep Focus / Minimal */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-[#A3A1BA]">
          Focus Immersion Mode
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {IMMERSION_MODES.map((m) => {
            const isSelected = immersionMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`immersion-mode-${m.id}`}
                onClick={() => onChangeImmersionMode(m.id)}
                className={`p-2 rounded-2xl flex flex-col items-start gap-0.5 text-left transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-[#2FE8FF]/18 text-[#F5F6FF] border-[#2FE8FF]/55 shadow-sm'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-xs">
                  <span className={isSelected ? 'text-[#2FE8FF]' : ''}>
                    {m.icon}
                  </span>
                  <span>{m.label}</span>
                </div>
                <span className="text-[10px] text-[#A3A1BA] leading-snug">
                  {m.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
