import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ChamberConfig,
  ChamberId,
  FocusSceneConfig,
  OrbDesignId,
} from '../types/aura';
import {
  AURA_SOUND_REGISTRY,
  AuraSoundRegistryEntry,
} from '../utils/soundSynthesizer';
import {
  ProjectedScreenAnchor,
  computeProjectedOrganismAnchors,
  getResonanceVisualProfile,
} from '../utils/auraResonanceController';

export interface AuraResonanceOverlayProps {
  orbDesign: OrbDesignId;
  scene: FocusSceneConfig;
  activeChamber: ChamberConfig;
  isSoundPlaying: boolean;
  resonanceOpen: boolean;
  onToggleResonanceOpen: (open: boolean) => void;
  hoveredChamberId: ChamberId | null;
  onHoverChamber: (id: ChamberId | null) => void;
  onSelectSound: (id: ChamberId) => void;
  pulseTimestamp: number;
  pulseChamberId: ChamberId | null;
  reducedMotion: boolean;
}

interface PositionedResonanceControl {
  entry: AuraSoundRegistryEntry;
  anchor: ProjectedScreenAnchor;
  visualSignatureLabel: string;
}

const JELLY_BELL_ORBIT_CX = 310;
const JELLY_BELL_ORBIT_CY = 186;
const JELLY_BELL_ORBIT_RX = 398;
const JELLY_BELL_ORBIT_RY = 248;

const BLOOM_CALYX_CENTER_CX = 310;
const BLOOM_CALYX_CENTER_CY = 216;

/**
 * Bespoke vector glyph for each of the 6 sound presets
 */
