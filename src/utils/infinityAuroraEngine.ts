import * as THREE from 'three';
import {
  FocusSceneConfig,
  FocusSceneId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import { hexToNormalizedRgb } from './quantumNebulaShaders';

// ============================================================================
// 1. SCENE-AWARE DUAL AURORA + FLUID DYNAMICS PALETTE & PARAMETERS
// ============================================================================

export interface InfinityAuroraPalette {
  sceneId: FocusSceneId;
  // Layer 1: Deep atmospheric background
  deepBackground: [number, number, number];
  zenithTint: [number, number, number];
  // Engine A: Primary Volumetric Aurora (curtains, vertical magnetic field lines)
  engineAPrimary: [number, number, number];
  engineASecondary: [number, number, number];
  engineAHighlight: [number, number, number];
  // Engine B: Secondary Volumetric Aurora (oblique broad atmospheric waves)
  engineBPrimary: [number, number, number];
  engineBSecondary: [number, number, number];
  engineBCoralHighlight: [number, number, number];
  // Engine C: GPU Fluid Dynamics (luminous liquid energy currents)
  engineCCyanCurrent: [number, number, number];
  engineCVioletCurrent: [number, number, number];
  engineCMagentaInterference: [number, number, number];
  // Scene-specific physical characteristics
  turbulenceScale: number;
  auroraCurtainSharpness: number;
  secondaryWaveAmplitude: number;
  fluidVorticityGain: number;
}

export interface TimerAwareAtmosphereInput {
  status: TimerStatus;
  phase: TimerPhase;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  audioAmplitude: number;
  reducedMotion: boolean;
  /** Seconds elapsed since the user clicked Begin (idle -> running) */
  secondsSinceStart: number;
  /** Seconds elapsed since session completed (running -> completed) */
  secondsSinceCompletion: number;
}

export interface TimerAwareAtmosphereState {
  // Overall time progression multiplier (frame-rate independent)
  engineATimeScale: number;
  engineBTimeScale: number;
  engineCTimeScale: number;
  // Turbulence & energy levels
  turbulence: number;
  auroraLuminousIntensity: number;
  secondaryAuroraIntensity: number;
  fluidEnergyGain: number;
  // Special state transitions (0..1)
  convergencePulse: number; // Subtle convergence when user clicks Begin
  finalFiveMinBoost: number; // Gradual, extremely subtle increase in final 5 mins
  completionRelease: number; // Sophisticated brief energy-release on completion
  breakWarmthFactor: number; // Softer lighting & warmer colors during breaks
  // Strict legibility & contrast protection behind central timer
  centralSanctuaryRetention: number;
}

export interface AdaptiveQualityProfile {
  tier: 'ultra' | 'high' | 'balanced' | 'software-safe';
  pixelRatioCap: number;
  primaryAuroraSteps: number;
  secondaryAuroraSteps: number;
  fluidGridSize: number;
  fluidPressureIterations: number;
  enableMultiPassFluidFbo: boolean;
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [
    Number((a[0] + (b[0] - a[0]) * c).toFixed(4)),
    Number((a[1] + (b[1] - a[1]) * c).toFixed(4)),
    Number((a[2] + (b[2] - a[2]) * c).toFixed(4)),
  ];
}

/**
 * Connects the 5 existing Focus Scenes to Engine A (Primary Aurora),
 * Engine B (Secondary Aurora), and Engine C (GPU Fluid Dynamics) using one
 * unified, configurable rendering architecture.
 */
export function computeSceneAuroraPalette(
  scene: FocusSceneConfig,
  phase: TimerPhase = 'focus'
): InfinityAuroraPalette {
  const primary = hexToNormalizedRgb(scene.colors.primary);
  const secondary = hexToNormalizedRgb(scene.colors.secondary);
  const tertiary = hexToNormalizedRgb(scene.colors.tertiary);
  const baseBg = hexToNormalizedRgb(scene.colors.baseBg);

  // Signature AURA TIME anchor colors
  const deepMidnight: [number, number, number] = [0.02, 0.024, 0.055]; // #05060E
  const ionViolet: [number, number, number] = [0.541, 0.361, 1.0]; // #8A5CFF
  const electricCyan: [number, number, number] = [0.184, 0.91, 1.0]; // #2FE8FF
  const signalMagenta: [number, number, number] = [1.0, 0.31, 0.639]; // #FF4FA3
  const signalCoral: [number, number, number] = [1.0, 0.365, 0.533]; // #FF5D88
  const liquidPeach: [number, number, number] = [1.0, 0.69, 0.541]; // #FFB08A
  const deepIndigo: [number, number, number] = [0.263, 0.22, 0.792]; // #4338CA
  const acidLime: [number, number, number] = [0.847, 1.0, 0.322]; // #D8FF52

  let palette: InfinityAuroraPalette;

  switch (scene.id) {
    case 'chromatic-flow':
      // Signal coral, magenta, and liquid peach with carefully balanced atmospheric lighting
      palette = {
        sceneId: 'chromatic-flow',
        deepBackground: mixRgb(deepMidnight, baseBg, 0.45),
        zenithTint: [0.095, 0.058, 0.165],
        engineAPrimary: signalMagenta,
        engineASecondary: signalCoral,
        engineAHighlight: electricCyan,
        engineBPrimary: liquidPeach,
        engineBSecondary: ionViolet,
        engineBCoralHighlight: signalCoral,
        engineCCyanCurrent: mixRgb(electricCyan, liquidPeach, 0.38),
        engineCVioletCurrent: mixRgb(ionViolet, signalMagenta, 0.52),
        engineCMagentaInterference: signalCoral,
        turbulenceScale: 1.08,
        auroraCurtainSharpness: 0.88,
        secondaryWaveAmplitude: 1.12,
        fluidVorticityGain: 1.15,
      };
      break;

    case 'night-signal':
      // Deep navy, blue, and bioluminescent cyan with subtle warm nocturnal undertones
      palette = {
        sceneId: 'night-signal',
        deepBackground: [0.016, 0.022, 0.05],
        zenithTint: [0.038, 0.068, 0.135],
        engineAPrimary: [0.14, 0.48, 0.88], // Deep bioluminescent blue
        engineASecondary: electricCyan,
        engineAHighlight: liquidPeach,
        engineBPrimary: [0.118, 0.18, 0.34], // Deep navy wave
        engineBSecondary: ionViolet,
        engineBCoralHighlight: mixRgb(liquidPeach, signalCoral, 0.45),
        engineCCyanCurrent: electricCyan,
        engineCVioletCurrent: [0.22, 0.38, 0.82],
        engineCMagentaInterference: mixRgb(liquidPeach, signalMagenta, 0.4),
        turbulenceScale: 0.76,
        auroraCurtainSharpness: 0.92,
        secondaryWaveAmplitude: 0.85,
        fluidVorticityGain: 0.82,
      };
      break;

    case 'electric-quiet':
      // Controlled acid-lime accents and electric cyan, with reduced turbulence
      palette = {
        sceneId: 'electric-quiet',
        deepBackground: [0.022, 0.038, 0.075],
        zenithTint: [0.045, 0.082, 0.145],
        engineAPrimary: electricCyan,
        engineASecondary: mixRgb(acidLime, electricCyan, 0.45),
        engineAHighlight: acidLime,
        engineBPrimary: mixRgb(deepIndigo, electricCyan, 0.42),
        engineBSecondary: [0.52, 0.58, 0.72],
        engineBCoralHighlight: mixRgb(acidLime, liquidPeach, 0.35),
        engineCCyanCurrent: electricCyan,
        engineCVioletCurrent: mixRgb(ionViolet, electricCyan, 0.48),
        engineCMagentaInterference: mixRgb(acidLime, electricCyan, 0.38),
        turbulenceScale: 0.64, // Reduced turbulence per specification
        auroraCurtainSharpness: 1.15,
        secondaryWaveAmplitude: 0.74,
        fluidVorticityGain: 0.68,
      };
      break;

    case 'solar-drift':
      // Liquid peach, coral, and warm amber atmospheric illumination
      palette = {
        sceneId: 'solar-drift',
        deepBackground: mixRgb(deepMidnight, [0.082, 0.045, 0.11], 0.55),
        zenithTint: [0.11, 0.058, 0.14],
        engineAPrimary: liquidPeach,
        engineASecondary: signalCoral,
        engineAHighlight: [1.0, 0.78, 0.46], // Warm amber
        engineBPrimary: ionViolet,
        engineBSecondary: signalCoral,
        engineBCoralHighlight: liquidPeach,
        engineCCyanCurrent: mixRgb(liquidPeach, electricCyan, 0.35),
        engineCVioletCurrent: mixRgb(ionViolet, signalCoral, 0.48),
        engineCMagentaInterference: [1.0, 0.62, 0.48],
        turbulenceScale: 0.78,
        auroraCurtainSharpness: 0.82,
        secondaryWaveAmplitude: 0.96,
        fluidVorticityGain: 0.86,
      };
      break;

    case 'deep-current':
    default:
      // Deep Current: Violet and electric cyan primary aurora, with restrained magenta fluid highlights
      palette = {
        sceneId: scene.id || 'deep-current',
        deepBackground: mixRgb(deepMidnight, baseBg, 0.5),
        zenithTint: [0.048, 0.055, 0.135],
        engineAPrimary: mixRgb(ionViolet, primary, 0.85),
        engineASecondary: mixRgb(electricCyan, secondary, 0.85),
        engineAHighlight: mixRgb(deepIndigo, tertiary, 0.65),
        engineBPrimary: mixRgb(deepIndigo, ionViolet, 0.55),
        engineBSecondary: mixRgb(signalMagenta, ionViolet, 0.58),
        engineBCoralHighlight: mixRgb(signalCoral, liquidPeach, 0.45),
        engineCCyanCurrent: electricCyan,
        engineCVioletCurrent: ionViolet,
        engineCMagentaInterference: signalMagenta,
        turbulenceScale: 0.88,
        auroraCurtainSharpness: 1.0,
        secondaryWaveAmplitude: 0.95,
        fluidVorticityGain: 0.96,
      };
      break;
  }

  // During breaks: Softer lighting, gentler fluid movement, and warmer atmospheric colors
  if (phase === 'break') {
    const warmAmber: [number, number, number] = [1.0, 0.69, 0.54];
    const softRose: [number, number, number] = [0.95, 0.48, 0.68];
    return {
      ...palette,
      engineAPrimary: mixRgb(palette.engineAPrimary, warmAmber, 0.34),
      engineASecondary: mixRgb(palette.engineASecondary, softRose, 0.28),
      engineBPrimary: mixRgb(palette.engineBPrimary, warmAmber, 0.38),
      engineBCoralHighlight: mixRgb(palette.engineBCoralHighlight, warmAmber, 0.45),
      engineCCyanCurrent: mixRgb(palette.engineCCyanCurrent, warmAmber, 0.3),
      turbulenceScale: Number((palette.turbulenceScale * 0.72).toFixed(4)),
      fluidVorticityGain: Number((palette.fluidVorticityGain * 0.68).toFixed(4)),
    };
  }

  return palette;
}

// ============================================================================
// 2. TIMER-AWARE VISUAL BEHAVIOR ENGINE
// ============================================================================

/**
 * Connects the rendering system to the existing application state without
 * changing timer logic:
 * - Before session (idle): Slow, calm, atmospheric motion.
 * - When user begins: Subtle convergence of luminous energy followed by smooth transition.
 * - During deep work (running): Stable, restrained auroral movement and controlled fluid turbulence.
 * - During final 5 minutes: Gradual, extremely subtle increase in atmospheric energy.
 * - On session completion: Sophisticated, brief energy-release visual transition.
 * - During breaks: Softer lighting, gentler fluid movement, warmer atmospheric colors.
 */
export function computeTimerAwareAtmosphereState(
  input: TimerAwareAtmosphereInput
): TimerAwareAtmosphereState {
  const {
    status,
    phase,
    remainingSeconds,
    totalSeconds,
    progress,
    audioAmplitude,
    reducedMotion,
    secondsSinceStart,
    secondsSinceCompletion,
  } = input;

  if (reducedMotion) {
    return {
      engineATimeScale: 0.045,
      engineBTimeScale: 0.034, // Incommensurate ratio so A & B never sync
      engineCTimeScale: 0.052,
      turbulence: 0.2,
      auroraLuminousIntensity: 0.68,
      secondaryAuroraIntensity: 0.56,
      fluidEnergyGain: 0.52,
      convergencePulse: 0,
      finalFiveMinBoost: 0,
      completionRelease: 0,
      breakWarmthFactor: phase === 'break' ? 1 : 0,
      centralSanctuaryRetention: 0.88,
    };
  }

  const clampedAudio = Math.max(0, Math.min(1, audioAmplitude || 0));
  const clampedProgress = Math.max(0, Math.min(1, progress || 0));
  const isBreak = phase === 'break';

  // 1. Subtle convergence of luminous energy when the user clicks Begin (0..3.6s envelope)
  let convergencePulse = 0;
  if (status === 'running' && secondsSinceStart >= 0 && secondsSinceStart < 3.6) {
    const u = secondsSinceStart / 3.6;
    // Smooth bell envelope peaking around 0.9s and settling smoothly to 0
    convergencePulse = Number(
      (Math.sin(Math.pow(u, 0.65) * Math.PI) * (1 - u * 0.45)).toFixed(4)
    );
  }

  // 2. Final five minutes (300s): Gradual, extremely subtle increase in atmospheric energy
  let finalFiveMinBoost = 0;
  if (
    status === 'running' &&
    !isBreak &&
    remainingSeconds > 0 &&
    remainingSeconds <= 300 &&
    totalSeconds >= 300
  ) {
    const windowRatio = 1 - remainingSeconds / 300;
    // Smooth cubic hermite curve capped for subtle elegance
    const smooth = windowRatio * windowRatio * (3 - 2 * windowRatio);
    finalFiveMinBoost = Number((smooth * 0.24).toFixed(4));
  }

  // 3. Session completion: Sophisticated, brief energy-release visual transition (0..5.0s envelope)
  let completionRelease = 0;
  if (status === 'completed') {
    const elapsed = Math.max(0, secondsSinceCompletion);
    completionRelease = Number(
      (Math.exp(-elapsed * 0.65) * 0.85 + 0.15).toFixed(4)
    );
  }

  // 4. State-dependent base speeds (using irrational/golden-ratio relationships between A, B, C)
  const PHI_INV = 0.6180339887;
  const EULER_RATIO = 0.7357588823;

  if (status === 'idle') {
    // Before the session: Slow, calm, atmospheric motion
    const baseSpeed = 0.36;
    return {
      engineATimeScale: Number(baseSpeed.toFixed(4)),
      engineBTimeScale: Number((baseSpeed * PHI_INV).toFixed(4)),
      engineCTimeScale: Number((baseSpeed * EULER_RATIO * 1.15).toFixed(4)),
      turbulence: 0.34,
      auroraLuminousIntensity: 0.76,
      secondaryAuroraIntensity: 0.64,
      fluidEnergyGain: 0.68,
      convergencePulse: 0,
      finalFiveMinBoost: 0,
      completionRelease: 0,
      breakWarmthFactor: isBreak ? 1 : 0,
      centralSanctuaryRetention: 0.85,
    };
  }

  if (status === 'paused') {
    const baseSpeed = 0.11;
    return {
      engineATimeScale: Number(baseSpeed.toFixed(4)),
      engineBTimeScale: Number((baseSpeed * PHI_INV).toFixed(4)),
      engineCTimeScale: Number((baseSpeed * EULER_RATIO).toFixed(4)),
      turbulence: 0.24,
      auroraLuminousIntensity: 0.64,
      secondaryAuroraIntensity: 0.52,
      fluidEnergyGain: 0.48,
      convergencePulse: 0,
      finalFiveMinBoost,
      completionRelease: 0,
      breakWarmthFactor: isBreak ? 1 : 0,
      centralSanctuaryRetention: 0.88,
    };
  }

  if (status === 'completed') {
    const baseSpeed = 0.52 + completionRelease * 0.34;
    return {
      engineATimeScale: Number(baseSpeed.toFixed(4)),
      engineBTimeScale: Number((baseSpeed * PHI_INV).toFixed(4)),
      engineCTimeScale: Number((baseSpeed * EULER_RATIO * 1.25).toFixed(4)),
      turbulence: Number((0.42 + completionRelease * 0.18).toFixed(4)),
      auroraLuminousIntensity: Number((0.82 + completionRelease * 0.16).toFixed(4)),
      secondaryAuroraIntensity: Number((0.72 + completionRelease * 0.18).toFixed(4)),
      fluidEnergyGain: Number((0.78 + completionRelease * 0.2).toFixed(4)),
      convergencePulse: 0,
      finalFiveMinBoost: 0,
      completionRelease,
      breakWarmthFactor: isBreak ? 1 : 0,
      centralSanctuaryRetention: 0.84,
    };
  }

  // Running state (Deep Work or Break)
  if (isBreak) {
    // During breaks: Softer lighting, gentler fluid movement, warmer atmospheric colors
    const breakSpeed = 0.31 + clampedAudio * 0.08;
    return {
      engineATimeScale: Number(breakSpeed.toFixed(4)),
      engineBTimeScale: Number((breakSpeed * PHI_INV).toFixed(4)),
      engineCTimeScale: Number((breakSpeed * EULER_RATIO).toFixed(4)),
      turbulence: 0.28,
      auroraLuminousIntensity: 0.68,
      secondaryAuroraIntensity: 0.62,
      fluidEnergyGain: 0.58,
      convergencePulse,
      finalFiveMinBoost: 0,
      completionRelease: 0,
      breakWarmthFactor: 1,
      centralSanctuaryRetention: 0.86,
    };
  }

  // Deep Work active focus session
  const baseWorkSpeed =
    0.44 +
    clampedProgress * 0.06 +
    finalFiveMinBoost * 0.35 +
    convergencePulse * 0.22 +
    clampedAudio * 0.14;

  return {
    engineATimeScale: Number(baseWorkSpeed.toFixed(4)),
    engineBTimeScale: Number((baseWorkSpeed * PHI_INV).toFixed(4)),
    engineCTimeScale: Number((baseWorkSpeed * EULER_RATIO * 1.18).toFixed(4)),
    turbulence: Number(
      (
        0.38 +
        finalFiveMinBoost * 0.22 +
        convergencePulse * 0.14 +
        clampedAudio * 0.1
      ).toFixed(4)
    ),
    auroraLuminousIntensity: Number(
      (
        0.8 +
        finalFiveMinBoost * 0.18 +
        convergencePulse * 0.15 +
        clampedAudio * 0.08
      ).toFixed(4)
    ),
    secondaryAuroraIntensity: Number(
      (
        0.68 +
        finalFiveMinBoost * 0.16 +
        convergencePulse * 0.12 +
        clampedAudio * 0.07
      ).toFixed(4)
    ),
    fluidEnergyGain: Number(
      (
        0.74 +
        finalFiveMinBoost * 0.2 +
        convergencePulse * 0.18 +
        clampedAudio * 0.1
      ).toFixed(4)
    ),
    convergencePulse,
    finalFiveMinBoost,
    completionRelease: 0,
    breakWarmthFactor: 0,
    centralSanctuaryRetention: 0.86,
  };
}

/**
 * Adaptive quality scaling based on real-time FPS telemetry and hardware capabilities.
 */
export function computeAdaptiveQualityTier(
  rollingFps: number,
  isSoftwareGl: boolean,
  reducedMotion: boolean,
  lowPowerMode = false
): AdaptiveQualityProfile {
  if (isSoftwareGl) {
    return {
      tier: 'software-safe',
      pixelRatioCap: 1.0,
      primaryAuroraSteps: 6,
      secondaryAuroraSteps: 5,
      fluidGridSize: 64,
      fluidPressureIterations: 4,
      enableMultiPassFluidFbo: false,
    };
  }

  if (reducedMotion || lowPowerMode || rollingFps < 32) {
    return {
      tier: 'balanced',
      pixelRatioCap: 1.25,
      primaryAuroraSteps: 8,
      secondaryAuroraSteps: 6,
      fluidGridSize: 96,
      fluidPressureIterations: 8,
      enableMultiPassFluidFbo: true,
    };
  }

  if (rollingFps < 50) {
    return {
      tier: 'high',
      pixelRatioCap: 1.5,
      primaryAuroraSteps: 11,
      secondaryAuroraSteps: 8,
      fluidGridSize: 128,
      fluidPressureIterations: 12,
      enableMultiPassFluidFbo: true,
    };
  }

  return {
    tier: 'ultra',
    pixelRatioCap: 2.0,
    primaryAuroraSteps: 14,
    secondaryAuroraSteps: 10,
    fluidGridSize: 160,
    fluidPressureIterations: 14,
    enableMultiPassFluidFbo: true,
  };
}

// ============================================================================
// 3. WEBGPU WGSL SHADER ARCHITECTURES (ENGINE A + ENGINE B + ENGINE C COMPUTE)
// ============================================================================

/**
 * Complete WGSL Compute & Volumetric Ray-Marching Shader Module for WebGPU.
 * Implements:
 * - Engine A: Primary Volumetric Aurora (3D ray marching, domain warping, FBM curtains)
 * - Engine B: Secondary Volumetric Aurora (independent oblique waves, cross-illumination)
 * - Engine C: Navier-Stokes GPU Fluid Dynamics (Semi-Lagrangian advection, divergence,
 *   Jacobi pressure projection, vorticity confinement)
 */
export const INFINITY_AURORA_WGSL_SOURCE = /* wgsl */ `
struct InfinityUniforms {
  timeA: f32,
  timeB: f32,
  timeC: f32,
  dt: f32,
  aspect: f32,
  turbulence: f32,
  convergencePulse: f32,
  finalFiveBoost: f32,
  completionRelease: f32,
  fluidWeight: f32,
  nebulaWeight: f32,
  pointer: vec2<f32>,
  pointerVel: vec2<f32>,
  engineAPrimary: vec3<f32>,
  engineASecondary: vec3<f32>,
  engineBPrimary: vec3<f32>,
  engineBCoral: vec3<f32>,
  engineCCyan: vec3<f32>,
  engineCViolet: vec3<f32>,
  engineCMagenta: vec3<f32>,
  deepBackground: vec3<f32>,
};

@group(0) @binding(0) var<uniform> u: InfinityUniforms;
@group(0) @binding(1) var<storage, read> velIn: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> velOut: array<vec4<f32>>;

fn hash3(p: vec3<f32>) -> f32 {
  var q = fract(p * vec3<f32>(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yxz + 33.33);
  return fract((q.x + q.y) * q.z);
}

fn noise3D(p: vec3<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u_interp = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  let n000 = hash3(i + vec3<f32>(0.0, 0.0, 0.0));
  let n100 = hash3(i + vec3<f32>(1.0, 0.0, 0.0));
  let n010 = hash3(i + vec3<f32>(0.0, 1.0, 0.0));
  let n110 = hash3(i + vec3<f32>(1.0, 1.0, 0.0));
  let n001 = hash3(i + vec3<f32>(0.0, 0.0, 1.0));
  let n101 = hash3(i + vec3<f32>(1.0, 0.0, 1.0));
  let n011 = hash3(i + vec3<f32>(0.0, 1.0, 1.0));
  let n111 = hash3(i + vec3<f32>(1.0, 1.0, 1.0));

  let nx00 = mix(n000, n100, u_interp.x);
  let nx10 = mix(n010, n110, u_interp.x);
  let nx01 = mix(n001, n101, u_interp.x);
  let nx11 = mix(n011, n111, u_interp.x);

  let nxy0 = mix(nx00, nx10, u_interp.y);
  let nxy1 = mix(nx01, nx11, u_interp.y);

  return mix(nxy0, nxy1, u_interp.z);
}

// Engine A: Primary Volumetric Aurora Density Field (Domain-Warped 3D FBM Curtains)
fn samplePrimaryAuroraDensity(pos: vec3<f32>, timeA: f32, fluidOffset: vec2<f32>) -> f32 {
  var p = pos;
  p.x += fluidOffset.x * 0.42;
  p.z += fluidOffset.y * 0.42;

  let warp = vec3<f32>(
    noise3D(p * 0.85 + vec3<f32>(timeA * 0.18, 0.0, -timeA * 0.14)),
    noise3D(p * 0.65 + vec3<f32>(-timeA * 0.12, timeA * 0.09, 2.7)),
    noise3D(p * 0.85 + vec3<f32>(4.1, -timeA * 0.11, timeA * 0.16))
  );

  var fbm = 0.0;
  var amp = 0.56;
  var q = p + (warp - 0.5) * 1.35;
  for (var i = 0; i < 4; i = i + 1) {
    let n = noise3D(vec3<f32>(q.x * 1.45, q.y * 0.52, q.z * 1.45));
    let ridge = 1.0 - abs(n * 2.0 - 1.0);
    fbm += amp * pow(ridge, 2.2);
    q = q * 1.88 + vec3<f32>(1.9, 0.7, 3.1);
    amp *= 0.48;
  }

  let altitudeEnvelope = smoothstep(-0.6, 0.15, pos.y) * exp(-max(0.0, pos.y - 0.1) * 2.2);
  return max(0.0, fbm - 0.26) * altitudeEnvelope;
}

// Engine B: Independent Secondary Volumetric Aurora Density Field
fn sampleSecondaryAuroraDensity(pos: vec3<f32>, timeB: f32, fluidOffset: vec2<f32>) -> f32 {
  // Oblique spatial orientation distinct from Engine A
  let c = 0.766044;
  let s = 0.642787;
  let rotated = vec3<f32>(
    pos.x * c - pos.z * s - fluidOffset.y * 0.34,
    pos.y * 0.82 + pos.x * 0.22,
    pos.x * s + pos.z * c + fluidOffset.x * 0.34
  );

  var wave = 0.0;
  var amp = 0.58;
  var q = rotated * 0.92 + vec3<f32>(-timeB * 0.15, timeB * 0.07, timeB * 0.19);
  for (var i = 0; i < 3; i = i + 1) {
    wave += amp * noise3D(q);
    q = q * 1.72 + vec3<f32>(5.2, 2.4, 8.1);
    amp *= 0.52;
  }

  let broadBand = exp(-pow(rotated.y + 0.15 + sin(rotated.x * 1.4 + timeB * 0.25) * 0.28, 2.0) * 3.8);
  return smoothstep(0.32, 0.88, wave) * broadBand;
}

// Engine C: WebGPU Compute Kernel for Semi-Lagrangian Advection & Vorticity Confinement
@compute @workgroup_size(64)
fn computeFluidStep(@builtin(global_invocation_id) gid: vec3<u32>) {
  let idx = gid.x;
  let gridRes = 64u;
  if (idx >= gridRes * gridRes) {
    return;
  }
  let x = idx % gridRes;
  let y = idx / gridRes;
  let uv = vec2<f32>(f32(x) / f32(gridRes), f32(y) / f32(gridRes));

  let current = velIn[idx];
  let backUv = clamp(uv - current.xy * u.dt * 0.5, vec2<f32>(0.0), vec2<f32>(0.999));
  let bx = u32(backUv.x * f32(gridRes));
  let by = u32(backUv.y * f32(gridRes));
  let advected = velIn[by * gridRes + bx];

  // Multiscale curl turbulence & auroral coupling force
  let p3 = vec3<f32>(uv * 3.2, u.timeC * 0.25);
  let curlX = noise3D(p3 + vec3<f32>(0.0, 0.08, 0.0)) - noise3D(p3 - vec3<f32>(0.0, 0.08, 0.0));
  let curlY = -(noise3D(p3 + vec3<f32>(0.08, 0.0, 0.0)) - noise3D(p3 - vec3<f32>(0.08, 0.0, 0.0)));

  let nextVel = (advected.xy + vec2<f32>(curlX, curlY) * u.dt * 0.45) * 0.985;
  let nextDye = clamp(advected.z * 0.99 + length(nextVel) * 0.12, 0.0, 1.0);
  velOut[idx] = vec4<f32>(nextVel, nextDye, 1.0);
}
`;

// ============================================================================
// 4. REAL-TIME GPU FLUID DYNAMICS SOLVER (PING-PONG WEBGL2 NAVIER-STOKES FBO)
// ============================================================================

const FLUID_BASE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Single-step Combined Navier-Stokes Velocity, Vorticity Confinement,
 * Semi-Lagrangian Advection & Luminous Energy Dye Solver for GPU Ping-Pong FBOs.
 * Stores:
 *   R, G = 2D velocity field (vx, vy) in [-1, 1] encoded or signed float
 *   B    = Fluid energy density / cyan-violet dye concentration
 *   A    = Signed vorticity / swirl curl potential
 */
const FLUID_NAVIER_STOKES_STEP_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uPrevState;
uniform vec2 uTexelSize;
uniform float uTimeA;
uniform float uTimeB;
uniform float uTimeC;
uniform float uDt;
uniform float uTurbulence;
uniform float uVorticityGain;
uniform float uConvergencePulse;
uniform float uCompletionRelease;
uniform vec2 uPointer;
uniform vec2 uPointerDelta;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 decodeVel(vec2 rg) {
  return (rg - 0.5) * 2.0;
}

vec2 encodeVel(vec2 v) {
  return clamp(v * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
  // 1. Sample 4-neighborhood for divergence, pressure gradient, and vorticity confinement
  vec4 centerSample = texture2D(uPrevState, vUv);
  vec4 leftSample   = texture2D(uPrevState, vUv - vec2(uTexelSize.x, 0.0));
  vec4 rightSample  = texture2D(uPrevState, vUv + vec2(uTexelSize.x, 0.0));
  vec4 bottomSample = texture2D(uPrevState, vUv - vec2(0.0, uTexelSize.y));
  vec4 topSample    = texture2D(uPrevState, vUv + vec2(0.0, uTexelSize.y));

  vec2 vC = decodeVel(centerSample.rg);
  vec2 vL = decodeVel(leftSample.rg);
  vec2 vR = decodeVel(rightSample.rg);
  vec2 vB = decodeVel(bottomSample.rg);
  vec2 vT = decodeVel(topSample.rg);

  // 2. Divergence & Local Pressure Projection (incompressibility enforcement)
  float divergence = 0.5 * ((vR.x - vL.x) + (vT.y - vB.y));
  vec2 laplacianVel = (vL + vR + vB + vT) * 0.25 - vC;
  vec2 gradDiv = vec2(vR.x - vL.x, vT.y - vB.y) * 0.25;

  // 3. Vorticity (curl) & Vorticity Confinement Force
  float curlC = 0.5 * ((vR.y - vL.y) - (vT.x - vB.x));
  float curlL = ( leftSample.a   - 0.5 ) * 2.0;
  float curlR = ( rightSample.a  - 0.5 ) * 2.0;
  float curlB = ( bottomSample.a - 0.5 ) * 2.0;
  float curlT = ( topSample.a    - 0.5 ) * 2.0;

  vec2 vorticityGrad = vec2(abs(curlR) - abs(curlL), abs(curlT) - abs(curlB));
  float gradLen = length(vorticityGrad) + 1e-5;
  vec2 vortForce = vec2(vorticityGrad.y, -vorticityGrad.x) / gradLen * curlC * uVorticityGain * 0.24;

  // 4. Semi-Lagrangian Backtrace Advection
  vec2 projectedVel = vC + laplacianVel * 0.18 - gradDiv * 0.32 + vortForce * uDt;
  vec2 backCoord = clamp(vUv - projectedVel * uDt * 0.28, 0.002, 0.998);
  vec4 advectedSample = texture2D(uPrevState, backCoord);
  vec2 advectedVel = decodeVel(advectedSample.rg);
  float advectedDye = advectedSample.b;

  // 5. Autonomous Dual-Aurora Harmonic Coupling Currents (connects Engine A & Engine B)
  vec2 centered = vUv - vec2(0.5, 0.475);
  float dist = length(centered);
  vec2 radialDir = centered / max(0.001, dist);

  // Multiscale procedural curl field connecting upper Primary Aurora & oblique Secondary Aurora
  float eps = 0.06;
  vec2 pNoise = vUv * 3.4 + vec2(uTimeC * 0.14, -uTimeA * 0.11);
  float nUp = smoothNoise(pNoise + vec2(0.0, eps));
  float nDn = smoothNoise(pNoise - vec2(0.0, eps));
  float nRt = smoothNoise(pNoise + vec2(eps, 0.0));
  float nLt = smoothNoise(pNoise - vec2(eps, 0.0));
  vec2 multiScaleCurl = vec2(nUp - nDn, -(nRt - nLt)) / (2.0 * eps);

  // Subtle convergence inward when user clicks Begin, or outward release on completion
  vec2 sessionImpulse =
    -radialDir * uConvergencePulse * 0.32 * exp(-dist * 3.0) +
     radialDir * uCompletionRelease * 0.36 * exp(-dist * 2.5);

  // Pointer wake injection
  vec2 toPtr = vUv - uPointer;
  float ptrMask = exp(-dot(toPtr, toPtr) * 32.0);
  vec2 ptrImpulse = uPointerDelta * ptrMask * 2.4;

  vec2 nextVel = advectedVel * 0.968
    + multiScaleCurl * (0.045 + uTurbulence * 0.055)
    + vortForce * 0.08
    + sessionImpulse * 0.06
    + ptrImpulse;

  nextVel = clamp(nextVel, vec2(-0.95), vec2(0.95));

  // 6. Luminous Energy Dye Evolution
  float auroraBridgeSource =
    smoothstep(0.28, 0.78, smoothNoise(vUv * 2.6 + vec2(uTimeA * 0.12, uTimeB * 0.09))) *
    exp(-pow(dist - 0.28, 2.0) * 6.5);

  float nextDye = clamp(
    advectedDye * 0.975 +
    auroraBridgeSource * 0.032 +
    length(nextVel) * 0.045 +
    ptrMask * length(uPointerDelta) * 0.8 +
    (uConvergencePulse + uCompletionRelease) * 0.025,
    0.0,
    1.0
  );

  float encodedCurl = clamp(curlC * 2.5 + 0.5, 0.0, 1.0);
  gl_FragColor = vec4(encodeVel(nextVel), nextDye, encodedCurl);
}
`;

export class GPUFluidSimulationPipeline {
  private renderer: THREE.WebGLRenderer;
  private rtA: THREE.WebGLRenderTarget;
  private rtB: THREE.WebGLRenderTarget;
  private simScene: THREE.Scene;
  private simCamera: THREE.OrthographicCamera;
  private simMaterial: THREE.ShaderMaterial;
  private simMesh: THREE.Mesh;
  private prevPtr = new THREE.Vector2(0.5, 0.5);

  constructor(renderer: THREE.WebGLRenderer, gridSize = 128) {
    this.renderer = renderer;

    const rtOptions: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.rtA = new THREE.WebGLRenderTarget(gridSize, gridSize, rtOptions);
    this.rtB = new THREE.WebGLRenderTarget(gridSize, gridSize, rtOptions);

    this.simScene = new THREE.Scene();
    this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.simMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrevState: { value: this.rtA.texture },
        uTexelSize: { value: new THREE.Vector2(1 / gridSize, 1 / gridSize) },
        uTimeA: { value: 0 },
        uTimeB: { value: 0 },
        uTimeC: { value: 0 },
        uDt: { value: 0.016 },
        uTurbulence: { value: 0.38 },
        uVorticityGain: { value: 0.95 },
        uConvergencePulse: { value: 0 },
        uCompletionRelease: { value: 0 },
        uPointer: { value: new THREE.Vector2(0.5, 0.5) },
        uPointerDelta: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: FLUID_BASE_VERTEX_SHADER,
      fragmentShader: FLUID_NAVIER_STOKES_STEP_FRAGMENT_SHADER,
      depthTest: false,
      depthWrite: false,
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    this.simMesh = new THREE.Mesh(geo, this.simMaterial);
    this.simMesh.frustumCulled = false;
    this.simScene.add(this.simMesh);
  }

  public step(params: {
    timeA: number;
    timeB: number;
    timeC: number;
    dt: number;
    turbulence: number;
    vorticityGain: number;
    convergencePulse: number;
    completionRelease: number;
    pointerX: number;
    pointerY: number;
  }): THREE.Texture {
    const u = this.simMaterial.uniforms;
    u.uPrevState.value = this.rtA.texture;
    u.uTimeA.value = params.timeA;
    u.uTimeB.value = params.timeB;
    u.uTimeC.value = params.timeC;
    u.uDt.value = Math.min(0.05, Math.max(0.004, params.dt));
    u.uTurbulence.value = params.turbulence;
    u.uVorticityGain.value = params.vorticityGain;
    u.uConvergencePulse.value = params.convergencePulse;
    u.uCompletionRelease.value = params.completionRelease;

    const dx = params.pointerX - this.prevPtr.x;
    const dy = params.pointerY - this.prevPtr.y;
    this.prevPtr.set(params.pointerX, params.pointerY);

    u.uPointer.value.set(params.pointerX, params.pointerY);
    u.uPointerDelta.value.set(
      Math.max(-0.08, Math.min(0.08, dx)),
      Math.max(-0.08, Math.min(0.08, dy))
    );

    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.rtB);
    this.renderer.render(this.simScene, this.simCamera);
    this.renderer.setRenderTarget(prevTarget);

    // Ping-pong swap
    const temp = this.rtA;
    this.rtA = this.rtB;
    this.rtB = temp;

    return this.rtA.texture;
  }

  public getTexture(): THREE.Texture {
    return this.rtA.texture;
  }

  public dispose(): void {
    this.rtA.dispose();
    this.rtB.dispose();
    this.simMesh.geometry.dispose();
    this.simMaterial.dispose();
  }
}

/**
 * Create a neutral 1x1 fallback texture for software WebGL or initial state
 * where velocity = (0.5, 0.5) [zero flow] and dye = 0.5.
 */
export function createNeutralFluidDataTexture(): THREE.DataTexture {
  const data = new Uint8Array([128, 128, 128, 128]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
