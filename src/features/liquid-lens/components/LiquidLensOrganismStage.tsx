import React, { useEffect, useRef } from 'react';
import type {
  LiquidLensMode,
  LiquidLensSessionStatus,
  LiquidLensSoundscapeEnvironment,
  StillnessSettlingSnapshot,
  SynchronizedBreathingSnapshot,
} from '../types/liquidLens.types';

export interface LiquidLensOrganismStageProps {
  mode: LiquidLensMode;
  status: LiquidLensSessionStatus;
  remainingSeconds: number;
  targetDurationSeconds: number;
  breathingSnapshot: SynchronizedBreathingSnapshot;
  stillnessSnapshot: StillnessSettlingSnapshot;
  activeEnvironment: LiquidLensSoundscapeEnvironment;
  isAudioPlaying: boolean;
  ambienceVolume: number;
  harmonicVolume: number;
  reducedMotion?: boolean;
  onPrimaryAction?: () => void;
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [47, 232, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Isolated Liquid Lens fluid-glass optical canvas organism.
 * Synchronizes physical expansion, geometric stability, caustic refraction, and luminous intensity
 * directly with the active Breathe / Stillness / Soundscape state.
 */
export const LiquidLensOrganismStage: React.FC<LiquidLensOrganismStageProps> = ({
  mode,
  status,
  remainingSeconds,
  targetDurationSeconds,
  breathingSnapshot,
  stillnessSnapshot,
  activeEnvironment,
  isAudioPlaying,
  ambienceVolume,
  harmonicVolume,
  reducedMotion = false,
  onPrimaryAction,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    mode,
    status,
    breathingSnapshot,
    stillnessSnapshot,
    activeEnvironment,
    isAudioPlaying,
    ambienceVolume,
    harmonicVolume,
    reducedMotion,
  });

  useEffect(() => {
    stateRef.current = {
      mode,
      status,
      breathingSnapshot,
      stillnessSnapshot,
      activeEnvironment,
      isAudioPlaying,
      ambienceVolume,
      harmonicVolume,
      reducedMotion,
    };
  }, [
    mode,
    status,
    breathingSnapshot,
    stillnessSnapshot,
    activeEnvironment,
    isAudioPlaying,
    ambienceVolume,
    harmonicVolume,
    reducedMotion,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let timePhase = 0;
    let smoothedExpansion = 0.35;
    let smoothedLuminous = 0.55;
    let smoothedRipple = 0.25;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(280, Math.floor(rect.width));
      const height = Math.max(280, Math.floor(rect.height));
      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      const current = stateRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);

      // Compute target physical parameters based on mode & session status
      let targetExpansion = 0.35;
      let targetLuminous = 0.55;
      let targetRipple = 0.22;

      if (current.mode === 'breathe') {
        if (current.status === 'running' || current.status === 'paused') {
          targetExpansion = current.breathingSnapshot.expansion;
          targetLuminous = current.breathingSnapshot.luminousIntensity;
          targetRipple = current.breathingSnapshot.rippleAmplitude;
        } else {
          // Gentle idle resting pulse
          targetExpansion = current.reducedMotion
            ? 0.38
            : 0.35 + 0.08 * Math.sin(timePhase * 0.9);
          targetLuminous = 0.52;
          targetRipple = current.reducedMotion ? 0.05 : 0.2;
        }
      } else if (current.mode === 'stillness') {
        const settle = current.stillnessSnapshot;
        const motionAmt = current.reducedMotion ? 0 : settle.motionScale;
        targetExpansion =
          0.42 +
          motionAmt * 0.09 * Math.sin(timePhase * 0.65) * (1 - 0.65 * settle.settlingFactor);
        targetLuminous = settle.luminousScale;
        targetRipple = motionAmt * 0.28;
      } else {
        // Soundscape mode: acoustic refraction ripples
        const audioEnergy = current.isAudioPlaying
          ? 0.35 + 0.5 * current.ambienceVolume + 0.25 * current.harmonicVolume
          : 0.18;
        targetExpansion = current.reducedMotion
          ? 0.46
          : 0.44 + 0.07 * audioEnergy * Math.sin(timePhase * 1.15);
        targetLuminous = 0.48 + 0.36 * audioEnergy;
        targetRipple = current.reducedMotion ? 0.08 : 0.25 + 0.45 * audioEnergy;
      }

      const lerpRate = current.reducedMotion ? 0.18 : 0.09;
      smoothedExpansion += (targetExpansion - smoothedExpansion) * lerpRate;
      smoothedLuminous += (targetLuminous - smoothedLuminous) * lerpRate;
      smoothedRipple += (targetRipple - smoothedRipple) * lerpRate;

      const dtStep = current.reducedMotion
        ? 0.003
        : current.status === 'paused'
        ? 0.004
        : 0.016 * (0.45 + smoothedRipple * 1.1);
      timePhase += dtStep;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const [r1, g1, b1] = hexToRgbTuple(current.activeEnvironment.primaryHex);
      const [r2, g2, b2] = hexToRgbTuple(current.activeEnvironment.secondaryHex);

      const baseRadius = minDim * (0.21 + smoothedExpansion * 0.125);

      // 1. Deep atmospheric halo behind the Liquid Lens
      const outerHalo = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.2,
        cx,
        cy,
        baseRadius * 1.95
      );
      outerHalo.addColorStop(
        0,
        `rgba(${r1}, ${g1}, ${b1}, ${(0.22 * smoothedLuminous).toFixed(3)})`
      );
      outerHalo.addColorStop(
        0.52,
        `rgba(${r2}, ${g2}, ${b2}, ${(0.11 * smoothedLuminous).toFixed(3)})`
      );
      outerHalo.addColorStop(1, 'rgba(5, 7, 17, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.95, 0, Math.PI * 2);
      ctx.fill();

      // 2. Acoustic / Breathing concentric refraction rings
      const ringCount = current.mode === 'soundscape' ? 4 : 3;
      for (let i = 0; i < ringCount; i++) {
        const ringRatio = (i + 1) / ringCount;
        const ringRadius =
          baseRadius * (1.06 + ringRatio * 0.34 + smoothedExpansion * 0.08);
        const ringAlpha =
          (1 - ringRatio * 0.72) * (0.14 + 0.16 * smoothedLuminous);

        ctx.strokeStyle =
          i % 2 === 0
            ? `rgba(${r1}, ${g1}, ${b1}, ${ringAlpha.toFixed(3)})`
            : `rgba(${r2}, ${g2}, ${b2}, ${(ringAlpha * 0.85).toFixed(3)})`;
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Multi-layered Fluid-Glass Deformable Membrane
      const drawLiquidMembrane = (
        radiusScale: number,
        phaseShift: number,
        harmonicAmp: number,
        fillStyle: CanvasGradient | string,
        strokeStyle?: string,
        lineWidth = 1.5
      ) => {
        const segments = 96;
        ctx.beginPath();
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const wave1 =
            Math.sin(theta * 3 + timePhase * 1.3 + phaseShift) *
            harmonicAmp *
            0.55;
          const wave2 =
            Math.cos(theta * 5 - timePhase * 0.95 + phaseShift * 1.7) *
            harmonicAmp *
            0.3;
          const wave3 =
            Math.sin(theta * 2 + timePhase * 0.6) * harmonicAmp * 0.25;

          const r =
            baseRadius * radiusScale * (1 + (wave1 + wave2 + wave3) * 0.045);
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      const distortion = current.reducedMotion ? 0.08 : smoothedRipple;

      // Outer refraction shell
      const outerGlassGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.28,
        cy - baseRadius * 0.28,
        baseRadius * 0.08,
        cx,
        cy,
        baseRadius * 1.08
      );
      outerGlassGrad.addColorStop(
        0,
        `rgba(245, 246, 255, ${(0.22 * smoothedLuminous).toFixed(3)})`
      );
      outerGlassGrad.addColorStop(
        0.42,
        `rgba(${r1}, ${g1}, ${b1}, ${(0.24 * smoothedLuminous).toFixed(3)})`
      );
      outerGlassGrad.addColorStop(
        0.78,
        `rgba(${r2}, ${g2}, ${b2}, ${(0.18 * smoothedLuminous).toFixed(3)})`
      );
      outerGlassGrad.addColorStop(1, 'rgba(8, 12, 28, 0.42)');

      drawLiquidMembrane(
        1.0,
        0,
        distortion,
        outerGlassGrad,
        `rgba(${r1}, ${g1}, ${b1}, ${(0.35 + 0.35 * smoothedLuminous).toFixed(3)})`,
        1.6
      );

      // Inner caustic lens core
      const innerCoreGrad = ctx.createRadialGradient(
        cx - baseRadius * 0.18,
        cy - baseRadius * 0.22,
        baseRadius * 0.04,
        cx,
        cy,
        baseRadius * 0.78
      );
      innerCoreGrad.addColorStop(
        0,
        `rgba(255, 255, 255, ${(0.32 * smoothedLuminous).toFixed(3)})`
      );
      innerCoreGrad.addColorStop(
        0.5,
        `rgba(${r1}, ${g1}, ${b1}, ${(0.28 * smoothedLuminous).toFixed(3)})`
      );
      innerCoreGrad.addColorStop(
        1,
        `rgba(${r2}, ${g2}, ${b2}, 0.04)`
      );

      drawLiquidMembrane(
        0.76,
        1.4,
        distortion * 0.8,
        innerCoreGrad,
        `rgba(255, 255, 255, ${(0.18 * smoothedLuminous).toFixed(3)})`,
        1.1
      );

      // Specular optical arc highlight (top-left meniscus)
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        baseRadius * 0.88,
        -Math.PI * 0.78,
        -Math.PI * 0.22
      );
      ctx.strokeStyle = `rgba(255, 255, 255, ${(
        0.24 +
        0.28 * smoothedLuminous
      ).toFixed(3)})`;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const progressPercent =
    targetDurationSeconds > 0
      ? Math.min(
          100,
          Math.max(
            0,
            ((targetDurationSeconds - remainingSeconds) /
              targetDurationSeconds) *
              100
          )
        )
      : 0;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[460px] aspect-square mx-auto">
      <canvas
        ref={canvasRef}
        onClick={onPrimaryAction}
        role="button"
        tabIndex={0}
        aria-label="Liquid Lens interactive restorative organism"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPrimaryAction?.();
          }
        }}
        className="w-full h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FE8FF]/60 rounded-full"
      />

      {/* Centered Non-Intrusive Optical Readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        {mode === 'breathe' && (
          <>
            <span className="text-[11px] uppercase tracking-[0.28em] text-[#2FE8FF]/90 font-medium mb-1">
              {status === 'idle'
                ? 'Synchronized Breath'
                : status === 'completed'
                ? 'Cycle Complete'
                : breathingSnapshot.phaseLabel}
            </span>
            <div className="text-3xl sm:text-4xl font-light tracking-tight text-[#F5F6FF] tabular-nums">
              {status === 'running' || status === 'paused'
                ? `${breathingSnapshot.phaseRemainingSeconds}s`
                : formatClock(targetDurationSeconds)}
            </div>
            <p className="mt-2 max-w-[230px] text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
              {status === 'running'
                ? breathingSnapshot.instruction
                : status === 'paused'
                ? 'Session paused — resume when ready'
                : status === 'completed'
                ? 'Take a quiet breath before returning'
                : 'Tap the Liquid Lens or press Start to begin'}
            </p>
            {(status === 'running' || status === 'paused') && (
              <div className="mt-3 text-[11px] font-mono tracking-widest text-[#A3A1BA]/80 tabular-nums">
                {formatClock(remainingSeconds)} remaining
              </div>
            )}
          </>
        )}

        {mode === 'stillness' && (
          <>
            <span className="text-[11px] uppercase tracking-[0.26em] text-[#5EF2C4]/90 font-medium mb-1">
              {status === 'idle'
                ? 'Non-Goal Stillness'
                : stillnessSnapshot.calmStateLabel}
            </span>
            <div className="text-3xl sm:text-4xl font-light tracking-tight text-[#F5F6FF] tabular-nums">
              {formatClock(
                status === 'idle' ? targetDurationSeconds : remainingSeconds
              )}
            </div>
            <p className="mt-2 max-w-[240px] text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
              {status === 'running'
                ? 'Allow visual and cognitive momentum to settle naturally'
                : status === 'paused'
                ? 'Stillness paused'
                : 'Quiet recovery with zero performance pressure'}
            </p>
          </>
        )}

        {mode === 'soundscape' && (
          <>
            <span className="text-[11px] uppercase tracking-[0.26em] text-[#2FE8FF]/90 font-medium mb-1">
              {isAudioPlaying ? 'Live Acoustic Field' : 'Soundscape Ready'}
            </span>
            <div className="text-2xl sm:text-3xl font-light tracking-tight text-[#F5F6FF]">
              {activeEnvironment.name}
            </div>
            <p className="mt-1.5 max-w-[240px] text-xs sm:text-sm text-[#A3A1BA]">
              {activeEnvironment.tagline}
            </p>
          </>
        )}
      </div>

      {/* Subtle Progress Ring Indicator during active sessions */}
      {(status === 'running' || status === 'paused') &&
        mode !== 'soundscape' && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 px-3 py-1 rounded-full bg-[#090D1E]/75 border border-white/[0.07] text-[10px] tracking-[0.18em] uppercase text-[#A3A1BA]"
          >
            {Math.round(progressPercent)}% settled
          </div>
        )}
    </div>
  );
};
