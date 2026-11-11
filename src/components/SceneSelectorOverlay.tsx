import React from 'react';
import { FocusSceneId } from '../types/aura';
import { CHAMBERS, FOCUS_SCENES } from '../utils/focusEngine';
import { X, Check } from 'lucide-react';

interface SceneSelectorOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeSceneId: FocusSceneId;
  onSelectScene: (sceneId: FocusSceneId) => void;
}

export const SceneSelectorOverlay: React.FC<SceneSelectorOverlayProps> = ({
  isOpen,
  onClose,
  activeSceneId,
  onSelectScene,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Scenes"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-[#0F1123]/90 border border-white/12 p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#2FE8FF]">
              Living Lens Physics
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-0.5">
              Focus Scenes
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A1BA] mt-1">
              Each Focus Scene transforms the Living Lens refraction, fluid
              viscosity, and paired acoustic Chamber.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Focus Scenes"
            className="p-2 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Focus Scenes Grid */}
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
                className={`group relative rounded-2xl p-4 text-left flex flex-col justify-between gap-5 transition-all duration-300 border ${
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
    </div>
  );
};
