import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChamberConfig,
  ChamberId,
  FocusImmersionMode,
  FocusSceneConfig,
  OrbDesignId,
  PerformanceMode,
  SessionRecord,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import {
  FOCUS_PRESET_MINUTES,
  SESSION_INTENTION_SUGGESTIONS,
  SNAP_PRESET_MINUTES,
  formatRemainingTime,
  minutesToRadialFraction,
  radialFractionToMinutes,
} from '../utils/focusEngine';
import {
  RESONANCE_SOUND_PRESETS,
  ResonanceSoundPreset,
  computeBloomResonanceBurstState,
  computeDropletMergeState,
  computeJellyResonancePulseState,
  computeResonanceNodesLayout,
  getResonancePresetByChamberId,
} from '../utils/auraResonance';
import {
  detectDeviceCapabilities,
  resolveMobilePerformanceProfile,
} from '../utils/mobilePerformanceEngine';
import {
  OrbRipple,
  computeBloomCycleState,
  computeJellyBellContraction,
  computeOrbStateParameters,
  computeThemeOrganismPalette,
  rgbaString,
} from '../utils/organicOrbEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface LivingLensProps {
  scene: FocusSceneConfig;
  chamber: ChamberConfig;
  onSelectChamber?: (chamberId: ChamberId) => void;
  isSoundPlaying?: boolean;
  onToggleSound?: () => void;
  onTriggerResonancePulse?: () => void;
  orbDesign?: OrbDesignId;
  completedSessionsCount?: number;
  status: TimerStatus;
  phase: TimerPhase;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  durationMinutes: number;
  onChangeDurationMinutes: (mins: number) => void;
  sessionLabel: string;
  onChangeSessionLabel: (label: string) => void;
  scrubberOpen: boolean;
  onToggleScrubber: (open: boolean) => void;
  audioReactive: boolean;
  reducedMotion: boolean;
  performanceMode?: PerformanceMode;
  timerTextScale: 'default' | 'large' | 'monumental';
  immersionMode: FocusImmersionMode;
  lastCompletedSession?: SessionRecord | null;
  onPrimaryAction: () => void;
  onStartBreak: () => void;
  onOpenRestore?: () => void;
  onStartAgain: () => void;
}

interface CausticDroplet {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  alpha: number;
  hueShift: number;
  phase: number;
}

interface MergingDropletAnim {
  preset: ResonanceSoundPreset;
  startX: number;
  startY: number;
  startTimeMs: number;
}

interface PollenBurstParticle {
  angle: number;
  speed: number;
  size: number;
  curlPhase: number;
  colorType: 'gold' | 'primary' | 'secondary';
}

const RESONANCE_MODE_TITLES: Record<OrbDesignId, string> = {
  original: 'Ripple Portal',
  'celestial-jelly': 'Resonance Halo',
  'living-bloom': 'Sound Blossom',
};

