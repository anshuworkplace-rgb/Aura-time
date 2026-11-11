import React from 'react';
import { FocusImmersionMode, FocusSceneId } from '../types/aura';
import { FOCUS_SCENES } from '../utils/focusEngine';
import { AuraButton } from './AuraButton';
import { Eye, Sparkles, Maximize2, Minimize2, Layers } from 'lucide-react';

interface FocusControlPanelProps {
  immersionMode: FocusImmersionMode;
  onChangeImmersionMode: (mode: FocusImmersionMode) => void;
  activeSceneId: FocusSceneId;
  onSelectScene: (sceneId: FocusSceneId) => void;
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
    description: 'Full Living Lens & signals',
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
  activeSceneId,
  onSelectScene,
  onOpenScenesGallery,
  reducedMotion = false,
}) => {
  const activeScene =
    FOCUS_SCENES[activeSceneId] || FOCUS_SCENES['deep-current'];

  return (
    <div
      role="dialog"
      aria-label="Focus Mode and Scene Controls"
      data-testid="focus-control-panel"
      className="w-80 sm:w-92 rounded-3xl aura-glass-elevated p-5 flex flex-col gap-4 text-xs text-[#F5F6FF]"
    >
      {/* Top Header: Active Scene & Gallery Trigger */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
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
              Atmospheric Scene
            </span>
            <span className="font-display text-sm font-semibold text-[#F5F6FF] truncate block">
              {activeScene.name}
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

      {/* Focus Immersion Mode Switcher: Standard / Deep Focus / Minimal */}
      <div className="flex flex-col gap-2">
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
                className={`p-2.5 rounded-2xl flex flex-col items-start gap-1 text-left transition-colors border cursor-pointer ${
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
                <span className="text-[10px] text-[#A3A1BA] leading-snug line-clamp-2">
                  {m.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Focus Scene Switcher (5 Curated Atmospheric Worlds) */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-[#A3A1BA] inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#2FE8FF]" />
          <span>Correlated Lens × Nebula Worlds</span>
        </span>
        <div className="flex flex-col gap-1.5">
          {Object.values(FOCUS_SCENES).map((sc) => {
            const id = sc.id;
            const isSelected = id === activeSceneId;
            return (
              <button
                key={id}
                type="button"
                data-testid={`quick-scene-${id}`}
                onClick={() => onSelectScene(id)}
                className={`px-3 py-2 rounded-2xl flex items-center justify-between gap-3 transition-colors border cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.11] text-[#F5F6FF] border-white/28'
                    : 'bg-white/[0.025] hover:bg-white/[0.07] text-[#A3A1BA] hover:text-[#F5F6FF] border-white/8'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
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
    </div>
  );
};
