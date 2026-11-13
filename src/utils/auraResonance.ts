import { ChamberId, OrbDesignId } from '../types/aura';

export interface ResonanceSoundPreset {
  /** Canonical ChamberId used across storage, sessions, and audio engine */
  id: ChamberId;
  /** Slug alias matching the 6 preset names */
  slug:
    | 'rain-chamber'
    | 'ocean-drift'
    | 'forest-echo'
    | 'cosmic-silence'
    | 'ember-glow'
    | 'celestial-tone';
  /** Display name required by AURA RESONANCE specification */
  name:
    | 'Rain Chamber'
    | 'Ocean Drift'
    | 'Forest Echo'
    | 'Cosmic Silence'
    | 'Ember Glow'
    | 'Celestial Tone';
  subtitle: string;
  description: string;
  primaryHex: string;
  secondaryHex: string;
  primaryRgb: [number, number, number];
  secondaryRgb: [number, number, number];
  /** Angle around the central visual object in radians (-PI/2 = top, clockwise) */
  orbitAngleRad: number;
}

/**
 * The 6 shared AURA RESONANCE sound presets available across all 3 visual themes:
 * 1. Rain Chamber
 * 2. Ocean Drift
 * 3. Forest Echo
 * 4. Cosmic Silence
 * 5. Ember Glow
 * 6. Celestial Tone
 */
export const RESONANCE_SOUND_PRESETS: ResonanceSoundPreset[] = [
  {
    id: 'rain-chamber',
    slug: 'rain-chamber',
    name: 'Rain Chamber',
    subtitle: 'Conservatory Rain',
    description:
      'Refracted rainfall across dark skylight glass with cool acoustic resonance.',
    primaryHex: '#2FE8FF',
    secondaryHex: '#8A5CFF',
    primaryRgb: [0.184, 0.91, 1.0],
    secondaryRgb: [0.541, 0.361, 1.0],
    orbitAngleRad: -Math.PI / 2, // 12 o'clock
  },
  {
    id: 'ocean-drift',
    slug: 'ocean-drift',
    name: 'Ocean Drift',
    subtitle: 'Pelagic Swell',
    description:
      'Long-period nocturnal ocean swells drifting softly over deep volcanic stone.',
    primaryHex: '#00D2FF',
    secondaryHex: '#5CE1E6',
    primaryRgb: [0.0, 0.824, 1.0],
    secondaryRgb: [0.361, 0.882, 0.902],
    orbitAngleRad: -Math.PI / 6, // 2 o'clock
  },
  {
    id: 'forest-echo',
    slug: 'forest-echo',
    name: 'Forest Echo',
    subtitle: 'Canopy Breeze',
    description:
      'High-altitude cedar wind and bioluminescent nocturnal canopy stillness.',
    primaryHex: '#9EFF6E',
    secondaryHex: '#2FE8FF',
    primaryRgb: [0.62, 1.0, 0.431],
    secondaryRgb: [0.184, 0.91, 1.0],
    orbitAngleRad: Math.PI / 6, // 4 o'clock
  },
  {
    id: 'cosmic-silence',
    slug: 'cosmic-silence',
    name: 'Cosmic Silence',
    subtitle: 'Deep Horizon',
    description:
      'Weightless sub-bass hull harmonics and tranquil stellar stillness in low orbit.',
    primaryHex: '#8A5CFF',
    secondaryHex: '#C084FC',
    primaryRgb: [0.541, 0.361, 1.0],
    secondaryRgb: [0.753, 0.518, 0.988],
    orbitAngleRad: Math.PI / 2, // 6 o'clock
  },
  {
    id: 'ember-glow',
    slug: 'ember-glow',
    name: 'Ember Glow',
    subtitle: 'Warm Hearth',
    description:
      'Gentle amber hearth crackle, warm analog resonance, and soft glowing embers.',
    primaryHex: '#FFB08A',
    secondaryHex: '#FF5D88',
    primaryRgb: [1.0, 0.69, 0.541],
    secondaryRgb: [1.0, 0.365, 0.533],
    orbitAngleRad: (5 * Math.PI) / 6, // 8 o'clock
  },
  {
    id: 'celestial-tone',
    slug: 'celestial-tone',
    name: 'Celestial Tone',
    subtitle: 'Harmonic Fifths',
    description:
      'Slow-breathing crystalline fifth intervals on a glass-resonator polyphonic synth.',
    primaryHex: '#F492F0',
    secondaryHex: '#2FE8FF',
    primaryRgb: [0.957, 0.573, 0.941],
    secondaryRgb: [0.184, 0.91, 1.0],
    orbitAngleRad: (-5 * Math.PI) / 6, // 10 o'clock
  },
];

