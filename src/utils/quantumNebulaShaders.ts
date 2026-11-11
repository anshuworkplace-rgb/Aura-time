import { FocusSceneConfig, OrbDesignId, TimerStatus } from '../types/aura';

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
  mix: number; // 0..1 (0 = GPU Fluid Dynamics, 1 = Quantum Nebula Atmosphere)
  description: string;
}

export const BACKGROUND_MIX_PRESETS: BackgroundMixPreset[] = [
  {
    id: 'fluid-dominant',
    label: 'GPU Fluid Dynamics',
    shortLabel: 'Fluid Stream',
    mix: 0.18,
    description: 'Silky curl-advected liquid currents radiating from the ORB',
  },
  {
    id: 'balanced-synthesis',
    label: 'Balanced Synthesis',
    shortLabel: 'Balanced Mix',
    mix: 0.52,
    description: 'Harmonious ORB-coupled fluid wake & soft nebula aura',
  },
  {
    id: 'nebula-atmosphere',
    label: 'Quantum Nebula',
    shortLabel: 'Nebula Cloud',
    mix: 0.85,
    description: 'Deep volumetric sanctuary halo emanating from the ORB',
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
 * Computes shader weights for blending the GPU Fluid Dynamics layer
 * and the Quantum Nebula Atmosphere layer from a normalized 0..1 mix value.
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
 * Custom WGSL Shader Module for WebGPU ORB-Centric Quantum Nebula × Calm Fluid Dynamics
 */
export const QUANTUM_NEBULA_WGSL = /* wgsl */ `
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

fn smoothNoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  let a = fract(sin(dot(i, vec2<f32>(127.1, 311.7))) * 43758.5453);
  let b = fract(sin(dot(i + vec2<f32>(1.0, 0.0), vec2<f32>(127.1, 311.7))) * 43758.5453);
  let c = fract(sin(dot(i + vec2<f32>(0.0, 1.0), vec2<f32>(127.1, 311.7))) * 43758.5453);
  let d = fract(sin(dot(i + vec2<f32>(1.0, 1.0), vec2<f32>(127.1, 311.7))) * 43758.5453);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn silkFluidFbm(p_in: vec2<f32>) -> f32 {
  var v = 0.0;
  var a = 0.55;
  var p = p_in;
  let rot = mat2x2<f32>(0.8, 0.6, -0.6, 0.8);
  for (var i = 0; i < 3; i = i + 1) {
    v = v + a * smoothNoise(p);
    p = rot * p * 1.65 + vec2<f32>(1.7, 9.2);
    a = a * 0.48;
  }
  return v;
}

fn evaluateQuantumNebula(uv: vec2<f32>, u: NebulaUniforms) -> vec3<f32> {
  var p = (uv - vec2<f32>(0.5, 0.47)) * vec2<f32>(u.aspect, 1.0);
  let r = length(p);
  let t = u.time * 0.14;
  let radialDir = p / max(0.001, r);
  let radialOutflow = p - radialDir * (t * 0.35);
  let q = vec2<f32>(
    silkFluidFbm(radialOutflow * 1.35 + vec2<f32>(0.0, t)),
    silkFluidFbm(radialOutflow * 1.35 + vec2<f32>(3.4, -t * 0.85))
  );
  let fluidStream = silkFluidFbm(radialOutflow * 1.45 + q * (1.25 + u.turbulence));
  let nebulaCloud = silkFluidFbm(radialOutflow * 0.92 - q * 0.55);
  // Tight radial decay so the background emanates from the ORB and fades into dark periphery
  let orbEmanation = exp(-r * r * 2.65);
  let fluidLayer = (u.colorCyan * fluidStream * 0.52 + u.colorMagenta * q.x * 0.38) * u.fluidWeight;
  let nebulaLayer = (u.colorViolet * nebulaCloud * 0.56 + u.colorMagenta * q.y * 0.34) * u.nebulaWeight;
  return u.colorDeep + (fluidLayer + nebulaLayer) * orbEmanation * 0.52;
}
`;

/**
 * Vertex Shader for the Full-Viewport Volumetric Quantum Nebula × Fluid Dynamics Plane
 */
export const NEBULA_FLUID_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Fragment Shader for ORB-Centric Synthesis of:
 * 1) GPU Fluid Dynamics (curl-advected liquid streams radiating from the central ORB)
 * 2) Quantum Nebula Atmosphere (subsurface aura & volumetric halo anchored to the ORB)
 *
 * The background is engineered as the physical medium and radiating aura OF the central ORB:
 * - High visual focus remains on the ORB at the center.
 * - Ripples, caustics, and fluid currents originate from the ORB's position and organism mode
 *   (0 = Original Lens, 1 = Celestial Jelly, 2 = Living Bloom) and attenuate into calm,
 *   deep-space velvet toward the outer screen edges.
 */
