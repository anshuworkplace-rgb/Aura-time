import React, { useEffect, useRef, useState } from 'react';
import {
  ChamberConfig,
  FocusImmersionMode,
  FocusSceneConfig,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import {
  SNAP_PRESET_MINUTES,
  formatRemainingTime,
  minutesToRadialFraction,
  radialFractionToMinutes,
} from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface LivingLensProps {
  scene: FocusSceneConfig;
  chamber: ChamberConfig;
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
}

export const LivingLens: React.FC<LivingLensProps> = ({
  scene,
  chamber,
  status,
  phase,
  remainingSeconds,
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

  const liveRef = useRef({
    scene,
    chamber,
    status,
    phase,
    progress,
    audioReactive,
    reducedMotion,
  });

  useEffect(() => {
    liveRef.current = {
      scene,
      chamber,
      status,
      phase,
      progress,
      audioReactive,
      reducedMotion,
    };
  }, [scene, chamber, status, phase, progress, audioReactive, reducedMotion]);

  useEffect(() => {
    if (isEditingLabel) {
      labelInputRef.current?.focus();
      labelInputRef.current?.select();
    }
  }, [isEditingLabel]);

  // Canvas 3D Refractive Liquid Lens Renderer
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

    // Internal liquid particles / droplets
    const droplets: CausticDroplet[] = Array.from({ length: 24 }, (_, idx) => ({
      x: Math.sin(idx * 2.1) * 0.55 * 180,
      y: Math.cos(idx * 1.7) * 0.55 * 180,
      r: 3 + (idx % 5) * 2.2,
      vx: (idx % 2 === 0 ? 1 : -1) * (0.14 + (idx % 3) * 0.08),
      vy: (idx % 3 === 0 ? 1 : -1) * (0.12 + (idx % 4) * 0.07),
      alpha: 0.25 + (idx % 4) * 0.14,
      hueShift: idx % 3,
    }));

    let animId = 0;
    let time = 0;
    let lastDraw = 0;

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
        const r = baseR + n1 + n2 + n3;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const render = (ts: number) => {
      if (document.hidden) {
        animId = requestAnimationFrame(render);
        return;
      }

      const p = liveRef.current;
      const minDelta = p.reducedMotion ? 500 : 28;
      if (ts - lastDraw < minDelta) {
        animId = requestAnimationFrame(render);
        return;
      }
      const dt = Math.min(0.1, (ts - lastDraw) / 1000 || 0.016);
      lastDraw = ts;

      const isPaused = p.status === 'paused';
      const isCompleted = p.status === 'completed';
      const isRunning = p.status === 'running';
      const isBreak = p.phase === 'break';

      const speedMult =
        p.reducedMotion || isPaused
          ? 0.04
          : isCompleted
          ? 1.25
          : isBreak
          ? p.scene.motion.flowSpeed * 0.55
          : isRunning
          ? p.scene.motion.flowSpeed
          : p.scene.motion.flowSpeed * 0.65;

      time += dt * speedMult;

      const bands =
        p.audioReactive && isRunning
          ? soundEngine.getAudioBands()
          : { bass: 0, mid: 0, treble: 0, overall: 0 };
      const audioAmp = bands.overall;

      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const lensRadius =
        204 +
        Math.sin(time * 1.4) * 5 +
        bands.bass * 18 +
        (isCompleted ? 14 : 0);

      const primaryHex = isBreak ? '#FFB08A' : p.scene.colors.primary;
      const secondaryHex = isBreak ? '#22E5A8' : p.scene.colors.secondary;

      ctx.save();
      if (isPaused) {
        ctx.filter = 'saturate(0.38) brightness(0.82)';
      }

      // 1. Wide Correlated Subsurface Aura (seamlessly bridges Orb and Background Fluid)
      const ambientGlow = ctx.createRadialGradient(
        cx,
        cy,
        lensRadius * 0.15,
        cx,
        cy,
        lensRadius * 1.46
      );
      ambientGlow.addColorStop(0, `${primaryHex}55`);
      ambientGlow.addColorStop(0.52, `${secondaryHex}33`);
      ambientGlow.addColorStop(0.82, `${p.scene.colors.tertiary}18`);
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
        audioAmp,
        bands.treble,
        0
      );
      ctx.clip();

      // Translucent Optical Glass Base (allows the 3D Quantum Fluid background to refract through)
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

      // 3. Correlated Internal Liquid Color Caustics (Screen Blending for Refracted Physics)
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
        primaryHex,
        'D8'
      );
      drawInternalCaustic(
        Math.sin(-orbitA * 0.75) * 64,
        Math.cos(orbitA * 0.9) * 56,
        188 + bands.mid * 28,
        secondaryHex,
        'CC'
      );
      drawInternalCaustic(
        Math.cos(orbitA * 0.5 + 2.1) * 48,
        Math.sin(orbitA * 1.1 + 1.4) * 60,
        175,
        p.scene.colors.tertiary,
        'BB'
      );
      // Chamber-coupled chromatic accent
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
      droplets.forEach((d) => {
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
            ? p.scene.colors.iridescent
            : d.hueShift === 1
            ? p.chamber.primaryHex
            : secondaryHex;
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

      // 5. Gentle Optical Depth Scrim (keeps numerals crisp while preserving orb-background correlation)
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
        audioAmp,
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
      rimStroke.addColorStop(0.5, `${primaryHex}66`);
      rimStroke.addColorStop(1, `${secondaryHex}66`);
      ctx.strokeStyle = rimStroke;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 8. Progress Refraction Arc around the Lens Perimeter when Running / Paused
      if (p.status === 'running' || p.status === 'paused') {
        const progressArcRadius = lensRadius + 16;
        const startAng = -Math.PI / 2;
        const remainingRatio = Math.max(0.01, 1 - p.progress);
        const endAng = startAng + Math.PI * 2 * remainingRatio;

        ctx.strokeStyle = 'rgba(245, 246, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, progressArcRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = secondaryHex;
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
      onPointerLeave={() => setIsLensHovered(false)}
      data-testid="living-lens-container"
      data-timer-status={status}
      className={`relative flex items-center justify-center select-none transition-all duration-700 ease-out ${scaleClass}`}
    >
      {/* Refractive 3D Liquid Lens Canvas (Centered behind numerals) */}
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
              className={`font-display font-semibold tracking-tight text-[#F5F6FF] tabular-nums leading-none drop-shadow-[0_4px_24px_rgba(7,8,18,0.65)] transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#2FE8FF] rounded-2xl cursor-pointer ${numeralSizeClass}`}
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
