import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChamberConfig,
  FocusImmersionMode,
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import {
  SNAP_PRESET_MINUTES,
  formatRemainingTime,
  minutesToRadialFraction,
  radialFractionToMinutes,
} from '../utils/focusEngine';
import {
  OrbRipple,
  ProceduralPetal,
  computeBloomCycleState,
  computeBloomGrowthStage,
  computeJellyBellContraction,
  computeOrbStateParameters,
  computeThemeOrganismPalette,
  generateBloomPetals,
  rgbaString,
} from '../utils/organicOrbEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface LivingLensProps {
  scene: FocusSceneConfig;
  chamber: ChamberConfig;
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
  timerTextScale: 'default' | 'large' | 'monumental';
  immersionMode: FocusImmersionMode;
  onPrimaryAction: () => void;
  onStartBreak: () => void;
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

export const LivingLens: React.FC<LivingLensProps> = ({
  scene,
  chamber,
  orbDesign = 'original',
  completedSessionsCount = 10,
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
  timerTextScale,
  immersionMode,
  onPrimaryAction,
  onStartBreak,
  onStartAgain,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);
  const [isLensHovered, setIsLensHovered] = useState(false);

  // Interactive pointer coordinates in 620x620 canvas space
  const pointerCanvasRef = useRef<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const ripplesRef = useRef<OrbRipple[]>([]);

  // Pre-compute botanical growth stage & procedural petals for Living Bloom
  const bloomGrowth = useMemo(
    () => computeBloomGrowthStage(completedSessionsCount),
    [completedSessionsCount]
  );
  const bloomPetals = useMemo(
    () => generateBloomPetals(bloomGrowth),
    [bloomGrowth]
  );

  const liveRef = useRef({
    scene,
    chamber,
    orbDesign,
    bloomGrowth,
    bloomPetals,
    status,
    phase,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
  });

  useEffect(() => {
    liveRef.current = {
      scene,
      chamber,
      orbDesign,
      bloomGrowth,
      bloomPetals,
      status,
      phase,
      totalSeconds,
      progress,
      audioReactive,
      reducedMotion,
    };
  }, [
    scene,
    chamber,
    orbDesign,
    bloomGrowth,
    bloomPetals,
    status,
    phase,
    totalSeconds,
    progress,
    audioReactive,
    reducedMotion,
  ]);

  // Trigger a gentle completion ripple when session finishes
  useEffect(() => {
    if (status === 'completed') {
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

  useEffect(() => {
    if (isEditingLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    }
  }, [isEditingLabel]);

  // Unified Real-Time Procedural Canvas Renderer (Original | Celestial Jelly | Living Bloom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 620;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Shared suspended particles / spores / bioluminescent plankton
    const particles: CausticDroplet[] = Array.from({ length: 38 }, (_, idx) => ({
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
    // Helper: Original Living Lens Contour
    // ------------------------------------------------------------------------
    const traceLensContour = (
      cx: number,
      cy: number,
      baseR: number,
      t: number,
      elasticity: number,
      amp: number,
      trebleAmp: number,
      phaseOffset = 0
    ) => {
      const ptr = pointerCanvasRef.current;
      ctx.beginPath();
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const n1 =
          Math.sin(theta * 3 + t * 1.3 + phaseOffset) *
          (9 * elasticity + amp * 13);
        const n2 =
          Math.cos(theta * 4 - t * 0.95 + phaseOffset) *
          (6 * elasticity + trebleAmp * 9);
        const n3 = Math.sin(theta * 2 + t * 0.6) * (5 * elasticity);
        let r = baseR + n1 + n2 + n3;

        const px = cx + Math.cos(theta) * r;
        const py = cy + Math.sin(theta) * r;
        if (ptr.x !== null && ptr.y !== null) {
          const distToPtr = Math.hypot(px - ptr.x, py - ptr.y);
          if (distToPtr < 140) {
            r += Math.sin((1 - distToPtr / 140) * Math.PI) * 9;
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
    // Helper: Draw a Single Procedural Botanical Petal for Living Bloom
    // ------------------------------------------------------------------------
    const drawProceduralPetal = (
      cx: number,
      cy: number,
      petal: ProceduralPetal,
      openness: number,
      globalRotation: number,
      t: number,
      palette: ReturnType<typeof computeThemeOrganismPalette>,
      ptrX: number | null,
      ptrY: number | null,
      luminescence: number
    ) => {
      const sway =
        Math.sin(t * 0.85 + petal.phaseOffset) * 0.042 +
        Math.cos(t * 0.53 - petal.phaseOffset * 0.7) * 0.025;
      let angle = petal.baseAngle + globalRotation + sway;

      // Subtle environmental current response to pointer
      const tipPreviewX = cx + Math.cos(angle) * petal.baseLength * openness;
      const tipPreviewY = cy + Math.sin(angle) * petal.baseLength * openness;
      if (ptrX !== null && ptrY !== null) {
        const dx = tipPreviewX - ptrX;
        const dy = tipPreviewY - ptrY;
        const d = Math.hypot(dx, dy);
        if (d < 150 && d > 1) {
          const cross =
            Math.cos(angle) * (dy / d) - Math.sin(angle) * (dx / d);
          angle += cross * (1 - d / 150) * 0.14;
        }
      }

      const len = petal.baseLength * (0.48 + openness * 0.56);
      const wid = petal.baseWidth * (0.56 + openness * 0.48);
      const bend =
        petal.curvatureBias * (0.6 + 0.4 * Math.sin(t * 0.7 + petal.phaseOffset));

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Organic asymmetric petal contour along +X axis
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.bezierCurveTo(
        len * 0.28,
        -wid * 0.82 + bend * 0.3,
        len * 0.74,
        -wid * petal.tipPointiness + bend * 0.7,
        len,
        bend
      );
      ctx.bezierCurveTo(
        len * 0.74,
        wid * petal.tipPointiness + bend * 0.7,
        len * 0.28,
        wid * 0.82 + bend * 0.3,
        8,
        0
      );
      ctx.closePath();

      // Subsurface translucent petal gradient
      const pRgb =
        petal.colorShift === 0
          ? palette.primaryRgb
          : petal.colorShift === 1
          ? palette.secondaryRgb
          : palette.tertiaryRgb;
      const sRgb =
        petal.colorShift === 0
          ? palette.secondaryRgb
          : petal.colorShift === 1
          ? palette.iridescentRgb
          : palette.primaryRgb;

      const grad = ctx.createLinearGradient(8, 0, len, bend);
      const baseAlpha =
        petal.layer === 'outer'
          ? 0.28
          : petal.layer === 'mid'
          ? 0.35
          : petal.layer === 'inner'
          ? 0.42
          : 0.5;
      grad.addColorStop(0, rgbaString(palette.tertiaryRgb, baseAlpha * 0.72));
      grad.addColorStop(
        0.55,
        rgbaString(pRgb, baseAlpha * luminescence)
      );
      grad.addColorStop(
        0.92,
        rgbaString(sRgb, Math.min(0.75, baseAlpha * 1.45 * luminescence))
      );
      grad.addColorStop(
        1,
        rgbaString(palette.iridescentRgb, Math.min(0.85, baseAlpha * 1.7))
      );

      ctx.fillStyle = grad;
      ctx.fill();

      // Delicate internal translucent veins inside each petal
      ctx.strokeStyle = rgbaString(
        sRgb,
        0.18 + 0.08 * Math.sin(t * 1.4 + petal.phaseOffset)
      );
      ctx.lineWidth = 0.85;
      // Central midrib vein
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(len * 0.55, bend * 0.45, len * 0.94, bend);
      ctx.stroke();

      // Branched lateral veins
      for (let vIdx = 0; vIdx < petal.veinSeeds.length; vIdx++) {
        const frac = petal.veinSeeds[vIdx];
        const vxStart = len * frac * 0.72;
        const vyStart = bend * frac * 0.4;
        const vxEnd = len * Math.min(0.95, frac + 0.22);
        const spread = wid * (0.48 - frac * 0.22);

        ctx.beginPath();
        ctx.moveTo(vxStart, vyStart);
        ctx.quadraticCurveTo(
          (vxStart + vxEnd) * 0.5,
          -spread * 0.55 + bend * 0.4,
          vxEnd,
          -spread + bend * 0.65
        );
        ctx.moveTo(vxStart, vyStart);
        ctx.quadraticCurveTo(
          (vxStart + vxEnd) * 0.5,
          spread * 0.55 + bend * 0.4,
          vxEnd,
          spread + bend * 0.65
        );
        ctx.stroke();
      }

      // Luminous petal rim edge
      const rimGrad = ctx.createLinearGradient(12, 0, len, bend);
      rimGrad.addColorStop(0, rgbaString(pRgb, 0.12));
      rimGrad.addColorStop(0.65, rgbaString(sRgb, 0.38 * luminescence));
      rimGrad.addColorStop(
        1,
        rgbaString(palette.iridescentRgb, 0.72 * luminescence)
      );
      ctx.strokeStyle = rimGrad;
      ctx.lineWidth = petal.layer === 'crown' ? 1.35 : 1.1;
      ctx.stroke();

      ctx.restore();
    };

    // ------------------------------------------------------------------------
    // Main Animation Loop
    // ------------------------------------------------------------------------
    const render = (ts: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const p = liveRef.current;
      const minDelta = p.reducedMotion ? 500 : 24;
      if (ts - lastDraw < minDelta) {
        animId = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(0.08, (ts - lastDraw) / 1000 || 0.016);
      lastDraw = ts;

      const bands =
        p.audioReactive && p.status === 'running'
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

      const palette = computeThemeOrganismPalette(p.scene, p.phase);
      const cx = size / 2;
      const cy = size / 2;
      const ptr = pointerCanvasRef.current;

      ctx.clearRect(0, 0, size, size);
      ctx.save();

      if (p.status === 'paused') {
        ctx.filter = 'saturate(0.42) brightness(0.84)';
      }

      // ======================================================================
      // BRANCH 1: CELESTIAL JELLY — 3D PROCEDURAL PELAGIC ORGANISM OVERLAY
      // (The 3D 16-lobe bell, inner manubrium, 8 ruffled oral arms, 16 marginal
      //  filaments, 8 pinnate fronds, bioluminescent nodes, and plankton are
      //  rendered in real-time 3D by CelestialJelly3DSceneController in the
      //  shared Three.js renderer. Here we render only the subtle optical bridge
      //  halo and central numeral readability scrim.)
      // ======================================================================
      if (p.orbDesign === 'celestial-jelly') {
        const bellDyn = computeJellyBellContraction(time);
        const haloRadius = 294 + bellDyn.contraction * 10;
        const halo = ctx.createRadialGradient(
          cx,
          cy,
          36,
          cx,
          cy,
          haloRadius
        );
        halo.addColorStop(
          0,
          rgbaString(
            palette.primaryRgb,
            0.06 * stateParams.luminescence
          )
        );
        halo.addColorStop(
          0.55,
          `${p.chamber.primaryHex}12`
        );
        halo.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // ======================================================================
      // BRANCH 2: LIVING BLOOM — 3D PROCEDURAL BOTANICAL ORGANISM OVERLAY
      // (The 44-petal 4-whorl corolla, 3-level branching vascular veins, 28
      //  central curled carpels, 128 curved stamen filaments, 128 golden pollen
      //  anthers, curved stem, 7 recurved sepals, and floating golden pollen are
      //  rendered in real-time 3D by LivingBloom3DSceneController in the shared
      //  Three.js renderer. Here we render only the subtle optical bridge halo
      //  and central numeral readability scrim.)
      // ======================================================================
      else if (p.orbDesign === 'living-bloom') {
        const bloomState = computeBloomCycleState(time, p.status, p.progress);
        const bloomAuraRadius = 294 + bloomState.outerOpenness * 10;
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
          rgbaString(palette.primaryRgb, 0.05 * stateParams.luminescence)
        );
        bloomAura.addColorStop(
          0.55,
          rgbaString(palette.secondaryRgb, 0.035 * stateParams.luminescence)
        );
        bloomAura.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = bloomAura;
        ctx.beginPath();
        ctx.arc(cx, cy, bloomAuraRadius, 0, Math.PI * 2);
        ctx.fill();

        // Subtle central readability scrim directly behind the countdown numerals
        const bloomScrim = ctx.createRadialGradient(cx, cy, 8, cx, cy, 118);
        bloomScrim.addColorStop(0, 'rgba(7, 8, 18, 0.28)');
        bloomScrim.addColorStop(0.65, 'rgba(7, 8, 18, 0.12)');
        bloomScrim.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = bloomScrim;
        ctx.beginPath();
        ctx.arc(cx, cy, 118, 0, Math.PI * 2);
        ctx.fill();
      }

      // ======================================================================
      // BRANCH 3: ORIGINAL — REFRACTIVE LIQUID LENS
      // ======================================================================
      else {
        const isCompleted = p.status === 'completed';
        const isPaused = p.status === 'paused';
        const lensRadius =
          204 +
          Math.sin(time * 1.4) * 5 +
          bands.bass * 18 +
          (isCompleted ? 14 : 0);

        // 1. Wide Correlated Subsurface Aura
        const ambientGlow = ctx.createRadialGradient(
          cx,
          cy,
          lensRadius * 0.15,
          cx,
          cy,
          lensRadius * 1.46
        );
        ambientGlow.addColorStop(0, `${palette.primaryHex}55`);
        ambientGlow.addColorStop(0.52, `${palette.secondaryHex}33`);
        ambientGlow.addColorStop(0.82, `${palette.tertiaryHex}18`);
        ambientGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = ambientGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, lensRadius * 1.46, 0, Math.PI * 2);
        ctx.fill();

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
          0
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

        // 3. Correlated Internal Liquid Color Caustics
        ctx.globalCompositeOperation = 'screen';

        const drawInternalCaustic = (
          offsetX: number,
          offsetY: number,
          blobR: number,
          hexColor: string,
          alphaHex: string
        ) => {
          const bx = cx + offsetX;
          const by = cy + offsetY;
          const g = ctx.createRadialGradient(bx, by, 6, bx, by, blobR);
          g.addColorStop(0, `${hexColor}${alphaHex}`);
          g.addColorStop(0.58, `${hexColor}66`);
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
          palette.primaryHex,
          'D8'
        );
        drawInternalCaustic(
          Math.sin(-orbitA * 0.75) * 64,
          Math.cos(orbitA * 0.9) * 56,
          188 + bands.mid * 28,
          palette.secondaryHex,
          'CC'
        );
        drawInternalCaustic(
          Math.cos(orbitA * 0.5 + 2.1) * 48,
          Math.sin(orbitA * 1.1 + 1.4) * 60,
          175,
          palette.tertiaryHex,
          'BB'
        );
        drawInternalCaustic(
          Math.sin(orbitA * 0.6 - 1.2) * 68,
          Math.cos(orbitA * 0.5 + 0.8) * 44,
          165,
          p.chamber.primaryHex,
          '99'
        );

        // 4. Chamber-Specific Material Physics inside the Lens
        const effect = p.chamber.materialEffect;
        if (effect === 'harmonic-rings' || effect === 'droplets') {
          const ringCount = effect === 'droplets' ? 3 : 2;
          for (let rIdx = 0; rIdx < ringCount; rIdx++) {
            const ripplePhase = (time * 0.28 + rIdx / ringCount) % 1;
            const rr = 34 + ripplePhase * (lensRadius * 0.82);
            ctx.strokeStyle =
              effect === 'droplets'
                ? `rgba(47, 232, 255, ${(1 - ripplePhase) * 0.18})`
                : `rgba(216, 255, 82, ${(1 - ripplePhase) * 0.16})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Soft internal liquid motes
        particles.slice(0, 24).forEach((d) => {
          if (!p.reducedMotion && !isPaused) {
            d.x += d.vx * (isCompleted ? 2.0 : 0.85);
            d.y += d.vy * (isCompleted ? 2.0 : 0.85);
            if (Math.hypot(d.x, d.y) > lensRadius * 0.82) {
              d.x *= -0.85;
              d.y *= -0.85;
            }
          }
          const dotColor =
            d.hueShift === 0
              ? palette.iridescentHex
              : d.hueShift === 1
              ? p.chamber.primaryHex
              : palette.secondaryHex;
          ctx.fillStyle = dotColor;
          ctx.globalAlpha = isCompleted
            ? Math.min(0.85, d.alpha * 1.8)
            : d.alpha * 0.45;
          ctx.beginPath();
          ctx.arc(
            cx + d.x,
            cy + d.y,
            isCompleted ? d.r * 1.25 : d.r * 0.9,
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
        topSpecular.addColorStop(0.32, 'rgba(47, 232, 255, 0.06)');
        topSpecular.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = topSpecular;
        ctx.fillRect(0, 0, size, size);

        ctx.restore(); // End Lens Clip

        // 7. Calm, Feathered Glass Rim Contour
        traceLensContour(
          cx,
          cy,
          lensRadius,
          time,
          p.scene.motion.elasticity,
          bands.overall,
          bands.treble,
          0
        );
        const rimStroke = ctx.createLinearGradient(
          cx - lensRadius,
          cy - lensRadius,
          cx + lensRadius,
          cy + lensRadius
        );
        rimStroke.addColorStop(0, 'rgba(245, 246, 255, 0.38)');
        rimStroke.addColorStop(0.5, `${palette.primaryHex}66`);
        rimStroke.addColorStop(1, `${palette.secondaryHex}66`);
        ctx.strokeStyle = rimStroke;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // ======================================================================
      // SHARED: INTERACTIVE BIOLUMINESCENT / BLOOM CLICK RIPPLES
      // ======================================================================
      if (ripplesRef.current.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let rIdx = ripplesRef.current.length - 1; rIdx >= 0; rIdx--) {
          const rp = ripplesRef.current[rIdx];
          rp.radius += dt * 155;
          const life = 1 - rp.radius / rp.maxRadius;
          if (life <= 0) {
            ripplesRef.current.splice(rIdx, 1);
            continue;
          }
          ctx.strokeStyle = rgbaString(
            palette.secondaryRgb,
            life * 0.52 * rp.intensity
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

        // Luminous leading droplet
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
  }, []);

  // Unified Pointer-Event Radial Time Scrubber (supports mouse, touch, stylus)
  const updateDurationFromPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // Angle from 12 o'clock clockwise (0..2PI)
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

  const showRadialRing =
    status === 'idle' && (scrubberOpen || isLensHovered || isDraggingScrubber);
  const radialFraction = minutesToRadialFraction(durationMinutes);
  const handleAngle = -Math.PI / 2 + radialFraction * Math.PI * 2;
  const scrubCenter = 310;
  const scrubRadius = 262;
  const handleX = scrubCenter + Math.cos(handleAngle) * scrubRadius;
  const handleY = scrubCenter + Math.sin(handleAngle) * scrubRadius;

  const isRunningOrPaused = status === 'running' || status === 'paused';

  const scaleClass =
    isRunningOrPaused && immersionMode !== 'minimal'
      ? 'w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] md:w-[300px] md:h-[300px] lg:w-[325px] lg:h-[325px]'
      : 'w-[190px] h-[190px] sm:w-[245px] sm:h-[245px] md:w-[285px] md:h-[285px] lg:w-[310px] lg:h-[310px]';

  const numeralSizeClass =
    timerTextScale === 'monumental'
      ? 'text-5xl sm:text-6xl md:text-7xl'
      : timerTextScale === 'large'
      ? 'text-4xl sm:text-5xl md:text-6xl'
      : 'text-3xl sm:text-4xl md:text-5xl';

  return (
    <div className="flex flex-col items-center">
      {/* Unobstructed Organism Centerpiece Stage */}
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
        className={`relative flex items-center justify-center select-none transition-all duration-700 ease-out ${scaleClass}`}
      >
        {/* Real-Time Procedural ORB Canvas (Original | Celestial Jelly | Living Bloom) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        />

        {/* Interactive Radial Time Scrubber (Progressive Disclosure when Idle) */}
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
        className="relative z-30 mt-3 sm:mt-4 flex flex-col items-center justify-center text-center px-6"
      >
        {status === 'completed' ? (
          <div className="flex flex-col items-center gap-2.5 animate-fade-in">
            <span className="text-xs font-medium tracking-wide text-[#2FE8FF]">
              {scene.name} · {durationMinutes}m {sessionLabel || 'Deep work'}
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight">
              {scene.completionPhrase}
            </h2>
            <div className="mt-1 flex items-center gap-3">
              <AuraButton
                variant="secondary"
                size="md"
                reducedMotion={reducedMotion}
                onClick={onStartBreak}
              >
                Take a break
              </AuraButton>
              <AuraButton
                variant="primary"
                size="md"
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
              <div className="mt-1.5 min-h-[24px] flex items-center justify-center">
                {isEditingLabel ? (
                  <input
                    ref={labelInputRef}
                    type="text"
                    aria-label="Session intention"
                    value={sessionLabel}
                    onChange={(e) => onChangeSessionLabel(e.target.value)}
                    onBlur={() => setIsEditingLabel(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setIsEditingLabel(false);
                      }
                    }}
                    placeholder="What are you focusing on?"
                    className="bg-transparent border-b border-[#2FE8FF]/60 text-center text-xs sm:text-sm font-medium text-[#F5F6FF] placeholder:text-[#A3A1BA]/60 focus:outline-none px-2 py-0.5 w-48"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingLabel(true)}
                    title="Click to edit session focus"
                    className="text-xs sm:text-sm font-normal text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors px-2.5 py-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-[#2FE8FF] cursor-pointer"
                  >
                    {sessionLabel.trim() || 'Deep work'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