/**
 * Resolves any ChamberId or legacy preset slug to one of the 6 canonical ResonanceSoundPresets.
 */
export function getResonancePresetByChamberId(
  chamberId: ChamberId | string
): ResonanceSoundPreset {
  const direct = RESONANCE_SOUND_PRESETS.find(
    (p) => p.id === chamberId || p.slug === chamberId
  );
  if (direct) return direct;

  if (chamberId === 'coastal-static') return RESONANCE_SOUND_PRESETS[1]; // Ocean Drift
  if (chamberId === 'forest-2am') return RESONANCE_SOUND_PRESETS[2]; // Forest Echo
  if (
    chamberId === 'low-orbit' ||
    chamberId === 'brown-noise' ||
    chamberId === 'deep-quiet'
  ) {
    return RESONANCE_SOUND_PRESETS[3]; // Cosmic Silence
  }
  if (chamberId === 'vinyl-library' || chamberId === 'afterhours-cafe') {
    return RESONANCE_SOUND_PRESETS[4]; // Ember Glow
  }
  if (chamberId === 'soft-drone') return RESONANCE_SOUND_PRESETS[5]; // Celestial Tone
  return RESONANCE_SOUND_PRESETS[0];
}

/**
 * Equal-power crossfade gain curve calculator (0..1 transition progress).
 * Preserves constant perceived acoustic power (fadeOut^2 + fadeIn^2 = 1)
 * to eliminate dips or clicks during sound preset transitions.
 */
export function computeEqualPowerCrossfadeGains(progress: number): {
  fadeOutGain: number;
  fadeInGain: number;
} {
  const t = Math.max(0, Math.min(1, progress));
  const angle = t * Math.PI * 0.5;
  return {
    fadeOutGain: Number(Math.cos(angle).toFixed(6)),
    fadeInGain: Number(Math.sin(angle).toFixed(6)),
  };
}

/**
 * Generates Float32Array equal-power curves for Web Audio GainNode.setValueCurveAtTime.
 */
export function buildEqualPowerCrossfadeCurves(
  steps = 32,
  fromGain = 0.82,
  toGain = 0.82
): {
  fadeOutCurve: Float32Array;
  fadeInCurve: Float32Array;
} {
  const count = Math.max(4, steps);
  const fadeOutCurve = new Float32Array(count);
  const fadeInCurve = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const { fadeOutGain, fadeInGain } = computeEqualPowerCrossfadeGains(t);
    fadeOutCurve[i] = Math.max(0.0001, fadeOutGain * fromGain);
    fadeInCurve[i] = Math.max(0.0001, fadeInGain * toGain);
  }
  return { fadeOutCurve, fadeInCurve };
}

export interface ResonanceNodeLayout {
  preset: ResonanceSoundPreset;
  index: number;
  /** Position in 620x620 canvas coordinate space */
  x: number;
  y: number;
  /** Normalized percentage position (0..100) for accessible DOM overlay alignment */
  percentX: number;
  percentY: number;
  /** Theme-adapted node radius in canvas pixels */
  baseRadius: number;
  /** Current hover distortion or bud opening factor (0..1) */
  interactionFactor: number;
}

/**
 * Computes theme-specific orbital coordinates and kinematics for the 6 resonance nodes:
 * - Liquid Lens ('original'): Refractive sound droplets orbiting the liquid portal perimeter.
 * - Celestial Jelly ('celestial-jelly'): Luminous bioluminescent particles coupled to the jellyfish's bell contraction and buoyancy drift.
 * - Living Bloom ('living-bloom'): Glowing botanical buds swaying with the flower's corolla breathing cycle.
 */
