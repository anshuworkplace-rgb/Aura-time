import React from 'react';
import {
  ChamberConfig,
  ChamberId,
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
    shortTag: 'Minimal Stage',
    description:
      'Refined organism selector with unobstructed centerpiece and right-side theme spectrum',
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

const ORGANISM_DISPLAY_LABELS: Record<OrbDesignId, string> = {
  original: 'Liquid Lens',
  'celestial-jelly': 'Celestial Jelly',
  'living-bloom': 'Living Bloom',
};

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
        className="w-3.5 h-3.5 shrink-0"
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
        className="w-3.5 h-3.5 shrink-0"
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
      className="w-3.5 h-3.5 shrink-0"
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

interface HomeStageOrbitalRailsProps {
  stageLayout?: HomeStageLayout;
  orbDesign: OrbDesignId;
  onSelectOrbDesign: (id: OrbDesignId) => void;
  activeSceneId: FocusSceneId;
  activeScene: FocusSceneConfig;
  onSelectScene: (id: FocusSceneId) => void;
  activeChamber: ChamberConfig;
  onSelectChamber?: (id: ChamberId) => void;
  isSoundPlaying?: boolean;
  onToggleSound?: () => void;
  onCycleChamber: () => void;
  durationMinutes: number;
  onChangeDuration: (minutes: number) => void;
  status: TimerStatus;
  railVisible: boolean;
}

/**
 * Renders:
 * 1. Top-center Organism Selector pill (`Liquid Lens` | `Celestial Jelly` | `Living Bloom`)
 * 2. Right-side Theme Spectrum Selector (`ATMOSPHERE •` with the 5 colour themes)
 */
export const HomeStageOrbitalFrame: React.FC<HomeStageOrbitalRailsProps> = ({
  orbDesign,
  onSelectOrbDesign,
  activeSceneId,
  activeScene,
  onSelectScene,
  status,
  railVisible,
}) => {
  const isRunningOrPaused = status === 'running' || status === 'paused';
  const hiddenDuringSession = isRunningOrPaused && !railVisible;

  return (
    <>
      {/* 1. First Option: Top-Center Organism Selector Pill (Liquid Lens | Celestial Jelly | Living Bloom) */}
      <nav
        data-testid="home-orbital-organism-rail"
        role="radiogroup"
        aria-label="Organism Selector"
        className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 sm:gap-1 p-1 rounded-full aura-glass shadow-2xl max-w-[calc(100vw-1.25rem)] transition-all duration-500 ${
          hiddenDuringSession
            ? 'opacity-0 -translate-y-2 pointer-events-none'
            : 'opacity-100'
        }`}
      >
        {ORB_DESIGNS.map((design) => {
          const isSelected = orbDesign === design.id;
          const displayLabel =
            ORGANISM_DISPLAY_LABELS[design.id] || design.name;
          return (
            <button
              key={design.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`home-orb-node-${design.id}`}
              onClick={() => onSelectOrbDesign(design.id)}
              title={`${displayLabel} — ${design.description}`}
              className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'text-[#F5F6FF] font-semibold'
                  : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/[0.04]'
              }`}
              style={
                isSelected
                  ? {
                      background: `linear-gradient(135deg, ${activeScene.colors.primary}2E, ${activeScene.colors.secondary}22)`,
                      boxShadow: `inset 0 0 0 1px ${activeScene.colors.secondary}55`,
                    }
                  : undefined
              }
            >
              <OrganismMiniGlyph
                designId={design.id}
                active={isSelected}
                primaryColor={activeScene.colors.primary}
                secondaryColor={activeScene.colors.secondary}
              />
              <span className="tracking-wide">{displayLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. Second Option: Right-Side Colour Theme Selector (ATMOSPHERE) */}
      <aside
        data-testid="home-orbital-spectrum-rail"
        aria-label="Colour Theme Spectrum Selector"
        className={`flex flex-col items-end gap-2 fixed right-2.5 sm:right-5 lg:right-8 top-1/2 -translate-y-1/2 z-30 transition-all duration-700 ${
          hiddenDuringSession
            ? 'opacity-0 translate-x-4 pointer-events-none'
            : 'opacity-100 translate-x-0'
        }`}
      >
        <div className="hidden md:flex px-2.5 pb-0.5 items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#A3A1BA]/85">
            Atmosphere
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
            style={{
              backgroundColor: activeScene.colors.primary,
              boxShadow: `0 0 8px ${activeScene.colors.primary}`,
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5 p-1.5 md:p-2 rounded-full md:rounded-2xl aura-glass shadow-2xl">
          {SCENE_LIST.map((scene) => {
            const isSelected = activeSceneId === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                data-testid={`home-theme-node-${scene.id}`}
                onClick={() => onSelectScene(scene.id)}
                aria-pressed={isSelected}
                aria-label={`${scene.name} theme`}
                title={`${scene.name} — ${scene.tagline}`}
                className={`group flex items-center justify-center md:justify-between gap-3 w-8 h-8 md:w-[176px] lg:w-[184px] md:h-auto p-0 md:px-3.5 md:py-2.5 rounded-full md:rounded-xl text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.12] md:bg-white/[0.09] text-[#F5F6FF] font-semibold'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/[0.05]'
                }`}
                style={
                  isSelected
                    ? {
                        boxShadow: `inset 0 0 0 1px ${scene.colors.primary}88`,
                      }
                    : undefined
                }
              >
                <span className="hidden md:inline text-xs tracking-tight truncate">
                  {scene.name}
                </span>

                <span
                  className={`w-4 h-4 rounded-full shrink-0 transition-transform duration-300 ${
                    isSelected ? 'scale-110' : 'group-hover:scale-110'
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${scene.colors.primary}, ${scene.colors.secondary})`,
                    boxShadow: isSelected
                      ? `0 0 12px ${scene.colors.primary}CC`
                      : 'none',
                  }}
                />
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
};
