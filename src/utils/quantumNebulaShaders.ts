import { FocusSceneConfig, OrbDesignId, TimerStatus } from '../types/aura';
import { INFINITY_AURORA_WGSL_SOURCE } from './infinityAuroraEngine';

export interface NebulaSpectrum {
  violet: [number, number, number];
  cyan: [number, number, number];
  magenta: [number, number, number];
  deepSpace: [number, number, number];
}

export interface BackgroundMixPreset {
  id: 'fluid-dominant' | 'balanced-synthesis' | 'nebula-atmosphere';
  label: string;
  shortLabel: string;
  mix: number; // 0..1 (0 = GPU Fluid Dynamics, 1 = Dual Volumetric Aurora)
  description: string;
}

export const BACKGROUND_MIX_PRESETS: BackgroundMixPreset[] = [
  {
    id: 'fluid-dominant',
    label: 'GPU Fluid Dynamics',
    shortLabel: 'Fluid Stream',
    mix: 0.18,
    description:
      'Luminous Navier-Stokes liquid energy currents connecting both auroras',
  },
  {
    id: 'balanced-synthesis',
    label: 'Balanced Synthesis',
    shortLabel: 'Balanced Mix',
    mix: 0.52,
    description:
      'Harmonious Dual Volumetric Aurora × GPU Fluid Dynamics synthesis',
  },
  {
    id: 'nebula-atmosphere',
    label: 'Quantum Nebula',
    shortLabel: 'Nebula Cloud',
    mix: 0.85,
    description:
      'Deep ray-marched Primary & Secondary Volumetric Aurora curtains',
  },
];

export interface BackgroundMixWeights {
  mix: number;
  fluidPercentage: number;
  nebulaPercentage: number;
  fluidWeight: number;
  nebulaWeight: number;
  particleGain: number;
  flowVelocityMultiplier: number;
}

/**
 * Maps the active ORB design to its numeric shader coupling mode:
 * 0 = Original (Refractive Liquid Lens caustic rings)
 * 1 = Celestial Jelly (Pelagic bioluminescent propulsion ripples & downward wake)
 * 2 = Living Bloom (Radial botanical petal caustics & spiraling spore currents)
 */
export function orbDesignToShaderMode(
  orbDesign: OrbDesignId = 'original'
): number {
  if (orbDesign === 'celestial-jelly') return 1.0;
  if (orbDesign === 'living-bloom') return 2.0;
  return 0.0;
}

/**
 * Computes shader weights for blending Engine C (GPU Fluid Dynamics)
 * and Engines A & B (Dual Volumetric Aurora) from a normalized 0..1 mix value.
 */
export function computeBackgroundMixWeights(
  backgroundMix = 0.52
): BackgroundMixWeights {
  const clamped = Math.max(
    0,
    Math.min(1, Number.isFinite(backgroundMix) ? backgroundMix : 0.52)
  );
  const nebulaPercentage = Math.round(clamped * 100);
  const fluidPercentage = 100 - nebulaPercentage;

  // Non-linear energy-preserving crossfade curves kept subordinate to the central ORB
  const fluidWeight = Number(
    (1.28 - Math.pow(clamped, 1.25) * 1.02).toFixed(3)
  );
  const nebulaWeight = Number(
    (0.22 + Math.pow(clamped, 0.82) * 1.08).toFixed(3)
  );
  const particleGain = Number((0.28 + clamped * 0.96).toFixed(3));
  const flowVelocityMultiplier = Number((1.22 - clamped * 0.44).toFixed(3));

  return {
    mix: clamped,
    fluidPercentage,
    nebulaPercentage,
    fluidWeight,
    nebulaWeight,
    particleGain,
    flowVelocityMultiplier,
  };
}

export function hexToNormalizedRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [0.54, 0.36, 1.0];
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0.54, 0.36, 1.0];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

/**
 * Tightly locks the background spectrum (94% correlation) to the central ORB's
 * active colour theme while keeping deepSpace dark and velvety so the ORB
 * commands primary visual focus and the background feels like an organic extension of it.
 */