export function computeResonanceNodesLayout(params: {
  orbDesign: OrbDesignId;
  timeSec: number;
  revealProgress: number; // 0 (collapsed inside center) -> 1 (fully revealed around object)
  hoveredIndex: number | null;
  activeChamberId: ChamberId;
  bellContraction?: number; // 0..1 for Celestial Jelly
  bloomOpenness?: number; // 0..1 for Living Bloom
}): ResonanceNodeLayout[] {
  const {
    orbDesign,
    timeSec,
    revealProgress,
    hoveredIndex,
    activeChamberId,
    bellContraction = 0.35,
    bloomOpenness = 0.72,
  } = params;

  const cx = 310;
  const cy = 310;
  const easedReveal = 1 - Math.pow(1 - Math.max(0, Math.min(1, revealProgress)), 3);

  return RESONANCE_SOUND_PRESETS.map((preset, idx) => {
    const isHovered = hoveredIndex === idx;
    const isSelected = preset.id === activeChamberId;

    let orbitRadius = 242;
    let angleOffset = 0;
    let verticalBob = 0;
    let horizontalDrift = 0;
    let baseRadius = 12;

    if (orbDesign === 'original') {
      // LIQUID LENS – Ripple Portal droplets with organic capillary oscillation
      orbitRadius =
        (90 + easedReveal * 148) +
        Math.sin(timeSec * 1.35 + idx * 1.05) * 4.5;
      angleOffset = Math.sin(timeSec * 0.45 + idx * 0.9) * 0.035;
      baseRadius = isHovered ? 16.5 : isSelected ? 14 : 11.5;
    } else if (orbDesign === 'celestial-jelly') {
      // CELESTIAL JELLY – Resonance Halo particles orbiting the bell & following its propulsion
      const bellBreath = (bellContraction - 0.35) * 18;
      orbitRadius =
        (82 + easedReveal * 154) -
        bellBreath * 0.45 +
        Math.cos(timeSec * 1.1 + idx * 1.2) * 5.0;
      angleOffset =
        Math.sin(timeSec * 0.38 + idx * 0.75) * 0.065 +
        timeSec * 0.04;
      // Follow the jellyfish's vertical propulsion surge & buoyancy bob
      verticalBob =
        Math.cos(timeSec * 0.46) * 8.5 -
        (bellContraction - 0.36) * 14.0 -
        12.0;
      horizontalDrift = Math.sin(timeSec * 0.38) * 6.5;
      baseRadius = isHovered ? 14.5 : isSelected ? 12.5 : 9.5;
    } else {
      // LIVING BLOOM – Sound Blossom buds arranged around the multi-whorl corolla
      const corollaBreath = (bloomOpenness - 0.68) * 22;
      orbitRadius =
        (88 + easedReveal * 150) +
        corollaBreath +
        Math.sin(timeSec * 0.9 + idx * 1.04) * 3.8;
      angleOffset = Math.cos(timeSec * 0.32 + idx * 0.8) * 0.045;
      verticalBob = Math.cos(timeSec * 0.37) * 4.5;
      horizontalDrift = Math.sin(timeSec * 0.31) * 4.5;
      baseRadius = isHovered ? 16.0 : isSelected ? 13.5 : 11.0;
    }

    const theta = preset.orbitAngleRad + angleOffset;
    const x = cx + horizontalDrift + Math.cos(theta) * orbitRadius;
    const y = cy + verticalBob + Math.sin(theta) * orbitRadius;

    return {
      preset,
      index: idx,
      x,
      y,
      percentX: (x / 620) * 100,
      percentY: (y / 620) * 100,
      baseRadius,
      interactionFactor: isHovered ? 1.0 : isSelected ? 0.65 : 0.2,
    };
  });
}

/**
 * Computes the position and scale of a selected Liquid Lens sound droplet
 * as it merges along a curved refractive stream into the center of the lens.
 */
