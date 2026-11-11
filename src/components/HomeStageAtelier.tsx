import React from 'react';
import {
  ChamberConfig,
  FocusSceneConfig,
  FocusSceneId,
  OrbDesignId,
  TimerStatus,
} from '../types/aura';
import { FOCUS_SCENES } from '../utils/focusEngine';
import { ORB_DESIGNS } from '../utils/organicOrbEngine';

export type HomeStageLayout = 'atelier' | 'horizon' | 'sculpture';

export interface HomeStageLayoutMeta {
  id: HomeStageLayout;
  label: string;
  shortTag: string;
  description: string;
}

export const HOME_STAGE_LAYOUTS: HomeStageLayoutMeta[] = [
  {
    id: 'atelier',
    label: 'Atelier',
    shortTag: 'Orbital Rails',
    description: 'Symmetrical organism & chromatic spectrum rails flanking the ORB',
  },
  {
    id: 'horizon',
    label: 'Horizon',
    shortTag: 'Chrono Scale',
    description: 'Editorial telemetry & interactive chronograph horizon scale',
  },
  {
    id: 'sculpture',
    label: 'Sculpture',
    shortTag: 'Pure ORB',
    description: 'Museum-grade living organism with minimal peripheral chrome',
  },
];

const SCENE_LIST: FocusSceneConfig[] = Object.values(FOCUS_SCENES);
const HORIZON_PRESETS = [15, 25, 45, 60, 90, 120] as const;

/**
 * Bespoke miniature vector glyph for each of the 3 living ORB organisms
 */
const OrganismMiniGlyph: React.FC<{
  designId: OrbDesignId;
  active: boolean;
  primaryColor: string;
  secondaryColor: string;
}> = ({ designId, active, primaryColor, secondaryColor }) => {
  const strokeColor = active ? secondaryColor : 'rgba(245, 246, 255, 0.55)';
  const accentColor = active ? primaryColor : 'rgba(163, 161, 186, 0.45)';

  if (designId === 'celestial-jelly') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 11.5C5 7.2 8.1 4 12 4C15.9 4 19 7.2 19 11.5C16.8 12.6 14.5 11.8 12 12.4C9.5 11.8 7.2 12.6 5 11.5Z"
          stroke={strokeColor}
          strokeWidth="1.5"
        />
        <path
          d="M8.5 12.5C8 15.2 7.2 17.6 8.2 20M12 12.6C12 15.6 11.4 18.2 12.3 20.5M15.5 12.5C16 15.2 16.8 17.6 15.8 20"
          stroke={accentColor}
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (designId === 'living-bloom') {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-4 h-4 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 3.5C14.2 6.8 14.2 9.8 12 12C9.8 9.8 9.8 6.8 12 3.5Z"
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M12 20.5C14.2 17.2 14.2 14.2 12 12C9.8 14.2 9.8 17.2 12 20.5Z"
          stroke={strokeColor}
          strokeWidth="1.4"
        />
        <path
          d="M3.5 12C6.8 9.8 9.8 9.8 12 12C9.8 14.2 6.8 14.2 3.5 12Z"
          stroke={accentColor}
          strokeWidth="1.4"
        />
        <path
          d="M20.5 12C17.2 9.8 14.2 9.8 12 12C14.2 14.2 17.2 14.2 20.5 12Z"
          stroke={accentColor}
          strokeWidth="1.4"
        />
        <circle cx="12" cy="12" r="2" fill={strokeColor} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="7.5"
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="4.2"
        ry="7.2"
        transform="rotate(-28 12 12)"
        stroke={accentColor}
        strokeWidth="1.2"
      />
    </svg>
  );
};

interface StageSwitcherBarProps {
  stageLayout: HomeStageLayout;
  onChangeStageLayout: (layout: HomeStageLayout) => void;
  activeScene: FocusSceneConfig;
}

/**
 * Top-Center Home Stage Designer Switcher (`Atelier` | `Horizon` | `Sculpture`)
 */