export function interpolateNebulaSpectrum(
  scene: FocusSceneConfig,
  sceneBlend = 0.94
): NebulaSpectrum {
  const baseViolet: [number, number, number] = [0.541, 0.361, 1.0]; // #8A5CFF
  const baseCyan: [number, number, number] = [0.184, 0.91, 1.0]; // #2FE8FF
  const baseMagenta: [number, number, number] = [1.0, 0.31, 0.639]; // #FF4FA3
  const baseDeep: [number, number, number] = [0.018, 0.022, 0.052]; // #05060D

  const sceneP = hexToNormalizedRgb(scene.colors.primary);
  const sceneS = hexToNormalizedRgb(scene.colors.secondary);
  const sceneT = hexToNormalizedRgb(scene.colors.tertiary);
  const sceneBg = hexToNormalizedRgb(scene.colors.baseBg);

  const mix = (
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];

  // Darken the base deep-space canvas so outer edges stay quiet and frame the ORB
  const darkenedSceneBg: [number, number, number] = [
    sceneBg[0] * 0.62,
    sceneBg[1] * 0.62,
    sceneBg[2] * 0.68,
  ];

  return {
    violet: mix(baseViolet, sceneP, sceneBlend),
    cyan: mix(baseCyan, sceneS, sceneBlend),
    magenta: mix(baseMagenta, sceneT, sceneBlend),
    deepSpace: mix(baseDeep, darkenedSceneBg, 0.72),
  };
}

/**
 * Calculates calm, correlated fluid velocity & harmonic coupling parameters
 * synchronized with the central Living Lens state.
 */
export function computeFluidTurbulenceGain(
  status: TimerStatus,
  progress: number,
  audioAmplitude: number,
  reducedMotion: boolean
): {
  flowSpeed: number;
  turbulence: number;
  gravitationalStrength: number;
  centralSanctuaryAlpha: number;
} {
  if (reducedMotion) {
    return {
      flowSpeed: 0.04,
      turbulence: 0.22,
      gravitationalStrength: 0.16,
      centralSanctuaryAlpha: 0.76,
    };
  }

  const clampedAudio = Math.max(0, Math.min(1, audioAmplitude));
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (status === 'paused') {
    return {
      flowSpeed: 0.08,
      turbulence: 0.26,
      gravitationalStrength: 0.18,
      centralSanctuaryAlpha: 0.78,
    };
  }

  if (status === 'completed') {
    return {
      flowSpeed: 0.95,
      turbulence: 0.62,
      gravitationalStrength: 0.36,
      centralSanctuaryAlpha: 0.72,
    };
  }

  if (status === 'running') {
    return {
      flowSpeed: 0.56 + clampedProgress * 0.18 + clampedAudio * 0.22,
      turbulence: 0.44 + clampedProgress * 0.12 + clampedAudio * 0.16,
      gravitationalStrength: 0.28 + clampedAudio * 0.12,
      centralSanctuaryAlpha: 0.76,
    };
  }

  // Idle state: serene, calm, breathing liquid field correlated with the central orb
  return {
    flowSpeed: 0.42,
    turbulence: 0.38,
    gravitationalStrength: 0.25,
    centralSanctuaryAlpha: 0.75,
  };
}

/**
 * Custom WGSL Shader Module for WebGPU Dual Volumetric Aurora × GPU Fluid Dynamics.
 */
export const QUANTUM_NEBULA_WGSL = /* wgsl */ `
${INFINITY_AURORA_WGSL_SOURCE}

struct NebulaUniforms {
  time: f32,
  aspect: f32,
  turbulence: f32,
  gravityStrength: f32,
  sanctuaryAlpha: f32,
  audioAmp: f32,
  fluidWeight: f32,
  nebulaWeight: f32,
  orbMode: f32,
  pointer: vec2<f32>,
  colorViolet: vec3<f32>,
  colorCyan: vec3<f32>,
  colorMagenta: vec3<f32>,
  colorDeep: vec3<f32>,
};

fn evaluateQuantumNebula(uv: vec2<f32>, u_neb: NebulaUniforms) -> vec3<f32> {
  let centered = (uv - vec2<f32>(0.5, 0.475)) * vec2<f32>(u_neb.aspect, 1.0);
  let r = length(centered);
  let rayPos = vec3<f32>(centered.x * 2.2, centered.y * 1.8, 1.0);
  let fluidOff = vec2<f32>(sin(u_neb.time * 0.22), cos(u_neb.time * 0.17)) * 0.25;

  let densA = samplePrimaryAuroraDensity(rayPos, u_neb.time, fluidOff);
  let densB = sampleSecondaryAuroraDensity(rayPos, u_neb.time * 0.618, fluidOff);

  let engineAColor = mix(u_neb.colorViolet, u_neb.colorCyan, clamp(densA * 1.4, 0.0, 1.0)) * densA * u_neb.nebulaWeight;
  let engineBColor = mix(u_neb.colorViolet, u_neb.colorMagenta, clamp(densB * 1.3, 0.0, 1.0)) * densB * u_neb.nebulaWeight * 0.82;
  let sanctuary = mix(0.38, 1.0, smoothstep(0.08, 0.34, r));

  return u_neb.colorDeep + (engineAColor + engineBColor) * sanctuary;
}
`;