export function computeDropletMergeState(params: {
  startX: number;
  startY: number;
  centerX?: number;
  centerY?: number;
  progress: number; // 0 (at orbit node) -> 1 (merged into lens core)
}): {
  x: number;
  y: number;
  radiusScale: number;
  alpha: number;
  coreAbsorptionGlow: number;
} {
  const {
    startX,
    startY,
    centerX = 310,
    centerY = 310,
    progress,
  } = params;
  const t = Math.max(0, Math.min(1, progress));
  // Smooth cubic ease-in-out with slight spiral curvature toward the lens center
  const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const dx = startX - centerX;
  const dy = startY - centerY;
  const startDist = Math.hypot(dx, dy);
  const startAngle = Math.atan2(dy, dx);

  const spiralAngle = startAngle + ease * 0.38;
  const currentDist = startDist * (1 - ease);

  const x = centerX + Math.cos(spiralAngle) * currentDist;
  const y = centerY + Math.sin(spiralAngle) * currentDist;

  // Droplet elongates slightly mid-flight and condenses into a luminous flash on absorption
  const radiusScale = 1.0 + Math.sin(t * Math.PI) * 0.35 - ease * 0.55;
  const alpha = Math.max(0, 1 - Math.pow(t, 2.6));
  const coreAbsorptionGlow = Math.sin(Math.pow(t, 0.75) * Math.PI);

  return {
    x,
    y,
    radiusScale,
    alpha,
    coreAbsorptionGlow,
  };
}

/**
 * Computes the traveling bioluminescent wave pulse for Celestial Jelly
 * when a Resonance Halo sound particle is selected.
 * Wave travels from the bell apex (0.0) through the bell margin (0.45)
 * and down the oral arms and trailing tentacles (1.0).
 */
export function computeJellyResonancePulseState(elapsedSec: number): {
  active: boolean;
  waveFrontPosition: number; // 0 (bell apex) -> 1 (tentacle tips)
  bellGlowBoost: number;
  tentacleGlowBoost: number;
} {
  const duration = 1.65;
  if (elapsedSec < 0 || elapsedSec > duration) {
    return {
      active: false,
      waveFrontPosition: 0,
      bellGlowBoost: 0,
      tentacleGlowBoost: 0,
    };
  }
  const norm = elapsedSec / duration;
  const waveFrontPosition = 1 - Math.pow(1 - norm, 1.8);
  // Bell illuminates strongly in first half of the wave
  const bellGlowBoost =
    Math.exp(-Math.pow((waveFrontPosition - 0.25) / 0.24, 2)) *
    (1 - norm * 0.4);
  // Tentacles illuminate as the wave cascades downward in the second half
  const tentacleGlowBoost =
    Math.exp(-Math.pow((waveFrontPosition - 0.68) / 0.28, 2)) *
    (1 - norm * 0.25);

  return {
    active: true,
    waveFrontPosition,
    bellGlowBoost,
    tentacleGlowBoost,
  };
}

/**
 * Computes the controlled blooming wave and radial luminous pollen particle burst
 * for Living Bloom when a Sound Blossom bud is selected.
 */
export function computeBloomResonanceBurstState(elapsedSec: number): {
  active: boolean;
  opennessBoost: number;
  nectaryBoost: number;
  pollenWaveRadius: number;
  pollenAlpha: number;
} {
  const duration = 1.85;
  if (elapsedSec < 0 || elapsedSec > duration) {
    return {
      active: false,
      opennessBoost: 0,
      nectaryBoost: 0,
      pollenWaveRadius: 0,
      pollenAlpha: 0,
    };
  }
  const norm = elapsedSec / duration;
  const envelope = Math.sin(Math.pow(norm, 0.65) * Math.PI);
  const opennessBoost = envelope * 0.24;
  const nectaryBoost = envelope * 0.45;
  const pollenWaveRadius = 28 + (1 - Math.pow(1 - norm, 2.2)) * 235;
  const pollenAlpha = Math.max(0, (1 - norm) * Math.min(1, norm * 4.5));

  return {
    active: true,
    opennessBoost,
    nectaryBoost,
    pollenWaveRadius,
    pollenAlpha,
  };
}
