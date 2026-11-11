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
  createJellyTentacles,
  generateBloomPetals,
  rgbaString,
  stepJellyTentacles,
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

    // Procedural Spring-Spline Tentacles for Celestial Jelly
    const jellyTentacles = createJellyTentacles(size / 2, 304);

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
    // Helper: Celestial Jelly Bell Umbrella Path
    // ------------------------------------------------------------------------
    const traceJellyBellPath = (
      bellCx: number,
      bellCy: number,
      rx: number,
      ry: number,
      marginPhase: number,
      ptrX: number | null,
      ptrY: number | null,
      scaleFactor = 1.0
    ) => {
      const sRx = rx * scaleFactor;
      const sRy = ry * scaleFactor;
      const domeSamples = 56;
      const marginSamples = 48;

      ctx.beginPath();
      // Upper umbrella dome (from left margin PI to right margin 0)
      for (let i = 0; i <= domeSamples; i++) {
        const u = i / domeSamples; // 0 .. 1
        const angle = Math.PI * (1 - u); // PI .. 0
        const domeProfile = Math.sin(angle);
        // Gentle skirt flare near the lower bell margin
        const skirtFlare = 1 + Math.pow(1 - domeProfile, 2.2) * 0.06;
        const rawX = bellCx + Math.cos(angle) * sRx * skirtFlare;
        const rawY =
          bellCy -
          Math.pow(domeProfile, 0.94) * sRy +
          Math.sin(angle * 4 + marginPhase) * 1.8 * domeProfile;

        let defX = 0;
        let defY = 0;
        if (ptrX !== null && ptrY !== null) {
          const dx = rawX - ptrX;
          const dy = rawY - ptrY;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 1) {
            const f = (1 - d / 130) * 11;
            defX = (dx / d) * f;
            defY = (dy / d) * f;
          }
        }

        if (i === 0) ctx.moveTo(rawX + defX, rawY + defY);
        else ctx.lineTo(rawX + defX, rawY + defY);
      }

      // Scalloped subumbrella margin (right +sRx*1.06 back to left -sRx*1.06)
      for (let j = 1; j <= marginSamples; j++) {
        const v = j / marginSamples; // 0 .. 1
        const xRatio = 1 - v * 2; // +1 .. -1
        const arch = Math.cos(xRatio * Math.PI * 0.5);
        const lappetWave =
          Math.sin(v * Math.PI * 10 + marginPhase) * 5.2 * arch +
          Math.cos(v * Math.PI * 5 - marginPhase * 0.7) * 2.8 * arch;
        const mx = bellCx + xRatio * sRx * 1.06;
        const my = bellCy + arch * (24 * scaleFactor) + lappetWave;
        ctx.lineTo(mx, my);
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
      // BRANCH 1: CELESTIAL JELLY — BIOLUMINESCENT PELAGIC ORGANISM
      // ======================================================================
      if (p.orbDesign === 'celestial-jelly') {
        const bellDyn = computeJellyBellContraction(time);
        const floatOffsetX = Math.sin(time * 0.42) * 8;
        const floatOffsetY =
          Math.cos(time * 0.55) * 7 - bellDyn.contraction * 11;
        const bellCx = cx + floatOffsetX;
        const bellCy = cy - 22 + floatOffsetY;
        const bellRx =
          (176 + bands.bass * 16) *
          bellDyn.radialScale *
          stateParams.expansionScale;
        const bellRy =
          (148 + bands.mid * 12) *
          bellDyn.verticalStretch *
          stateParams.expansionScale;

        // 1. Wide Pelagic Bioluminescent Halo bridging the ORB into the WebGL field
        const haloRadius = 296 + bellDyn.contraction * 14;
        const halo = ctx.createRadialGradient(
          bellCx,
          cy,
          16,
          bellCx,
          cy,
          haloRadius
        );
        halo.addColorStop(
          0,
          rgbaString(
            palette.primaryRgb,
            (0.42 + bellDyn.contraction * 0.08) * stateParams.luminescence
          )
        );
        halo.addColorStop(
          0.45,
          rgbaString(palette.secondaryRgb, 0.24 * stateParams.luminescence)
        );
        halo.addColorStop(
          0.76,
          rgbaString(palette.tertiaryRgb, 0.1 * stateParams.luminescence)
        );
        halo.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(bellCx, cy, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Step Spring-Spline Tentacles Physics
        stepJellyTentacles(
          jellyTentacles,
          bellCx,
          bellCy + 8,
          bellRx,
          bellDyn,
          time,
          dt,
          ptr.x,
          ptr.y,
          stateParams.motionSpeed
        );

        // Helper to draw a group of tentacles
        const renderTentacleGroup = (filterBack: boolean) => {
          for (const t of jellyTentacles) {
            const isBack = t.id % 2 === 0 && t.kind !== 'oral-arm';
            if (isBack !== filterBack) continue;

            const nodes = t.nodes;
            if (nodes.length < 2) continue;

            const tRgb =
              t.colorVariant === 0
                ? palette.secondaryRgb
                : t.colorVariant === 1
                ? palette.primaryRgb
                : palette.iridescentRgb;
            const tipNode = nodes[nodes.length - 1];

            const grad = ctx.createLinearGradient(
              nodes[0].x,
              nodes[0].y,
              tipNode.x,
              tipNode.y
            );
            const alphaScale = filterBack ? 0.48 : 0.82;
            grad.addColorStop(
              0,
              rgbaString(palette.primaryRgb, 0.55 * alphaScale)
            );
            grad.addColorStop(
              0.55,
              rgbaString(tRgb, 0.42 * alphaScale * stateParams.luminescence)
            );
            grad.addColorStop(
              1,
              rgbaString(palette.iridescentRgb, 0.12 * alphaScale)
            );

            ctx.strokeStyle = grad;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth =
              t.baseThickness *
              (t.kind === 'oral-arm'
                ? 1 + 0.2 * Math.sin(time * 1.4 + t.id)
                : 1);

            ctx.beginPath();
            ctx.moveTo(nodes[0].x, nodes[0].y);
            for (let k = 1; k < nodes.length - 1; k++) {
              const xc = (nodes[k].x + nodes[k + 1].x) * 0.5;
              const yc = (nodes[k].y + nodes[k + 1].y) * 0.5;
              ctx.quadraticCurveTo(nodes[k].x, nodes[k].y, xc, yc);
            }
            ctx.lineTo(tipNode.x, tipNode.y);
            ctx.stroke();

            // Oral arms get a delicate second ruffled translucent ribbon edge
            if (t.kind === 'oral-arm') {
              ctx.strokeStyle = rgbaString(
                palette.secondaryRgb,
                0.28 * stateParams.luminescence
              );
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              for (let k = 0; k < nodes.length; k++) {
                const ruffle =
                  Math.sin(k * 1.3 - time * 2.2 + t.id) * (6.5 - k * 0.35);
                const rx = nodes[k].x + ruffle;
                const ry = nodes[k].y;
                if (k === 0) ctx.moveTo(rx, ry);
                else ctx.lineTo(rx, ry);
              }
              ctx.stroke();
            }

            // Independently moving luminous nematocyst tip
            const tipGlow = ctx.createRadialGradient(
              tipNode.x,
              tipNode.y,
              0.5,
              tipNode.x,
              tipNode.y,
              8
            );
            tipGlow.addColorStop(
              0,
              rgbaString(palette.iridescentRgb, 0.85 * alphaScale)
            );
            tipGlow.addColorStop(0.5, rgbaString(tRgb, 0.45 * alphaScale));
            tipGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = tipGlow;
            ctx.beginPath();
            ctx.arc(tipNode.x, tipNode.y, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        // 3. Render Background Tentacles (behind subumbrella)
        renderTentacleGroup(true);

        // 4. Render Volumetric Bell Dome & Internal Bioluminescent World
        ctx.save();
        traceJellyBellPath(
          bellCx,
          bellCy,
          bellRx,
          bellRy,
          bellDyn.marginWavePhase,
          ptr.x,
          ptr.y,
          1.0
        );
        ctx.clip();

        // Subsurface Mesoglea Translucent Fill
        const domeGrad = ctx.createRadialGradient(
          bellCx,
          bellCy - bellRy * 0.45,
          14,
          bellCx,
          bellCy,
          bellRx * 1.15
        );
        domeGrad.addColorStop(
          0,
          rgbaString(
            palette.primaryRgb,
            0.46 * bellDyn.subsurfacePulse * stateParams.luminescence
          )
        );
        domeGrad.addColorStop(
          0.52,
          rgbaString(palette.secondaryRgb, 0.28 * stateParams.luminescence)
        );
        domeGrad.addColorStop(0.85, rgbaString(palette.tertiaryRgb, 0.22));
        domeGrad.addColorStop(
          1,
          rgbaString(palette.iridescentRgb, 0.38 * stateParams.luminescence)
        );
        ctx.fillStyle = domeGrad;
        ctx.fillRect(0, 0, size, size);

        // Internal Gonad / Manubrium Bioluminescent Core Rings
        ctx.globalCompositeOperation = 'screen';
        for (let ring = 0; ring < 3; ring++) {
          const coreR =
            (44 + ring * 22) * (0.9 + bellDyn.contraction * 0.16);
          const coreGrad = ctx.createRadialGradient(
            bellCx,
            bellCy - bellRy * 0.28,
            4,
            bellCx,
            bellCy - bellRy * 0.28,
            coreR
          );
          coreGrad.addColorStop(
            0,
            rgbaString(palette.iridescentRgb, 0.35 - ring * 0.08)
          );
          coreGrad.addColorStop(
            0.6,
            rgbaString(palette.secondaryRgb, 0.24 - ring * 0.05)
          );
          coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.ellipse(
            bellCx,
            bellCy - bellRy * 0.28,
            coreR * 1.15,
            coreR * 0.72,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        // 8 Radial Gastrovascular Bioluminescent Canals along the 3D bell dome
        const canalCount = 8;
        for (let c = 0; c < canalCount; c++) {
          const frac = (c / (canalCount - 1)) * 2 - 1; // -1 .. 1
          const pulseWave =
            0.5 + 0.5 * Math.sin(time * 2.1 - Math.abs(frac) * 2.0 + c);
          ctx.strokeStyle = rgbaString(
            c % 2 === 0 ? palette.secondaryRgb : palette.iridescentRgb,
            (0.18 + pulseWave * 0.24) * stateParams.luminescence
          );
          ctx.lineWidth = 1.45;
          ctx.beginPath();
          ctx.moveTo(
            bellCx + frac * 18,
            bellCy - bellRy * 0.88 + Math.abs(frac) * 5
          );
          ctx.bezierCurveTo(
            bellCx + frac * bellRx * 0.54,
            bellCy - bellRy * 0.82,
            bellCx + frac * bellRx * 0.92,
            bellCy - bellRy * 0.36,
            bellCx + frac * bellRx * 0.96,
            bellCy + Math.cos(frac * Math.PI * 0.5) * 18
          );
          ctx.stroke();
        }

        // Circulating internal bioluminescent organelles & caustic particles
        ctx.globalCompositeOperation = 'screen';
        for (const pt of particles) {
          if (!p.reducedMotion && p.status !== 'paused') {
            pt.x += pt.vx * stateParams.particleSpeed;
            pt.y +=
              (pt.vy - bellDyn.contraction * 0.22) * stateParams.particleSpeed;
            if (ptr.x !== null && ptr.y !== null) {
              const dx = bellCx + pt.x - ptr.x;
              const dy = bellCy - 20 + pt.y - ptr.y;
              const d = Math.hypot(dx, dy);
              if (d < 110 && d > 1) {
                pt.x += (dx / d) * 1.6;
                pt.y += (dy / d) * 1.6;
              }
            }
            if (Math.hypot(pt.x, pt.y) > 165) {
              pt.x *= -0.82;
              pt.y *= -0.82;
            }
          }
          const cRgb =
            pt.hueShift === 0
              ? palette.iridescentRgb
              : pt.hueShift === 1
              ? palette.secondaryRgb
              : palette.primaryRgb;
          ctx.fillStyle = rgbaString(
            cRgb,
            pt.alpha * (0.5 + 0.5 * Math.sin(time * 1.6 + pt.phase))
          );
          ctx.beginPath();
          ctx.arc(
            bellCx + pt.x * 0.85,
            bellCy - 28 + pt.y * 0.65,
            pt.r,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }

        ctx.restore(); // End Bell Clip

        // 5. Outer Fresnel Iridescent Bell Rim & Double Membrane Highlight
        traceJellyBellPath(
          bellCx,
          bellCy,
          bellRx,
          bellRy,
          bellDyn.marginWavePhase,
          ptr.x,
          ptr.y,
          1.0
        );
        const bellRimGrad = ctx.createLinearGradient(
          bellCx - bellRx,
          bellCy - bellRy,
          bellCx + bellRx,
          bellCy + 30
        );
        bellRimGrad.addColorStop(
          0,
          rgbaString(palette.iridescentRgb, 0.72 * stateParams.luminescence)
        );
        bellRimGrad.addColorStop(
          0.5,
          rgbaString(palette.secondaryRgb, 0.58 * stateParams.luminescence)
        );
        bellRimGrad.addColorStop(
          1,
          rgbaString(palette.primaryRgb, 0.64 * stateParams.luminescence)
        );
        ctx.strokeStyle = bellRimGrad;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Inner mesoglea membrane contour
        traceJellyBellPath(
          bellCx,
          bellCy + 4,
          bellRx,
          bellRy,
          bellDyn.marginWavePhase + 0.4,
          ptr.x,
          ptr.y,
          0.88
        );
        ctx.strokeStyle = rgbaString(palette.secondaryRgb, 0.24);
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 6. Render Foreground Tentacles & Ruffled Oral Arms
        renderTentacleGroup(false);

        // 7. Gentle Optical Depth Scrim behind central timer numerals
        const textScrim = ctx.createRadialGradient(cx, cy, 12, cx, cy, 155);
        textScrim.addColorStop(0, 'rgba(8, 10, 24, 0.44)');
        textScrim.addColorStop(0.65, 'rgba(8, 10, 24, 0.18)');
        textScrim.addColorStop(1, 'rgba(8, 10, 24, 0)');
        ctx.fillStyle = textScrim;
        ctx.beginPath();
        ctx.arc(cx, cy, 155, 0, Math.PI * 2);
        ctx.fill();
      }

      // ======================================================================
      // BRANCH 2: LIVING BLOOM — EVOLVING BOTANICAL LIFE FORM
      // ======================================================================
      else if (p.orbDesign === 'living-bloom') {
        const bloomState = computeBloomCycleState(time, p.status, p.progress);

        // 1. Botanical Sanctuary Subsurface Aura bridging the Bloom into the WebGL field
        const bloomAuraRadius = 298 + bloomState.outerOpenness * 10;
        const bloomAura = ctx.createRadialGradient(
          cx,
          cy,
          16,
          cx,
          cy,
          bloomAuraRadius
        );
        bloomAura.addColorStop(
          0,
          rgbaString(palette.primaryRgb, 0.44 * stateParams.luminescence)
        );
        bloomAura.addColorStop(
          0.46,
          rgbaString(palette.secondaryRgb, 0.25 * stateParams.luminescence)
        );
        bloomAura.addColorStop(
          0.76,
          rgbaString(palette.tertiaryRgb, 0.11 * stateParams.luminescence)
        );
        bloomAura.addColorStop(1, 'rgba(7, 8, 18, 0)');
        ctx.fillStyle = bloomAura;
        ctx.beginPath();
        ctx.arc(cx, cy, bloomAuraRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. Render 4 Concentric Tiers of Individually Generated Asymmetric Petals
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const layersOrder: Array<ProceduralPetal['layer']> = [
          'outer',
          'mid',
          'inner',
          'crown',
        ];
        for (const layerName of layersOrder) {
          const openness =
            layerName === 'outer'
              ? bloomState.outerOpenness
              : layerName === 'mid'
              ? bloomState.midOpenness
              : layerName === 'inner'
              ? bloomState.innerOpenness
              : bloomState.innerOpenness * 0.92;
          const layerRot =
            layerName === 'outer'
              ? bloomState.corollaRotation * 0.65
              : layerName === 'mid'
              ? -bloomState.corollaRotation * 0.85
              : layerName === 'inner'
              ? bloomState.corollaRotation * 1.1
              : -bloomState.corollaRotation * 1.35;

          for (const petal of p.bloomPetals) {
            if (petal.layer !== layerName) continue;
            drawProceduralPetal(
              cx,
              cy,
              petal,
              openness * stateParams.expansionScale,
              layerRot,
              time,
              palette,
              ptr.x,
              ptr.y,
              stateParams.luminescence
            );
          }
        }
        ctx.restore();

        // 3. Intricate Botanical Receptacle Core & Glowing Stamen Filaments
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const stamenCount = p.bloomGrowth.stamenCount;
        for (let s = 0; s < stamenCount; s++) {
          const sAngle =
            (s / stamenCount) * Math.PI * 2 +
            bloomState.corollaRotation * 0.5 +
            Math.sin(time * 0.9 + s) * 0.05;
          const sLen =
            (54 + (s % 3) * 14) *
            (0.75 + bloomState.innerOpenness * 0.28) *
            (1 + bands.treble * 0.14);
          const ctrlAngle = sAngle + Math.sin(s * 1.7 + time) * 0.14;
          const sx = cx + Math.cos(sAngle) * sLen;
          const sy = cy + Math.sin(sAngle) * sLen;
          const cpx = cx + Math.cos(ctrlAngle) * (sLen * 0.55);
          const cpy = cy + Math.sin(ctrlAngle) * (sLen * 0.55);

          ctx.strokeStyle = rgbaString(
            s % 2 === 0 ? palette.secondaryRgb : palette.primaryRgb,
            0.34 * stateParams.luminescence
          );
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(sAngle) * 16, cy + Math.sin(sAngle) * 16);
          ctx.quadraticCurveTo(cpx, cpy, sx, sy);
          ctx.stroke();

          // Luminous pollen anther tip
          ctx.fillStyle = rgbaString(
            palette.iridescentRgb,
            (0.65 + 0.35 * Math.sin(time * 1.8 + s)) * stateParams.luminescence
          );
          ctx.beginPath();
          ctx.arc(sx, sy, s % 2 === 0 ? 2.4 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Nectary Core Glow
        const nectaryGrad = ctx.createRadialGradient(
          cx,
          cy,
          4,
          cx,
          cy,
          68 * bloomState.nectaryPulse
        );
        nectaryGrad.addColorStop(
          0,
          rgbaString(palette.iridescentRgb, 0.42 * stateParams.luminescence)
        );
        nectaryGrad.addColorStop(
          0.55,
          rgbaString(palette.primaryRgb, 0.26 * stateParams.luminescence)
        );
        nectaryGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nectaryGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 68, 0, Math.PI * 2);
        ctx.fill();

        // 4. Floating Pollen Spores & Drifting Botanical Dust
        for (const sp of particles) {
          if (!p.reducedMotion && p.status !== 'paused') {
            const angle = Math.atan2(sp.y, sp.x) + 0.004 * stateParams.particleSpeed;
            const rad =
              (Math.hypot(sp.x, sp.y) + 0.22 * stateParams.particleSpeed) % 225;
            sp.x = Math.cos(angle) * Math.max(24, rad);
            sp.y = Math.sin(angle) * Math.max(24, rad);

            if (ptr.x !== null && ptr.y !== null) {
              const dx = cx + sp.x - ptr.x;
              const dy = cy + sp.y - ptr.y;
              const d = Math.hypot(dx, dy);
              if (d < 120 && d > 1) {
                sp.x += (dx / d) * 1.8;
                sp.y += (dy / d) * 1.8;
              }
            }
          }

          const spRgb =
            sp.hueShift === 0
              ? palette.iridescentRgb
              : sp.hueShift === 1
              ? palette.secondaryRgb
              : palette.primaryRgb;
          const twinkle = 0.5 + 0.5 * Math.sin(time * 1.9 + sp.phase);
          ctx.fillStyle = rgbaString(
            spRgb,
            sp.alpha * twinkle * stateParams.luminescence
          );
          ctx.beginPath();
          ctx.arc(cx + sp.x, cy + sp.y, sp.r * 0.95, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // 5. Gentle Optical Scrim directly behind the countdown numerals
        const bloomScrim = ctx.createRadialGradient(cx, cy, 12, cx, cy, 148);
        bloomScrim.addColorStop(0, 'rgba(8, 10, 24, 0.48)');
        bloomScrim.addColorStop(0.65, 'rgba(8, 10, 24, 0.2)');
        bloomScrim.addColorStop(1, 'rgba(8, 10, 24, 0)');
        ctx.fillStyle = bloomScrim;
        ctx.beginPath();
        ctx.arc(cx, cy, 148, 0, Math.PI * 2);
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
        const progressArcRadius = 224;
        const startAng = -Math.PI / 2;
        const remainingRatio = Math.max(0.01, 1 - p.progress);
        const endAng = startAng + Math.PI * 2 * remainingRatio;

        ctx.strokeStyle = 'rgba(245, 246, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, progressArcRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = palette.secondaryHex;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, progressArcRadius, startAng, endAng);
        ctx.stroke();

        // Luminous leading droplet
        const tx = cx + Math.cos(endAng) * progressArcRadius;
        const ty = cy + Math.sin(endAng) * progressArcRadius;
        ctx.fillStyle = '#F5F6FF';
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
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
      ? 'w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] md:w-[540px] md:h-[540px]'
      : 'w-[330px] h-[330px] sm:w-[450px] sm:h-[450px] md:w-[500px] md:h-[500px]';

  const numeralSizeClass =
    timerTextScale === 'monumental'
      ? 'text-7xl sm:text-8xl md:text-[6.5rem]'
      : timerTextScale === 'large'
      ? 'text-6xl sm:text-7xl md:text-[5.5rem]'
      : 'text-5xl sm:text-6xl md:text-7xl';

  return (
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
                  fill={isCurrentSnap ? '#2FE8FF' : 'rgba(245, 246, 255, 0.45)'}
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

      {/* Interior Layer: Timer Numerals, Session Label, or Completion Bloom */}
      <div className="relative z-30 flex flex-col items-center justify-center text-center px-8">
        {status === 'completed' ? (
          /* Restrained, Emotional Completion Experience inside the Lens */
          <div className="flex flex-col items-center gap-4 animate-fade-in">
            <span className="text-xs font-medium tracking-widest uppercase text-[#2FE8FF]">
              {scene.name}
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F6FF] tracking-tight">
              {scene.completionPhrase}
            </h2>
            <p className="text-xs text-[#A3A1BA]">
              {durationMinutes} minutes · {sessionLabel || 'Deep work'}
            </p>
            <div className="mt-2 flex items-center gap-3">
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
            {/* Subtle non-color state signal when Paused or on Break */}
            {(status === 'paused' || phase === 'break') && (
              <span className="text-[11px] font-medium tracking-widest uppercase text-[#FFB08A] mb-1.5">
                {status === 'paused' ? 'Paused' : 'Restorative Break'}
              </span>
            )}

            {/* Striking Timer Numerals */}
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
              className={`font-display font-semibold tracking-tight text-[#F5F6FF] tabular-nums leading-none drop-shadow-[0_4px_24px_rgba(7,8,18,0.75)] transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#2FE8FF] rounded-2xl cursor-pointer ${numeralSizeClass}`}
            >
              {formatRemainingTime(remainingSeconds)}
            </button>

            {/* Simple Session Label ("Deep work") -> Inline 1-line text input when clicked */}
            {immersionMode !== 'deep' && (
              <div className="mt-3.5 min-h-[28px] flex items-center justify-center">
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
                    placeholder="What are you making?"
                    className="bg-transparent border-b border-[#2FE8FF]/60 text-center text-sm font-medium text-[#F5F6FF] placeholder:text-[#A3A1BA]/60 focus:outline-none px-2 py-0.5 w-52"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingLabel(true)}
                    title="Click to rename session"
                    className="text-sm font-medium text-[#F5F6FF]/85 hover:text-[#F5F6FF] transition-colors px-3 py-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-[#2FE8FF] cursor-pointer"
                  >
                    {sessionLabel.trim() || 'What are you making?'}
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