/**
 * Vertex Shader for the Full-Viewport Volumetric Dual Aurora × GPU Fluid Dynamics Plane
 */
export const NEBULA_FLUID_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Master Volumetric Ray-Marching & GPU Fluid Dynamics Fragment Shader:
 * AURA TIME — INFINITY AURORA
 *
 * Implements 3 interconnected rendering engines across 5 volumetric depth layers
 * (Layer 6 is rendered by the 3D depth-sorted particle field):
 *
 * - Layer 1: Deep atmospheric background & zenith light absorption
 * - Layer 2: Distant high-altitude auroral veil (deep spatial parallax)
 * - Layer 3: ENGINE A — Primary Volumetric Aurora (3D ray-marched auroral curtains,
 *            domain warping, 4-octave FBM, magnetic field striations, anisotropic light scattering)
 * - Layer 4: ENGINE B — Secondary Volumetric Aurora (independent oblique spatial orientation,
 *            incommensurate time coordinate uTimeB, distinct frequency FBM, subtle magenta/violet/blue
 *            and restrained coral highlights, radiative cross-illumination with Engine A)
 * - Layer 5: ENGINE C — GPU-Accelerated Fluid Dynamics (couples real-time GPU ping-pong
 *            Navier-Stokes simulation texture uFluidSimTex with multiscale curl-advected liquid
 *            energy currents flowing through 3D space between Engine A and Engine B)
 * - Cinematic Pipeline: Multi-scale bloom, HDR luminance control, subtle chromatic refraction,
 *   ACES Filmic tone mapping, and strict Central Timer Sanctuary protection.
 */
export const NEBULA_FLUID_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

// Independent multi-timescale uniforms (Engine A, Engine B, Engine C never synchronize)
uniform float uTime;
uniform float uTimeB;
uniform float uTimeC;
uniform float uAspect;
uniform float uTurbulence;
uniform float uGravityStrength;
uniform float uSanctuaryAlpha;
uniform float uAudioAmp;
uniform float uFluidWeight;
uniform float uNebulaWeight;
uniform float uOrbMode;
uniform float uConvergencePulse;
uniform float uFinalFiveBoost;
uniform float uCompletionRelease;
uniform float uCurtainSharpness;
uniform float uSecondaryWaveAmp;
uniform vec2 uPointer;

// Real-time Ping-Pong Navier-Stokes GPU Fluid Simulation Texture (R,G=vel, B=dye, A=vorticity)
uniform sampler2D uFluidSimTex;

// Scene-calibrated color uniforms for Engine A, Engine B, Engine C, and Deep Space
uniform vec3 uColorViolet;          // Engine A Primary (Ion Violet / Scene Primary)
uniform vec3 uColorCyan;            // Engine A Secondary & Fluid Cyan (Electric Cyan / Scene Secondary)
uniform vec3 uColorMagenta;         // Engine C Interference & Accents (Signal Magenta / Scene Tertiary)
uniform vec3 uColorDeep;            // Layer 1 Deep Space Midnight Ink
uniform vec3 uColorZenith;          // Layer 1 Upper Atmospheric Zenith Tint
uniform vec3 uColorEngineBPrimary;  // Engine B Primary Wave Color
uniform vec3 uColorEngineBCoral;    // Engine B Restrained Coral/Iridescent Highlight

// ----------------------------------------------------------------------------
// 3D & 2D Procedural Noise Primitives (Quintic C2-Continuous, Zero Grid Seams)
// ----------------------------------------------------------------------------
float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float smoothNoise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float smoothNoise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, u.x);
  float nx10 = mix(n010, n110, u.x);
  float nx01 = mix(n001, n101, u.x);
  float nx11 = mix(n011, n111, u.x);

  float nxy0 = mix(nx00, nx10, u.y);
  float nxy1 = mix(nx01, nx11, u.y);

  return mix(nxy0, nxy1, u.z);
}

