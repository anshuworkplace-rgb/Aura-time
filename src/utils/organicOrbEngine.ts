import {
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';

export interface OrbDesignConfig {
  id: OrbDesignId;
  name: string;
  subtitle: string;
  badge: string;
  description: string;
}

/**
 * Strictly 3 selectable ORB designs as required by the architecture specification.
 */
export const ORB_DESIGNS: readonly OrbDesignConfig[] = [
  {
    id: 'original',
    name: 'Original',
    subtitle: 'Liquid Lens',
    badge: '3D Refractive',
    description:
      'Refractive liquid-glass sculpture with internal caustics and optical Fresnel rim.',
  },
  {
    id: 'celestial-jelly',
    name: 'Celestial Jelly',
    subtitle: 'Pelagic Organism',
    badge: '3D Pelagic',
    description:
      'Translucent pelagic life form with pulsating bell membrane, spring-spline tendrils, and internal bioluminescence.',
  },
  {
    id: 'living-bloom',
    name: 'Living Bloom',
    subtitle: 'Botanical Flora',
    badge: '3D Botanical',
    description:
      'Evolving multi-layered translucent flower with veined petals, living spores, and session-driven growth.',
  },
] as const;

export interface OrganismThemePalette {
  primaryHex: string;
  secondaryHex: string;
  tertiaryHex: string;
  iridescentHex: string;
  rimGlowHex: string;
  baseBgHex: string;
  primaryRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  tertiaryRgb: [number, number, number];
  iridescentRgb: [number, number, number];
}

export function hexToRgb255(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return [138, 92, 255];
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [138, 92, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbaString(
  rgb: [number, number, number],
  alpha: number
): string {
  const a = Math.max(0, Math.min(1, alpha));
  const isNormalized =
    rgb[0] <= 1.0 &&
    rgb[1] <= 1.0 &&
    rgb[2] <= 1.0 &&
    (rgb[0] > 0 || rgb[1] > 0 || rgb[2] > 0);
  const r = isNormalized ? Math.round(rgb[0] * 255) : Math.round(rgb[0]);
  const g = isNormalized ? Math.round(rgb[1] * 255) : Math.round(rgb[1]);
  const b = isNormalized ? Math.round(rgb[2] * 255) : Math.round(rgb[2]);
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

/**
 * Dynamically maps any of the 5 existing FocusScene colour themes into a cohesive
 * subsurface, membrane/petal, vein, and particle palette.
 */
export function computeThemeOrganismPalette(
  scene: FocusSceneConfig,
  phase: TimerPhase = 'focus'
): OrganismThemePalette {
  const isBreak = phase === 'break';
  const primaryHex = isBreak ? '#FFB08A' : scene.colors.primary;
  const secondaryHex = isBreak ? '#22E5A8' : scene.colors.secondary;
  const tertiaryHex = scene.colors.tertiary;
  const iridescentHex = scene.colors.iridescent;
  const rimGlowHex = isBreak ? '#FFB08A' : scene.colors.rimGlow;

  return {
    primaryHex,
    secondaryHex,
    tertiaryHex,
    iridescentHex,
    rimGlowHex,
    baseBgHex: scene.colors.baseBg,
    primaryRgb: hexToRgb255(primaryHex),
    secondaryRgb: hexToRgb255(secondaryHex),
    tertiaryRgb: hexToRgb255(tertiaryHex),
    iridescentRgb: hexToRgb255(iridescentHex),
  };
}

export interface OrbStateParameters {
  motionSpeed: number;
  breathingAmplitude: number;
  luminescence: number;
  particleSpeed: number;
  expansionScale: number;
  saturation: number;
}

/**
 * Synchronizes the ORB's biological rhythm with the current timer state and phase:
 * Idle, Deep Work (running), Paused, Short/Long Break, and Session Completion.
 */
export function computeOrbStateParameters(
  status: TimerStatus,
  phase: TimerPhase,
  progress: number,
  audioAmplitude: number,
  reducedMotion: boolean,
  totalSeconds = 2700
): OrbStateParameters {
  if (reducedMotion) {
    return {
      motionSpeed: 0.05,
      breathingAmplitude: 0.15,
      luminescence: 0.78,
      particleSpeed: 0.08,
      expansionScale: 1.0,
      saturation: status === 'paused' ? 0.45 : 1.0,
    };
  }

  const clampedAudio = Math.max(0, Math.min(1, audioAmplitude));
  const clampedProgress = Math.max(0, Math.min(1, progress));

  if (status === 'paused') {
    return {
      motionSpeed: 0.12,
      breathingAmplitude: 0.22,
      luminescence: 0.62,
      particleSpeed: 0.14,
      expansionScale: 0.97,
      saturation: 0.42,
    };
  }

  if (status === 'completed') {
    return {
      motionSpeed: 1.18,
      breathingAmplitude: 1.25,
      luminescence: 1.32,
      particleSpeed: 1.35,
      expansionScale: 1.08,
      saturation: 1.12,
    };
  }

  if (status === 'running') {
    if (phase === 'break') {
      const isLongBreak = totalSeconds >= 15 * 60;
      return {
        motionSpeed: isLongBreak ? 0.48 : 0.56,
        breathingAmplitude: isLongBreak ? 0.88 : 0.76,
        luminescence: 0.88,
        particleSpeed: isLongBreak ? 0.42 : 0.52,
        expansionScale: isLongBreak ? 1.05 : 1.02,
        saturation: 0.94,
      };
    }

    // Deep Work (running focus)
    return {
      motionSpeed: 0.82 + clampedProgress * 0.16 + clampedAudio * 0.24,
      breathingAmplitude: 0.92 + clampedAudio * 0.28,
      luminescence: 0.96 + clampedProgress * 0.14 + clampedAudio * 0.2,
      particleSpeed: 0.85 + clampedAudio * 0.3,
      expansionScale: 1.02 + clampedAudio * 0.04,
      saturation: 1.04,
    };
  }

  // Idle state: serene, subtle ambient breathing
  return {
    motionSpeed: 0.52,
    breathingAmplitude: 0.58,
    luminescence: 0.84,
    particleSpeed: 0.48,
    expansionScale: 1.0,
    saturation: 0.98,
  };
}

export interface OrbRipple {
  id: number;
  x: number; // canvas coordinate (0..620)
  y: number; // canvas coordinate (0..620)
  radius: number;
  maxRadius: number;
  intensity: number;
}

// ============================================================================
// DESIGN 1: CELESTIAL JELLY — PROCEDURAL PELAGIC ORGANISM ENGINE
// ============================================================================

export interface JellyBellDynamics {
  contraction: number; // 0 (relaxed glide) .. 1 (peak power stroke)
  radialScale: number; // horizontal bell flare/contraction
  verticalStretch: number; // dome elongation during propulsion
  marginWavePhase: number;
  subsurfacePulse: number;
}

/**
 * Computes an authentic, asymmetric jellyfish propulsion cycle:
 * A smooth, muscular bell contraction followed by an elastic expansion and
 * weightless pelagic glide using multi-frequency non-repeating harmonics.
 */
export function computeJellyBellContraction(time: number): JellyBellDynamics {
  // Primary propulsion cycle (~5.2s period) modulated by a secondary breath (~8.7s)
  const rawCycle = (time * 0.32) % 1;
  // Asymmetric power stroke (0..0.38) + slow recovery & pelagic glide (0.38..1.0)
  let contraction = 0;
  if (rawCycle < 0.38) {
    const u = rawCycle / 0.38;
    contraction = Math.sin(u * Math.PI * 0.5);
    contraction = contraction * contraction * (3 - 2 * contraction);
  } else {
    const u = (rawCycle - 0.38) / 0.62;
    contraction = Math.cos(u * Math.PI * 0.5);
    contraction = Math.pow(Math.max(0, contraction), 1.65);
  }

  const secondaryBreath =
    0.5 + 0.5 * Math.sin(time * 0.71 + Math.cos(time * 0.43) * 0.6);
  const blended = contraction * 0.78 + secondaryBreath * 0.22;

  const radialScale = 1.06 - blended * 0.14;
  const verticalStretch = 0.95 + blended * 0.13;
  const marginWavePhase = time * 1.85 + blended * 1.1;
  const subsurfacePulse = 0.65 + blended * 0.35;

  return {
    contraction: Number(blended.toFixed(4)),
    radialScale: Number(radialScale.toFixed(4)),
    verticalStretch: Number(verticalStretch.toFixed(4)),
    marginWavePhase: Number(marginWavePhase.toFixed(4)),
    subsurfacePulse: Number(subsurfacePulse.toFixed(4)),
  };
}

export interface JellyTentacleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface JellyTentacle {
  id: number;
  kind: 'oral-arm' | 'primary-tendril' | 'delicate-filament';
  anchorRatioX: number; // -0.82 .. 0.82 across subumbrella margin
  anchorDepthY: number;
  baseThickness: number;
  segmentLength: number;
  frequency: number;
  phaseOffset: number;
  colorVariant: 0 | 1 | 2;
  nodes: JellyTentacleNode[];
}

/**
 * Generates 18 diverse tentacles across 3 anatomical classes:
 * - 4 central ruffled oral arms
 * - 8 primary trailing bioluminescent tendrils
 * - 6 delicate outer sensory filaments
 */
export function createJellyTentacles(
  centerX = 310,
  anchorBaseY = 292
): JellyTentacle[] {
  const count = 18;
  const tentacles: JellyTentacle[] = [];

  for (let i = 0; i < count; i++) {
    const norm = (i / (count - 1)) * 2 - 1; // -1 .. 1
    const isOralArm = Math.abs(norm) < 0.36 && i % 2 === 1;
    const isDelicate = i % 3 === 0 && !isOralArm;
    const kind: JellyTentacle['kind'] = isOralArm
      ? 'oral-arm'
      : isDelicate
      ? 'delicate-filament'
      : 'primary-tendril';

    const nodeCount = isOralArm ? 13 : isDelicate ? 11 : 14;
    const segLen = isOralArm
      ? 16.0
      : isDelicate
      ? 13.5 + (i % 3) * 1.8
      : 16.5 + (i % 4) * 1.5;
    const baseThickness = isOralArm ? 6.0 : isDelicate ? 1.5 : 2.8;

    const anchorX = centerX + norm * 136;
    const anchorY = anchorBaseY + Math.cos(norm * Math.PI * 0.5) * 16;

    const nodes: JellyTentacleNode[] = Array.from(
      { length: nodeCount },
      (_, nIdx) => ({
        x: anchorX + norm * nIdx * 1.5 + Math.sin(nIdx * 0.5 + i) * 4,
        y: anchorY + nIdx * segLen,
        vx: 0,
        vy: 0,
      })
    );

    tentacles.push({
      id: i,
      kind,
      anchorRatioX: norm,
      anchorDepthY: Math.cos(norm * Math.PI * 0.5),
      baseThickness,
      segmentLength: segLen,
      frequency: 1.25 + (i % 5) * 0.18,
      phaseOffset: i * 0.92,
      colorVariant: (i % 3) as 0 | 1 | 2,
      nodes,
    });
  }

  return tentacles;
}

/**
 * Advances all tentacle nodes using damped spring-verlet fluid physics,
 * bell propulsion coupling, S-curve travelling waves, and pointer repulsion.
 */
export function stepJellyTentacles(
  tentacles: JellyTentacle[],
  bellCenterX: number,
  bellMarginY: number,
  bellRadiusX: number,
  bellDynamics: JellyBellDynamics,
  time: number,
  dt: number,
  pointerX: number | null,
  pointerY: number | null,
  motionSpeed: number
): void {
  const safeDt = Math.min(0.05, Math.max(0.004, dt));

  for (const t of tentacles) {
    const anchorX =
      bellCenterX +
      t.anchorRatioX * bellRadiusX * 0.82 * bellDynamics.radialScale;
    const archDrop = Math.sin((1 - Math.abs(t.anchorRatioX)) * Math.PI * 0.5);
    const anchorY =
      bellMarginY +
      archDrop * 16 -
      bellDynamics.contraction * 10 * archDrop;

    t.nodes[0].x = anchorX;
    t.nodes[0].y = anchorY;

    for (let idx = 1; idx < t.nodes.length; idx++) {
      const prev = t.nodes[idx - 1];
      const curr = t.nodes[idx];
      const depthFrac = idx / (t.nodes.length - 1);

      // Multi-harmonic S-curve travelling wave down the tentacle column
      const wavePhase =
        time * t.frequency * (0.85 + motionSpeed * 0.35) -
        depthFrac * 4.2 +
        t.phaseOffset;
      const secondaryWave =
        Math.cos(time * 0.82 - depthFrac * 2.8 + t.id * 0.7) * 0.45;
      const swayAmp = (6.0 + depthFrac * 24.0) * (0.7 + motionSpeed * 0.3);

      // Natural bell-flare spread + propulsion convergence
      const radialSpread =
        t.anchorRatioX * depthFrac * (26 - bellDynamics.contraction * 18);
      const targetColumnX =
        anchorX +
        radialSpread +
        (Math.sin(wavePhase) + secondaryWave) * swayAmp;

      const pelagicFloatY =
        prev.y +
        t.segmentLength *
          (0.95 - (1 - bellDynamics.contraction) * 0.06 * depthFrac);

      // Spring-damper attraction toward the undulating vertical column
      const springK = 16.0 - depthFrac * 5.0;
      let ax = (targetColumnX - curr.x) * springK;
      let ay = (pelagicFloatY - curr.y) * springK;

      // Subtle pointer fluid current interaction
      if (pointerX !== null && pointerY !== null) {
        const dx = curr.x - pointerX;
        const dy = curr.y - pointerY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 15000 && distSq > 4) {
          const dist = Math.sqrt(distSq);
          const push = (1 - dist / 122) * 195 * (0.4 + depthFrac * 0.6);
          ax += (dx / dist) * push;
          ay += (dy / dist) * push;
        }
      }

      curr.vx = (curr.vx + ax * safeDt) * 0.82;
      curr.vy = (curr.vy + ay * safeDt) * 0.82;
      curr.x += curr.vx * safeDt * 60;
      curr.y += curr.vy * safeDt * 60;

      // Enforce inextensible spline segment length constraint
      const segDx = curr.x - prev.x;
      const segDy = curr.y - prev.y;
      const segDist = Math.hypot(segDx, segDy) || 1;
      const targetLen = t.segmentLength;
      const diff = (segDist - targetLen) / segDist;
      curr.x -= segDx * diff * 0.82;
      curr.y -= segDy * diff * 0.82;
    }
  }
}

// ============================================================================
// DESIGN 2: LIVING BLOOM — PROCEDURAL BOTANICAL LIFE FORM ENGINE
// ============================================================================

export type BloomCycleStageName =
  | 'partially-closed'
  | 'inner-unfold'
  | 'outer-unfold'
  | 'environmental-drift'
  | 'balanced-open'
  | 'resting-breath'
  | 'natural-renewal';

export interface BloomCycleState {
  stage: BloomCycleStageName;
  innerOpenness: number; // 0.25 .. 1.0
  midOpenness: number; // 0.30 .. 1.0
  outerOpenness: number; // 0.35 .. 1.0
  corollaRotation: number; // subtle radians rotation
  nectaryPulse: number; // 0 .. 1 core luminescence
}

/**
 * Implements the 7-stage continuous biological blooming cycle without
 * mechanical repetition using irrational harmonic phases.
 */
export function computeBloomCycleState(
  time: number,
  status: TimerStatus = 'idle',
  progress = 0
): BloomCycleState {
  // Non-periodic biological breathing wave combining golden-ratio harmonics
  const primaryWave = 0.5 + 0.5 * Math.sin(time * 0.24);
  const phiWave = 0.5 + 0.5 * Math.sin(time * 0.24 * 0.6180339887 + 1.2);
  const microBreath = 0.5 + 0.5 * Math.cos(time * 0.58 - 0.7);

  let baseBloom = primaryWave * 0.58 + phiWave * 0.28 + microBreath * 0.14;

  // Completion triggers a full, radiant flowering event
  if (status === 'completed') {
    baseBloom = 0.96 + 0.04 * microBreath;
  } else if (status === 'running') {
    baseBloom = Math.min(1, baseBloom * 0.75 + progress * 0.22 + 0.12);
  }

  // Staggered inner -> mid -> outer petal unfolding curves
  const innerOpenness = 0.34 + Math.pow(baseBloom, 0.85) * 0.66;
  const midOpenness = 0.38 + Math.pow(baseBloom, 1.05) * 0.62;
  const outerOpenness = 0.44 + Math.pow(baseBloom, 1.25) * 0.56;

  const corollaRotation =
    Math.sin(time * 0.17) * 0.14 + Math.cos(time * 0.11) * 0.08;
  const nectaryPulse = 0.62 + 0.38 * Math.sin(time * 1.15 + phiWave * 2.0);

  let stage: BloomCycleStageName = 'balanced-open';
  if (baseBloom < 0.28) stage = 'partially-closed';
  else if (baseBloom < 0.44) stage = 'inner-unfold';
  else if (baseBloom < 0.62) stage = 'outer-unfold';
  else if (baseBloom < 0.76) stage = 'environmental-drift';
  else if (baseBloom < 0.88) stage = 'balanced-open';
  else if (Math.cos(time * 0.24) < 0) stage = 'resting-breath';
  else stage = 'natural-renewal';

  return {
    stage,
    innerOpenness: Number(innerOpenness.toFixed(4)),
    midOpenness: Number(midOpenness.toFixed(4)),
    outerOpenness: Number(outerOpenness.toFixed(4)),
    corollaRotation: Number(corollaRotation.toFixed(4)),
    nectaryPulse: Number(nectaryPulse.toFixed(4)),
  };
}

export interface BloomGrowthEvolution {
  stageLevel: 1 | 2 | 3 | 4;
  stageTitle: string;
  outerPetalCount: number;
  midPetalCount: number;
  innerPetalCount: number;
  crownPetalCount: number;
  stamenCount: number;
  veinComplexity: number;
}

/**
 * Computes cosmetic botanical growth stages unlocked through accumulated
 * completed focus sessions without altering core timer mechanics.
 */
export function computeBloomGrowthStage(
  completedSessionsCount: number
): BloomGrowthEvolution {
  const count = Math.max(0, Math.floor(completedSessionsCount));
  if (count >= 12) {
    return {
      stageLevel: 4,
      stageTitle: 'Celestial Flora · Stage IV',
      outerPetalCount: 12,
      midPetalCount: 10,
      innerPetalCount: 8,
      crownPetalCount: 7,
      stamenCount: 28,
      veinComplexity: 5,
    };
  }
  if (count >= 8) {
    return {
      stageLevel: 3,
      stageTitle: 'Luminous Sanctuary · Stage III',
      outerPetalCount: 11,
      midPetalCount: 9,
      innerPetalCount: 7,
      crownPetalCount: 6,
      stamenCount: 24,
      veinComplexity: 4,
    };
  }
  if (count >= 4) {
    return {
      stageLevel: 2,
      stageTitle: 'Awakening Corolla · Stage II',
      outerPetalCount: 10,
      midPetalCount: 8,
      innerPetalCount: 6,
      crownPetalCount: 5,
      stamenCount: 18,
      veinComplexity: 3,
    };
  }
  return {
    stageLevel: 1,
    stageTitle: 'Nascent Bloom · Stage I',
    outerPetalCount: 8,
    midPetalCount: 7,
    innerPetalCount: 6,
    crownPetalCount: 4,
    stamenCount: 14,
    veinComplexity: 3,
  };
}

export interface ProceduralPetal {
  id: string;
  layer: 'outer' | 'mid' | 'inner' | 'crown';
  baseAngle: number;
  angleAsymmetry: number;
  baseLength: number;
  baseWidth: number;
  tipPointiness: number;
  curvatureBias: number;
  phaseOffset: number;
  colorShift: 0 | 1 | 2;
  veinSeeds: number[];
}

/**
 * Generates individually shaped, naturally asymmetric translucent petals across
 * 4 concentric botanical layers so no two petals are identical.
 */
export function generateBloomPetals(
  growth: BloomGrowthEvolution
): ProceduralPetal[] {
  const petals: ProceduralPetal[] = [];

  const layers: Array<{
    layer: ProceduralPetal['layer'];
    count: number;
    baseLen: number;
    baseWid: number;
    angleOffset: number;
  }> = [
    {
      layer: 'outer',
      count: growth.outerPetalCount,
      baseLen: 196,
      baseWid: 68,
      angleOffset: 0,
    },
    {
      layer: 'mid',
      count: growth.midPetalCount,
      baseLen: 162,
      baseWid: 58,
      angleOffset: Math.PI / growth.midPetalCount,
    },
    {
      layer: 'inner',
      count: growth.innerPetalCount,
      baseLen: 126,
      baseWid: 46,
      angleOffset: Math.PI / (growth.innerPetalCount * 1.5),
    },
    {
      layer: 'crown',
      count: growth.crownPetalCount,
      baseLen: 88,
      baseWid: 34,
      angleOffset: 0.42,
    },
  ];

  layers.forEach((cfg, lIdx) => {
    for (let i = 0; i < cfg.count; i++) {
      const seed = (lIdx + 1) * 37 + i * 53;
      const pseudo1 = Math.sin(seed * 1.73) * 0.5 + 0.5;
      const pseudo2 = Math.cos(seed * 2.41) * 0.5 + 0.5;
      const pseudo3 = Math.sin(seed * 3.19);

      const stepAngle = (Math.PI * 2) / cfg.count;
      const angleAsymmetry = pseudo3 * 0.065;
      const baseAngle = cfg.angleOffset + i * stepAngle + angleAsymmetry;

      const baseLength = cfg.baseLen * (0.91 + pseudo1 * 0.18);
      const baseWidth = cfg.baseWid * (0.89 + pseudo2 * 0.22);
      const tipPointiness = 0.55 + pseudo1 * 0.35;
      const curvatureBias = pseudo3 * 12;

      const veinSeeds = Array.from(
        { length: growth.veinComplexity },
        (_, vIdx) => 0.22 + (vIdx / growth.veinComplexity) * 0.65 + pseudo3 * 0.04
      );

      petals.push({
        id: `${cfg.layer}-${i}`,
        layer: cfg.layer,
        baseAngle,
        angleAsymmetry,
        baseLength,
        baseWidth,
        tipPointiness,
        curvatureBias,
        phaseOffset: i * 0.91 + lIdx * 1.4,
        colorShift: ((i + lIdx) % 3) as 0 | 1 | 2,
        veinSeeds,
      });
    }
  });

  return petals;
}

// ============================================================================
// WEBGPU WGSL SHADER MODULES FOR CELESTIAL JELLY & LIVING BLOOM
// ============================================================================

export const CELESTIAL_JELLY_WGSL = /* wgsl */ `
struct JellyOpticsUniforms {
  time: f32,
  contraction: f32,
  fresnelPower: f32,
  colorPrimary: vec3<f32>,
  colorSecondary: vec3<f32>,
  colorIridescent: vec3<f32>,
};

fn evaluateJellySubsurface(uv: vec2<f32>, normalZ: f32, u: JellyOpticsUniforms) -> vec4<f32> {
  let fresnel = pow(1.0 - clamp(normalZ, 0.0, 1.0), u.fresnelPower);
  let canalWave = 0.5 + 0.5 * cos(atan2(uv.y, uv.x) * 8.0 + u.time * 1.2);
  let scatter = mix(u.colorPrimary, u.colorSecondary, fresnel * 0.72 + canalWave * 0.28);
  let rim = u.colorIridescent * fresnel * (0.65 + u.contraction * 0.35);
  let alpha = clamp(0.18 + fresnel * 0.64 + canalWave * 0.12, 0.12, 0.88);
  return vec4<f32>(scatter + rim, alpha);
}
`;

export const LIVING_BLOOM_WGSL = /* wgsl */ `
struct BloomPetalUniforms {
  time: f32,
  openness: f32,
  veinGlow: f32,
  colorPrimary: vec3<f32>,
  colorSecondary: vec3<f32>,
  colorEdge: vec3<f32>,
};

fn evaluatePetalSubsurface(uv: vec2<f32>, u: BloomPetalUniforms) -> vec4<f32> {
  let edgeDist = min(min(uv.x, 1.0 - uv.x), 1.0 - uv.y);
  let edgeLume = exp(-edgeDist * 9.0);
  let veinPattern = exp(-abs(sin(uv.x * 18.0 - uv.y * 6.0)) * 7.5) * u.veinGlow;
  let bodyCol = mix(u.colorPrimary, u.colorSecondary, uv.y * 0.75);
  let finalCol = bodyCol + u.colorEdge * (edgeLume * 0.65 + veinPattern * 0.45);
  let alpha = clamp(0.24 + edgeLume * 0.52 + veinPattern * 0.18, 0.15, 0.90);
  return vec4<f32>(finalCol, alpha);
}
`;