export const NEBULA_FLUID_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uAspect;
uniform float uTurbulence;
uniform float uGravityStrength;
uniform float uSanctuaryAlpha;
uniform float uAudioAmp;
uniform float uFluidWeight;
uniform float uNebulaWeight;
uniform float uOrbMode;
uniform vec2 uPointer;
uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
uniform vec3 uColorMagenta;
uniform vec3 uColorDeep;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

// Quintic C2-continuous smooth noise (zero sharp grid or contour edges)
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

mat2 rot2(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

// Low-frequency 3-octave velvety FBM
float calmFluidFbm(vec2 p) {
  float v = 0.0;
  float amp = 0.54;
  mat2 m = rot2(0.58);
  for (int i = 0; i < 3; i++) {
    v += amp * smoothNoise(p);
    p = m * p * 1.58 + vec2(1.7, 9.2);
    amp *= 0.46;
  }
  return v;
}

// Smooth divergence-free curl velocity field
vec2 computeCurlFlow(vec2 p, float t) {
  float eps = 0.18;
  float n1 = calmFluidFbm(p + vec2(0.0, eps) + vec2(t * 0.32, -t * 0.24));
  float n2 = calmFluidFbm(p - vec2(0.0, eps) + vec2(t * 0.32, -t * 0.24));
  float n3 = calmFluidFbm(p + vec2(eps, 0.0) + vec2(-t * 0.26, t * 0.30));
  float n4 = calmFluidFbm(p - vec2(eps, 0.0) + vec2(-t * 0.26, t * 0.30));
  return vec2((n1 - n2) / (2.0 * eps), -(n3 - n4) / (2.0 * eps));
}

void main() {
  // Exact center of the Living Lens ORB on screen (0.5, 0.475)
  vec2 orbCenter = vec2(0.5, 0.475);
  vec2 centered = (vUv - orbCenter) * vec2(uAspect, 1.0);
  float dist = length(centered);
  vec2 radialDir = centered / max(0.0001, dist);
  float angle = atan(centered.y, centered.x);

  // Subtle pointer wake perturbation around the ORB
  vec2 ptr = (uPointer - orbCenter) * vec2(uAspect, 1.0);
  vec2 toPtr = centered - ptr;
  float ptrInfluence = exp(-dot(toPtr, toPtr) * 2.6) * 0.08;
  vec2 ptrFlow = vec2(-toPtr.y, toPtr.x) * ptrInfluence;

  float t = uTime * 0.15;

  // Radial outflow coordinate: fluid currents gently emanate outward from the ORB
  float softTwist = uGravityStrength * 0.38 * exp(-dist * dist * 2.2);
  vec2 radialOutflow = rot2(softTwist) * (centered + ptrFlow) - radialDir * (t * 0.22);

  // ============================================================================
  // ORGANISM-SPECIFIC HARMONIC COUPLING (Original / Celestial Jelly / Living Bloom)
  // ============================================================================
  float isJelly = clamp(1.0 - abs(uOrbMode - 1.0), 0.0, 1.0);
  float isBloom = clamp(1.0 - abs(uOrbMode - 2.0), 0.0, 1.0);
  float isOriginal = clamp(1.0 - isJelly - isBloom, 0.0, 1.0);

  // 1. Original Lens: Gentle concentric liquid-glass wave
  float originalRipple = 0.5 + 0.5 * sin(dist * 7.5 - uTime * 0.85 + angle);

  // 2. Celestial Jelly: Pelagic propulsion breathing wave & soft downward wake
  float jellyBellPulse = pow(max(0.0, sin(uTime * 1.45)), 2.2);
  float jellyRingWave = 0.5 + 0.5 * sin(dist * 8.5 - uTime * 1.15 - jellyBellPulse * 0.8);
  float lowerWakeMask = smoothstep(0.15, -0.42, centered.y) * exp(-centered.x * centered.x * 7.5);
  float jellyTentacleWake = lowerWakeMask * (0.5 + 0.5 * sin(centered.x * 10.0 + centered.y * 5.0 - uTime * 1.1));

  // 3. Living Bloom: Gentle botanical corolla harmonic
  float bloomPetalCaustic = 0.5 + 0.5 * cos(angle * 6.0 - dist * 4.5 + uTime * 0.42);
  float bloomSpiral = 0.5 + 0.5 * sin(angle * 3.0 + dist * 5.5 - uTime * 0.48);

  float organismWave =
    isOriginal * originalRipple +
    isJelly * (jellyRingWave * 0.68 + jellyTentacleWake * 0.32) +
    isBloom * (bloomPetalCaustic * 0.58 + bloomSpiral * 0.42);

  // ============================================================================
  // LAYER 1: ORB-EMITTED GPU FLUID DYNAMICS (Velvety Radial Silk Currents)
  // ============================================================================
  vec2 curlVel = computeCurlFlow(radialOutflow * 0.95, t);
  vec2 advectedFluid = radialOutflow * 1.05 + curlVel * (0.72 + uTurbulence * 0.45);

  vec2 fluidQ = vec2(
    calmFluidFbm(advectedFluid + vec2(0.0, t * 0.72)),
    calmFluidFbm(advectedFluid + vec2(4.2, 1.7 - t * 0.64))
  );

  vec2 fluidR = vec2(
    calmFluidFbm(advectedFluid * 1.12 + 1.25 * fluidQ + vec2(1.7 + t * 0.42, 6.2)),
    calmFluidFbm(advectedFluid * 1.12 + 1.25 * fluidQ + vec2(5.8 - t * 0.38, 2.4))
  );

  float fluidStream = calmFluidFbm(advectedFluid + (1.05 + uTurbulence * 0.48) * fluidR);
  float streamHarmonic = 0.5 + 0.5 * sin(dist * 6.5 - t * 1.8 + fluidQ.x * 2.4);

  // Smooth radial decay from the ORB outward so the background is a subtle extension of the ORB
  float orbFluidEnvelope = exp(-dist * dist * 2.15) * (0.52 + uAudioAmp * 0.16);

  vec3 fluidDynamicsLayer = vec3(0.0);
  fluidDynamicsLayer += uColorCyan * smoothstep(0.15, 0.92, fluidStream * 0.64 + organismWave * 0.36) * 0.34;
  fluidDynamicsLayer += uColorMagenta * smoothstep(0.18, 0.92, fluidR.x * 0.62 + streamHarmonic * 0.38) * 0.28;
  fluidDynamicsLayer += uColorViolet * smoothstep(0.14, 0.90, fluidQ.y * 0.68 + fluidStream * 0.32) * 0.32;
  fluidDynamicsLayer *= orbFluidEnvelope * uFluidWeight;

  // ============================================================================
  // LAYER 2: ORB-COUPLED QUANTUM NEBULA HALO (Subsurface Sanctuary Diffusion)
  // ============================================================================
  vec2 nebulaCoord = rot2(-0.22) * (radialOutflow * 0.78) + curlVel * 0.20;
  float nebulaBillowA = calmFluidFbm(nebulaCoord * 0.88 + vec2(t * 0.18, -t * 0.14));
  float nebulaBillowB = calmFluidFbm(nebulaCoord * 1.18 - vec2(nebulaBillowA * 0.72, t * 0.15) + vec2(6.4, 2.9));
  float nebulaVeil = calmFluidFbm(nebulaCoord * 0.68 + vec2(nebulaBillowB * 0.82, t * 0.10));

  float orbNebulaReach = exp(-dist * dist * 1.65);

  vec3 quantumNebulaLayer = vec3(0.0);
  quantumNebulaLayer += uColorViolet * smoothstep(0.14, 0.90, nebulaVeil * 0.70 + organismWave * 0.30) * 0.36;
  quantumNebulaLayer += uColorMagenta * smoothstep(0.18, 0.92, nebulaBillowB * 0.66 + nebulaBillowA * 0.34) * 0.26;
  quantumNebulaLayer += uColorCyan * smoothstep(0.22, 0.92, organismWave * 0.48 + nebulaVeil * 0.52) * 0.24;
  quantumNebulaLayer *= orbNebulaReach * uNebulaWeight;

  // ============================================================================
  // UNIFIED ORB-TO-BACKGROUND BRIDGE & RADIAL FOCUS HIERARCHY
  // ============================================================================
  vec3 combinedAtmosphere = 1.0 - (1.0 - clamp(fluidDynamicsLayer, 0.0, 0.75)) * (1.0 - clamp(quantumNebulaLayer, 0.0, 0.75));

  // Seamless subsurface aura directly tethering the ORB to the background field
  float orbCorona = exp(-dist * dist * 4.2) * (0.22 + jellyBellPulse * isJelly * 0.08 + uAudioAmp * 0.10);
  float pelagicStreamGlow = isJelly * lowerWakeMask * 0.12;

  vec3 bridgeColor = mix(uColorViolet, uColorCyan, organismWave * 0.52 + 0.24);
  bridgeColor = mix(bridgeColor, uColorMagenta, isBloom * 0.28);

  combinedAtmosphere += bridgeColor * (orbCorona + pelagicStreamGlow);

  // Calm peripheral vignette so outer screen frames the ORB in deep space
  float peripheralFocusMask = smoothstep(1.16, 0.18, dist);
  combinedAtmosphere *= peripheralFocusMask * 0.68;

  // Keep the immediate interior behind the ORB crystal-clear and high-contrast
  float orbInteriorCalm = mix(0.42, 1.0, smoothstep(0.06, 0.28, dist));

  vec3 finalColor = uColorDeep + combinedAtmosphere * orbInteriorCalm;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * GPU-Accelerated Quantum Particle System Vertex Shader
 * Bioluminescent motes & spores that emerge from the central ORB and drift in its wake.
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

  // Calm orbital & radial drift synchronized with the central ORB
  float angularVel = aSpeed * (0.08 + 0.08 / (radius + 0.35));
  float angle = baseAngle + uTime * angularVel;

  float waveX = sin(uTime * 0.42 + aPhase * 6.2831) * 0.08 * uTurbulence;
  float waveY = cos(uTime * 0.38 + aPhase * 4.7123) * 0.08 * uTurbulence;
  float waveZ = sin(uTime * 0.3 + radius * 1.8 + aPhase * 3.1415) * 0.20;

  // Concentrate particles closer to the ORB aura (0.28 .. 1.65) so they feel part of the ORB
  float orbTetheredRadius = 0.24 + radius * 0.68;
  float radialPulse = orbTetheredRadius * (1.0 + sin(uTime * 0.36 + aPhase * 6.28) * 0.05 + uAudioAmp * 0.05);

  vec3 advectedPos = vec3(
    cos(angle) * radialPulse + waveX,
    sin(angle) * radialPulse + waveY,
    position.z + waveZ
  );

  vec4 mvPosition = modelViewMatrix * vec4(advectedPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Clear directly behind the timer digits, peak in the ORB's outer corona, and fade in the far periphery
  float screenDist = length(advectedPos.xy);
  float centerClearance = smoothstep(0.18, 0.48, screenDist);
  float orbProximityFade = exp(-screenDist * screenDist * 0.42) * (1.0 - smoothstep(1.35, 2.25, screenDist));

  float twinkle = 0.5 + 0.5 * sin(uTime * (0.9 + aSpeed * 0.8) + aPhase * 12.566);
  vAlpha = twinkle * centerClearance * orbProximityFade * smoothstep(-5.2, -0.9, mvPosition.z);

  gl_PointSize = clamp(
    (aScale * (10.5 + uAudioAmp * 4.5) * uPixelRatio) / max(0.9, -mvPosition.z),
    1.5,
    13.5
  );
}
`;

/**
 * GPU-Accelerated Quantum Particle System Fragment Shader
 * Feather-soft radial Gaussian glow modulated by uParticleGain.
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
  float glow = exp(-r * r * 4.4) * (1.0 - r);

  vec3 particleColor = mix(uColorViolet, uColorCyan, smoothstep(0.0, 0.5, vColorMix));
  particleColor = mix(particleColor, uColorMagenta, smoothstep(0.5, 1.0, vColorMix));

  gl_FragColor = vec4(particleColor, glow * vAlpha * 0.46 * uParticleGain);
}
`;
