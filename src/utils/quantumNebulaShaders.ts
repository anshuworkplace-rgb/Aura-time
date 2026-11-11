import { FocusSceneConfig, TimerStatus } from '../types/aura';

export interface NebulaSpectrum {
  violet: [number, number, number];
  cyan: [number, number, number];
  magenta: [number, number, number];
  deepSpace: [number, number, number];
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
 * Blends the signature Quantum Nebula palette (Ion Violet #8A5CFF,
 * Electric Cyan #2FE8FF, Signal Magenta #FF4FA3) with the active Focus Scene.
 */
export function interpolateNebulaSpectrum(
  scene: FocusSceneConfig,
  sceneBlend = 0.42
): NebulaSpectrum {
  const baseViolet: [number, number, number] = [0.541, 0.361, 1.0]; // #8A5CFF
  const baseCyan: [number, number, number] = [0.184, 0.91, 1.0]; // #2FE8FF
  const baseMagenta: [number, number, number] = [1.0, 0.31, 0.639]; // #FF4FA3
  const baseDeep: [number, number, number] = [0.027, 0.031, 0.071]; // #070812

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

  return {
    violet: mix(baseViolet, sceneP, sceneBlend),
    cyan: mix(baseCyan, sceneS, sceneBlend),
    magenta: mix(baseMagenta, sceneT, sceneBlend),
    deepSpace: mix(baseDeep, sceneBg, 0.5),
  };
}

/**
 * Calculates the fluid turbulence velocity & gravitational distortion gain
 * based on timer status, completion proximity, and live audio amplitude.
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
      flowSpeed: 0.05,
      turbulence: 0.25,
      gravitationalStrength: 0.18,
      centralSanctuaryAlpha: 0.88,
    };
  }

  const clampedAudio = Math.max(0, Math.min(1, audioAmplitude));
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (status === 'paused') {
    return {
      flowSpeed: 0.12,
      turbulence: 0.32,
      gravitationalStrength: 0.22,
      centralSanctuaryAlpha: 0.86,
    };
  }

  if (status === 'completed') {
    return {
      flowSpeed: 1.45,
      turbulence: 0.92,
      gravitationalStrength: 0.52,
      centralSanctuaryAlpha: 0.72,
    };
  }

  if (status === 'running') {
    return {
      flowSpeed: 0.88 + clampedProgress * 0.28 + clampedAudio * 0.35,
      turbulence: 0.64 + clampedProgress * 0.18 + clampedAudio * 0.25,
      gravitationalStrength: 0.36 + clampedAudio * 0.18,
      centralSanctuaryAlpha: 0.84,
    };
  }

  // Idle state: serene, mesmerizing cosmic drift
  return {
    flowSpeed: 0.58,
    turbulence: 0.52,
    gravitationalStrength: 0.3,
    centralSanctuaryAlpha: 0.82,
  };
}

/**
 * Custom WGSL Shader Module for WebGPU Quantum Nebula × Fluid Dynamics
 * (Used when WebGPU/TSL pipeline is active and exported for shader inspection)
 */
export const QUANTUM_NEBULA_WGSL = /* wgsl */ `
struct NebulaUniforms {
  time: f32,
  aspect: f32,
  turbulence: f32,
  gravityStrength: f32,
  sanctuaryAlpha: f32,
  audioAmp: f32,
  pointer: vec2<f32>,
  colorViolet: vec3<f32>,
  colorCyan: vec3<f32>,
  colorMagenta: vec3<f32>,
  colorDeep: vec3<f32>,
};

fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453123);
}

fn valueNoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbmFluid(p_in: vec2<f32>) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var p = p_in;
  let rot = mat2x2<f32>(0.8, 0.6, -0.6, 0.8);
  for (var i = 0; i < 5; i = i + 1) {
    v = v + a * valueNoise(p);
    p = rot * p * 2.03 + vec2<f32>(1.7, 9.2);
    a = a * 0.5;
  }
  return v;
}

fn evaluateQuantumNebula(uv: vec2<f32>, u: NebulaUniforms) -> vec3<f32> {
  var p = (uv - 0.5) * vec2<f32>(u.aspect, 1.0);
  let r = length(p);

  // Relativistic Frame-Dragging & Gravitational Lensing around the Living Lens
  let lensTwist = u.gravityStrength / (r * r + 0.18);
  let s = sin(lensTwist * 0.35);
  let c = cos(lensTwist * 0.35);
  let warped = vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);

  // Domain-Warped Navier-Stokes / FBM Fluid Cascade
  let t = u.time * 0.18;
  let q = vec2<f32>(
    fbmFluid(warped * 2.2 + vec2<f32>(0.0, t)),
    fbmFluid(warped * 2.2 + vec2<f32>(5.2, 1.3 - t * 0.8))
  );
  let rField = vec2<f32>(
    fbmFluid(warped * 2.6 + 2.8 * q + vec2<f32>(1.7 + t * 0.6, 9.2)),
    fbmFluid(warped * 2.6 + 2.8 * q + vec2<f32>(8.3, 2.8 - t * 0.5))
  );
  let density = fbmFluid(warped * 2.4 + 3.2 * rField * u.turbulence);

  // Violet - Cyan - Magenta Volumetric Light Diffusion
  var col = u.colorDeep;
  col = mix(col, u.colorViolet, smoothstep(0.15, 0.78, density));
  col = mix(col, u.colorCyan, smoothstep(0.32, 0.88, length(q)) * 0.75);
  col = mix(col, u.colorMagenta, smoothstep(0.45, 0.95, rField.y * density) * 0.82);

  // Central Sanctuary Vignette so the Living Lens timer remains razor-sharp
  let sanctuary = smoothstep(0.14, 0.48, r);
  return mix(u.colorDeep, col, mix(1.0 - u.sanctuaryAlpha, 1.0, sanctuary));
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
 * Fragment Shader for Volumetric Quantum Nebula × GPU Fluid Dynamics
 * Combines 5-octave domain-warped FBM fluid advection, turbulent energy filaments,
 * gravitational lensing around the central Living Lens, pointer vortex interaction,
 * and smooth violet-cyan-magenta light diffusion with a protective dark sanctuary
 * behind the central timer numerals.
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

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

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

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.52;
  mat2 m = rot2(0.64);
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p = m * p * 2.04 + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return v;
}

void main() {
  // Normalized aspect-corrected coordinates centered on the Living Lens (0, -0.02)
  vec2 centered = (vUv - vec2(0.5, 0.48)) * vec2(uAspect, 1.0);
  float dist = length(centered);

  // Subtle Pointer Vortex Perturbation
  vec2 ptr = (uPointer - vec2(0.5, 0.48)) * vec2(uAspect, 1.0);
  vec2 toPtr = centered - ptr;
  float ptrDist = length(toPtr);
  float ptrInfluence = exp(-ptrDist * ptrDist * 5.5) * 0.14;
  vec2 ptrSwirl = vec2(-toPtr.y, toPtr.x) * ptrInfluence;

  // Relativistic Gravitational Lensing & Frame-Dragging around the Living Lens
  float einsteinRingRadius = 0.27;
  float lensDeflection = uGravityStrength * exp(-pow((dist - einsteinRingRadius) * 4.2, 2.0));
  vec2 warped = rot2(lensDeflection * 0.85) * (centered + ptrSwirl);
  // Radial gravitational pull near the event horizon rim
  warped *= 1.0 - lensDeflection * 0.18;

  float t = uTime * 0.14;

  // Dual-Cascade Domain-Warped Fluid Simulation (q -> r -> f)
  vec2 q = vec2(
    fbm(warped * 2.15 + vec2(0.0, t * 0.9)),
    fbm(warped * 2.15 + vec2(5.2, 1.3 - t * 0.75))
  );

  vec2 r = vec2(
    fbm(warped * 2.55 + 2.9 * q + vec2(1.7 + t * 0.55, 9.2)),
    fbm(warped * 2.55 + 2.9 * q + vec2(8.3 - t * 0.45, 2.8))
  );

  float fluidDensity = fbm(warped * 2.3 + (2.6 + uTurbulence * 1.4) * r);

  // High-frequency turbulent energy currents & plasma ridges
  float ridgeA = 1.0 - abs(sin((fluidDensity + r.x * 0.65) * 6.28318));
  float energyFilament = pow(clamp(ridgeA, 0.0, 1.0), 3.6) * (0.65 + uAudioAmp * 0.6);

  // Einstein-ring gravitational horizon glow around the Living Lens perimeter
  float horizonHalo = exp(-pow((dist - 0.255) * 7.5, 2.0)) * (0.48 + uAudioAmp * 0.35);

  // Smooth Violet - Cyan - Magenta Volumetric Light Diffusion with Deep Cosmic Valleys
  float cloudMask = pow(smoothstep(0.16, 0.82, fluidDensity), 1.35);
  vec3 nebulaColor = uColorDeep;
  nebulaColor = mix(
    nebulaColor,
    uColorViolet * 0.88,
    cloudMask
  );
  nebulaColor = mix(
    nebulaColor,
    uColorCyan * 0.9,
    pow(smoothstep(0.28, 0.86, length(q) * 0.86), 1.25) * 0.64
  );
  nebulaColor = mix(
    nebulaColor,
    uColorMagenta * 0.88,
    pow(smoothstep(0.34, 0.92, r.y * fluidDensity * 1.4), 1.2) * 0.72
  );

  // Add luminous plasma filaments and gravitational halo
  nebulaColor += (uColorCyan * 0.52 + uColorMagenta * 0.48) * energyFilament * 0.48;
  nebulaColor += mix(uColorViolet, uColorCyan, 0.55) * horizonHalo * 0.52;

  // Deep-space outer vignette & Central Focus Sanctuary so timer numerals remain 100% legible
  float centralSanctuary = smoothstep(0.13, 0.36, dist);
  float sanctuaryFactor = mix(1.0 - uSanctuaryAlpha, 1.0, centralSanctuary);
  float outerVignette = 1.0 - smoothstep(0.48, 1.08, dist) * 0.58;

  vec3 finalColor = mix(uColorDeep, nebulaColor, sanctuaryFactor * outerVignette);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * GPU-Accelerated Quantum Particle System Vertex Shader
 * Computes 3D orbital stream advection, curl-wave turbulence, and depth-based size attenuation
 * entirely on the GPU.
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

  // Spherical / toroidal quantum stream coordinates
  float radius = length(position.xy);
  float baseAngle = atan(position.y, position.x);

  // Differential Keplerian + fluid vortex angular velocity
  float angularVel = aSpeed * (0.18 + 0.14 / (radius + 0.35));
  float angle = baseAngle + uTime * angularVel;

  // 3D turbulent curl wave displacement
  float waveX = sin(uTime * 0.65 + aPhase * 6.2831) * 0.14 * uTurbulence;
  float waveY = cos(uTime * 0.55 + aPhase * 4.7123) * 0.14 * uTurbulence;
  float waveZ = sin(uTime * 0.45 + radius * 2.2 + aPhase * 3.1415) * 0.28;

  // Breathing radial expansion coupled to audio & fluid turbulence
  float radialPulse = radius * (1.0 + sin(uTime * 0.4 + aPhase * 6.28) * 0.06 + uAudioAmp * 0.08);

  vec3 advectedPos = vec3(
    cos(angle) * radialPulse + waveX,
    sin(angle) * radialPulse + waveY,
    position.z + waveZ
  );

  vec4 mvPosition = modelViewMatrix * vec4(advectedPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Keep central focus timer unobstructed by softly attenuating particles crossing the center
  float screenDist = length(advectedPos.xy);
  float centerClearance = smoothstep(0.45, 1.15, screenDist);

  // Twinkle & depth fade
  float twinkle = 0.55 + 0.45 * sin(uTime * (1.4 + aSpeed * 1.5) + aPhase * 12.566);
  vAlpha = twinkle * centerClearance * smoothstep(-5.5, -0.8, mvPosition.z);

  gl_PointSize = clamp(
    (aScale * (14.0 + uAudioAmp * 8.0) * uPixelRatio) / max(0.8, -mvPosition.z),
    1.5,
    18.0
  );
}
`;

/**
 * GPU-Accelerated Quantum Particle System Fragment Shader
 * Renders soft optical Airy-disk glow points in violet, cyan, magenta, and starlight white.
 */
export const QUANTUM_PARTICLES_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vColorMix;

uniform vec3 uColorViolet;
uniform vec3 uColorCyan;
uniform vec3 uColorMagenta;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord) * 2.0;
  if (r > 1.0) discard;

  // Soft optical Airy-disk radial falloff with bright core
  float glow = pow(1.0 - r, 2.4);
  float core = smoothstep(0.45, 0.0, r) * 0.65;

  vec3 particleColor = mix(uColorViolet, uColorCyan, smoothstep(0.0, 0.5, vColorMix));
  particleColor = mix(particleColor, uColorMagenta, smoothstep(0.5, 1.0, vColorMix));
  particleColor = mix(particleColor, vec3(0.96, 0.97, 1.0), core);

  gl_FragColor = vec4(particleColor, (glow + core) * vAlpha * 0.82);
}
`;
