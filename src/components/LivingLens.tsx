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
    progress,
    audioReactive,
    reducedMotion,
  });

  useEffect(() => {
    liveRef.current = {
      scene,
      chamber,
      status,
      progress,
      audioReactive,
      reducedMotion,
    };
  }, [scene, chamber, status, progress, audioReactive, reducedMotion]);

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
      x: (Math.sin(idx * 2.1) * 0.55) * 180,
      y: (Math.cos(idx * 1.7) * 0.55) * 180,
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
      phaseOffset = 0
    ) => {
      ctx.beginPath();
      const steps = 90;
      for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        const n1 =
          Math.sin(theta * 3 + t * 1.3 + phaseOffset) *
          (9 * elasticity + amp * 14);
        const n2 =
          Math.cos(theta * 4 - t * 0.95 + phaseOffset) *
          (6 * elasticity + amp * 8);
        const n3 =
          Math.sin(theta * 2 + t * 0.6) * (5 * elasticity);
        const r = baseR + n1 + n2 + n3;
        const x = cx + Math.cos(theta) * r;
        const y = cy + Math.sin(theta) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const render = (ts: number) => {
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

      const speedMult =
        p.reducedMotion || isPaused
          ? 0.04
          : isCompleted
          ? 1.25
          : isRunning
          ? p.scene.motion.flowSpeed
          : p.scene.motion.flowSpeed * 0.65;

      time += dt * speedMult;

      const audioAmp =
        p.audioReactive && isRunning ? soundEngine.getAudioAmplitude() : 0;

      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const lensRadius =
        204 +
        Math.sin(time * 1.4) * 5 +
        audioAmp * 16 +
        (isCompleted ? 14 : 0);

      ctx.save();
      if (isPaused) {
        ctx.filter = 'saturate(0.38) brightness(0.82)';
      }

      // 1. Subsurface Ambient Refraction Aura behind the Lens
      const ambientGlow = ctx.createRadialGradient(
        cx,
        cy,
        lensRadius * 0.25,
        cx,
        cy,
        lensRadius * 1.42
      );
      ambientGlow.addColorStop(0, `${p.scene.colors.primary}44`);
      ambientGlow.addColorStop(0.5, `${p.scene.colors.secondary}22`);
      ambientGlow.addColorStop(1, 'rgba(7, 8, 18, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, lensRadius * 1.42, 0, Math.PI * 2);
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
        0
      );
      ctx.clip();

      // Deep Internal Glass Base
      const baseGrad = ctx.createRadialGradient(
        cx - 40,
        cy - 50,
        20,
        cx,
        cy,
        lensRadius * 1.1
      );
      baseGrad.addColorStop(0, '#191530');
      baseGrad.addColorStop(0.65, '#0B0D1C');
      baseGrad.addColorStop(1, '#070812');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, size, size);

      // 3. Internal Iridescent Liquid Color Blobs (Screen Blending for Refracted Physics)
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
        const g = ctx.createRadialGradient(bx, by, 8, bx, by, blobR);
        g.addColorStop(0, `${hexColor}${alphaHex}`);
        g.addColorStop(0.55, `${hexColor}44`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, blobR, 0, Math.PI * 2);
        ctx.fill();
      };

      const orbitA = time * 0.9;
      drawInternalCaustic(
        Math.cos(orbitA) * 68,
        Math.sin(orbitA * 0.8) * 58,
        165 + audioAmp * 32,
        p.scene.colors.primary,
        'CC'
      );
      drawInternalCaustic(
        Math.sin(-orbitA * 0.75) * 76,
        Math.cos(orbitA * 0.9) * 64,
        155 + audioAmp * 25,
        p.scene.colors.secondary,
        'BB'
      );
      drawInternalCaustic(
        Math.cos(orbitA * 0.5 + 2.1) * 54,
        Math.sin(orbitA * 1.1 + 1.4) * 70,
        140,
        p.scene.colors.tertiary,
        'AA'
      );
      // Chamber-coupled chromatic accent
      drawInternalCaustic(
        Math.sin(orbitA * 0.6 - 1.2) * 82,
        Math.cos(orbitA * 0.5 + 0.8) * 48,
        130,
        p.chamber.primaryHex,
        '88'
      );

      // 4. Chamber-Specific Material Physics inside the Lens
      const effect = p.chamber.materialEffect;
      if (effect === 'harmonic-rings' || effect === 'droplets') {
        const ringCount = effect === 'droplets' ? 4 : 3;
        for (let rIdx = 0; rIdx < ringCount; rIdx++) {
          const ripplePhase = ((time * 0.35 + rIdx / ringCount) % 1);
          const rr = 30 + ripplePhase * (lensRadius * 0.85);
          ctx.strokeStyle =
            effect === 'droplets'
              ? `rgba(47, 232, 255, ${(1 - ripplePhase) * 0.28})`
              : `rgba(216, 255, 82, ${(1 - ripplePhase) * 0.24})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Liquid particles / droplets / orbital dust
      droplets.forEach((d) => {
        if (!p.reducedMotion && !isPaused) {
          d.x += d.vx * (isCompleted ? 2.4 : 1);
          d.y += d.vy * (isCompleted ? 2.4 : 1);
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
            : p.scene.colors.secondary;
        ctx.fillStyle = dotColor;
        ctx.globalAlpha = isCompleted
          ? Math.min(0.95, d.alpha * 2)
          : d.alpha * 0.7;
        ctx.beginPath();
        ctx.arc(
          cx + d.x,
          cy + d.y,
          isCompleted ? d.r * 1.35 : d.r,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 5. Central Optical Depth Scrim so Typography is Always Razor-Sharp (WCAG AAA)
      ctx.globalCompositeOperation = 'source-over';
      const centerScrim = ctx.createRadialGradient(
        cx,
        cy,
        15,
        cx,
        cy,
        lensRadius * 0.82
      );
      centerScrim.addColorStop(0, 'rgba(7, 8, 18, 0.72)');
      centerScrim.addColorStop(0.65, 'rgba(7, 8, 18, 0.42)');
      centerScrim.addColorStop(1, 'rgba(7, 8, 18, 0.0)');
      ctx.fillStyle = centerScrim;
      ctx.fillRect(0, 0, size, size);

      // 6. Specular 3D Glass Rim Highlights (Top-Left Fresnel & Bottom-Right Caustic)
      const topSpecular = ctx.createLinearGradient(
        cx - lensRadius,
        cy - lensRadius,
        cx + lensRadius * 0.4,
        cy + lensRadius * 0.4
      );
      topSpecular.addColorStop(0, 'rgba(245, 246, 255, 0.34)');
      topSpecular.addColorStop(0.28, 'rgba(47, 232, 255, 0.08)');
      topSpecular.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = topSpecular;
      ctx.fillRect(0, 0, size, size);

      ctx.restore(); // End Lens Clip

      // 7. Refracted Outer Glass Rim Contour
      traceLensContour(
        cx,
        cy,
        lensRadius,
        time,
        p.scene.motion.elasticity,
        audioAmp,
        0
      );
      const rimStroke = ctx.createLinearGradient(
        cx - lensRadius,
        cy - lensRadius,
        cx + lensRadius,
        cy + lensRadius
      );
      rimStroke.addColorStop(0, 'rgba(245, 246, 255, 0.65)');
      rimStroke.addColorStop(0.5, `${p.scene.colors.primary}88`);
      rimStroke.addColorStop(1, `${p.scene.colors.secondary}99`);
      ctx.strokeStyle = rimStroke;
      ctx.lineWidth = 2.2;
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

        ctx.strokeStyle = p.scene.colors.secondary;
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

  // Radial Time Scrubber Pointer Math
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
    const onMove = (e: MouseEvent) => {
      updateDurationFromPointer(e.clientX, e.clientY);
    };
    const onUp = () => {
      setIsDraggingScrubber(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
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
      ? 'w-[380px] h-[380px] sm:w-[500px] sm:h-[500px] md:w-[560px] md:h-[560px]'
      : 'w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] md:w-[520px] md:h-[520px]';

  const numeralSizeClass =
    timerTextScale === 'monumental'
      ? 'text-7xl sm:text-8xl md:text-[6.5rem]'
      : timerTextScale === 'large'
      ? 'text-6xl sm:text-7xl md:text-[5.5rem]'
      : 'text-5xl sm:text-6xl md:text-7xl';

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsLensHovered(true)}
      onMouseLeave={() => setIsLensHovered(false)}
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
          className="absolute inset-0 w-full h-full overflow-visible z-20"
          aria-label="Radial Duration Scrubber (15 to 120 minutes)"
        >
          {/* Interactive Ring Track */}
          <circle
            cx={scrubCenter}
            cy={scrubCenter}
            r={scrubRadius}
            fill="none"
            stroke="rgba(245, 246, 255, 0.14)"
            strokeWidth={14}
            className="cursor-pointer"
            onMouseDown={(e) => {
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
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingScrubber(true);
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <circle
              cx={handleX}
              cy={handleY}
              r={11}
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
              <button
                type="button"
                onClick={onStartBreak}
                className="px-5 py-2.5 rounded-full text-xs font-medium text-[#F5F6FF] bg-white/10 hover:bg-white/18 border border-white/15 transition-all whitespace-nowrap"
              >
                Take a break
              </button>
              <button
                type="button"
                onClick={onStartAgain}
                style={{ backgroundColor: scene.colors.primary }}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#070812] hover:brightness-110 transition-all shadow-lg whitespace-nowrap"
              >
                Start again
              </button>
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
              className={`font-display font-semibold tracking-tight text-[#F5F6FF] tabular-nums leading-none drop-shadow-[0_4px_24px_rgba(7,8,18,0.65)] transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[#2FE8FF] rounded-2xl ${numeralSizeClass}`}
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
                    className="text-sm font-medium text-[#F5F6FF]/85 hover:text-[#F5F6FF] transition-colors px-3 py-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-[#2FE8FF]"
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
