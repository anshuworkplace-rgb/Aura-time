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
 * Strongly correlates the Quantum Nebula background palette with the central
 * Living Lens Focus Scene (82% scene correlation + 18% cosmic violet-cyan-magenta harmonics)
 * so the central orb and surrounding fluid field feel like one unified system.
 */
export function interpolateNebulaSpectrum(
  scene: FocusSceneConfig,
  sceneBlend = 0.82
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
    deepSpace: mix(baseDeep, sceneBg, 0.75),
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
    flowSpeed: 0.38,
    turbulence: 0.36,
    gravitationalStrength: 0.24,
    centralSanctuaryAlpha: 0.75,
  };
}

/**
 * Custom WGSL Shader Module for WebGPU Quantum Nebula × Calm Fluid Dynamics
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

fn smoothNoise(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  // Quintic C2-continuous interpolation for zero sharp edges
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
  var p = (uv - vec2<f32>(0.5, 0.48)) * vec2<f32>(u.aspect, 1.0);
  let r = length(p);
  let t = u.time * 0.12;
  let q = vec2<f32>(
    silkFluidFbm(p * 1.15 + vec2<f32>(0.0, t)),
    silkFluidFbm(p * 1.15 + vec2<f32>(3.4, -t * 0.8))
  );
  let density = silkFluidFbm(p * 1.2 + q * (1.2 + u.turbulence));
  let radialAura = exp(-r * r * 1.65);
  var col = mix(u.colorDeep, u.colorViolet * 0.55, density * radialAura);
  col = mix(col, u.colorCyan * 0.5, q.x * radialAura * 0.65);
  col = mix(col, u.colorMagenta * 0.45, q.y * radialAura * 0.55);
  return col;
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
 * Fragment Shader for Calm, Edgeless, Correlated Quantum Nebula × GPU Fluid Dynamics
 * Uses C2-continuous quintic interpolation and low-frequency harmonic fluid advection
 * so there are zero harsh contour lines or jagged edges. The fluid field radiates
 * outward from the central Living Lens orb and shares its exact color physics and
 * breathing rhythm.
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

// Low-frequency 3-octave velvety fluid FBM (eliminates crinkles and sharp edges)
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

void main() {
  // Aspect-corrected coordinates centered on the Living Lens orb (0.5, 0.48)
  vec2 centered = (vUv - vec2(0.5, 0.48)) * vec2(uAspect, 1.0);
  float dist = length(centered);

  // Gentle pointer flow perturbation (wide, soft Gaussian radius)
  vec2 ptr = (uPointer - vec2(0.5, 0.48)) * vec2(uAspect, 1.0);
  vec2 toPtr = centered - ptr;
  float ptrInfluence = exp(-dot(toPtr, toPtr) * 2.4) * 0.09;
  vec2 ptrFlow = vec2(-toPtr.y, toPtr.x) * ptrInfluence;

  // Gentle, edgeless gravitational frame-dragging coupled to the central orb
  float softTwist = uGravityStrength * 0.45 * exp(-dist * dist * 2.2);
  vec2 warped = rot2(softTwist) * (centered + ptrFlow);

  float t = uTime * 0.16;

  // Smooth Domain-Warped Silk Fluid Advection (low frequency, calm, velvety)
  vec2 q = vec2(
    calmFluidFbm(warped * 1.12 + vec2(0.0, t * 0.85)),
    calmFluidFbm(warped * 1.12 + vec2(4.2, 1.7 - t * 0.7))
  );

  vec2 r = vec2(
    calmFluidFbm(warped * 1.28 + 1.45 * q + vec2(1.7 + t * 0.45, 6.2)),
    calmFluidFbm(warped * 1.28 + 1.45 * q + vec2(5.8 - t * 0.4, 2.4))
  );

  float fluidField = calmFluidFbm(warped * 1.18 + (1.2 + uTurbulence * 0.65) * r);

  // Soft harmonic wave coupling that mirrors the central Living Lens internal caustics
  float orbHarmonicA = 0.5 + 0.5 * sin(warped.x * 2.4 + warped.y * 1.8 + t * 1.4);
  float orbHarmonicB = 0.5 + 0.5 * cos(warped.x * 1.9 - warped.y * 2.2 - t * 1.1);

  // Radial correlation envelope:
  // The fluid field emanates from the central orb and diffuses smoothly into the calm night sky
  float coreCoupling = exp(-dist * dist * 1.55) * (0.78 + uAudioAmp * 0.22);
  float ambientReach = exp(-dist * dist * 0.52);
  float radialEnvelope = mix(ambientReach * 0.48, 1.0, coreCoupling);

  // Velvety Violet - Cyan - Magenta Diffusion correlated with the orb's internal palette
  vec3 fluidColor = uColorDeep;
  fluidColor = mix(
    fluidColor,
    uColorViolet * 0.62,
    smoothstep(0.18, 0.85, fluidField) * radialEnvelope
  );
  fluidColor = mix(
    fluidColor,
    uColorCyan * 0.58,
    smoothstep(0.22, 0.88, q.x * 0.65 + orbHarmonicA * 0.35) * radialEnvelope * 0.72
  );
  fluidColor = mix(
    fluidColor,
    uColorMagenta * 0.52,
    smoothstep(0.26, 0.9, r.y * 0.65 + orbHarmonicB * 0.35) * radialEnvelope * 0.62
  );

  // Soft, edgeless subsurface bloom directly around and behind the Living Lens orb
  // so the orb and background feel continuously connected without a stark gap
  float sharedOrbBloom = exp(-dist * dist * 4.2) * (0.28 + uAudioAmp * 0.14);
  fluidColor += mix(uColorViolet, uColorCyan, orbHarmonicA) * sharedOrbBloom;

  // Gentle, feathered optical calm directly behind the timer numerals (subtle, not a harsh black hole)
  float textCalm = mix(0.68, 1.0, smoothstep(0.0, 0.38, dist));
  // Soft outer screen edge vignette
  float outerCalm = 1.0 - smoothstep(0.55, 1.25, dist) * 0.45;

  vec3 finalColor = mix(uColorDeep, fluidColor, textCalm * outerCalm);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

/**
 * GPU-Accelerated Quantum Particle System Vertex Shader
 * Soft, calm, bokeh-like quantum motes that drift in harmony with the central orb.
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

  // Calm, laminar orbital drift synchronized with the central orb's flow
  float angularVel = aSpeed * (0.09 + 0.07 / (radius + 0.45));
  float angle = baseAngle + uTime * angularVel;

  float waveX = sin(uTime * 0.42 + aPhase * 6.2831) * 0.1 * uTurbulence;
  float waveY = cos(uTime * 0.38 + aPhase * 4.7123) * 0.1 * uTurbulence;
  float waveZ = sin(uTime * 0.3 + radius * 1.8 + aPhase * 3.1415) * 0.22;

  float radialPulse = radius * (1.0 + sin(uTime * 0.32 + aPhase * 6.28) * 0.04 + uAudioAmp * 0.05);

  vec3 advectedPos = vec3(
    cos(angle) * radialPulse + waveX,
    sin(angle) * radialPulse + waveY,
    position.z + waveZ
  );

  vec4 mvPosition = modelViewMatrix * vec4(advectedPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Softly attenuate particles directly behind the timer text while keeping orb & halo connected
  float screenDist = length(advectedPos.xy);
  float centerClearance = smoothstep(0.28, 0.85, screenDist);
  float outerFade = 1.0 - smoothstep(1.8, 3.1, screenDist);

  float twinkle = 0.5 + 0.5 * sin(uTime * (0.9 + aSpeed * 0.8) + aPhase * 12.566);
  vAlpha = twinkle * centerClearance * outerFade * smoothstep(-5.2, -0.9, mvPosition.z);

  gl_PointSize = clamp(
    (aScale * (11.0 + uAudioAmp * 5.0) * uPixelRatio) / max(0.9, -mvPosition.z),
    1.5,
    14.0
  );
}
`;

/**
 * GPU-Accelerated Quantum Particle System Fragment Shader
 * Feather-soft radial Gaussian glow with zero hard edges.
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

  // Ultra-soft Gaussian bokeh falloff (no sharp point edges)
  float glow = exp(-r * r * 4.2) * (1.0 - r);

  vec3 particleColor = mix(uColorViolet, uColorCyan, smoothstep(0.0, 0.5, vColorMix));
  particleColor = mix(particleColor, uColorMagenta, smoothstep(0.5, 1.0, vColorMix));

  gl_FragColor = vec4(particleColor, glow * vAlpha * 0.48);
}
`;