const SoundPresetGlyph: React.FC<{
  chamberId: ChamberId;
  color: string;
  isActive: boolean;
}> = ({ chamberId, color, isActive }) => {
  const stroke = isActive ? '#F5F6FF' : color;
  switch (chamberId) {
    case 'rain-chamber':
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 5.5V12.5M10 4V14.5M14 6.5V13.5"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="16.2" r="1" fill={color} />
        </svg>
      );
    case 'ocean-drift':
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3.5 8.5C5.5 6.5 8 6.5 10 8.5C12 10.5 14.5 10.5 16.5 8.5M3.5 12.5C5.5 10.5 8 10.5 10 12.5C12 14.5 14.5 14.5 16.5 12.5"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'forest-echo':
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3.8C13.2 6.8 14.2 10.6 10 14.6C5.8 10.6 6.8 6.8 10 3.8Z"
            stroke={stroke}
            strokeWidth="1.45"
          />
          <path
            d="M10 8V16.5"
            stroke={color}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'cosmic-silence':
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="2.4"
            stroke={stroke}
            strokeWidth="1.4"
          />
          <ellipse
            cx="10"
            cy="10"
            rx="6.8"
            ry="2.8"
            transform="rotate(-24 10 10)"
            stroke={color}
            strokeWidth="1.2"
          />
        </svg>
      );
    case 'ember-glow':
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3.8C12.6 7.2 13.8 9.6 13.8 11.8C13.8 14.1 12.1 15.8 10 15.8C7.9 15.8 6.2 14.1 6.2 11.8C6.2 9.6 7.4 7.2 10 3.8Z"
            stroke={stroke}
            strokeWidth="1.45"
          />
          <circle cx="10" cy="12.2" r="1.4" fill={color} />
        </svg>
      );
    case 'celestial-tone':
    default:
      return (
        <svg
          viewBox="0 0 20 20"
          className="w-4 h-4 shrink-0 pointer-events-none"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3.5L11.6 8.4L16.5 10L11.6 11.6L10 16.5L8.4 11.6L3.5 10L8.4 8.4L10 3.5Z"
            stroke={stroke}
            strokeWidth="1.35"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

/**
 * AURA TIME 3.0 — RESONANCE EXPERIENCE
 * One Selection, One Complete World.
 *
 * Implements two distinct, 3D-anchor-derived interactive architectures:
 * 1. Celestial Jelly — Resonance Orbit (around the 3D jellyfish bell bounds)
 * 2. Living Bloom — Harmonic Petal Array (around the 3D flower outer petal clusters)
 *
 * Strictly excludes Liquid Lens ('original'), which remains completely unchanged.
 */
export const AuraResonanceOverlay: React.FC<AuraResonanceOverlayProps> = ({
  orbDesign,
  scene,
  activeChamber,
  isSoundPlaying,
  resonanceOpen,
  onToggleResonanceOpen,
  hoveredChamberId,
  onHoverChamber,
  onSelectSound,
  pulseTimestamp,
  pulseChamberId,
  reducedMotion,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const nodeWrapperRefs = useRef<Array<HTMLDivElement | null>>([]);
  const nodeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const orbitRingRef = useRef<SVGGElement | null>(null);
  const revealTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const pulseTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const [activatorHovered, setActivatorHovered] = useState(false);
  const [activeWaveProgress, setActiveWaveProgress] = useState<number | null>(
    null
  );
  const [viewportSize, setViewportSize] = useState<{
    width: number;
    height: number;
  }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));

  // Strict scope guard: Liquid Lens ('original') is strictly out of scope
  const isSupportedTheme =
    orbDesign === 'celestial-jelly' || orbDesign === 'living-bloom';

  // Track viewport resizing so 3D-anchor-derived screen coordinates stay aligned
  useEffect(() => {
    if (typeof window === 'undefined' || !isSupportedTheme) return;
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSupportedTheme]);

  // Compute 3D-anchor-derived screen coordinates for all 6 sound presets
  const positionedControls = useMemo<PositionedResonanceControl[]>(() => {
    if (!isSupportedTheme) return [];
    const anchors = computeProjectedOrganismAnchors(
      orbDesign,
      viewportSize.width,
      viewportSize.height
    );
    return anchors.map((anchor) => {
      const entry =
        AURA_SOUND_REGISTRY.find((r) => r.id === anchor.chamberId) ||
        AURA_SOUND_REGISTRY[0];
      const profile = getResonanceVisualProfile(entry.id);
      return {
        entry,
        anchor,
        visualSignatureLabel: profile.visualSignatureLabel,
      };
    });
  }, [isSupportedTheme, orbDesign, viewportSize.width, viewportSize.height]);

  // PART 8: GSAP Coordinated Timeline for Revealing / Collapsing the Resonance Interface
  useEffect(() => {
    if (!isSupportedTheme) return;

    if (revealTimelineRef.current) {
      revealTimelineRef.current.kill();
      revealTimelineRef.current = null;
    }

    const wrappers = nodeWrapperRefs.current.filter(
      (el): el is HTMLDivElement => el !== null
    );
    const orbitGroup = orbitRingRef.current;

    if (reducedMotion) {
      wrappers.forEach((el) => {
        gsap.set(el, {
          opacity: resonanceOpen ? 1 : 0,
          scale: resonanceOpen ? 1 : 0.72,
        });
      });
      if (orbitGroup) {
        gsap.set(orbitGroup, { opacity: resonanceOpen ? 1 : 0 });
      }
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out', overwrite: 'auto' },
    });
    revealTimelineRef.current = tl;

    if (resonanceOpen) {
      if (orbitGroup) {
        tl.to(orbitGroup, { opacity: 1, duration: 0.42 }, 0);
      }
      if (wrappers.length > 0) {
        tl.to(
          wrappers,
          {
            opacity: 1,
            scale: 1,
            duration: 0.46,
            stagger: 0.045,
          },
          0.04
        );
      }
    } else {
      if (wrappers.length > 0) {
        tl.to(
          wrappers,
          {
            opacity: 0,
            scale: 0.68,
            duration: 0.28,
            stagger: 0.025,
            ease: 'power2.in',
          },
          0
        );
      }
      if (orbitGroup) {
        tl.to(orbitGroup, { opacity: 0, duration: 0.3 }, 0.05);
      }
    }

    return () => {
      tl.kill();
    };
  }, [resonanceOpen, isSupportedTheme, orbDesign, reducedMotion]);

  // PART 8: GSAP Coordinated Timeline for Selection Wave Propagation (with interruption handling & cleanup)
  useEffect(() => {
    if (!pulseTimestamp || !isSupportedTheme) return;

    if (pulseTimelineRef.current) {
      pulseTimelineRef.current.kill();
      pulseTimelineRef.current = null;
    }

    if (reducedMotion) {
      setActiveWaveProgress(null);
      return;
    }

    const proxy = { t: 0 };
    setActiveWaveProgress(0);

    const tl = gsap.timeline({
      onComplete: () => {
        setActiveWaveProgress(null);
      },
    });
    pulseTimelineRef.current = tl;

    tl.to(proxy, {
      t: 1,
      duration: 0.78,
      ease: 'power2.out',
      onUpdate: () => {
        setActiveWaveProgress(proxy.t);
      },
    });

    return () => {
      tl.kill();
    };
  }, [pulseTimestamp, isSupportedTheme, reducedMotion]);

  // Keyboard navigation across the 6 Resonance controls
  const handleNodeKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const count = positionedControls.length;
    if (count === 0) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (idx + 1) % count;
      nodeButtonRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (idx - 1 + count) % count;
      nodeButtonRefs.current[prevIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      nodeButtonRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      nodeButtonRefs.current[count - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onHoverChamber(null);
      onToggleResonanceOpen(false);
    }
  };

  if (!isSupportedTheme) {
    return null;
  }

  const isJelly = orbDesign === 'celestial-jelly';
  const activeEntry =
    AURA_SOUND_REGISTRY.find((e) => e.id === activeChamber.id) ||
    AURA_SOUND_REGISTRY[1];
  const activeVisualProfile = getResonanceVisualProfile(activeEntry.id);

  const hoveredControl = hoveredChamberId
    ? positionedControls.find((c) => c.entry.id === hoveredChamberId) || null
    : null;
  const pulsedControl = pulseChamberId
    ? positionedControls.find((c) => c.entry.id === pulseChamberId) || null
    : positionedControls.find((c) => c.entry.id === activeChamber.id) || null;

  return (
    <div
      ref={overlayRef}
      data-testid="aura-resonance-overlay"
      data-resonance-theme={isJelly ? 'resonance-orbit' : 'harmonic-petal-array'}
      data-resonance-open={resonanceOpen ? 'true' : 'false'}
      data-selected-sound={activeChamber.id}
      className="absolute inset-0 pointer-events-none z-25 select-none overflow-visible"
    >
      {/* Subtle Re-open Trigger (only visible if user dismissed the array via Escape) */}
      {!resonanceOpen && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: '50%',
            top: '-6%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <button
            type="button"
            data-testid="resonance-activator-btn"
            aria-label={`Show ${
              isJelly ? 'Resonance Orbit' : 'Harmonic Petal Array'
            } sound controls (active: ${activeEntry.name})`}
            aria-expanded={resonanceOpen}
            onPointerEnter={() => setActivatorHovered(true)}
            onPointerLeave={() => setActivatorHovered(false)}
            onFocus={() => setActivatorHovered(true)}
            onBlur={() => setActivatorHovered(false)}
            onClick={(e) => {
              e.stopPropagation();
              onToggleResonanceOpen(true);
            }}
            className="group relative flex items-center gap-2 min-w-[44px] min-h-[44px] max-sm:min-w-[48px] max-sm:min-h-[48px] px-3.5 py-2 rounded-full transition-all duration-300 cursor-pointer opacity-90 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2FE8FF]"
            style={{
              background:
                'radial-gradient(circle, rgba(16, 22, 42, 0.84) 0%, rgba(8, 11, 24, 0.68) 100%)',
              boxShadow: `0 6px 20px rgba(5, 6, 14, 0.65), inset 0 0 0 1.25px ${activeVisualProfile.primaryHex}AA`,
            }}
          >
            <svg
              viewBox="0 0 18 18"
              className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3.5 9V9.01M6.5 6V12M9.5 3.8V14.2M12.5 6.5V11.5M15 8.5V9.5"
                stroke={activeVisualProfile.primaryHex}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span
              data-testid="resonance-active-indicator"
              className="text-[11px] font-medium text-[#F5F6FF]"
            >
              {activeEntry.name}
            </span>
          </button>

          {activatorHovered && (
            <div
              role="tooltip"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-10 px-3 py-1.5 rounded-xl whitespace-nowrap text-[11px] font-medium tracking-wide text-[#F5F6FF] transition-opacity duration-200 z-30"
              style={{
                background: 'rgba(10, 14, 28, 0.9)',
                border: `1px solid ${activeVisualProfile.primaryHex}55`,
                boxShadow: '0 8px 24px rgba(5, 6, 14, 0.65)',
              }}
            >
              <span className="text-[#A3A1BA] mr-1.5">
                {isJelly ? 'Resonance Orbit' : 'Harmonic Petal Array'} ·
              </span>
              <span style={{ color: activeVisualProfile.primaryHex }}>
                {activeEntry.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          PART 3: CELESTIAL JELLY — RESONANCE ORBIT STRUCTURE
          Positioned around the 3D jellyfish bell bounds
         ==================================================================== */}
      {isJelly && (
        <svg
          viewBox="0 0 620 620"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="celestial-resonance-orbit-grad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor={scene.colors.secondary}
                stopOpacity="0.38"
              />
              <stop
                offset="50%"
                stopColor={activeVisualProfile.primaryHex}
                stopOpacity="0.58"
              />
              <stop
                offset="100%"
                stopColor={scene.colors.primary}
                stopOpacity="0.34"
              />
            </linearGradient>
          </defs>

          <g ref={orbitRingRef}>
            {/* Primary Resonance Orbit arc around the jellyfish bell */}
            <ellipse
              cx={JELLY_BELL_ORBIT_CX}
              cy={JELLY_BELL_ORBIT_CY}
              rx={JELLY_BELL_ORBIT_RX}
              ry={JELLY_BELL_ORBIT_RY}
              fill="none"
              stroke="url(#celestial-resonance-orbit-grad)"
              strokeWidth="1.15"
              strokeDasharray="4 6"
              style={{ opacity: 0.72 }}
            />
            <ellipse
              cx={JELLY_BELL_ORBIT_CX}
              cy={JELLY_BELL_ORBIT_CY}
              rx={JELLY_BELL_ORBIT_RX}
              ry={JELLY_BELL_ORBIT_RY}
              fill="none"
              stroke={
                hoveredControl?.entry.primaryHex ||
                activeVisualProfile.primaryHex
              }
              strokeWidth="0.75"
              style={{ opacity: 0.32 }}
            />

            {/* Subtle 3D bell-anchor radial ticks connecting each orbital node to the bell margin */}
            {positionedControls.map(({ entry, anchor }) => {
              const isSelected = activeChamber.id === entry.id;
              const isHovered = hoveredChamberId === entry.id;
              const profile = getResonanceVisualProfile(entry.id);
              const innerX =
                JELLY_BELL_ORBIT_CX +
                (anchor.stageX - JELLY_BELL_ORBIT_CX) * 0.76;
              const innerY =
                JELLY_BELL_ORBIT_CY +
                (anchor.stageY - JELLY_BELL_ORBIT_CY) * 0.76;

              return (
                <line
                  key={`tick-${entry.id}`}
                  x1={anchor.stageX}
                  y1={anchor.stageY}
                  x2={innerX}
                  y2={innerY}
                  stroke={profile.primaryHex}
                  strokeWidth={isSelected || isHovered ? 1.4 : 0.75}
                  strokeDasharray="2 4"
                  style={{
                    opacity: isSelected ? 0.65 : isHovered ? 0.55 : 0.22,
                  }}
                />
              );
            })}
          </g>

          {/* Selection Animation: Localized light response propagating from selected node through the jellyfish bell */}
          {activeWaveProgress !== null && pulsedControl && (
            <g>
              <ellipse
                cx={JELLY_BELL_ORBIT_CX}
                cy={JELLY_BELL_ORBIT_CY}
                rx={JELLY_BELL_ORBIT_RX}
                ry={JELLY_BELL_ORBIT_RY}
                fill="none"
                stroke={pulsedControl.entry.primaryHex}
                strokeWidth={2.4 * (1 - activeWaveProgress) + 0.6}
                strokeLinecap="round"
                strokeDasharray={`${Math.max(
                  48,
                  activeWaveProgress * 1280
                )} 2400`}
                style={{
                  opacity: (1 - activeWaveProgress) * 0.85,
                }}
              />
              <line
                x1={pulsedControl.anchor.stageX}
                y1={pulsedControl.anchor.stageY}
                x2={
                  JELLY_BELL_ORBIT_CX +
                  (pulsedControl.anchor.stageX - JELLY_BELL_ORBIT_CX) *
                    (1 - activeWaveProgress * 0.75)
                }
                y2={
                  JELLY_BELL_ORBIT_CY +
                  (pulsedControl.anchor.stageY - JELLY_BELL_ORBIT_CY) *
                    (1 - activeWaveProgress * 0.75)
                }
                stroke={pulsedControl.entry.primaryHex}
                strokeWidth={1.6 * (1 - activeWaveProgress)}
                strokeLinecap="round"
                style={{
                  opacity: (1 - activeWaveProgress) * 0.75,
                }}
              />
            </g>
          )}
        </svg>
      )}

      {/* ====================================================================
          PART 4: LIVING BLOOM — HARMONIC PETAL ARRAY STRUCTURE
          Curved botanical nectary filaments & inward light wave to flower center
          (Completely distinct from Celestial Jelly's orbital ring)
         ==================================================================== */}
      {!isJelly && (
        <svg
          viewBox="0 0 620 620"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          aria-hidden="true"
        >
          <g ref={orbitRingRef}>
            {positionedControls.map(({ entry, anchor }) => {
              const isSelected = activeChamber.id === entry.id;
              const isHovered = hoveredChamberId === entry.id;
              const profile = getResonanceVisualProfile(entry.id);
              const midX = (anchor.stageX + BLOOM_CALYX_CENTER_CX) * 0.5;
              const midY =
                (anchor.stageY + BLOOM_CALYX_CENTER_CY) * 0.5 - 18;
              const stopX =
                BLOOM_CALYX_CENTER_CX +
                (anchor.stageX - BLOOM_CALYX_CENTER_CX) * 0.58;
              const stopY =
                BLOOM_CALYX_CENTER_CY +
                (anchor.stageY - BLOOM_CALYX_CENTER_CY) * 0.58;

              return (
                <path
                  key={`petal-stem-${entry.id}`}
                  d={`M ${anchor.stageX} ${anchor.stageY} Q ${midX} ${midY} ${stopX} ${stopY}`}
                  fill="none"
                  stroke={profile.primaryHex}
                  strokeWidth={isSelected || isHovered ? 1.35 : 0.8}
                  strokeLinecap="round"
                  style={{
                    opacity: isSelected ? 0.58 : isHovered ? 0.48 : 0.2,
                  }}
                />
              );
            })}
          </g>

          {/* Selection Animation: Localized light wave travelling inward toward the flower center + subtle pollen particles */}
          {activeWaveProgress !== null && pulsedControl && (
            <g>
              <path
                d={`M ${pulsedControl.anchor.stageX} ${
                  pulsedControl.anchor.stageY
                } Q ${
                  (pulsedControl.anchor.stageX + BLOOM_CALYX_CENTER_CX) * 0.5
                } ${
                  (pulsedControl.anchor.stageY + BLOOM_CALYX_CENTER_CY) * 0.5 -
                  20
                } ${BLOOM_CALYX_CENTER_CX} ${BLOOM_CALYX_CENTER_CY}`}
                fill="none"
                stroke={pulsedControl.entry.primaryHex}
                strokeWidth={2.2 * (1 - activeWaveProgress)}
                strokeLinecap="round"
                style={{
                  opacity: (1 - activeWaveProgress) * 0.85,
                }}
              />
              {/* Traveling luminous nectar wave front */}
              <circle
                cx={
                  pulsedControl.anchor.stageX +
                  (BLOOM_CALYX_CENTER_CX - pulsedControl.anchor.stageX) *
                    activeWaveProgress
                }
                cy={
                  pulsedControl.anchor.stageY +
                  (BLOOM_CALYX_CENTER_CY - pulsedControl.anchor.stageY) *
                    activeWaveProgress
                }
                r={4.2 * (1 - activeWaveProgress * 0.35)}
                fill="#FFE28A"
                style={{
                  opacity: (1 - activeWaveProgress) * 0.92,
                }}
              />
              {/* Restrained golden pollen particles accompanying selection */}
              {[0, 1, 2, 3, 4, 5].map((pIdx) => {
                const pAng =
                  pulsedControl.anchor.angleRad +
                  (pIdx - 2.5) * 0.44 +
                  activeWaveProgress * 0.75;
                const pDist = 16 + activeWaveProgress * (34 + pIdx * 5);
                const px = BLOOM_CALYX_CENTER_CX + Math.cos(pAng) * pDist;
                const py = BLOOM_CALYX_CENTER_CY + Math.sin(pAng) * pDist;
                return (
                  <circle
                    key={pIdx}
                    cx={px}
                    cy={py}
                    r={1.8 * (1 - activeWaveProgress * 0.45)}
                    fill={
                      pIdx % 2 === 0
                        ? '#FFE28A'
                        : pulsedControl.entry.primaryHex
                    }
                    style={{
                      opacity: Math.sin(activeWaveProgress * Math.PI) * 0.78,
                    }}
                  />
                );
              })}
            </g>
          )}
        </svg>
      )}

      {/* ====================================================================
          SIX ACCESSIBLE INTERACTIVE SOUND NODES (Resonance Orbit) /
          SIX BOTANICAL PETAL-CLUSTER MARKERS (Harmonic Petal Array)
          Minimum 44px desktop interaction targets & 48px mobile touch targets
         ==================================================================== */}
      <div
        role="radiogroup"
        aria-label={
          isJelly
            ? 'Celestial Jelly Resonance Orbit Sound Selection'
            : 'Living Bloom Harmonic Petal Array Sound Selection'
        }
        className="absolute inset-0 pointer-events-none"
      >
        {positionedControls.map(
          ({ entry, anchor, visualSignatureLabel }, index) => {
            const isSelected = activeChamber.id === entry.id;
            const isHovered = hoveredChamberId === entry.id;
            const profile = getResonanceVisualProfile(entry.id);

            const isLeftHalf = Math.cos(anchor.angleRad) < -0.15;
            const isRightHalf = Math.cos(anchor.angleRad) > 0.15;

            return (
              <div
                key={entry.id}
                ref={(el) => {
                  nodeWrapperRefs.current[index] = el;
                }}
                style={{
                  left: `${anchor.leftPct}%`,
                  top: `${anchor.topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                data-anchor-name={anchor.anatomicalAnchorName}
                className={`absolute ${
                  resonanceOpen ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <button
                  ref={(el) => {
                    nodeButtonRefs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-testid={`resonance-node-${entry.id}`}
                  data-sound-selected={isSelected ? 'true' : 'false'}
                  data-visual-signature={visualSignatureLabel}
                  aria-label={`${entry.name} — ${entry.shortDescription} (${visualSignatureLabel})`}
                  tabIndex={resonanceOpen ? 0 : -1}
                  onKeyDown={(e) => handleNodeKeyDown(e, index)}
                  onPointerEnter={() => onHoverChamber(entry.id)}
                  onPointerLeave={() => {
                    if (hoveredChamberId === entry.id) {
                      onHoverChamber(null);
                    }
                  }}
                  onFocus={() => onHoverChamber(entry.id)}
                  onBlur={() => {
                    if (hoveredChamberId === entry.id) {
                      onHoverChamber(null);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectSound(entry.id);
                  }}
                  className={`group relative flex items-center justify-center min-w-[44px] min-h-[44px] max-sm:min-w-[48px] max-sm:min-h-[48px] w-11 h-11 max-sm:w-12 max-sm:h-12 cursor-pointer transition-transform duration-200 ease-out hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#2FE8FF] ${
                    isJelly ? 'rounded-full' : 'rounded-2xl'
                  }`}
                >
                  {isJelly ? (
                    /* CELESTIAL JELLY — RESONANCE ORBIT NODE (44px/48px target with sculpted bioluminescent glass core) */
                    <span
                      className="relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300"
                      style={{
                        background:
                          isSelected || isHovered
                            ? `radial-gradient(circle at 35% 32%, rgba(245, 246, 255, 0.34) 0%, ${profile.primaryHex}44 52%, rgba(9, 13, 28, 0.86) 100%)`
                            : 'radial-gradient(circle at 35% 32%, rgba(245, 246, 255, 0.14) 0%, rgba(14, 19, 38, 0.82) 100%)',
                        boxShadow: isSelected
                          ? `0 0 18px ${profile.primaryHex}88, inset 0 0 0 1.5px ${profile.primaryHex}`
                          : isHovered
                          ? `0 0 14px ${profile.primaryHex}66, inset 0 0 0 1.25px ${profile.primaryHex}CC`
                          : `0 4px 14px rgba(5, 6, 14, 0.55), inset 0 0 0 1px ${profile.primaryHex}55`,
                      }}
                    >
                      <SoundPresetGlyph
                        chamberId={entry.id}
                        color={profile.primaryHex}
                        isActive={isSelected || isHovered}
                      />

                      {/* Active selection orbital halo ring */}
                      {isSelected && (
                        <span
                          className="absolute -inset-1.5 rounded-full pointer-events-none"
                          style={{
                            border: `1.25px solid ${profile.primaryHex}`,
                            opacity: isSoundPlaying ? 0.9 : 0.55,
                          }}
                        />
                      )}
                    </span>
                  ) : (
                    /* LIVING BLOOM — HARMONIC PETAL ARRAY MARKER (44px/48px sculpted botanical petal-cluster medallion) */
                    <span className="relative flex items-center justify-center w-10 h-10 transition-all duration-300">
                      <svg
                        viewBox="0 0 40 40"
                        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                        aria-hidden="true"
                      >
                        {/* Outer cupped botanical calyx silhouette */}
                        <path
                          d="M20 3.5 C26.5 9.5 34.5 13.5 34.5 21.5 C34.5 29.5 28 35.5 20 36.5 C12 35.5 5.5 29.5 5.5 21.5 C5.5 13.5 13.5 9.5 20 3.5 Z"
                          fill={
                            isSelected || isHovered
                              ? 'rgba(18, 20, 38, 0.88)'
                              : 'rgba(12, 15, 30, 0.82)'
                          }
                          stroke={profile.primaryHex}
                          strokeWidth={isSelected ? '1.6' : isHovered ? '1.35' : '1.0'}
                          strokeOpacity={isSelected ? 0.95 : isHovered ? 0.85 : 0.52}
                        />
                        {/* Delicate inner petal venation */}
                        <path
                          d="M20 7.5 C24.2 12.2 29.5 15.5 29.5 21.2 C29.5 26.8 25.2 31.2 20 32.2 C14.8 31.2 10.5 26.8 10.5 21.2 C10.5 15.5 15.8 12.2 20 7.5 Z"
                          fill={profile.primaryHex}
                          fillOpacity={isSelected ? 0.24 : isHovered ? 0.18 : 0.08}
                          stroke="#FFE28A"
                          strokeWidth="0.65"
                          strokeOpacity={isSelected || isHovered ? 0.65 : 0.28}
                        />
                        {/* Warm golden nectary crown dot */}
                        <circle
                          cx="20"
                          cy="8.5"
                          r={isSelected ? '1.8' : '1.3'}
                          fill="#FFE28A"
                          fillOpacity={isSelected || isHovered ? 0.95 : 0.65}
                        />
                      </svg>

                      <span className="relative z-10 translate-y-0.5">
                        <SoundPresetGlyph
                          chamberId={entry.id}
                          color={profile.primaryHex}
                          isActive={isSelected || isHovered}
                        />
                      </span>
                    </span>
                  )}
                </button>

                {/* Accessible Tooltip: Displays sound title, active status, and visual signature */}
                {isHovered && (
                  <div
                    role="tooltip"
                    data-testid="resonance-single-tooltip"
                    className={`pointer-events-none absolute z-30 px-3 py-1.5 rounded-xl whitespace-nowrap text-left transition-opacity duration-150 ${
                      isLeftHalf
                        ? 'right-13 top-1/2 -translate-y-1/2'
                        : isRightHalf
                        ? 'left-13 top-1/2 -translate-y-1/2'
                        : 'left-1/2 -translate-x-1/2 -top-12'
                    }`}
                    style={{
                      background: 'rgba(10, 14, 28, 0.92)',
                      border: `1px solid ${profile.primaryHex}66`,
                      boxShadow: '0 8px 24px rgba(5, 6, 14, 0.68)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#F5F6FF]">
                      <span>{entry.name}</span>
                      {isSelected && (
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: profile.primaryHex }}
                        >
                          · {isSoundPlaying ? 'Playing' : 'Active'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#A3A1BA] tracking-wide">
                      {visualSignatureLabel}
                    </div>
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};