mat2 rot2(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

// 3-Octave Velvety FBM for Fluid & Domain Warping
float fbm2D(vec2 p) {
  float v = 0.0;
  float amp = 0.54;
  mat2 m = rot2(0.58);
  for (int i = 0; i < 3; i++) {
    v += amp * smoothNoise2D(p);
    p = m * p * 1.62 + vec2(1.7, 9.2);
    amp *= 0.46;
  }
  return v;
}

// Divergence-free multiscale curl velocity field
vec2 computeCurlVelocity(vec2 p, float t) {
  float eps = 0.14;
  float n1 = fbm2D(p + vec2(0.0, eps) + vec2(t * 0.28, -t * 0.21));
  float n2 = fbm2D(p - vec2(0.0, eps) + vec2(t * 0.28, -t * 0.21));
  float n3 = fbm2D(p + vec2(eps, 0.0) + vec2(-t * 0.23, t * 0.26));
  float n4 = fbm2D(p - vec2(eps, 0.0) + vec2(-t * 0.23, t * 0.26));
  return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
}

// ----------------------------------------------------------------------------
// ENGINE A — PRIMARY VOLUMETRIC AURORA (3D Ray-Marched Magnetic Curtains)
// ----------------------------------------------------------------------------
// Evaluates a 3D volumetric curtain density field with domain warping, vertical
// magnetic field-line striations, and altitude-dependent Beer-Lambert scattering.
vec4 renderEngineAPrimaryAurora(
  vec3 rayOrigin,
  vec3 rayDir,
  vec2 fluidVelocity,
  float fluidDye,
  float tA
) {
  vec3 accumulatedLight = vec3(0.0);
  float transmittance = 1.0;

  // 8 volumetric ray-marching slices through the 3D atmospheric curtain volume
  for (int i = 0; i < 8; i++) {
    float fi = float(i) / 7.0;
    float marchDist = 1.05 + fi * 2.25;
    vec3 samplePos = rayOrigin + rayDir * marchDist;

    // Couple GPU fluid velocity field into the lower auroral boundary
    float fluidCoupling = exp(-max(0.0, samplePos.y + 0.25) * 1.65);
    samplePos.xz += fluidVelocity * (0.52 * fluidCoupling);

    // Sweeping S-curve auroral arc across the upper & mid celestial vault
    float arcCurve = sin(samplePos.x * 1.15 + tA * 0.18) * 0.38
                   + cos(samplePos.x * 2.1 - tA * 0.13) * 0.18;

    // 3D Domain Warping for organic folding auroral curtains
    vec2 curtainCoord = vec2(samplePos.x * 0.85, (samplePos.z - arcCurve) * 1.05);
    vec2 warp = vec2(
      fbm2D(curtainCoord * 1.05 + vec2(tA * 0.16, -tA * 0.11)),
      fbm2D(curtainCoord * 1.05 + vec2(-tA * 0.12, tA * 0.14) + vec2(4.7, 2.3))
    );

    vec2 warpedXZ = curtainCoord + (warp - 0.5) * (1.35 + uTurbulence * 0.58);

    // Primary and secondary curtain fold sheets (ridged multifractal ribbons)
    float sheetA = smoothNoise3D(vec3(warpedXZ * 1.55, samplePos.y * 0.34 + tA * 0.11));
    float ribbonA = 1.0 - abs(sheetA * 2.0 - 1.0);
    ribbonA = pow(clamp(ribbonA, 0.0, 1.0), 2.65 * uCurtainSharpness);

    float sheetB = smoothNoise3D(vec3(warpedXZ * 2.45 + vec2(2.3, -1.7), samplePos.y * 0.42 - tA * 0.09));
    float ribbonB = pow(clamp(1.0 - abs(sheetB * 2.0 - 1.0), 0.0, 1.0), 3.1 * uCurtainSharpness);

    float curtainFold = ribbonA * 0.72 + ribbonB * 0.48;

    // Fine vertical magnetic field-line pillars/striations along the auroral curtain
    float fieldRayA = smoothNoise2D(vec2(warpedXZ.x * 7.8 + warpedXZ.y * 3.4, samplePos.y * 1.25 - tA * 0.52));
    float fieldRayB = smoothNoise2D(vec2(warpedXZ.x * 14.5 - warpedXZ.y * 5.2, samplePos.y * 1.85 - tA * 0.78));
    float fieldStriations = 0.52 + 0.48 * smoothstep(0.22, 0.86, fieldRayA * 0.65 + fieldRayB * 0.35);

    // Altitude profile: luminous cyan/violet lower curtain edge -> deep violet mid -> magenta crown
    float altitudeNorm = clamp((samplePos.y + 0.58 - arcCurve * 0.25) / 1.48, 0.0, 1.0);
    float altitudeEnvelope = smoothstep(0.02, 0.22, altitudeNorm) * exp(-pow(max(0.0, altitudeNorm - 0.26), 1.75) * 3.1);

    float sliceDensity = curtainFold * fieldStriations * altitudeEnvelope * (0.34 + fluidDye * 0.16);

    if (sliceDensity > 0.002) {
      // Vertically stratified auroral emission spectrum
      vec3 curtainEmission = mix(uColorCyan, uColorViolet, smoothstep(0.10, 0.62, altitudeNorm));
      curtainEmission = mix(curtainEmission, uColorMagenta, smoothstep(0.62, 0.96, altitudeNorm) * 0.46);

      // Forward anisotropic light scattering boost along bright curtain folds
      float scatterPhase = 1.0 + 0.48 * pow(curtainFold, 2.0);
      vec3 sampleLight = curtainEmission * sliceDensity * scatterPhase * 0.68;

      accumulatedLight += sampleLight * transmittance;
      transmittance *= exp(-sliceDensity * 0.62);
    }
  }

  return vec4(accumulatedLight, 1.0 - transmittance);
}

// ----------------------------------------------------------------------------
// ENGINE B — SECONDARY VOLUMETRIC AURORA (Independent Oblique Atmospheric Waves)
// ----------------------------------------------------------------------------
// Completely independent volumetric aurora with oblique spatial orientation,
// distinct noise frequencies, independent time coordinate uTimeB, and delicate
// cross-illumination with Engine A.
vec4 renderEngineBSecondaryAurora(
  vec3 rayOrigin,
  vec3 rayDir,
  vec2 fluidVelocity,
  float primaryAuroraAlpha,
  float tB
) {
  vec3 accumulatedWave = vec3(0.0);
  float transmittance = 1.0;

  // Oblique 42-degree spatial orientation matrix (distinct from Engine A)
  mat2 obliqueRot = rot2(-0.7330);

  for (int j = 0; j < 6; j++) {
    float fj = float(j) / 5.0;
    float marchDist = 1.35 + fj * 2.15;
    vec3 samplePos = rayOrigin + rayDir * marchDist;

    // Rotate into Engine B's independent coordinate frame
    vec2 rotXZ = obliqueRot * samplePos.xz - fluidVelocity * 0.36;
    float obliqueWaveUndulation = 0.22 * sin(rotXZ.x * 1.45 - tB * 0.24)
                                + 0.14 * cos(rotXZ.y * 1.85 + tB * 0.19);
    float obliqueWaveHeight = samplePos.y + 0.14 - obliqueWaveUndulation;

    // Broad, flowing atmospheric waves with different noise frequencies from Engine A
    float waveFbmA = fbm2D(rotXZ * 0.72 + vec2(-tB * 0.18, tB * 0.13));
    float waveFbmB = smoothNoise3D(vec3(rotXZ * 1.32 + waveFbmA * 0.72, obliqueWaveHeight * 0.72 - tB * 0.15));
    float waveCrest = 1.0 - abs(waveFbmB * 2.0 - 1.0);

    float waveBand = exp(-pow(obliqueWaveHeight * 1.75 + (waveFbmA - 0.5) * 0.9, 2.0) * 2.9);
    float waveDensity = (smoothstep(0.24, 0.84, waveFbmB) * 0.65 + pow(waveCrest, 2.2) * 0.55)
      * waveBand
      * uSecondaryWaveAmp
      * 0.26;

    if (waveDensity > 0.002) {
      // Subtle magenta, violet, deep blue, and extremely restrained coral highlights
      vec3 waveColor = mix(uColorEngineBPrimary, uColorMagenta, smoothstep(0.18, 0.76, waveFbmA) * 0.74);
      float coralCrest = pow(clamp(waveCrest, 0.0, 1.0), 2.4) * 0.44;
      waveColor = mix(waveColor, uColorEngineBCoral, coralCrest);

      // Delicate radiative cross-illumination where Engine A and Engine B intersect in 3D space
      vec3 crossIllum = uColorCyan * (primaryAuroraAlpha * 0.30);
      vec3 sliceLight = (waveColor + crossIllum) * waveDensity * 0.62;

      accumulatedWave += sliceLight * transmittance;
      transmittance *= exp(-waveDensity * 0.52);
    }
  }

  return vec4(accumulatedWave, 1.0 - transmittance);
}

// ACES Filmic Tone Mapping for cinematic HDR luminance management without clipping
vec3 acesFilmicToneMap(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  // Exact center of the Living Lens ORB on screen (0.5, 0.475)
  vec2 orbCenter = vec2(0.5, 0.475);
  vec2 centered = (vUv - orbCenter) * vec2(uAspect, 1.0);
  float dist = length(centered);
  vec2 radialDir = centered / max(0.0001, dist);
  float angle = atan(centered.y, centered.x);

  // ============================================================================
  // SAMPLE LIVE GPU FLUID SIMULATION TEXTURE (ENGINE C PING-PONG SOLVER)
  // ============================================================================
  vec4 fluidSimSample = texture2D(uFluidSimTex, vUv);
  vec2 gpuFluidVel = (fluidSimSample.rg - 0.5) * 2.0;
  float gpuFluidDye = fluidSimSample.b;
  float gpuFluidVorticity = (fluidSimSample.a - 0.5) * 2.0;

  // Combine GPU FBO velocity with analytical multiscale curl velocity for infinite detail
  vec2 pointerCentered = (uPointer - orbCenter) * vec2(uAspect, 1.0);
  vec2 toPtr = centered - pointerCentered;
  float ptrWake = exp(-dot(toPtr, toPtr) * 3.2) * 0.09;
  vec2 ptrSwirl = vec2(-toPtr.y, toPtr.x) * ptrWake;

  float tA = uTime * 0.16;
  float tB = uTimeB * 0.16;
  float tC = uTimeC * 0.16;

  // Session start convergence twist & gravitational coupling around the ORB
  float gravityTwist = (uGravityStrength * 0.36 + uConvergencePulse * 0.28) * exp(-dist * dist * 2.1);
  vec2 fluidCoord = rot2(gravityTwist) * (centered + ptrSwirl) - radialDir * (tC * 0.21 - uConvergencePulse * 0.15);

  vec2 curlVel = computeCurlVelocity(fluidCoord * 0.92, tC);
  vec2 totalFluidVel = gpuFluidVel * 0.65 + curlVel * (0.68 + uTurbulence * 0.42);

  // ============================================================================
  // LAYER 1: DEEP ATMOSPHERIC BACKGROUND & ZENITH ABSORPTION
  // ============================================================================
  float zenithGrad = smoothstep(-0.65, 0.85, centered.y);
  vec3 layer1DeepSpace = mix(uColorDeep, uColorZenith, zenithGrad * 0.48);

  // ============================================================================
  // LAYER 2: DISTANT VOLUMETRIC AURORAL FORMATIONS (High-Altitude Veil)
  // ============================================================================
  vec2 distantCoord = centered * 0.58 + vec2(tA * 0.05, -tB * 0.04) + totalFluidVel * 0.08;
  float distantVeilNoise = fbm2D(distantCoord * 1.15);
  float distantHorizonMask = smoothstep(-0.45, 0.42, centered.y) * exp(-dist * dist * 0.85);
  vec3 layer2DistantAurora = mix(uColorViolet, uColorEngineBPrimary, distantVeilNoise)
    * smoothstep(0.26, 0.85, distantVeilNoise)
    * distantHorizonMask
    * 0.18
    * uNebulaWeight;

  // ============================================================================
  // CONSTRUCT 3D VIEW RAY FOR VOLUMETRIC AURORA ENGINES A & B
  // ============================================================================
  vec3 rayOrigin = vec3(0.0, -0.10, 0.0);
  // Subtle chromatic refraction along fluid shear gradient
  vec2 refractedCentered = centered + totalFluidVel * 0.038;
  vec3 rayDir = normalize(vec3(refractedCentered.x * 1.22, refractedCentered.y * 1.12 + 0.14, 1.32));

  // ============================================================================
  // LAYER 3: ENGINE A — PRIMARY VOLUMETRIC AURORA
  // ============================================================================
  vec4 engineAResult = renderEngineAPrimaryAurora(
    rayOrigin,
    rayDir,
    totalFluidVel,
    gpuFluidDye,
    tA
  );
  vec3 layer3PrimaryAurora = engineAResult.rgb * (0.78 + uFinalFiveBoost * 0.18 + uAudioAmp * 0.14) * uNebulaWeight;

  // ============================================================================
  // LAYER 4: ENGINE B — SECONDARY VOLUMETRIC AURORA
  // ============================================================================
  vec4 engineBResult = renderEngineBSecondaryAurora(
    rayOrigin,
    rayDir,
    totalFluidVel,
    engineAResult.a,
    tB
  );
  vec3 layer4SecondaryAurora = engineBResult.rgb * (0.74 + uFinalFiveBoost * 0.15 + uCompletionRelease * 0.22) * uNebulaWeight;

  // ============================================================================
  // LAYER 5: ENGINE C — GPU-ACCELERATED FLUID DYNAMICS (Luminous Liquid Energy)
  // ============================================================================
  // Evaluates translucent flowing energy streams connecting Engine A and Engine B,
  // coupled with the active ORB organism mode (Original Lens / Celestial Jelly / Living Bloom).
  float isJelly = clamp(1.0 - abs(uOrbMode - 1.0), 0.0, 1.0);
  float isBloom = clamp(1.0 - abs(uOrbMode - 2.0), 0.0, 1.0);
  float isOriginal = clamp(1.0 - isJelly - isBloom, 0.0, 1.0);

  float originalRipple = 0.5 + 0.5 * sin(dist * 7.2 - uTime * 0.82 + angle);
  float jellyBellPulse = pow(max(0.0, sin(uTime * 1.45)), 2.2);
  float jellyRingWave = 0.5 + 0.5 * sin(dist * 8.2 - uTime * 1.12 - jellyBellPulse * 0.8);
  float lowerWakeMask = smoothstep(0.15, -0.45, centered.y) * exp(-centered.x * centered.x * 7.2);
  float jellyTentacleWake = lowerWakeMask * (0.5 + 0.5 * sin(centered.x * 9.5 + centered.y * 5.0 - uTime * 1.1));
  float bloomPetalCaustic = 0.5 + 0.5 * cos(angle * 6.0 - dist * 4.4 + uTime * 0.42);
  float bloomSpiral = 0.5 + 0.5 * sin(angle * 3.0 + dist * 5.2 - uTime * 0.48);

  float organismWave =
    isOriginal * originalRipple +
    isJelly * (jellyRingWave * 0.68 + jellyTentacleWake * 0.32) +
    isBloom * (bloomPetalCaustic * 0.58 + bloomSpiral * 0.42);

  vec2 advectedPos = fluidCoord * 1.08 + totalFluidVel * 0.88;
  vec2 fluidQ = vec2(
    fbm2D(advectedPos + vec2(0.0, tC * 0.68)),
    fbm2D(advectedPos + vec2(4.2, 1.7 - tC * 0.61))
  );
  vec2 fluidR = vec2(
    fbm2D(advectedPos * 1.18 + 1.25 * fluidQ + vec2(1.7 + tC * 0.38, 6.2)),
    fbm2D(advectedPos * 1.18 + 1.25 * fluidQ + vec2(5.8 - tC * 0.35, 2.4))
  );

  float fluidStream = fbm2D(advectedPos + (1.06 + uTurbulence * 0.48) * fluidR);
  // Crisp luminous fluid filaments (streamlines connecting the auroral fields)
  float fluidFilament = pow(clamp(1.0 - abs(fluidStream * 2.0 - 1.0), 0.0, 1.0), 2.4);
  float vorticitySwirl = smoothstep(0.10, 0.86, abs(gpuFluidVorticity) * 0.65 + length(totalFluidVel) * 0.52);

  // Fluid streams flow through the atmospheric space between Engine A and Engine B
  float fluidSpatialEnvelope = mix(
    exp(-dist * dist * 1.32),
    1.0,
    clamp((engineAResult.a + engineBResult.a) * 0.52, 0.0, 0.72)
  ) * (0.58 + gpuFluidDye * 0.25 + uAudioAmp * 0.14);

  vec3 layer5FluidStreams = vec3(0.0);
  // Subtle cyan & violet luminous currents + filament caustics
  layer5FluidStreams += uColorCyan * (smoothstep(0.16, 0.88, fluidStream * 0.62 + organismWave * 0.38) * 0.32 + fluidFilament * 0.22);
  layer5FluidStreams += uColorViolet * (smoothstep(0.14, 0.88, fluidQ.y * 0.66 + fluidStream * 0.34) * 0.32);
  // Occasional restrained magenta interference along high-vorticity filaments
  float magentaInterference = smoothstep(0.28, 0.90, fluidR.x * 0.54 + vorticitySwirl * 0.46) * (0.7 + fluidFilament * 0.3);
  layer5FluidStreams += uColorMagenta * magentaInterference * 0.26;
  layer5FluidStreams *= fluidSpatialEnvelope * uFluidWeight;

  // ============================================================================
  // ADVANCED VOLUMETRIC LIGHTING, MULTI-SCALE BLOOM & COMPOSITING PIPELINE
  // ============================================================================
  // Combine Engine A and Engine B with physically inspired soft screen/transmittance blending
  vec3 dualAuroraComposite = layer2DistantAurora + layer3PrimaryAurora + layer4SecondaryAurora * (1.0 - layer3PrimaryAurora * 0.30);

  // Integrate Engine C fluid currents through the auroral density field
  vec3 unifiedEcosystem = 1.0 - (1.0 - clamp(dualAuroraComposite, 0.0, 0.84)) * (1.0 - clamp(layer5FluidStreams, 0.0, 0.80));

  // Soft volumetric multi-scale atmospheric bloom & subsurface scattering halo
  float auroraEnergyDensity = length(dualAuroraComposite) * 0.58 + length(layer5FluidStreams) * 0.42;
  vec3 volumetricScatterBloom = mix(uColorViolet, uColorCyan, 0.45) * pow(clamp(auroraEnergyDensity, 0.0, 1.0), 1.55) * 0.19;

  // Timer-aware session transitions: Begin convergence ring & Completion release wave
  float convergenceHalo = exp(-pow(dist - (0.38 - uConvergencePulse * 0.16), 2.0) * 18.0) * uConvergencePulse * 0.22;
  float completionHalo = exp(-pow(dist - (0.24 + (1.0 - uCompletionRelease) * 0.45), 2.0) * 12.0) * uCompletionRelease * 0.24;
  float orbSubsurfaceBridge = exp(-dist * dist * 3.8) * (0.20 + jellyBellPulse * isJelly * 0.07 + uAudioAmp * 0.09);

  vec3 bridgeHue = mix(uColorViolet, uColorCyan, organismWave * 0.5 + 0.25);
  bridgeHue = mix(bridgeHue, uColorEngineBCoral, isBloom * 0.25);

  unifiedEcosystem += volumetricScatterBloom + bridgeHue * (orbSubsurfaceBridge + convergenceHalo + completionHalo);

  // ============================================================================
  // STRICT VISUAL HIERARCHY: CENTRAL TIMER SANCTUARY & PERIPHERAL VIGNETTE
  // ============================================================================
  // Keep the brightest auroral structures behind/away from the central timer's immediate reading zone
  float timerReadingSanctuary = mix(0.32, 1.0, smoothstep(0.08, 0.35, dist));
  float peripheralHorizonVignette = smoothstep(1.36, 0.22, dist);

  vec3 preToneMapped = layer1DeepSpace + unifiedEcosystem * timerReadingSanctuary * peripheralHorizonVignette * 0.82;

  // Filmic tone mapping & luxury dark-violet color grading
  vec3 toneMapped = acesFilmicToneMap(preToneMapped * 1.10);
  vec3 finalColor = mix(preToneMapped, toneMapped, 0.68);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * Layer 6: Extremely Subtle 3D Atmospheric Particles & Light Details Vertex Shader
 * Advected by both aurora waves and fluid turbulence, with strict clearance behind the timer.
 */
export const QUANTUM_PARTICLES_VERTEX_SHADER = /* glsl */ `
attribute float aPhase;
attribute float aSpeed;
attribute float aScale;
attribute float aColorMix;

varying float vAlpha;
varying float vColorMix;

uniform float uTime;
uniform float uTurbulence;
uniform float uAudioAmp;
uniform float uPixelRatio;

void main() {
  vColorMix = aColorMix;

  float radius = length(position.xy);
  float baseAngle = atan(position.y, position.x);

  // Multi-timescale orbital & fluid drift
  float angularVel = aSpeed * (0.065 + 0.075 / (radius + 0.4));
  float angle = baseAngle + uTime * angularVel;

  float waveX = sin(uTime * 0.38 + aPhase * 6.2831) * 0.09 * uTurbulence;
  float waveY = cos(uTime * 0.31 + aPhase * 4.7123) * 0.09 * uTurbulence;
  float waveZ = sin(uTime * 0.27 + radius * 1.6 + aPhase * 3.1415) * 0.22;

  float spatialRadius = 0.28 + radius * 0.74;
  float radialBreath = spatialRadius * (1.0 + sin(uTime * 0.32 + aPhase * 6.28) * 0.045 + uAudioAmp * 0.04);

  vec3 advectedPos = vec3(
    cos(angle) * radialBreath + waveX,
    sin(angle) * radialBreath + waveY,
    position.z + waveZ
  );

  vec4 mvPosition = modelViewMatrix * vec4(advectedPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Strict clearance behind central timer numerals (screenDist < 0.38)
  float screenDist = length(advectedPos.xy);
  float centerClearance = smoothstep(0.24, 0.56, screenDist);
  float peripheralFade = exp(-screenDist * screenDist * 0.34) * (1.0 - smoothstep(1.45, 2.35, screenDist));

  float twinkle = 0.5 + 0.5 * sin(uTime * (0.75 + aSpeed * 0.65) + aPhase * 12.566);
  vAlpha = twinkle * centerClearance * peripheralFade * smoothstep(-5.2, -0.9, mvPosition.z);

  gl_PointSize = clamp(
    (aScale * (9.5 + uAudioAmp * 3.8) * uPixelRatio) / max(0.9, -mvPosition.z),
    1.2,
    11.5
  );
}
`;

/**
 * Layer 6: Extremely Subtle Atmospheric Particles Fragment Shader
 */
export const QUANTUM_PARTICLES_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vColorMix;

uniform float uParticleGain;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
uniform vec3 uColorMagenta;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord) * 2.0;
  if (r > 1.0) discard;

  // Ultra-soft Gaussian bokeh falloff
  float glow = exp(-r * r * 4.6) * (1.0 - r);

  vec3 particleColor = mix(uColorViolet, uColorCyan, smoothstep(0.0, 0.5, vColorMix));
  particleColor = mix(particleColor, uColorMagenta, smoothstep(0.5, 1.0, vColorMix));

  gl_FragColor = vec4(particleColor, glow * vAlpha * 0.38 * uParticleGain);
}
`;
