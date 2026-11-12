import React from 'react';
import { FocusSceneId, OrbDesignId } from '../types/aura';
import { CHAMBERS, FOCUS_SCENES } from '../utils/focusEngine';
import { ORB_DESIGNS } from '../utils/organicOrbEngine';
import {
  BACKGROUND_MIX_PRESETS,
  computeBackgroundMixWeights,
} from '../utils/quantumNebulaShaders';
import { X, Check, Waves, Orbit } from 'lucide-react';

interface SceneSelectorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeSceneId: FocusSceneId;
  onSelectScene: (sceneId: FocusSceneId) => void;
  orbDesign?: OrbDesignId;
  onChangeOrbDesign?: (design: OrbDesignId) => void;
  backgroundMix?: number;
  onChangeBackgroundMix?: (mix: number) => void;
}

export const SceneSelectorOverlay: React.FC<SceneSelectorOverlayProps> = ({
  isOpen,
  onClose,
  activeSceneId,
  onSelectScene,
  orbDesign = 'original',
  onChangeOrbDesign,
  backgroundMix = 0.52,
  onChangeBackgroundMix,
}) => {
  if (!isOpen) return null;

  const mixWeights = computeBackgroundMixWeights(backgroundMix);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ORB Designs and Focus Scenes"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl aura-glass-elevated p-5 sm:p-6 flex flex-col gap-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#2FE8FF]">
              Living ORB Organisms × 5 Atmospheric Colour Themes
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] mt-0.5">
              ORB Design & Focus Scenes
            </h2>
            <p className="text-xs text-[#A3A1BA] mt-0.5">
              Combine any of the 3 living ORB organisms with any of the 5
              atmospheric colour themes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Focus Scenes"
            className="p-2 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strictly 3 ORB Designs Selector: Original | Celestial Jelly | Living Bloom */}
        {onChangeOrbDesign && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#F5F6FF] inline-flex items-center gap-2">
                <Orbit className="w-4 h-4 text-[#2FE8FF]" />
                <span>1. Select ORB Design (3 Living Organisms)</span>
              </span>
              <span className="text-[11px] font-mono text-[#A3A1BA]">
                Persisted independently of colour theme
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ORB_DESIGNS.map((design) => {
                const isSelected = orbDesign === design.id;
                return (
                  <button
                    key={design.id}
                    type="button"
                    data-testid={`gallery-orb-design-${design.id}`}
                    onClick={() => onChangeOrbDesign(design.id)}
                    className={`rounded-2xl p-4 text-left flex flex-col justify-between gap-2 transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-[#2FE8FF]/16 border-[#2FE8FF]/65 shadow-lg'
                        : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
                          {design.name}
                        </h3>
                        <span className="text-[11px] text-[#2FE8FF]">
                          {design.subtitle}
                        </span>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-[#2FE8FF]/20 text-[#2FE8FF]">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#A3A1BA] leading-relaxed">
                      {design.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Strictly 5 Existing Colour Themes Grid */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-medium text-[#F5F6FF]">
            2. Select Colour Theme (5 Atmospheric Worlds)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {(Object.keys(FOCUS_SCENES) as FocusSceneId[]).map((id) => {
              const sc = FOCUS_SCENES[id];
              const isSelected = activeSceneId === id;
              const suggestedChamber = CHAMBERS.find(
                (c) => c.id === sc.suggestedChamberId
              );

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectScene(id);
                    onClose();
                  }}
                  className={`group relative rounded-2xl p-4 text-left flex flex-col justify-between gap-5 transition-all duration-300 border cursor-pointer ${
                    isSelected
                      ? 'bg-white/12 border-[#2FE8FF]/60 shadow-lg'
                      : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07] hover:border-white/20'
                  }`}
                >
                  {/* Refractive Liquid Sphere Preview */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-12 h-12 rounded-full relative overflow-hidden shadow-inner border border-white/25 transition-transform duration-500 group-hover:scale-105"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${sc.colors.iridescent}, ${sc.colors.primary} 48%, ${sc.colors.secondary} 82%, ${sc.colors.baseBg})`,
                      }}
                    />
                    {isSelected && (
                      <span className="p-1 rounded-full bg-[#2FE8FF]/20 text-[#2FE8FF]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-display text-base font-semibold text-[#F5F6FF]">
                      {sc.name}
                    </h3>
                    <p className="text-[11px] font-medium text-[#2FE8FF]/90">
                      {sc.tagline}
                    </p>
                    <p className="text-xs text-[#A3A1BA] leading-relaxed mt-1">
                      {sc.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/8 w-full text-[11px] text-[#A3A1BA]">
                    <span>Paired Chamber · </span>
                    <span className="text-[#F5F6FF] font-medium">
                      {suggestedChamber?.name || 'Rain Chamber'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* GPU Fluid Dynamics × Quantum Nebula Atmosphere Mix Control Bar */}
        {onChangeBackgroundMix && (
          <div className="rounded-2xl bg-black/30 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#F5F6FF]">
                <Waves className="w-4 h-4 text-[#2FE8FF]" />
                <span>Background Mix: GPU Fluid Dynamics × Quantum Nebula</span>
              </div>
              <span className="text-[11px] font-mono text-[#2FE8FF]">
                {mixWeights.fluidPercentage}% GPU Fluid Dynamics ·{' '}
                {mixWeights.nebulaPercentage}% Quantum Nebula Atmosphere
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1.5">
                {BACKGROUND_MIX_PRESETS.map((preset) => {
                  const isCurrent =
                    Math.abs(backgroundMix - preset.mix) < 0.08;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onChangeBackgroundMix(preset.mix)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50'
                          : 'bg-white/[0.04] hover:bg-white/[0.1] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/10'
                      }`}
                    >
                      {preset.shortLabel}
                    </button>
                  );
                })}
              </div>

              <input
                type="range"
                aria-label="Gallery Background Mix Slider"
                min={0}
                max={1}
                step={0.02}
                value={backgroundMix}
                onChange={(e) =>
                  onChangeBackgroundMix(parseFloat(e.target.value))
                }
                className="w-full sm:w-36 accent-[#2FE8FF] cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