export const LivingLens: React.FC<LivingLensProps> = ({
  scene,
  chamber,
  onSelectChamber,
  onTriggerResonancePulse,
  orbDesign = 'celestial-jelly',
  status,
  phase,
  remainingSeconds,
  totalSeconds,
  progress,
  durationMinutes,
  onChangeDurationMinutes,
  sessionLabel,
  onChangeSessionLabel,
  scrubberOpen,
  onToggleScrubber,
  audioReactive,
  reducedMotion,
  performanceMode = 'auto',
  timerTextScale,
  immersionMode,
  lastCompletedSession,
  onPrimaryAction,
  onStartBreak,
  onOpenRestore,
  onStartAgain,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [isLensHovered, setIsLensHovered] = useState(false);

  // AURA RESONANCE interactive sound-selection state
  const [isResonanceOpen, setIsResonanceOpen] = useState(false);
  const [hoveredResonanceIdx, setHoveredResonanceIdx] = useState<number | null>(
    null
  );

  // Smooth animation refs for the 6 resonance nodes & theme-specific selection effects
  const revealProgressRef = useRef<number>(0);
  const budOpennessRef = useRef<number[]>([0.2, 0.2, 0.2, 0.2, 0.2, 0.2]);
  const mergingDropletRef = useRef<MergingDropletAnim | null>(null);
  const jellyPulseStartMsRef = useRef<number>(-10000);
  const bloomBurstStartMsRef = useRef<number>(-10000);

  // Smoothly interpolated RGB lighting reflecting the active Resonance Sound
  const activeResonancePreset = useMemo(
    () => getResonancePresetByChamberId(chamber.id),
    [chamber.id]
  );
  const currentResonancePrimaryRgbRef = useRef<[number, number, number]>([
    ...activeResonancePreset.primaryRgb,
  ]);
  const currentResonanceSecondaryRgbRef = useRef<[number, number, number]>([
    ...activeResonancePreset.secondaryRgb,
  ]);

  // Deterministic luminous pollen particles for Living Bloom – Sound Blossom
  const pollenBurstParticles = useMemo<PollenBurstParticle[]>(
    () =>
      Array.from({ length: 44 }, (_, idx) => ({
        angle: (idx / 44) * Math.PI * 2 + (idx % 3) * 0.11,
        speed: 0.68 + ((idx * 17) % 13) / 22,
        size: 1.6 + (idx % 4) * 0.85,
        curlPhase: idx * 0.91,
        colorType:
          idx % 3 === 0 ? 'gold' : idx % 3 === 1 ? 'primary' : 'secondary',
      })),
    []
  );

  // Interactive pointer coordinates in 620x620 canvas space
  const pointerCanvasRef = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const ripplesRef = useRef<OrbRipple[]>([]);

  const liveRef = useRef({
    scene,
    chamber,
    activeResonancePreset,
    orbDesign,
    status,
    phase,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
    performanceMode,
    isResonanceOpen,
    hoveredResonanceIdx,
  });

  useEffect(() => {
    liveRef.current = {
      scene,
      chamber,
      activeResonancePreset,
      orbDesign,
      status,
      phase,
      totalSeconds,
      progress,
      audioReactive,
      reducedMotion,
      performanceMode,
      isResonanceOpen,
      hoveredResonanceIdx,
    };
  }, [
    scene,
    chamber,
    activeResonancePreset,
    orbDesign,
    status,
    phase,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
    performanceMode,
    isResonanceOpen,
    hoveredResonanceIdx,
  ]);

  // Trigger a gentle completion ripple when session finishes
  useEffect(() => {
    if (status === 'completed') {
      setIsResonanceOpen(false);
      ripplesRef.current.push({
        id: Date.now(),
        x: 310,
        y: 310,
        radius: 18,
        maxRadius: 285,
        intensity: 1.0,
      });
    }
  }, [status]);

  // Close Aura Resonance when clicking outside the organism or pressing Escape
  useEffect(() => {
    if (!isResonanceOpen) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }
      // Allow switching organisms or themes while keeping Aura Resonance open
      if (
        target.closest('[data-testid="home-orbital-organism-rail"]') ||
        target.closest('[data-testid="home-orbital-spectrum-rail"]')
      ) {
        return;
      }
      setIsResonanceOpen(false);
      setHoveredResonanceIdx(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsResonanceOpen(false);
        setHoveredResonanceIdx(null);
      }
    };
    window.addEventListener('pointerdown', onPointerDownOutside);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDownOutside);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isResonanceOpen]);

  useEffect(() => {
    if (isEditingLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    }
  }, [isEditingLabel]);

  // Activate or toggle the central Aura Resonance interface on the organism
  const handleToggleResonancePortal = useCallback(() => {
    setIsResonanceOpen((prev) => {
      const next = !prev;
      if (next) {
        ripplesRef.current.push({
          id: Date.now() + Math.random(),
          x: 310,
          y: 310,
          radius: 16,
          maxRadius: 265,
          intensity: 0.95,
        });
      } else {
        setHoveredResonanceIdx(null);
      }
      return next;
    });
  }, []);

  // Handle selecting one of the 6 Aura Resonance sound presets on the organism
  const handleSelectResonancePreset = useCallback(
    (preset: ResonanceSoundPreset, idx: number) => {
      const nowMs = Date.now();

      const layout = computeResonanceNodesLayout({
        orbDesign,
        timeSec: nowMs / 1000,
        revealProgress: Math.max(0.85, revealProgressRef.current),
        hoveredIndex: idx,
        activeChamberId: preset.id,
      });
      const selectedNode = layout[idx] || { x: 310, y: 120 };

      if (orbDesign === 'original') {
        // LIQUID LENS – Animate selected droplet merging into the lens center
        mergingDropletRef.current = {
          preset,
          startX: selectedNode.x,
          startY: selectedNode.y,
          startTimeMs: nowMs,
        };
        ripplesRef.current.push({
          id: nowMs + Math.random(),
          x: 310,
          y: 310,
          radius: 14,
          maxRadius: 255,
          intensity: 1.0,
        });
      } else if (orbDesign === 'celestial-jelly') {
        // CELESTIAL JELLY – Animate light pulse traveling through bell and tentacles
        jellyPulseStartMsRef.current = nowMs;
        ripplesRef.current.push({
          id: nowMs + Math.random(),
          x: selectedNode.x,
          y: selectedNode.y,
          radius: 8,
          maxRadius: 220,
          intensity: 0.9,
        });
      } else {
        // LIVING BLOOM – Animate controlled blooming effect & luminous pollen wave
        bloomBurstStartMsRef.current = nowMs;
        ripplesRef.current.push({
          id: nowMs + Math.random(),
          x: 310,
          y: 310,
          radius: 20,
          maxRadius: 260,
          intensity: 0.92,
        });
      }

      onTriggerResonancePulse?.();
      onSelectChamber?.(preset.id);
    },
    [orbDesign, onSelectChamber, onTriggerResonancePulse]
  );

  // Unified Real-Time Procedural Canvas Renderer (Liquid Lens | Celestial Jelly | Living Bloom + Aura Resonance)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initialCaps = detectDeviceCapabilities({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      coarsePointer: window.matchMedia?.('(pointer: coarse)')?.matches ?? false,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
    });
    const initialPerfProfile = resolveMobilePerformanceProfile({
      performanceMode: liveRef.current.performanceMode,
      capabilities: initialCaps,
      reducedMotion: liveRef.current.reducedMotion,
    });

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      initialPerfProfile.pixelRatioCap
    );
    const size = 620;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const particles: CausticDroplet[] = Array.from({ length: 34 }, (_, idx) => ({
      x: Math.sin(idx * 2.13) * 0.58 * 195,
      y: Math.cos(idx * 1.71) * 0.58 * 195,
      r: 2.0 + (idx % 5) * 1.6,
      vx: (idx % 2 === 0 ? 1 : -1) * (0.14 + (idx % 3) * 0.08),
      vy: (idx % 3 === 0 ? 1 : -1) * (0.12 + (idx % 4) * 0.07),
      alpha: 0.28 + (idx % 4) * 0.14,
      hueShift: idx % 3,
      phase: idx * 0.67,
    }));

    let animId = 0;
    let time = 0;
    let lastDraw = 0;

    // ------------------------------------------------------------------------
    // Helper 1: Liquid Lens Contour with Shader-Like Capillary Hover Distortion
    // ------------------------------------------------------------------------
    const traceLensContour = (
      cx: number,
      cy: number,
      baseR: number,
      t: number,
      elasticity: number,
      amp: number,
      trebleAmp: number,
      hoveredNodeAngle: number | null,
      portalReveal: number,
      phaseOffset = 0
    ) => {
      const ptr = pointerCanvasRef.current;
      ctx.beginPath();
      const steps = 96;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const n1 =
          Math.sin(theta * 3 + t * 1.3 + phaseOffset) *
          (8.5 * elasticity + amp * 12);
        const n2 =
          Math.cos(theta * 4 - t * 0.95 + phaseOffset) *
          (5.5 * elasticity + trebleAmp * 8);
        const n3 = Math.sin(theta * 2 + t * 0.6) * (4.5 * elasticity);
        let r = baseR + n1 + n2 + n3;

        // Gentle liquid capillary bulge toward the hovered sound droplet
        if (hoveredNodeAngle !== null && portalReveal > 0.05) {
          const angleDiff = Math.atan2(
            Math.sin(theta - hoveredNodeAngle),
            Math.cos(theta - hoveredNodeAngle)
          );
          const pull = Math.exp(-Math.pow(angleDiff / 0.42, 2));
          r += pull * 13.5 * portalReveal;
        }

        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (ptr.x !== null && ptr.y !== null) {
          const distToPtr = Math.hypot(px - ptr.x, py - ptr.y);
          if (distToPtr < 140) {
            r += Math.sin((1 - distToPtr / 140) * Math.PI) * 8;
          }
        }
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    // ------------------------------------------------------------------------
    // Helper 2: Draw a Refractive Liquid Sound Droplet (Liquid Lens – Ripple Portal)
    // ------------------------------------------------------------------------
    const drawLiquidResonanceDroplet = (
      x: number,
      y: number,
      radius: number,
      preset: ResonanceSoundPreset,
      isHovered: boolean,
      isSelected: boolean,
      alpha: number,
      t: number,
      idx: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();

      const outerR = radius * (isHovered ? 2.8 : isSelected ? 2.4 : 1.95);
      const halo = ctx.createRadialGradient(x, y, radius * 0.2, x, y, outerR);
      halo.addColorStop(
        0,
        rgbaString(
          preset.primaryRgb,
          (isHovered ? 0.62 : isSelected ? 0.48 : 0.34) * alpha
        )
      );
      halo.addColorStop(
        0.55,
        rgbaString(preset.secondaryRgb, (isHovered ? 0.28 : 0.16) * alpha)
      );
      halo.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, outerR, 0, Math.PI * 2);
      ctx.fill();

      // Liquid droplet contour with organic hover displacement
      ctx.beginPath();
      const segs = 32;
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * Math.PI * 2;
        const wobble = isHovered
          ? Math.sin(ang * 3 + t * 5.2 + idx) * 2.6 +
            Math.cos(ang * 2 - t * 3.8) * 1.6
          : Math.sin(ang * 2 + t * 2.2 + idx) * 0.8;
        const rr = radius + wobble;
        const dx = x + Math.cos(ang) * rr;
        const dy = y + Math.sin(ang) * rr;
        if (s === 0) ctx.moveTo(dx, dy);
        else ctx.lineTo(dx, dy);
      }
      ctx.closePath();

      const bodyGrad = ctx.createRadialGradient(
        x - radius * 0.32,
        y - radius * 0.35,
        radius * 0.1,
        x,
        y,
        radius * 1.15
      );
      bodyGrad.addColorStop(0, `rgba(245, 246, 255, ${0.95 * alpha})`);
      bodyGrad.addColorStop(0.45, rgbaString(preset.primaryRgb, 0.88 * alpha));
      bodyGrad.addColorStop(1, rgbaString(preset.secondaryRgb, 0.72 * alpha));
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      ctx.strokeStyle = isSelected
        ? `rgba(245, 246, 255, ${0.95 * alpha})`
        : rgbaString(preset.primaryRgb, 0.75 * alpha);
      ctx.lineWidth = isSelected ? 1.8 : 1.1;
      ctx.stroke();

      // Specular highlight bead
      ctx.fillStyle = `rgba(255, 255, 255, ${0.88 * alpha})`;
      ctx.beginPath();
      ctx.arc(
        x - radius * 0.28,
        y - radius * 0.28,
        Math.max(1.5, radius * 0.22),
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();
    };

    // ------------------------------------------------------------------------
    // Helper 3: Draw a Bioluminescent Halo Particle (Celestial Jelly – Resonance Halo)
    // ------------------------------------------------------------------------
    const drawJellyResonanceParticle = (
      x: number,
      y: number,
      bellCenterX: number,
      bellCenterY: number,
      radius: number,
      preset: ResonanceSoundPreset,
      isHovered: boolean,
      isSelected: boolean,
      alpha: number,
      t: number,
      idx: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Delicate bioluminescent neural tendril connecting active/hovered particle to jellyfish bell
      if (isHovered || isSelected) {
        const tendrilGrad = ctx.createLinearGradient(
          x,
          y,
          bellCenterX,
          bellCenterY
        );
        tendrilGrad.addColorStop(
          0,
          rgbaString(preset.primaryRgb, (isHovered ? 0.52 : 0.34) * alpha)
        );
        tendrilGrad.addColorStop(
          0.6,
          rgbaString(preset.secondaryRgb, (isHovered ? 0.22 : 0.12) * alpha)
        );
        tendrilGrad.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.strokeStyle = tendrilGrad;
        ctx.lineWidth = isHovered ? 1.6 : 1.1;
        ctx.beginPath();
        const midX =
          (x + bellCenterX) * 0.5 + Math.sin(t * 2.4 + idx) * 14;
        const midY =
          (y + bellCenterY) * 0.5 + Math.cos(t * 2.1 + idx) * 14;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(midX, midY, bellCenterX, bellCenterY);
        ctx.stroke();
      }

      // Pulsing pelagic bioluminescent corona
      const pulse = 1 + Math.sin(t * 3.4 + idx * 1.1) * 0.14;
      const glowR = radius * (isHovered ? 3.2 : isSelected ? 2.6 : 2.1) * pulse;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, glowR);
      glow.addColorStop(
        0,
        rgbaString(
          preset.primaryRgb,
          (isHovered ? 0.85 : isSelected ? 0.68 : 0.46) * alpha
        )
      );
      glow.addColorStop(
        0.48,
        rgbaString(
          preset.secondaryRgb,
          (isHovered ? 0.42 : isSelected ? 0.28 : 0.18) * alpha
        )
      );
      glow.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fill();

      if (isHovered || isSelected) {
        ctx.strokeStyle = rgbaString(
          preset.primaryRgb,
          (isHovered ? 0.82 : 0.58) * alpha
        );
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.45 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Luminous cellular core
      ctx.fillStyle = `rgba(245, 246, 255, ${
        (isHovered ? 0.98 : isSelected ? 0.92 : 0.82) * alpha
      })`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.52, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // ------------------------------------------------------------------------
    // Helper 4: Draw a Glowing Botanical Bud (Living Bloom – Sound Blossom)
    // ------------------------------------------------------------------------
    const drawBloomResonanceBud = (
      x: number,
      y: number,
      centerX: number,
      centerY: number,
      radius: number,
      openFactor: number,
      preset: ResonanceSoundPreset,
      isHovered: boolean,
      isSelected: boolean,
      alpha: number,
      t: number,
      idx: number
    ) => {
      if (alpha <= 0.01) return;
      ctx.save();

      // Soft botanical pollen aura around the bud
      const haloR = radius * (2.1 + openFactor * 0.9);
      const halo = ctx.createRadialGradient(x, y, 2, x, y, haloR);
      halo.addColorStop(
        0,
        rgbaString(preset.primaryRgb, (0.34 + openFactor * 0.38) * alpha)
      );
      halo.addColorStop(
        0.55,
        rgbaString(preset.secondaryRgb, (0.16 + openFactor * 0.18) * alpha)
      );
      halo.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fill();

      const outwardAngle =
        Math.atan2(y - centerY, x - centerX) +
        Math.sin(t * 1.5 + idx) * 0.05;
      ctx.translate(x, y);
      ctx.rotate(outwardAngle);

      // Draw 5 miniature translucent petals that unfurl smoothly on hover/selection
      const petalCount = 5;
      const spreadAngle = 0.24 + openFactor * 0.48;
      const petalLen = radius * (1.05 + openFactor * 0.42);
      const petalWid = radius * (0.42 + openFactor * 0.18);

      for (let p = 0; p < petalCount; p++) {
        const relIndex = p - (petalCount - 1) / 2;
        const pAngle = relIndex * spreadAngle;
        ctx.save();
        ctx.rotate(pAngle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(
          petalLen * 0.35,
          -petalWid,
          petalLen * 0.8,
          -petalWid * 0.65,
          petalLen,
          0
        );
        ctx.bezierCurveTo(
          petalLen * 0.8,
          petalWid * 0.65,
          petalLen * 0.35,
          petalWid,
          0,
          0
        );
        ctx.closePath();

        const pGrad = ctx.createLinearGradient(0, 0, petalLen, 0);
        pGrad.addColorStop(0, rgbaString(preset.secondaryRgb, 0.78 * alpha));
        pGrad.addColorStop(0.65, rgbaString(preset.primaryRgb, 0.88 * alpha));
        pGrad.addColorStop(1, `rgba(245, 246, 255, ${0.94 * alpha})`);
        ctx.fillStyle = pGrad;
        ctx.fill();

        ctx.strokeStyle = `rgba(245, 246, 255, ${
          (isHovered || isSelected ? 0.75 : 0.38) * alpha
        })`;
        ctx.lineWidth = 0.85;
        ctx.stroke();
        ctx.restore();
      }

      // Golden nectary stamen core inside the bud
      const coreR = Math.max(2.2, radius * (0.26 + openFactor * 0.14));
      ctx.fillStyle = `rgba(255, 224, 140, ${
        (0.78 + openFactor * 0.22) * alpha
      })`;
      ctx.beginPath();
      ctx.arc(petalLen * 0.22, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // ------------------------------------------------------------------------
    // Main 60fps Animation Frame Loop
    // ------------------------------------------------------------------------
    const render = (now: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const p = liveRef.current;
      const is3DIdleOverlay =
        (p.orbDesign === 'celestial-jelly' || p.orbDesign === 'living-bloom') &&
        !p.isResonanceOpen &&
        ripplesRef.current.length === 0 &&
        revealProgressRef.current < 0.02;
      const minDelta = p.reducedMotion
        ? 125
        : is3DIdleOverlay
        ? Math.max(42, initialPerfProfile.idle2DOverlayIntervalMs || 42)
        : Math.max(16, initialPerfProfile.minFrameIntervalMs || 16);
      if (now - lastDraw < minDelta) {
        animId = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(0.05, Math.max(0.008, (now - lastDraw) / 1000));
      lastDraw = now;

      const bands = p.audioReactive
        ? soundEngine.getAudioBands()
        : { bass: 0, mid: 0, treble: 0, overall: 0 };

      const stateParams = computeOrbStateParameters(
        p.status,
        p.phase,
        p.progress,
        bands.overall,
        p.reducedMotion,
        p.totalSeconds
      );

      time += dt * stateParams.motionSpeed * p.scene.motion.flowSpeed;

      // Smoothly damp Resonance Portal reveal progress (0 -> 1)
      const targetReveal = p.isResonanceOpen ? 1.0 : 0.0;
      revealProgressRef.current +=
        (targetReveal - revealProgressRef.current) * Math.min(1, dt * 8.5);

      // Smoothly damp Living Bloom bud opening states on hover/selection
      for (let i = 0; i < 6; i++) {
        const isHov = p.hoveredResonanceIdx === i;
        const isSel =
          RESONANCE_SOUND_PRESETS[i].id === p.activeResonancePreset.id;
        const targetOpen = isHov ? 1.0 : isSel ? 0.68 : 0.22;
        budOpennessRef.current[i] +=
          (targetOpen - budOpennessRef.current[i]) * Math.min(1, dt * 9.0);
      }

      // Smoothly transition central organism lighting toward active or hovered Resonance Sound
      const targetPreset =
        p.hoveredResonanceIdx !== null
          ? RESONANCE_SOUND_PRESETS[p.hoveredResonanceIdx]
          : p.activeResonancePreset;
      const colorDamp = Math.min(1, dt * 4.5);
      for (let c = 0; c < 3; c++) {
        currentResonancePrimaryRgbRef.current[c] +=
          (targetPreset.primaryRgb[c] -
            currentResonancePrimaryRgbRef.current[c]) *
          colorDamp;
        currentResonanceSecondaryRgbRef.current[c] +=
          (targetPreset.secondaryRgb[c] -
            currentResonanceSecondaryRgbRef.current[c]) *
          colorDamp;
      }

      const palette = computeThemeOrganismPalette(p.scene, p.phase);
      const cx = size / 2;
      const cy = size / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      if (stateParams.saturation < 0.85) {
        ctx.filter = `saturate(${Math.round(stateParams.saturation * 100)}%)`;
      }

      const bellDyn = computeJellyBellContraction(time);
      const bloomState = computeBloomCycleState(time);

      const resonanceNodes = computeResonanceNodesLayout({
        orbDesign: p.orbDesign,
        timeSec: time,
        revealProgress: revealProgressRef.current,
        hoveredIndex: p.hoveredResonanceIdx,
        activeChamberId: p.activeResonancePreset.id,
        bellContraction: bellDyn.contraction,
        bloomOpenness: bloomState.outerOpenness,
      });

      const nowMs = Date.now();
      const currentResonanceRgb: [number, number, number] = [
        Math.round(currentResonancePrimaryRgbRef.current[0] * 255),
        Math.round(currentResonancePrimaryRgbRef.current[1] * 255),
        Math.round(currentResonancePrimaryRgbRef.current[2] * 255),
      ];
      const currentResonanceSecRgb: [number, number, number] = [
        Math.round(currentResonanceSecondaryRgbRef.current[0] * 255),
        Math.round(currentResonanceSecondaryRgbRef.current[1] * 255),
        Math.round(currentResonanceSecondaryRgbRef.current[2] * 255),
      ];

      // ======================================================================
      // BRANCH 1: CELESTIAL JELLY — RESONANCE HALO OVERLAY
      // ======================================================================
      if (p.orbDesign === 'celestial-jelly') {
        const pulseState = computeJellyResonancePulseState(
          (nowMs - jellyPulseStartMsRef.current) / 1000
        );

        const haloRadius =
          292 +
          bellDyn.radialScale * 12 +
          bands.bass * 12 +
          pulseState.bellGlowBoost * 24;
        const pelagicHalo = ctx.createRadialGradient(
          cx,
          cy - 14,
          36,
          cx,
          cy,
          haloRadius
        );
        pelagicHalo.addColorStop(
          0,
          rgbaString(
            currentResonanceRgb,
            (0.065 + pulseState.bellGlowBoost * 0.14) * stateParams.luminescence
          )
        );
        pelagicHalo.addColorStop(
          0.55,
          rgbaString(
            currentResonanceSecRgb,
            (0.045 + pulseState.tentacleGlowBoost * 0.1) *
              stateParams.luminescence
          )
        );
        pelagicHalo.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = pelagicHalo;
        ctx.beginPath();
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Traveling bioluminescent wave ring through bell & tentacles upon sound selection
        if (pulseState.active) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const waveY =
            cy - 95 + pulseState.waveFrontPosition * 235;
          const waveRx =
            115 + Math.sin(pulseState.waveFrontPosition * Math.PI) * 58;
          const waveRy = 28 + pulseState.waveFrontPosition * 24;
          const waveAlpha =
            (pulseState.bellGlowBoost + pulseState.tentacleGlowBoost) * 0.42;

          const waveGrad = ctx.createRadialGradient(
            cx,
            waveY,
            4,
            cx,
            waveY,
            waveRx
          );
          waveGrad.addColorStop(
            0,
            rgbaString(currentResonanceRgb, waveAlpha)
          );
          waveGrad.addColorStop(
            0.55,
            rgbaString(currentResonanceSecRgb, waveAlpha * 0.55)
          );
          waveGrad.addColorStop(1, 'rgba(7, 8, 18, 0)');
          ctx.fillStyle = waveGrad;
          ctx.beginPath();
          ctx.ellipse(cx, waveY, waveRx, waveRy, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Render 6 Orbiting Resonance Halo Particles when activated
        if (revealProgressRef.current > 0.01) {
          const bellCenterX = cx + Math.sin(time * 0.38) * 6.5;
          const bellCenterY =
            cy -
            24 +
            Math.cos(time * 0.46) * 8.5 -
            (bellDyn.contraction - 0.36) * 14;

          resonanceNodes.forEach((node) => {
            drawJellyResonanceParticle(
              node.x,
              node.y,
              bellCenterX,
              bellCenterY,
              node.baseRadius,
              node.preset,
              p.hoveredResonanceIdx === node.index,
              node.preset.id === p.activeResonancePreset.id,
              revealProgressRef.current,
              time,
              node.index
            );
          });
        }
      }

      // ======================================================================
      // BRANCH 2: LIVING BLOOM — SOUND BLOSSOM OVERLAY
      // ======================================================================
      else if (p.orbDesign === 'living-bloom') {
        const bloomBurst = computeBloomResonanceBurstState(
          (nowMs - bloomBurstStartMsRef.current) / 1000
        );

        const bloomAuraRadius =
          294 +
          bloomState.outerOpenness * 10 +
          bands.mid * 10 +
          bloomBurst.opennessBoost * 35;
        const bloomAura = ctx.createRadialGradient(
          cx,
          cy,
          36,
          cx,
          cy,
          bloomAuraRadius
        );
        bloomAura.addColorStop(
          0,
          rgbaString(
            currentResonanceRgb,
            (0.07 + bloomBurst.nectaryBoost * 0.16) * stateParams.luminescence
          )
        );
        bloomAura.addColorStop(
          0.55,
          rgbaString(
            currentResonanceSecRgb,
            (0.045 + bloomBurst.opennessBoost * 0.12) * stateParams.luminescence
          )
        );
        bloomAura.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = bloomAura;
        ctx.beginPath();
        ctx.arc(cx, cy, bloomAuraRadius, 0, Math.PI * 2);
        ctx.fill();

        // Luminous Pollen Particle Wave released upon Sound Blossom selection
        if (bloomBurst.active && bloomBurst.pollenAlpha > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          pollenBurstParticles.forEach((pt, idx) => {
            const dist =
              bloomBurst.pollenWaveRadius * pt.speed +
              Math.sin(time * 2.4 + pt.curlPhase) * 12;
            const ang =
              pt.angle +
              Math.cos(time * 1.6 + pt.curlPhase) * 0.16;
            const px = cx + Math.cos(ang) * dist;
            const py =
              cy + Math.sin(ang) * dist - bloomBurst.pollenWaveRadius * 0.08;

            const ptRgb: [number, number, number] =
              pt.colorType === 'gold'
                ? [255, 227, 148]
                : pt.colorType === 'primary'
                ? currentResonanceRgb
                : currentResonanceSecRgb;

            const pGlow = ctx.createRadialGradient(
              px,
              py,
              0.5,
              px,
              py,
              pt.size * 3.2
            );
            pGlow.addColorStop(
              0,
              rgbaString(ptRgb, Math.min(0.95, bloomBurst.pollenAlpha * 1.25))
            );
            pGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
            ctx.fillStyle = pGlow;
            ctx.beginPath();
            ctx.arc(px, py, pt.size * 3.2, 0, Math.PI * 2);
            ctx.fill();

            if (idx % 2 === 0) {
              ctx.fillStyle = `rgba(255, 248, 225, ${bloomBurst.pollenAlpha})`;
              ctx.beginPath();
              ctx.arc(px, py, pt.size * 0.65, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          ctx.restore();
        }

        // Render 6 Glowing Botanical Buds when Sound Blossom is active
        if (revealProgressRef.current > 0.01) {
          resonanceNodes.forEach((node) => {
            drawBloomResonanceBud(
              node.x,
              node.y,
              cx,
              cy,
              node.baseRadius,
              budOpennessRef.current[node.index] ?? 0.2,
              node.preset,
              p.hoveredResonanceIdx === node.index,
              node.preset.id === p.activeResonancePreset.id,
              revealProgressRef.current,
              time,
              node.index
            );
          });
        }
      }

      // ======================================================================
      // BRANCH 3: ORIGINAL — REFRACTIVE LIQUID LENS (RIPPLE PORTAL)
      // ======================================================================
      else {
        const isCompleted = p.status === 'completed';
        const isPaused = p.status === 'paused';

        let mergeState: ReturnType<typeof computeDropletMergeState> | null =
          null;
        if (mergingDropletRef.current) {
          const elapsed = (nowMs - mergingDropletRef.current.startTimeMs) / 620;
          if (elapsed >= 1) {
            mergingDropletRef.current = null;
          } else {
            mergeState = computeDropletMergeState({
              startX: mergingDropletRef.current.startX,
              startY: mergingDropletRef.current.startY,
              centerX: cx,
              centerY: cy,
              progress: elapsed,
            });
          }
        }

        const absorptionBoost = mergeState ? mergeState.coreAbsorptionGlow : 0;
        const lensRadius =
          204 +
          Math.sin(time * 1.4) * 5 +
          bands.bass * 18 +
          absorptionBoost * 10 +
          (isCompleted ? 14 : 0);

        // 1. Wide Correlated Subsurface Aura (transitions to reflect selected sound)
        const ambientGlow = ctx.createRadialGradient(
          cx,
          cy,
          lensRadius * 0.15,
          cx,
          cy,
          lensRadius * 1.46
        );
        ambientGlow.addColorStop(
          0,
          rgbaString(currentResonanceRgb, 0.36 + absorptionBoost * 0.22)
        );
        ambientGlow.addColorStop(
          0.52,
          rgbaString(currentResonanceSecRgb, 0.22 + absorptionBoost * 0.14)
        );
        ambientGlow.addColorStop(0.82, `${palette.tertiaryHex}18`);
        ambientGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = ambientGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, lensRadius * 1.46, 0, Math.PI * 2);
        ctx.fill();

        const hoveredPreset =
          p.hoveredResonanceIdx !== null
            ? RESONANCE_SOUND_PRESETS[p.hoveredResonanceIdx]
            : null;

        // 2. Clip to the Organic Liquid Lens Contour
        ctx.save();
        traceLensContour(
          cx,
          cy,
          lensRadius,
          time,
          p.scene.motion.elasticity,
          bands.overall,
          bands.treble,
          hoveredPreset ? hoveredPreset.orbitAngleRad : null,
          revealProgressRef.current * (hoveredPreset ? 1.0 : 0.0)
        );
        ctx.clip();

        // Translucent Optical Glass Base
        const baseGrad = ctx.createRadialGradient(
          cx - 36,
          cy - 44,
          18,
          cx,
          cy,
          lensRadius * 1.08
        );
        baseGrad.addColorStop(0, 'rgba(26, 22, 52, 0.38)');
        baseGrad.addColorStop(0.65, 'rgba(13, 16, 34, 0.32)');
        baseGrad.addColorStop(1, 'rgba(9, 11, 24, 0.24)');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, size, size);

        // 3. Correlated Internal Liquid Color Caustics (tinted by selected Resonance Sound)
        ctx.globalCompositeOperation = 'screen';

        const drawInternalCaustic = (
          offsetX: number,
          offsetY: number,
          blobR: number,
          rgbColor: [number, number, number],
          alpha: number
        ) => {
          const bx = cx + offsetX;
          const by = cy + offsetY;
          const g = ctx.createRadialGradient(bx, by, 6, bx, by, blobR);
          g.addColorStop(0, rgbaString(rgbColor, alpha));
          g.addColorStop(0.58, rgbaString(rgbColor, alpha * 0.45));
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(bx, by, blobR, 0, Math.PI * 2);
          ctx.fill();
        };

        const orbitA = time * 0.75;
        drawInternalCaustic(
          Math.cos(orbitA) * 58,
          Math.sin(orbitA * 0.8) * 50,
          195 + bands.bass * 34,
          palette.primaryRgb,
          0.78
        );
        drawInternalCaustic(
          Math.sin(-orbitA * 0.75) * 64,
          Math.cos(orbitA * 0.9) * 56,
          188 + bands.mid * 28,
          currentResonanceRgb,
          0.82 + absorptionBoost * 0.15
        );
        drawInternalCaustic(
          Math.cos(orbitA * 0.5 + 2.1) * 48,
          Math.sin(orbitA * 1.1 + 1.4) * 60,
          175,
          palette.tertiaryRgb,
          0.68
        );
        drawInternalCaustic(
          Math.sin(orbitA * 0.6 - 1.2) * 68,
          Math.cos(orbitA * 0.5 + 0.8) * 44,
          172 + absorptionBoost * 40,
          currentResonanceSecRgb,
          0.72 + absorptionBoost * 0.2
        );

        // 4. Sound-Specific Refractive Ripples inside the Lens
        const effect = p.chamber.materialEffect;
        const ringCount =
          effect === 'droplets' || p.isResonanceOpen ? 3 : 2;
        for (let rIdx = 0; rIdx < ringCount; rIdx++) {
          const ripplePhase = (time * 0.28 + rIdx / ringCount) % 1;
          const rr = 34 + ripplePhase * (lensRadius * 0.84);
          ctx.strokeStyle = rgbaString(
            currentResonanceRgb,
            (1 - ripplePhase) * (p.isResonanceOpen ? 0.28 : 0.18)
          );
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Soft internal liquid motes
        particles.slice(0, 24).forEach((d) => {
          if (!p.reducedMotion && !isPaused) {
            const speedMult =
              (isCompleted ? 2.0 : 0.85) + bands.overall * 0.65;
            d.x += d.vx * speedMult;
            d.y += d.vy * speedMult;
            if (Math.hypot(d.x, d.y) > lensRadius * 0.82) {
              d.x *= -0.85;
              d.y *= -0.85;
            }
          }
          const dotColor =
            d.hueShift === 0
              ? palette.iridescentHex
              : d.hueShift === 1
              ? targetPreset.primaryHex
              : palette.secondaryHex;
          ctx.fillStyle = dotColor;
          ctx.globalAlpha = isCompleted
            ? Math.min(0.85, d.alpha * 1.8)
            : Math.min(0.8, d.alpha * (0.45 + bands.treble * 0.35));
          ctx.beginPath();
          ctx.arc(
            cx + d.x,
            cy + d.y,
            isCompleted ? d.r * 1.25 : d.r * (0.9 + bands.overall * 0.25),
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 5. Gentle Optical Depth Scrim
        ctx.globalCompositeOperation = 'source-over';
        const centerScrim = ctx.createRadialGradient(
          cx,
          cy,
          12,
          cx,
          cy,
          lensRadius * 0.78
        );
        centerScrim.addColorStop(0, 'rgba(10, 12, 26, 0.34)');
        centerScrim.addColorStop(0.6, 'rgba(10, 12, 26, 0.16)');
        centerScrim.addColorStop(1, 'rgba(10, 12, 26, 0.0)');
        ctx.fillStyle = centerScrim;
        ctx.fillRect(0, 0, size, size);

        // 6. Soft Specular 3D Glass Sheen (Top-Left Fresnel)
        const topSpecular = ctx.createLinearGradient(
          cx - lensRadius,
          cy - lensRadius,
          cx + lensRadius * 0.45,
          cy + lensRadius * 0.45
        );
        topSpecular.addColorStop(0, 'rgba(245, 246, 255, 0.24)');
        topSpecular.addColorStop(
          0.32,
          rgbaString(currentResonanceRgb, 0.09)
        );
        topSpecular.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = topSpecular;
        ctx.fillRect(0, 0, size, size);

        ctx.restore(); // End Lens Clip

        // 7. Calm, Feathered Glass Rim Contour reflecting selected sound lighting
        traceLensContour(
          cx,
          cy,
          lensRadius,
          time,
          p.scene.motion.elasticity,
          bands.overall,
          bands.treble,
          hoveredPreset ? hoveredPreset.orbitAngleRad : null,
          revealProgressRef.current * (hoveredPreset ? 1.0 : 0.0)
        );
        const rimStroke = ctx.createLinearGradient(
          cx - lensRadius,
          cy - lensRadius,
          cx + lensRadius,
          cy + lensRadius
        );
        rimStroke.addColorStop(0, 'rgba(245, 246, 255, 0.42)');
        rimStroke.addColorStop(0.5, rgbaString(currentResonanceRgb, 0.65));
        rimStroke.addColorStop(1, rgbaString(currentResonanceSecRgb, 0.65));
        ctx.strokeStyle = rimStroke;
        ctx.lineWidth = 1.75;
        ctx.stroke();

        // 8. Render 6 Glowing Sound Droplets around the Liquid Lens when Ripple Portal is active
        if (revealProgressRef.current > 0.01) {
          resonanceNodes.forEach((node) => {
            drawLiquidResonanceDroplet(
              node.x,
              node.y,
              node.baseRadius,
              node.preset,
              p.hoveredResonanceIdx === node.index,
              node.preset.id === p.activeResonancePreset.id,
              revealProgressRef.current,
              time,
              node.index
            );
          });
        }

        // 9. Render Merging Droplet Animation into the Lens Core upon Selection
        if (mergeState && mergingDropletRef.current) {
          drawLiquidResonanceDroplet(
            mergeState.x,
            mergeState.y,
            13.5 * mergeState.radiusScale,
            mergingDropletRef.current.preset,
            true,
            true,
            mergeState.alpha,
            time,
            0
          );
        }
      }

      // ======================================================================
      // SHARED: INTERACTIVE BIOLUMINESCENT / BLOOM / RIPPLE PORTAL WAVES
      // ======================================================================
      if (ripplesRef.current.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let rIdx = ripplesRef.current.length - 1; rIdx >= 0; rIdx--) {
          const rp = ripplesRef.current[rIdx];
          rp.radius += dt * 165;
          const life = 1 - rp.radius / rp.maxRadius;
          if (life <= 0) {
            ripplesRef.current.splice(rIdx, 1);
            continue;
          }
          ctx.strokeStyle = rgbaString(
            currentResonanceRgb,
            life * 0.56 * rp.intensity
          );
          ctx.lineWidth = 2.2 * life + 0.6;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ======================================================================
      // SHARED: PROGRESS REFRACTION ARC AROUND THE PERIMETER WHEN ACTIVE
      // ======================================================================
      if (p.status === 'running' || p.status === 'paused') {
        const is3DOrganism =
          p.orbDesign === 'celestial-jelly' || p.orbDesign === 'living-bloom';
        const progressArcRadius = is3DOrganism ? 286 : 224;
        const startAng = -Math.PI / 2;
        const remainingRatio = Math.max(0.01, 1 - p.progress);
        const endAng = startAng + Math.PI * 2 * remainingRatio;

        ctx.strokeStyle = is3DOrganism
          ? 'rgba(245, 246, 255, 0.04)'
          : 'rgba(245, 246, 255, 0.08)';
        ctx.lineWidth = is3DOrganism ? 1.0 : 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, progressArcRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = is3DOrganism
          ? rgbaString(palette.secondaryRgb, 0.28)
          : palette.secondaryHex;
        ctx.lineWidth = is3DOrganism ? 1.25 : 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, progressArcRadius, startAng, endAng);
        ctx.stroke();

        const tx = cx + Math.cos(endAng) * progressArcRadius;
        const ty = cy + Math.sin(endAng) * progressArcRadius;
        ctx.fillStyle = is3DOrganism ? 'rgba(245, 246, 255, 0.58)' : '#F5F6FF';
        ctx.beginPath();
        ctx.arc(tx, ty, is3DOrganism ? 2.4 : 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [pollenBurstParticles]);

  // Unified Pointer-Event Radial Time Scrubber (supports mouse, touch, stylus)
  const updateDurationFromPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const fraction = angle / (Math.PI * 2);
    const nextMins = radialFractionToMinutes(fraction);
    onChangeDurationMinutes(nextMins);
  };

  useEffect(() => {
    if (!isDraggingScrubber) return;
    const onPointerMove = (e: PointerEvent) => {
      updateDurationFromPointer(e.clientX, e.clientY);
    };
    const onPointerUp = () => {
      setIsDraggingScrubber(false);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  });

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 620;
    const normY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 620;
    pointerCanvasRef.current = { x: normX, y: normY };
  };

  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 620;
    const normY = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 620;
    ripplesRef.current.push({
      id: Date.now() + Math.random(),
      x: normX,
      y: normY,
      radius: 10,
      maxRadius: 230,
      intensity: 0.9,
    });
  };

  // Radial scrubber ONLY shows when explicitly toggled open via Custom/Time Scrubber button (never blocks organism hover/click)
  const showRadialRing =
    status === 'idle' &&
    !isResonanceOpen &&
    (scrubberOpen || isDraggingScrubber);
  const radialFraction = minutesToRadialFraction(durationMinutes);
  const handleAngle = -Math.PI / 2 + radialFraction * Math.PI * 2;
  const scrubCenter = 310;
  const scrubRadius = 262;
  const handleX = scrubCenter + Math.cos(handleAngle) * scrubRadius;
  const handleY = scrubCenter + Math.sin(handleAngle) * scrubRadius;

  const isRunningOrPaused = status === 'running' || status === 'paused';

  const scaleClass =
    isRunningOrPaused && immersionMode !== 'minimal'
      ? 'w-[225px] h-[225px] sm:w-[260px] sm:h-[260px] md:w-[300px] md:h-[300px] lg:w-[325px] lg:h-[325px]'
      : 'w-[215px] h-[215px] sm:w-[245px] sm:h-[245px] md:w-[285px] md:h-[285px] lg:w-[310px] lg:h-[310px]';

  const numeralSizeClass =
    timerTextScale === 'monumental'
      ? 'text-5xl sm:text-6xl md:text-7xl'
      : timerTextScale === 'large'
      ? 'text-4xl sm:text-5xl md:text-6xl'
      : 'text-4xl sm:text-4xl md:text-5xl';

  // Compute DOM overlay coordinates for the 6 interactive Resonance nodes around the organism
  const domNodesLayout = useMemo(
    () =>
      computeResonanceNodesLayout({
        orbDesign,
        timeSec: 0,
        revealProgress: 1,
        hoveredIndex: hoveredResonanceIdx,
        activeChamberId: activeResonancePreset.id,
      }),
    [orbDesign, hoveredResonanceIdx, activeResonancePreset.id]
  );

  return (
    <div className="flex flex-col items-center">
      {/* Unobstructed Organism Centerpiece Stage & Interactive Aura Resonance Sound Portal */}
      <div
        ref={containerRef}
        onPointerEnter={() => setIsLensHovered(true)}
        onPointerLeave={() => {
          setIsLensHovered(false);
          pointerCanvasRef.current = { x: null, y: null };
        }}
        onPointerMove={handleContainerPointerMove}
        onPointerDown={handleContainerPointerDown}
        data-testid="living-lens-container"
        data-timer-status={status}
        data-orb-design={orbDesign}
        data-chamber-id={chamber.id}
        data-resonance-open={isResonanceOpen ? 'true' : 'false'}
        data-active-resonance-sound={activeResonancePreset.slug}
        className={`relative flex items-center justify-center select-none transition-all duration-700 ease-out ${scaleClass}`}
      >
        {/* Real-Time Procedural ORB Canvas (Liquid Lens | Celestial Jelly | Living Bloom + Resonance Nodes) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Central Visual Object Interactive Trigger for AURA RESONANCE */}
        <button
          type="button"
          data-testid="aura-resonance-trigger"
          aria-expanded={isResonanceOpen}
          aria-label={`${RESONANCE_MODE_TITLES[orbDesign]} — Active sound: ${activeResonancePreset.name}. Click organism to ${
            isResonanceOpen ? 'close' : 'open'
          } Aura Resonance sound selector`}
          title={`${RESONANCE_MODE_TITLES[orbDesign]} · Click organism to tune ambient sound (${activeResonancePreset.name})`}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleResonancePortal();
          }}
          className="relative z-10 w-[82%] h-[82%] rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2FE8FF] bg-transparent group flex items-end justify-center pb-2"
        >
          {/* Always-Accessible Organism Resonance Pill when closed */}
          {!isResonanceOpen && (
            <span
              data-testid="organism-resonance-badge"
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-medium tracking-wide whitespace-nowrap transition-all duration-300 aura-glass border border-white/15 shadow-lg ${
                isLensHovered
                  ? 'opacity-100 scale-105 text-[#F5F6FF] border-[#2FE8FF]/55 shadow-[0_0_18px_rgba(47,232,255,0.28)]'
                  : 'opacity-85 text-[#E5E7F8] hover:opacity-100'
              }`}
              style={{
                boxShadow: `inset 0 0 0 1px ${activeResonancePreset.primaryHex}44`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                style={{
                  backgroundColor: activeResonancePreset.primaryHex,
                  boxShadow: `0 0 8px ${activeResonancePreset.primaryHex}`,
                }}
              />
              <span className="text-[#2FE8FF] font-semibold">
                {RESONANCE_MODE_TITLES[orbDesign]}
              </span>
              <span className="opacity-50">·</span>
              <span>{activeResonancePreset.name}</span>
            </span>
          )}
        </button>

        {/* 6 Interactive Aura Resonance Sound Nodes Orbiting the Organism */}
        {isResonanceOpen && (
          <div
            role="radiogroup"
            aria-label={`Aura Resonance — ${RESONANCE_MODE_TITLES[orbDesign]} Sound Selector`}
            data-testid="aura-resonance-nodes"
            className="absolute inset-0 z-30 pointer-events-none"
          >
            {domNodesLayout.map((node, idx) => {
              const isSelected = node.preset.id === activeResonancePreset.id;
              const isHovered = hoveredResonanceIdx === idx;
              return (
                <button
                  key={node.preset.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${node.preset.name} — ${node.preset.subtitle}`}
                  data-testid={`resonance-node-${node.preset.slug}`}
                  data-sound-name={node.preset.name}
                  style={{
                    left: `${node.percentX}%`,
                    top: `${node.percentY}%`,
                  }}
                  onPointerEnter={() => setHoveredResonanceIdx(idx)}
                  onPointerLeave={() =>
                    setHoveredResonanceIdx((prev) =>
                      prev === idx ? null : prev
                    )
                  }
                  onFocus={() => setHoveredResonanceIdx(idx)}
                  onBlur={() =>
                    setHoveredResonanceIdx((prev) =>
                      prev === idx ? null : prev
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectResonancePreset(node.preset, idx);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      const nextIdx =
                        (idx + 1) % RESONANCE_SOUND_PRESETS.length;
                      setHoveredResonanceIdx(nextIdx);
                      const nextEl = containerRef.current?.querySelector(
                        `[data-testid="resonance-node-${RESONANCE_SOUND_PRESETS[nextIdx].slug}"]`
                      ) as HTMLButtonElement | null;
                      nextEl?.focus();
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      const prevIdx =
                        (idx - 1 + RESONANCE_SOUND_PRESETS.length) %
                        RESONANCE_SOUND_PRESETS.length;
                      setHoveredResonanceIdx(prevIdx);
                      const prevEl = containerRef.current?.querySelector(
                        `[data-testid="resonance-node-${RESONANCE_SOUND_PRESETS[prevIdx].slug}"]`
                      ) as HTMLButtonElement | null;
                      prevEl?.focus();
                    }
                  }}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-[#2FE8FF] group"
                >
                  {/* Floating contextual sound label pill */}
                  <span
                    className={`pointer-events-none absolute whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium tracking-wide transition-all duration-200 ${
                      node.percentY < 32
                        ? '-top-6'
                        : node.percentY > 68
                        ? '-top-6'
                        : node.percentX < 50
                        ? 'right-full mr-1.5'
                        : 'left-full ml-1.5'
                    } ${
                      isHovered || isSelected
                        ? 'opacity-100 scale-105 aura-glass text-[#F5F6FF] font-semibold shadow-lg'
                        : 'opacity-90 scale-95 text-[#E5E7F8] bg-[#070812]/80 border border-white/10'
                    }`}
                    style={
                      isHovered || isSelected
                        ? {
                            boxShadow: `inset 0 0 0 1px ${node.preset.primaryHex}88, 0 0 14px ${node.preset.primaryHex}44`,
                          }
                        : undefined
                    }
                  >
                    {node.preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Interactive Radial Time Scrubber (Progressive Disclosure when Custom Time is toggled open) */}
        {showRadialRing && (
          <svg
            viewBox="0 0 620 620"
            className="absolute inset-0 w-full h-full overflow-visible z-20 touch-none"
            aria-label="Radial Duration Scrubber (15 to 120 minutes)"
          >
            {/* Interactive Ring Track */}
            <circle
              cx={scrubCenter}
              cy={scrubCenter}
              r={scrubRadius}
              fill="none"
              stroke="rgba(245, 246, 255, 0.14)"
              strokeWidth={16}
              className="cursor-pointer"
              onPointerDown={(e) => {
                e.stopPropagation();
                onToggleScrubber(true);
                setIsDraggingScrubber(true);
                updateDurationFromPointer(e.clientX, e.clientY);
              }}
            />

            {/* Active Radial Arc */}
            <circle
              cx={scrubCenter}
              cy={scrubCenter}
              r={scrubRadius}
              fill="none"
              stroke={scene.colors.secondary}
              strokeWidth={3.5}
              strokeDasharray={`${
                radialFraction * 2 * Math.PI * scrubRadius
              } 2400`}
              transform={`rotate(-90 ${scrubCenter} ${scrubCenter})`}
              className="pointer-events-none"
            />

            {/* Magnetic Snap Points at 25, 45, 60, and 90 minutes */}
            {SNAP_PRESET_MINUTES.map((snapMins) => {
              const snapFrac = minutesToRadialFraction(snapMins);
              const ang = -Math.PI / 2 + snapFrac * Math.PI * 2;
              const sx = scrubCenter + Math.cos(ang) * scrubRadius;
              const sy = scrubCenter + Math.sin(ang) * scrubRadius;
              const lx = scrubCenter + Math.cos(ang) * (scrubRadius + 26);
              const ly = scrubCenter + Math.sin(ang) * (scrubRadius + 26);
              const isCurrentSnap = durationMinutes === snapMins;

              return (
                <g
                  key={snapMins}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChangeDurationMinutes(snapMins);
                  }}
                  className="cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Set duration to ${snapMins} minutes`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChangeDurationMinutes(snapMins);
                    }
                  }}
                >
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isCurrentSnap ? 6 : 4}
                    fill={
                      isCurrentSnap ? '#2FE8FF' : 'rgba(245, 246, 255, 0.45)'
                    }
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isCurrentSnap ? '#F5F6FF' : '#A3A1BA'}
                    fontSize="11.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight={isCurrentSnap ? '600' : '400'}
                  >
                    {snapMins}m
                  </text>
                </g>
              );
            })}

            {/* Draggable Scrubber Handle */}
            <g
              onPointerDown={(e) => {
                e.stopPropagation();
                setIsDraggingScrubber(true);
              }}
              className="cursor-grab active:cursor-grabbing"
            >
              <circle
                cx={handleX}
                cy={handleY}
                r={12}
                fill="#070812"
                stroke="#2FE8FF"
                strokeWidth={3}
              />
              <circle cx={handleX} cy={handleY} r={4} fill="#F5F6FF" />
            </g>
          </svg>
        )}
      </div>

      {/* Dedicated Balanced Timer & Intention Focal Zone (Cleanly Separated From Organism) */}
      <div
        data-testid="timer-display-zone"
        className="relative z-30 mt-2.5 sm:mt-3.5 flex flex-col items-center justify-center text-center px-4 max-w-xl"
      >
        {status === 'completed' ? (
          <div
            data-testid="session-completion-summary"
            className="flex flex-col items-center gap-2.5 animate-fade-in aura-glass rounded-3xl px-6 py-4 border border-white/10"
          >
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                data-testid="completion-status-badge"
                className={`text-[10px] font-mono uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full ${
                  (lastCompletedSession?.completionStatus ?? 'completed') ===
                  'completed'
                    ? 'bg-[#38F8A8]/16 text-[#38F8A8] border border-[#38F8A8]/40'
                    : 'bg-[#FFB08A]/16 text-[#FFB08A] border border-[#FFB08A]/40'
                }`}
              >
                {(lastCompletedSession?.completionStatus ?? 'completed') ===
                'completed'
                  ? 'Session Completed'
                  : 'Ended Early · Actual Time Logged'}
              </span>
              <span className="text-xs font-medium tracking-wide text-[#2FE8FF]">
                {scene.name}
              </span>
            </div>

            <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] tracking-tight">
              {(lastCompletedSession?.completionStatus ?? 'completed') ===
              'completed'
                ? scene.completionPhrase
                : 'Focus Progress Recorded'}
            </h2>

            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#A3A1BA]">
              <span>
                Intention:{' '}
                <strong className="text-[#F5F6FF] font-medium">
                  {lastCompletedSession?.label || sessionLabel || 'Deep work'}
                </strong>
              </span>
              <span>·</span>
              <span data-testid="completion-actual-time">
                Focused:{' '}
                <strong className="text-[#2FE8FF] font-mono">
                  {lastCompletedSession
                    ? `${lastCompletedSession.actualMinutes ?? lastCompletedSession.durationMinutes}m`
                    : `${durationMinutes}m`}
                </strong>
                {lastCompletedSession?.plannedMinutes &&
                  lastCompletedSession.plannedMinutes !==
                    (lastCompletedSession.actualMinutes ??
                      lastCompletedSession.durationMinutes) && (
                    <span className="text-[#A3A1BA] ml-1">
                      (of {lastCompletedSession.plannedMinutes}m planned)
                    </span>
                  )}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">
              {onOpenRestore && (
                <AuraButton
                  variant="secondary"
                  size="md"
                  data-testid="completion-restore-btn"
                  reducedMotion={reducedMotion}
                  onClick={onOpenRestore}
                >
                  Restorative Break
                </AuraButton>
              )}
              <AuraButton
                variant="secondary"
                size="md"
                data-testid="completion-quick-break-btn"
                reducedMotion={reducedMotion}
                onClick={onStartBreak}
              >
                Take a break
              </AuraButton>
              <AuraButton
                variant="primary"
                size="md"
                data-testid="completion-start-again-btn"
                accentColor={scene.colors.primary}
                secondaryColor={scene.colors.secondary}
                reducedMotion={reducedMotion}
                onClick={onStartAgain}
              >
                Start again
              </AuraButton>
            </div>
          </div>
        ) : (
          <>
            {(status === 'paused' || phase === 'break') && (
              <span className="text-xs font-medium tracking-wide text-[#FFB08A] mb-1">
                {status === 'paused' ? 'Paused' : 'Restorative Break'}
              </span>
            )}

            <button
              type="button"
              onClick={onPrimaryAction}
              aria-label={`Remaining focus time ${formatRemainingTime(
                remainingSeconds
              )}. Click to ${
                status === 'running'
                  ? 'pause'
                  : status === 'paused'
                  ? 'resume'
                  : 'begin'
              }`}
              className={`font-display font-medium tracking-[-0.03em] text-[#F5F6FF] tabular-nums leading-none drop-shadow-[0_6px_28px_rgba(7,8,18,0.85)] transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-6 focus-visible:outline-[#2FE8FF] rounded-xl cursor-pointer ${numeralSizeClass}`}
            >
              {formatRemainingTime(remainingSeconds)}
            </button>

            {immersionMode !== 'deep' && (
              <div className="mt-2 min-h-[26px] flex flex-col items-center justify-center">
                {isEditingLabel ? (
                  <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-[#070915]/80 backdrop-blur-md border border-white/15 shadow-xl">
                    <input
                      ref={labelInputRef}
                      type="text"
                      aria-label="Session intention"
                      data-testid="session-intention-input"
                      value={sessionLabel}
                      onChange={(e) => onChangeSessionLabel(e.target.value)}
                      onBlur={() => {
                        window.setTimeout(() => setIsEditingLabel(false), 160);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setIsEditingLabel(false);
                        }
                      }}
                      placeholder="What do you intend to accomplish?"
                      className="bg-transparent border-b border-[#2FE8FF]/60 text-center text-xs sm:text-sm font-medium text-[#F5F6FF] placeholder:text-[#A3A1BA]/60 focus:outline-none px-2 py-0.5 w-64"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-1 max-w-md">
                      {SESSION_INTENTION_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onChangeSessionLabel(suggestion);
                            setIsEditingLabel(false);
                          }}
                          className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/[0.08] hover:bg-[#2FE8FF]/20 text-[#E5E7F8] hover:text-[#F5F6FF] border border-white/15 transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    data-testid="session-intention-trigger"
                    onClick={() => setIsEditingLabel(true)}
                    title="Click to set your session intention"
                    className="text-xs sm:text-sm font-medium text-[#E5E7F8] hover:text-[#F5F6FF] bg-[#070915]/70 hover:bg-[#070915]/85 backdrop-blur-md border border-white/15 shadow-lg transition-all px-3.5 py-1 rounded-full focus-visible:outline-2 focus-visible:outline-[#2FE8FF] cursor-pointer"
                  >
                    {sessionLabel.trim() || 'Set session intention…'}
                  </button>
                )}

                {/* Quick Session Presets when Idle (15, 25, 45, 50, 60, 90m + Custom) */}
                {status === 'idle' && !isEditingLabel && (
                  <div
                    data-testid="home-session-presets"
                    className="mt-2 p-1 rounded-full bg-[#070915]/68 backdrop-blur-md border border-white/14 shadow-lg flex flex-wrap items-center justify-center gap-1"
                  >
                    {FOCUS_PRESET_MINUTES.map((mins) => {
                      const isCurrent = durationMinutes === mins;
                      return (
                        <button
                          key={mins}
                          type="button"
                          data-testid={`stage-preset-${mins}m`}
                          onClick={() => onChangeDurationMinutes(mins)}
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-[#2FE8FF]/25 text-[#2FE8FF] border border-[#2FE8FF]/60 font-semibold shadow-[0_0_12px_rgba(47,232,255,0.22)]'
                              : 'text-[#D6D8EC] hover:text-[#F5F6FF] bg-white/[0.04] hover:bg-white/[0.1] border border-transparent'
                          }`}
                        >
                          {mins}m
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      data-testid="stage-preset-custom"
                      onClick={() => onToggleScrubber(!scrubberOpen)}
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] transition-all cursor-pointer ${
                        scrubberOpen ||
                        !FOCUS_PRESET_MINUTES.includes(durationMinutes)
                          ? 'bg-[#8A5CFF]/30 text-[#F5F6FF] border border-[#8A5CFF]/60 font-semibold'
                          : 'text-[#D6D8EC] hover:text-[#F5F6FF] bg-white/[0.04] hover:bg-white/[0.1] border border-transparent'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