export const HomeStageSwitcherPill: React.FC<StageSwitcherBarProps> = ({
  stageLayout,
  onChangeStageLayout,
  activeScene,
}) => {
  return (
    <div
      data-testid="home-stage-switcher"
      role="radiogroup"
      aria-label="Home Page Stage Design"
      className="hidden sm:flex items-center gap-1 p-1 rounded-full aura-glass"
    >
      {HOME_STAGE_LAYOUTS.map((mode) => {
        const isSelected = stageLayout === mode.id;
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-testid={`stage-layout-${mode.id}`}
            onClick={() => onChangeStageLayout(mode.id)}
            title={`${mode.label} — ${mode.description}`}
            className={`relative px-3 py-1 rounded-full text-[11px] font-medium tracking-[0.12em] uppercase transition-all duration-300 cursor-pointer ${
              isSelected
                ? 'text-[#F5F6FF] shadow-sm'
                : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
            }`}
            style={
              isSelected
                ? {
                    background: `linear-gradient(135deg, ${activeScene.colors.primary}38, ${activeScene.colors.secondary}28)`,
                    boxShadow: `inset 0 0 0 1px ${activeScene.colors.secondary}66`,
                  }
                : undefined
            }
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
};

interface HomeStageOrbitalRailsProps {
  stageLayout: HomeStageLayout;
  orbDesign: OrbDesignId;
  onSelectOrbDesign: (id: OrbDesignId) => void;
  activeSceneId: FocusSceneId;
  activeScene: FocusSceneConfig;
  onSelectScene: (id: FocusSceneId) => void;
  activeChamber: ChamberConfig;
  onCycleChamber: () => void;
  durationMinutes: number;
  onChangeDuration: (minutes: number) => void;
  status: TimerStatus;
  railVisible: boolean;
}

/**
 * Symmetrical Orbital Rails (`Atelier` mode) & Editorial Telemetry (`Horizon` mode)
 * that frame the central ORB on the Home Page without competing with it.
 */
export const HomeStageOrbitalFrame: React.FC<HomeStageOrbitalRailsProps> = ({
  stageLayout,
  orbDesign,
  onSelectOrbDesign,
  activeSceneId,
  activeScene,
  onSelectScene,
  activeChamber,
  onCycleChamber,
  durationMinutes,
  onChangeDuration,
  status,
  railVisible,
}) => {
  const isRunningOrPaused = status === 'running' || status === 'paused';
  const hiddenDuringSession = isRunningOrPaused && !railVisible;

  const currentOrbMeta =
    ORB_DESIGNS.find((d) => d.id === orbDesign) ?? ORB_DESIGNS[0];

  const handleCycleOrb = () => {
    const idx = ORB_DESIGNS.findIndex((d) => d.id === orbDesign);
    const next = ORB_DESIGNS[(idx + 1) % ORB_DESIGNS.length];
    onSelectOrbDesign(next.id);
  };

  const handleCycleScene = () => {
    const idx = SCENE_LIST.findIndex((s) => s.id === activeSceneId);
    const next = SCENE_LIST[(idx + 1) % SCENE_LIST.length];
    onSelectScene(next.id);
  };

  return (
    <>
      {/* ====================================================================
          MODE 1: ATELIER — SYMMETRICAL LEFT/RIGHT ORBITAL STUDIO RAILS
          ==================================================================== */}
      {stageLayout === 'atelier' && (
        <>
          {/* Left Orbital Rail: LIVING FORM (3 Organisms) */}
          <aside
            data-testid="home-orbital-organism-rail"
            aria-label="Living ORB Organism Selector"
            className={`hidden xl:flex flex-col gap-2.5 fixed left-7 top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ${
              hiddenDuringSession
                ? 'opacity-0 -translate-x-4 pointer-events-none'
                : 'opacity-100 translate-x-0'
            }`}
          >
            <div className="px-2.5 pb-1 flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: activeScene.colors.secondary }}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A3A1BA]/80">
                Living Form
              </span>
            </div>

            <div className="flex flex-col gap-2 p-2 rounded-2xl aura-glass">
              {ORB_DESIGNS.map((design, idx) => {
                const isSelected = orbDesign === design.id;
                return (
                  <button
                    key={design.id}
                    type="button"
                    data-testid={`home-orb-node-${design.id}`}
                    onClick={() => onSelectOrbDesign(design.id)}
                    aria-pressed={isSelected}
                    title={`${design.name} — ${design.description}`}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 cursor-pointer w-[184px] ${
                      isSelected
                        ? 'bg-white/[0.08] text-[#F5F6FF]'
                        : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/[0.04]'
                    }`}
                    style={
                      isSelected
                        ? {
                            boxShadow: `inset 0 0 0 1px ${activeScene.colors.secondary}55, 0 8px 24px -8px ${activeScene.colors.primary}55`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: isSelected
                          ? `radial-gradient(circle at 35% 35%, ${activeScene.colors.primary}44, ${activeScene.colors.secondary}22)`
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected
                          ? `1px solid ${activeScene.colors.secondary}66`
                          : '1px solid rgba(255, 255, 255, 0.07)',
                      }}
                    >
                      <OrganismMiniGlyph
                        designId={design.id}
                        active={isSelected}
                        primaryColor={activeScene.colors.primary}
                        secondaryColor={activeScene.colors.secondary}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium tracking-tight truncate">
                          {design.name}
                        </span>
                        <span className="font-mono text-[9px] text-[#A3A1BA]/60">
                          0{idx + 1}
                        </span>
                      </div>
                      <span className="block text-[10px] text-[#A3A1BA]/80 truncate">
                        {design.subtitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Orbital Rail: SPECTRUM (5 Existing Colour Themes) */}
          <aside
            data-testid="home-orbital-spectrum-rail"
            aria-label="Colour Theme Spectrum Selector"
            className={`hidden xl:flex flex-col items-end gap-2.5 fixed right-7 top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ${
              hiddenDuringSession
                ? 'opacity-0 translate-x-4 pointer-events-none'
                : 'opacity-100 translate-x-0'
            }`}
          >
            <div className="px-2.5 pb-1 flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A3A1BA]/80">
                Atmosphere
              </span>
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: activeScene.colors.primary }}
              />
            </div>

            <div className="flex flex-col gap-1.5 p-2 rounded-2xl aura-glass">
              {SCENE_LIST.map((scene) => {
                const isSelected = activeSceneId === scene.id;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    data-testid={`home-theme-node-${scene.id}`}
                    onClick={() => onSelectScene(scene.id)}
                    aria-pressed={isSelected}
                    title={`${scene.name} — ${scene.tagline}`}
                    className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-300 cursor-pointer w-[176px] ${
                      isSelected
                        ? 'bg-white/[0.08] text-[#F5F6FF]'
                        : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/[0.04]'
                    }`}
                    style={
                      isSelected
                        ? {
                            boxShadow: `inset 0 0 0 1px ${scene.colors.secondary}55`,
                          }
                        : undefined
                    }
                  >
                    <span className="text-xs font-medium tracking-tight truncate">
                      {scene.name}
                    </span>

                    <span
                      className={`w-4 h-4 rounded-full shrink-0 transition-transform duration-300 ${
                        isSelected ? 'scale-110' : 'group-hover:scale-110'
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${scene.colors.primary}, ${scene.colors.secondary})`,
                        boxShadow: isSelected
                          ? `0 0 12px ${scene.colors.primary}AA`
                          : 'none',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      )}

      {/* ====================================================================
          MODE 2: HORIZON — EDITORIAL TELEMETRY & CHRONOGRAPH HORIZON SCALE
          ==================================================================== */}
      {stageLayout === 'horizon' && !hiddenDuringSession && (
        <div
          data-testid="home-horizon-telemetry"
          className="w-full max-w-2xl mx-auto mb-1 flex flex-col items-center gap-2 z-30 animate-fade-in"
        >
          {/* Interactive Click-to-Cycle Editorial Telemetry Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full aura-glass text-[10px] font-mono uppercase tracking-[0.18em] text-[#A3A1BA]">
            <button
              type="button"
              data-testid="horizon-cycle-orb-btn"
              onClick={handleCycleOrb}
              title="Click to cycle Living ORB Organism"
              className="hover:text-[#F5F6FF] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-[#A3A1BA]/60">FORM //</span>
              <span style={{ color: activeScene.colors.secondary }}>
                {currentOrbMeta.name}
              </span>
            </button>

            <span className="text-white/15">·</span>

            <button
              type="button"
              data-testid="horizon-cycle-theme-btn"
              onClick={handleCycleScene}
              title="Click to cycle Colour Theme"
              className="hover:text-[#F5F6FF] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-[#A3A1BA]/60">PALETTE //</span>
              <span style={{ color: activeScene.colors.primary }}>
                {activeScene.name}
              </span>
            </button>

            <span className="text-white/15">·</span>

            <button
              type="button"
              data-testid="horizon-cycle-chamber-btn"
              onClick={onCycleChamber}
              title="Click to cycle Acoustic Chamber"
              className="hover:text-[#F5F6FF] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-[#A3A1BA]/60">CHAMBER //</span>
              <span className="text-[#F5F6FF]/90">{activeChamber.name}</span>
            </button>
          </div>

          {/* Precision Chronograph Horizon Scale (when Idle) */}
          {status === 'idle' && (
            <div
              role="group"
              aria-label="Chronograph Duration Scale"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.02] border border-white/[0.06]"
            >
              {HORIZON_PRESETS.map((mins) => {
                const isCurr = durationMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onChangeDuration(mins)}
                    className={`px-2 py-0.5 rounded-full font-mono text-[10px] transition-all cursor-pointer ${
                      isCurr
                        ? 'text-[#F5F6FF] font-semibold'
                        : 'text-[#A3A1BA]/70 hover:text-[#F5F6FF]'
                    }`}
                    style={
                      isCurr
                        ? {
                            backgroundColor: `${activeScene.colors.primary}33`,
                            boxShadow: `inset 0 0 0 1px ${activeScene.colors.secondary}66`,
                          }
                        : undefined
                    }
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
};
