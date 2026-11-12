import * as THREE from 'three';
import { FocusSceneConfig, TimerPhase } from '../types/aura';
import {
  JellyBellDynamics,
  computeJellyBellContraction,
  computeOrbStateParameters,
  computeThemeOrganismPalette,
} from './organicOrbEngine';
import { hexToNormalizedRgb } from './quantumNebulaShaders';

// ============================================================================
// CONSTANTS & ANATOMICAL SPECIFICATIONS (MASTER ARTISTIC RECONSTRUCTION)
// ============================================================================

export const JELLY_RADIAL_LOBES = 16;
export const JELLY_ORAL_ARM_COUNT = 8;
export const JELLY_MARGINAL_FILAMENT_COUNT = 16;
export const JELLY_PINNATE_FROND_COUNT = 8;
export const JELLY_TOTAL_TENTACLE_CHAINS =
  JELLY_MARGINAL_FILAMENT_COUNT + JELLY_PINNATE_FROND_COUNT; // 24 outer appendages

export interface CelestialJellyColorRig {
  domeCyan: [number, number, number];
  domeBlue: [number, number, number];
  domeViolet: [number, number, number];
  domeMagenta: [number, number, number];
  subumbrellaPeach: [number, number, number];
  coronaRose: [number, number, number];
  coronaChampagne: [number, number, number];
  oralArmCrownPink: [number, number, number];
  oralArmPearl: [number, number, number];
  oralArmMidLavender: [number, number, number];
  oralArmTipCyan: [number, number, number];
  biolumeGold: [number, number, number];
}

/**
 * STAGE G — PERMANENT INTRINSIC COLOUR IDENTITY & ATMOSPHERE INDEPENDENCE
 *
 * Preserves the exact intrinsic anatomical palette of the master artwork
 * (`celestial-jelly-master.png`) across all 5 Aura Time atmospheres:
 * - Bell: Crystalline blue, deep violet, electric cyan, lavender, subtle magenta.
 * - Internal Corona: Rose-pink, coral, lavender, champagne, warm amber.
 * - Central Oral Arms: Rich coral-pink, rose, pearl, lavender, lower cyan-violet tips.
 * - Tentacles: Transparent lavender, fine cyan highlights, subtle pink & amber nodes.
 */
export function computeCelestialJellyColorRig(
  scene: FocusSceneConfig,
  phase: TimerPhase = 'focus'
): CelestialJellyColorRig {
  const theme = computeThemeOrganismPalette(scene, phase);
  const scenePrimary = hexToNormalizedRgb(theme.primaryHex);
  const sceneSecondary = hexToNormalizedRgb(theme.secondaryHex);
  const sceneTertiary = hexToNormalizedRgb(theme.tertiaryHex);
  const sceneIridescent = hexToNormalizedRgb(theme.iridescentHex);

  // Permanent Master Reference Intrinsic Palette (from celestial-jelly-master.png)
  const refCyan: [number, number, number] = [0.22, 0.93, 1.0]; // Electric Cyan #38EDFF
  const refBlue: [number, number, number] = [0.18, 0.45, 1.0]; // Crystalline Cobalt Blue #2E73FF
  const refViolet: [number, number, number] = [0.56, 0.28, 1.0]; // Deep Crystalline Violet #8F47FF
  const refMagenta: [number, number, number] = [1.0, 0.34, 0.78]; // Luminous Magenta-Rose #FF57C7
  const refSubPeach: [number, number, number] = [1.0, 0.56, 0.48]; // Coral-Peach Subumbrella #FF8F7A
  const refCoronaRose: [number, number, number] = [1.0, 0.46, 0.68]; // Rose-Pink Corona Strands #FF75AD
  const refCoronaChampagne: [number, number, number] = [1.0, 0.84, 0.56]; // Warm Champagne-Amber #FFD68F
  const refCrownPink: [number, number, number] = [1.0, 0.60, 0.74]; // Rich Coral-Rose Oral Crown #FF99BD
  const refPearl: [number, number, number] = [1.0, 0.93, 0.97]; // Pearlescent Frill Rim #FFEDF7
  const refMidLavender: [number, number, number] = [0.78, 0.46, 0.98]; // Orchid Lavender #C775FA
  const refTipCyan: [number, number, number] = [0.28, 0.82, 1.0]; // Bioluminescent Plume Cyan #47D1FF
  const refGold: [number, number, number] = [1.0, 0.76, 0.38]; // Warm Amber-Gold Nodes #FFC261

  const mix3 = (
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] => [
    Number((a[0] + (b[0] - a[0]) * t).toFixed(4)),
    Number((a[1] + (b[1] - a[1]) * t).toFixed(4)),
    Number((a[2] + (b[2] - a[2]) * t).toFixed(4)),
  ];

  // Keep intrinsic identity >= 96.5% permanent; atmosphere provides subtle 2-3.5% environmental reflection
  const envTint = scene.id === 'deep-current' && phase === 'focus' ? 0.02 : 0.035;

  return {
    domeCyan: mix3(refCyan, sceneSecondary, envTint),
    domeBlue: mix3(refBlue, scenePrimary, envTint * 0.8),
    domeViolet: mix3(refViolet, scenePrimary, envTint),
    domeMagenta: mix3(refMagenta, sceneTertiary, envTint * 0.7),
    subumbrellaPeach: mix3(refSubPeach, sceneIridescent, envTint * 0.5),
    coronaRose: mix3(refCoronaRose, sceneTertiary, envTint * 0.5),
    coronaChampagne: mix3(refCoronaChampagne, sceneIridescent, envTint * 0.4),
    oralArmCrownPink: mix3(refCrownPink, sceneIridescent, envTint * 0.45),
    oralArmPearl: refPearl,
    oralArmMidLavender: mix3(refMidLavender, scenePrimary, envTint * 0.6),
    oralArmTipCyan: mix3(refTipCyan, sceneSecondary, envTint * 0.65),
    biolumeGold: mix3(refGold, sceneIridescent, envTint * 0.4),
  };
}

// ============================================================================
// STAGE A, B & C: PROCEDURAL 3D ANATOMICAL GEOMETRY BUILDERS
// ============================================================================

/**
 * STAGE A & C: THE CRYSTALLINE BELL
 * Reconstructs the large, rounded, translucent hemispherical bell from `celestial-jelly-master.png`:
 * - High, rounded hemispherical upper dome + secondary puffed lower lobe tier
 * - 16 radial gadrooned lobes with organic multi-harmonic variation
 * - Irregular scalloped lower rim that arches slightly upward on the front-facing side
 *   so the glowing Internal Corona beneath the bell is clearly visible
 */
export function buildCelestialJellyBellGeometry(
  radialSegments = 128,
  meridionalRings = 72
): THREE.BufferGeometry {
  const cols = Math.max(32, radialSegments);
  const rows = Math.max(24, meridionalRings);
  const vertexCount = (rows + 1) * (cols + 1);

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const bellParams = new Float32Array(vertexCount * 4);
  const indices: number[] = [];

  const bellRadius = 1.14;
  const bellHeight = 0.94;

  const sampleBellSurface = (u: number, v: number, target: THREE.Vector3) => {
    const theta = u * Math.PI * 2.0;

    // 16 primary radial lobes + organic multi-harmonic variation
    const organicAzimuth =
      theta * JELLY_RADIAL_LOBES +
      0.15 * Math.sin(theta * 3.0 + 0.7) +
      0.10 * Math.cos(theta * 5.0 - 1.2);
    const lobeCos = Math.cos(organicAzimuth);
    const lobeCrest = Math.pow(0.5 + 0.5 * lobeCos, 0.54);
    const furrowPinch = Math.pow(1.0 - (0.5 + 0.5 * lobeCos), 2.1);

    const organicRimVar =
      1.0 +
      0.16 * Math.sin(theta * 3.0 + 0.4) +
      0.12 * Math.cos(theta * 7.0 - 0.9);

    // Subtle front-facing arch lift (around +Z camera-facing side, sin(theta) > 0)
    // so the camera looks slightly up into the subumbrella cavity to see the Internal Corona!
    const frontArchLift = Math.max(0.0, Math.sin(theta)) * 0.11;

    if (v <= 0.86) {
      const m = v / 0.86; // 0 (apex) .. 1 (scalloped margin)
      const phi = m * Math.PI * 0.52;
      const domeSin = Math.sin(phi);
      const domeCos = Math.cos(phi);

      // Double-tier umbrella contour visible in celestial-jelly-master.png:
      // Rounded upper hemispherical dome + puffed lower gadrooned lobe tier
      const upperTier = Math.exp(-Math.pow((m - 0.36) * 4.0, 2.0)) * 0.042;
      const lowerSkirtPuff =
        Math.exp(-Math.pow((m - 0.75) * 3.6, 2.0)) * 0.068 * lobeCrest;

      const gadroonRadial =
        Math.sin(m * Math.PI * 0.96) *
          (0.086 * lobeCrest - 0.040 * furrowPinch) *
          organicRimVar +
        upperTier +
        lowerSkirtPuff;

      const skirtFlare = 1.0 + Math.pow(m, 2.3) * 0.065;

      // Irregular scalloped lower lappet margin
      const scallopDrop =
        Math.pow(m, 2.5) *
        (0.095 * lobeCrest - 0.044 * furrowPinch) *
        organicRimVar;

      const r = bellRadius * (domeSin * skirtFlare + gadroonRadial);
      const y =
        bellHeight * (domeCos + 0.02) -
        scallopDrop +
        Math.pow(m, 1.6) * frontArchLift;

      target.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
    } else {
      // Translucent inward-curled subumbrella velarium tissue layer (v: 0.86 -> 1.0)
      const lipFrac = (v - 0.86) / 0.14;
      const rimPhi = Math.PI * 0.52;
      const rimSin = Math.sin(rimPhi);
      const rimCos = Math.cos(rimPhi);
      const lowerSkirtPuff =
        Math.exp(-Math.pow((1.0 - 0.75) * 3.6, 2.0)) * 0.068 * lobeCrest;
      const gadroonRadial =
        Math.sin(Math.PI * 0.96) *
          (0.086 * lobeCrest - 0.040 * furrowPinch) *
          organicRimVar +
        lowerSkirtPuff;

      const rimR = bellRadius * (rimSin * 1.065 + gadroonRadial);
      const rimY =
        bellHeight * (rimCos + 0.02) -
        (0.095 * lobeCrest - 0.044 * furrowPinch) * organicRimVar +
        frontArchLift;

      const curlR = rimR * (1.0 - lipFrac * 0.22);
      const curlY = rimY + Math.sin(lipFrac * Math.PI * 0.65) * 0.085;

      target.set(Math.cos(theta) * curlR, curlY, Math.sin(theta) * curlR);
    }
  };

  const pCenter = new THREE.Vector3();
  const pRight = new THREE.Vector3();
  const pUp = new THREE.Vector3();
  const tangentU = new THREE.Vector3();
  const tangentV = new THREE.Vector3();
  const normalVec = new THREE.Vector3();
  const eps = 0.002;

  let vIdx = 0;
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const theta = u * Math.PI * 2.0;
      const organicAzimuth =
        theta * JELLY_RADIAL_LOBES +
        0.15 * Math.sin(theta * 3.0 + 0.7) +
        0.10 * Math.cos(theta * 5.0 - 1.2);
      const lobeCos = Math.cos(organicAzimuth);
      const lobeCrest = Math.pow(0.5 + 0.5 * lobeCos, 0.54);
      const isInner = v > 0.86 ? (v - 0.86) / 0.14 : 0.0;

      sampleBellSurface(u, v, pCenter);
      sampleBellSurface((u + eps) % 1.0, v, pRight);
      sampleBellSurface(u, Math.min(1.0, v + eps), pUp);

      tangentU.subVectors(pRight, pCenter);
      tangentV.subVectors(pUp, pCenter);
      normalVec.crossVectors(tangentV, tangentU).normalize();
      if (normalVec.lengthSq() < 0.001) {
        normalVec.set(0, 1, 0);
      }

      positions[vIdx * 3] = pCenter.x;
      positions[vIdx * 3 + 1] = pCenter.y;
      positions[vIdx * 3 + 2] = pCenter.z;

      normals[vIdx * 3] = normalVec.x;
      normals[vIdx * 3 + 1] = normalVec.y;
      normals[vIdx * 3 + 2] = normalVec.z;

      uvs[vIdx * 2] = u;
      uvs[vIdx * 2 + 1] = v;

      bellParams[vIdx * 4] = v;
      bellParams[vIdx * 4 + 1] = theta;
      bellParams[vIdx * 4 + 2] = lobeCrest;
      bellParams[vIdx * 4 + 3] = isInner;

      vIdx++;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + cols + 1;
      const d = a + 1;
      const e = b + 1;
      indices.push(a, b, d);
      indices.push(b, e, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('aBellParams', new THREE.BufferAttribute(bellParams, 4));
  return geo;
}

/**
 * STAGE B (PART 1): THE INTERNAL CORONA
 * Directly beneath the bell, recreates the warm luminous fibrous structures
 * radiating downwards from the upper central body into the coral-pink oral crown:
 * - 84 individually visible, radiating biological filament ribbons across 3 concentric tiers
 * - Positioned from y = +0.34 down to y = -0.19 so the warm rose-pink, champagne, and amber
 *   corona strands are prominently visible directly beneath the crystalline bell!
 */
export function buildInnerManubriumCoreGeometry(
  strandCount = 84,
  segmentsPerStrand = 18
): THREE.BufferGeometry {
  const numStrands = Math.max(24, strandCount);
  const segs = Math.max(8, segmentsPerStrand);
  const vertsPerStrand = (segs + 1) * 2;
  const totalVerts = numStrands * vertsPerStrand;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices: number[] = [];

  for (let s = 0; s < numStrands; s++) {
    const tier = s % 3; // 0 = inner champagne-gold bundle, 1 = mid rose-pink corona, 2 = outer flaring coral-lavender strands
    const baseAngle =
      (s / numStrands) * Math.PI * 2.0 +
      tier * 0.06 +
      Math.sin(s * 1.9) * 0.035;

    // Radiate from a wide subumbrella dome attachment (topR ~ 0.34..0.64)
    // down into the central oral-arm throat (bottomR ~ 0.09..0.18)
    const topR = 0.32 + tier * 0.15 + (s % 5) * 0.03;
    const midR = 0.21 + tier * 0.11 + Math.sin(s * 2.3) * 0.025;
    const bottomR = 0.09 + tier * 0.048 + Math.cos(s * 1.7) * 0.015;

    const topY = 0.36 - tier * 0.03;
    const bottomY = -0.18 - (1.0 - tier * 0.25) * 0.03;

    const strandHalfW =
      tier === 0 ? 0.015 : tier === 1 ? 0.013 : 0.011;

    const dirX = Math.cos(baseAngle);
    const dirZ = Math.sin(baseAngle);
    const tangX = -dirZ;
    const tangZ = dirX;

    const baseV = s * vertsPerStrand;

    for (let r = 0; r <= segs; r++) {
      const v = r / segs; // 0 = upper subumbrella roof, 1 = lower corona converging into oral crown
      const curveT = Math.pow(v, 0.85);
      const archBow = Math.sin(v * Math.PI) * 0.045 * (tier === 2 ? 1.0 : -0.35);
      const rad =
        THREE.MathUtils.lerp(topR, bottomR, curveT) +
        (midR - (topR + bottomR) * 0.5) * Math.sin(v * Math.PI) +
        archBow;
      const y = THREE.MathUtils.lerp(topY, bottomY, Math.pow(v, 0.92));

      const waveOffset = Math.sin(v * Math.PI * 1.4 + s * 0.8) * 0.012 * (1.0 - v);

      const cx = dirX * rad + tangX * waveOffset;
      const cz = dirZ * rad + tangZ * waveOffset;

      const widthProfile =
        (0.45 + 0.55 * Math.sin(v * Math.PI * 0.9)) * strandHalfW;

      const ribRightX = tangX * 0.72 + 0.28;
      const ribRightZ = tangZ * 0.72;

      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1;
        const vIdx = baseV + r * 2 + side;

        positions[vIdx * 3] = cx + ribRightX * sign * widthProfile;
        positions[vIdx * 3 + 1] = y;
        positions[vIdx * 3 + 2] = cz + ribRightZ * sign * widthProfile;

        normals[vIdx * 3] = dirX;
        normals[vIdx * 3 + 1] = -0.25;
        normals[vIdx * 3 + 2] = dirZ;

        uvs[vIdx * 2] = side + (s / numStrands) * 0.001;
        uvs[vIdx * 2 + 1] = v;
      }
    }

    for (let r = 0; r < segs; r++) {
      const i0 = baseV + r * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geo;
}

// ============================================================================
// STAGE B, D & F: 3D PHYSICS & INDEPENDENT MOVEMENT STATE
// ============================================================================

export interface VerletNode3D {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface OralArmChain3D {
  id: number;
  baseAngle: number;
  radialOffset: number;
  twistRate: number;
  ruffleFrequency: number;
  phaseOffset: number;
  ribbonHalfWidth: number;
  segmentLength: number;
  nodes: VerletNode3D[];
}

export interface TentacleChain3D {
  id: number;
  kind: 'marginal-filament' | 'pinnate-frond';
  lobeIndex: number;
  anchorAngle: number;
  anchorRadiusRatio: number;
  segmentLength: number;
  baseWidth: number;
  frequency: number;
  phaseOffset: number;
  colorVariant: 0 | 1 | 2;
  nodes: VerletNode3D[];
}

export interface CelestialJelly3DRigState {
  oralArms: OralArmChain3D[];
  tentacles: TentacleChain3D[];
  oralArmsGeometry: THREE.BufferGeometry;
  oralArmsPositions: Float32Array;
  oralArmsNormals: Float32Array;
  filamentsGeometry: THREE.BufferGeometry;
  filamentsPositions: Float32Array;
  pinnateFrondsGeometry: THREE.BufferGeometry;
  pinnateFrondsPositions: Float32Array;
  biolumeNodesGeometry: THREE.BufferGeometry;
  biolumeNodesPositions: Float32Array;
  biolumeNodesPhases: Float32Array;
  biolumeNodesColors: Float32Array;
  biolumeNodeCount: number;
}

// High-density 64-node spine × 13 lateral vertices per oral arm for silky-smooth 3D curtains
const ORAL_ARM_SPINE_NODES = 64;
const ORAL_ARM_WIDTH_SEGS = 12;

// 32 nodes per marginal filament / pinnate frond for ultra-smooth fluid S-curves
const FILAMENT_SPINE_NODES = 32;
// 18 pairs of delicate, closely-spaced feathery side-branches per pinnate frond
const PINNATE_BARBULE_PAIRS = 18;
const PINNATE_SEGS_U = 4;

/**
 * Initializes the complete 3D procedural physics rig and pre-allocated
 * dynamic BufferGeometries for:
 * - 8 elaborate, multi-layered ruffled oral arms (with upper cauliflower crown + cascading folds)
 * - 16 fine, gracefully curved marginal filaments of varying lengths
 * - 8 delicate feathery pinnate fronds with 18 pairs of side-branches each
 * - 248 concentrated bioluminescent nodes distributed along the bell clefts, oral arms & tentacles
 */
export function createCelestialJelly3DRig(): CelestialJelly3DRigState {
  // 1. Initialize 8 Distinct, Sculpted Ruffled Oral Arms (staggered lengths, 3D fan spread & separated widths)
  const oralArms: OralArmChain3D[] = [];
  const armLengths = [1.96, 1.46, 2.08, 1.32, 1.82, 1.56, 2.02, 1.40];
  const armHalfWidths = [0.20, 0.15, 0.22, 0.14, 0.19, 0.16, 0.21, 0.15];
  const armRadialOffsets = [0.11, 0.25, 0.16, 0.29, 0.13, 0.27, 0.19, 0.24];
  const armFanSpreadX = [-0.30, -0.19, -0.08, 0.04, 0.15, 0.28, -0.13, 0.11];

  for (let i = 0; i < JELLY_ORAL_ARM_COUNT; i++) {
    const baseAngle =
      (i / JELLY_ORAL_ARM_COUNT) * Math.PI * 2.0 + (i % 2) * 0.22;
    const radialOffset = armRadialOffsets[i];
    const totalArmLen = armLengths[i];
    const segLen = totalArmLen / (ORAL_ARM_SPINE_NODES - 1);
    const nodes: VerletNode3D[] = [];

    for (let n = 0; n < ORAL_ARM_SPINE_NODES; n++) {
      const frac = n / (ORAL_ARM_SPINE_NODES - 1);
      const spiralAngle = baseAngle + frac * 0.76 * (i % 2 === 0 ? 1 : -1);
      const r =
        radialOffset * (0.92 + Math.sin(frac * Math.PI * 0.82) * 0.95) +
        frac * 0.08 * (i % 3);
      nodes.push({
        x:
          Math.cos(spiralAngle) * r +
          armFanSpreadX[i] * Math.pow(frac, 0.75) -
          frac * frac * 0.14,
        // Anchor at y = -0.15 right at the base of the visible Internal Corona!
        y: -0.15 - n * segLen,
        z: Math.sin(spiralAngle) * r,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    oralArms.push({
      id: i,
      baseAngle,
      radialOffset,
      twistRate: (i % 2 === 0 ? 1 : -1) * (2.5 + (i % 3) * 0.42),
      // Smooth 3.5..4.7 macro curtain waves across 64 vertices = 16 vertices per wave (zero jagged triangles!)
      ruffleFrequency: 3.5 + (i % 3) * 0.58,
      phaseOffset: i * 0.94,
      ribbonHalfWidth: armHalfWidths[i],
      segmentLength: segLen,
      nodes,
    });
  }

  // Build high-resolution dynamic BufferGeometry for the 8 Ruffled Oral Arms
  const vertsPerArm = ORAL_ARM_SPINE_NODES * (ORAL_ARM_WIDTH_SEGS + 1);
  const totalOralArmVerts = JELLY_ORAL_ARM_COUNT * vertsPerArm;
  const oralArmsPositions = new Float32Array(totalOralArmVerts * 3);
  const oralArmsNormals = new Float32Array(totalOralArmVerts * 3);
  const oralArmsUvs = new Float32Array(totalOralArmVerts * 2);
  const oralArmsMeta = new Float32Array(totalOralArmVerts * 3);
  const oralArmsIndices: number[] = [];

  for (let a = 0; a < JELLY_ORAL_ARM_COUNT; a++) {
    const baseV = a * vertsPerArm;
    for (let r = 0; r < ORAL_ARM_SPINE_NODES; r++) {
      const vFrac = r / (ORAL_ARM_SPINE_NODES - 1);
      for (let c = 0; c <= ORAL_ARM_WIDTH_SEGS; c++) {
        const uFrac = c / ORAL_ARM_WIDTH_SEGS;
        const signedCross = uFrac * 2.0 - 1.0;
        const idx = baseV + r * (ORAL_ARM_WIDTH_SEGS + 1) + c;

        oralArmsUvs[idx * 2] = uFrac;
        oralArmsUvs[idx * 2 + 1] = vFrac;

        oralArmsMeta[idx * 3] = a / JELLY_ORAL_ARM_COUNT;
        oralArmsMeta[idx * 3 + 1] = vFrac;
        oralArmsMeta[idx * 3 + 2] = signedCross;
      }
    }

    for (let r = 0; r < ORAL_ARM_SPINE_NODES - 1; r++) {
      for (let c = 0; c < ORAL_ARM_WIDTH_SEGS; c++) {
        const i0 = baseV + r * (ORAL_ARM_WIDTH_SEGS + 1) + c;
        const i1 = i0 + ORAL_ARM_WIDTH_SEGS + 1;
        const i2 = i0 + 1;
        const i3 = i1 + 1;
        oralArmsIndices.push(i0, i1, i2);
        oralArmsIndices.push(i1, i3, i2);
      }
    }
  }

  const oralArmsGeometry = new THREE.BufferGeometry();
  oralArmsGeometry.setIndex(oralArmsIndices);
  const oaPosAttr = new THREE.BufferAttribute(oralArmsPositions, 3);
  oaPosAttr.setUsage(THREE.DynamicDrawUsage);
  const oaNormAttr = new THREE.BufferAttribute(oralArmsNormals, 3);
  oaNormAttr.setUsage(THREE.DynamicDrawUsage);
  oralArmsGeometry.setAttribute('position', oaPosAttr);
  oralArmsGeometry.setAttribute('normal', oaNormAttr);
  oralArmsGeometry.setAttribute('uv', new THREE.BufferAttribute(oralArmsUvs, 2));
  oralArmsGeometry.setAttribute(
    'aArmMeta',
    new THREE.BufferAttribute(oralArmsMeta, 3)
  );

  // 2. Initialize 16 Fine Marginal Filaments + 8 Delicate Feathery Pinnate Fronds
  const tentacles: TentacleChain3D[] = [];
  const filamentLengthVariations = [
    2.22, 1.66, 2.02, 2.30, 1.58, 2.14, 1.82, 2.26,
    1.96, 1.62, 2.18, 1.74, 2.28, 1.68, 2.08, 1.88,
  ];

  for (let f = 0; f < JELLY_MARGINAL_FILAMENT_COUNT; f++) {
    const anchorAngle =
      (f / JELLY_MARGINAL_FILAMENT_COUNT) * Math.PI * 2.0 +
      Math.sin(f * 2.1) * 0.05;
    const totalLen = filamentLengthVariations[f];
    const segLen = totalLen / (FILAMENT_SPINE_NODES - 1);
    const anchorR = 1.02;
    const nodes: VerletNode3D[] = [];

    for (let n = 0; n < FILAMENT_SPINE_NODES; n++) {
      const frac = n / (FILAMENT_SPINE_NODES - 1);
      const sCurve = Math.sin(frac * Math.PI * 1.7 + f * 0.85) * 0.25 * frac;
      const flareR = anchorR + Math.sin(frac * Math.PI * 0.72) * 0.36 + sCurve;
      nodes.push({
        x: Math.cos(anchorAngle) * flareR - frac * frac * 0.18,
        y: -0.02 - n * segLen,
        z: Math.sin(anchorAngle) * flareR,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    tentacles.push({
      id: f,
      kind: 'marginal-filament',
      lobeIndex: f,
      anchorAngle,
      anchorRadiusRatio: 0.95,
      segmentLength: segLen,
      baseWidth: 0.0076 + (f % 3) * 0.0014,
      frequency: 1.35 + (f % 5) * 0.19,
      phaseOffset: f * 0.79,
      colorVariant: (f % 3) as 0 | 1 | 2,
      nodes,
    });
  }

  for (let p = 0; p < JELLY_PINNATE_FROND_COUNT; p++) {
    const anchorAngle =
      ((p + 0.5) / JELLY_PINNATE_FROND_COUNT) * Math.PI * 2.0 +
      Math.cos(p * 1.7) * 0.06;
    const totalLen = 1.86 + (p % 3) * 0.18;
    const segLen = totalLen / (FILAMENT_SPINE_NODES - 1);
    const anchorR = 0.88;
    const nodes: VerletNode3D[] = [];

    for (let n = 0; n < FILAMENT_SPINE_NODES; n++) {
      const frac = n / (FILAMENT_SPINE_NODES - 1);
      const sCurve = Math.cos(frac * Math.PI * 1.55 + p * 0.95) * 0.22 * frac;
      const flareR = anchorR + Math.sin(frac * Math.PI * 0.78) * 0.32 + sCurve;
      nodes.push({
        x: Math.cos(anchorAngle) * flareR - frac * frac * 0.2,
        y: -0.04 - n * segLen,
        z: Math.sin(anchorAngle) * flareR,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    }

    tentacles.push({
      id: JELLY_MARGINAL_FILAMENT_COUNT + p,
      kind: 'pinnate-frond',
      lobeIndex: p * 2,
      anchorAngle,
      anchorRadiusRatio: 0.84,
      segmentLength: segLen,
      baseWidth: 0.010,
      frequency: 1.18 + (p % 4) * 0.16,
      phaseOffset: p * 0.97 + 1.15,
      colorVariant: ((p + 1) % 3) as 0 | 1 | 2,
      nodes,
    });
  }

  // 3. Pre-allocate Ribbon BufferGeometry for the 24 Tentacle Shafts
  const vertsPerFilament = FILAMENT_SPINE_NODES * 2;
  const totalFilamentVerts = JELLY_TOTAL_TENTACLE_CHAINS * vertsPerFilament;
  const filamentsPositions = new Float32Array(totalFilamentVerts * 3);
  const filamentsUvs = new Float32Array(totalFilamentVerts * 2);
  const filamentsMeta = new Float32Array(totalFilamentVerts * 3);
  const filamentsIndices: number[] = [];

  for (let tIdx = 0; tIdx < JELLY_TOTAL_TENTACLE_CHAINS; tIdx++) {
    const baseV = tIdx * vertsPerFilament;
    const chain = tentacles[tIdx];
    for (let n = 0; n < FILAMENT_SPINE_NODES; n++) {
      const depthFrac = n / (FILAMENT_SPINE_NODES - 1);
      for (let side = 0; side < 2; side++) {
        const vPtr = baseV + n * 2 + side;
        filamentsUvs[vPtr * 2] = side;
        filamentsUvs[vPtr * 2 + 1] = depthFrac;
        filamentsMeta[vPtr * 3] = tIdx / JELLY_TOTAL_TENTACLE_CHAINS;
        filamentsMeta[vPtr * 3 + 1] = depthFrac;
        filamentsMeta[vPtr * 3 + 2] = chain.colorVariant;
      }
    }
    for (let n = 0; n < FILAMENT_SPINE_NODES - 1; n++) {
      const i0 = baseV + n * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      filamentsIndices.push(i0, i2, i1);
      filamentsIndices.push(i1, i2, i3);
    }
  }

  const filamentsGeometry = new THREE.BufferGeometry();
  filamentsGeometry.setIndex(filamentsIndices);
  const filPosAttr = new THREE.BufferAttribute(filamentsPositions, 3);
  filPosAttr.setUsage(THREE.DynamicDrawUsage);
  filamentsGeometry.setAttribute('position', filPosAttr);
  filamentsGeometry.setAttribute('uv', new THREE.BufferAttribute(filamentsUvs, 2));
  filamentsGeometry.setAttribute(
    'aFilamentMeta',
    new THREE.BufferAttribute(filamentsMeta, 3)
  );

  // 4. Pre-allocate Delicate Feathery Pinnules for the 8 Pinnate Fronds
  const plumesPerFrond = PINNATE_BARBULE_PAIRS * 2;
  const totalPlumes = JELLY_PINNATE_FROND_COUNT * plumesPerFrond;
  const vertsPerPlume = (PINNATE_SEGS_U + 1) * 2;
  const pinnateVertCount = totalPlumes * vertsPerPlume;
  const pinnateFrondsPositions = new Float32Array(pinnateVertCount * 3);
  const pinnateUvs = new Float32Array(pinnateVertCount * 2);
  const pinnateMeta = new Float32Array(pinnateVertCount * 2);
  const pinnateIndices: number[] = [];

  for (let pIdx = 0; pIdx < totalPlumes; pIdx++) {
    const baseV = pIdx * vertsPerPlume;
    const frondOrdering = (pIdx % PINNATE_BARBULE_PAIRS) / PINNATE_BARBULE_PAIRS;
    for (let s = 0; s <= PINNATE_SEGS_U; s++) {
      const u = s / PINNATE_SEGS_U;
      for (let side = 0; side < 2; side++) {
        const vPtr = baseV + s * 2 + side;
        pinnateUvs[vPtr * 2] = u;
        pinnateUvs[vPtr * 2 + 1] = side;
        pinnateMeta[vPtr * 2] = frondOrdering;
        pinnateMeta[vPtr * 2 + 1] = pIdx * 0.41;
      }
    }
    for (let s = 0; s < PINNATE_SEGS_U; s++) {
      const i0 = baseV + s * 2;
      const i1 = i0 + 1;
      const i2 = i0 + 2;
      const i3 = i0 + 3;
      pinnateIndices.push(i0, i2, i1);
      pinnateIndices.push(i1, i2, i3);
    }
  }

  const pinnateFrondsGeometry = new THREE.BufferGeometry();
  pinnateFrondsGeometry.setIndex(pinnateIndices);
  const pinPosAttr = new THREE.BufferAttribute(pinnateFrondsPositions, 3);
  pinPosAttr.setUsage(THREE.DynamicDrawUsage);
  pinnateFrondsGeometry.setAttribute('position', pinPosAttr);
  pinnateFrondsGeometry.setAttribute('uv', new THREE.BufferAttribute(pinnateUvs, 2));
  pinnateFrondsGeometry.setAttribute(
    'aPinnateMeta',
    new THREE.BufferAttribute(pinnateMeta, 2)
  );

  // 5. Bioluminescent Nodes Geometry (248 jewel-like glowing nodes along clefts, filaments, fronds & oral arms)
  const nodesPerTentacle = 7;
  const nodesPerOralArm = 8;
  const biolumeNodeCount =
    JELLY_RADIAL_LOBES +
    JELLY_TOTAL_TENTACLE_CHAINS * nodesPerTentacle +
    JELLY_ORAL_ARM_COUNT * nodesPerOralArm;

  const biolumeNodesPositions = new Float32Array(biolumeNodeCount * 3);
  const biolumeNodesPhases = new Float32Array(biolumeNodeCount);
  const biolumeNodesSizes = new Float32Array(biolumeNodeCount);
  const biolumeNodesColors = new Float32Array(biolumeNodeCount);

  for (let i = 0; i < biolumeNodeCount; i++) {
    biolumeNodesPhases[i] = (i * 0.6180339887) % 1.0;
    if (i < JELLY_RADIAL_LOBES) {
      biolumeNodesSizes[i] = 1.45;
      biolumeNodesColors[i] = i % 2 === 0 ? 1.0 : 0.0;
    } else if (
      i <
      JELLY_RADIAL_LOBES + JELLY_TOTAL_TENTACLE_CHAINS * nodesPerTentacle
    ) {
      const localIdx = (i - JELLY_RADIAL_LOBES) % nodesPerTentacle;
      const isTip = localIdx === nodesPerTentacle - 1;
      biolumeNodesSizes[i] = isTip ? 1.55 : 0.95 + (i % 3) * 0.22;
      biolumeNodesColors[i] = (i % 3) as 0 | 1 | 2;
    } else {
      biolumeNodesSizes[i] = 1.05 + (i % 3) * 0.24;
      biolumeNodesColors[i] = i % 2 === 0 ? 1.0 : 2.0;
    }
  }

  const biolumeNodesGeometry = new THREE.BufferGeometry();
  const bioPosAttr = new THREE.BufferAttribute(biolumeNodesPositions, 3);
  bioPosAttr.setUsage(THREE.DynamicDrawUsage);
  biolumeNodesGeometry.setAttribute('position', bioPosAttr);
  biolumeNodesGeometry.setAttribute(
    'aPhase',
    new THREE.BufferAttribute(biolumeNodesPhases, 1)
  );
  biolumeNodesGeometry.setAttribute(
    'aSize',
    new THREE.BufferAttribute(biolumeNodesSizes, 1)
  );
  biolumeNodesGeometry.setAttribute(
    'aColorType',
    new THREE.BufferAttribute(biolumeNodesColors, 1)
  );

  const rig: CelestialJelly3DRigState = {
    oralArms,
    tentacles,
    oralArmsGeometry,
    oralArmsPositions,
    oralArmsNormals,
    filamentsGeometry,
    filamentsPositions,
    pinnateFrondsGeometry,
    pinnateFrondsPositions,
    biolumeNodesGeometry,
    biolumeNodesPositions,
    biolumeNodesPhases,
    biolumeNodesColors,
    biolumeNodeCount,
  };

  // Warm up 14 physics steps so initial posture has natural organic S-curves immediately
  const initialBell = computeJellyBellContraction(0.4);
  for (let w = 0; w < 14; w++) {
    stepCelestialJelly3DPhysics(
      rig,
      initialBell,
      w * 0.08,
      0.016,
      null,
      null,
      0.68
    );
  }

  return rig;
}

/**
 * STAGE F: VIDEO-ACCURATE BIOLOGICAL MOTION & 3D FLUID PHYSICS
 */
export function stepCelestialJelly3DPhysics(
  rig: CelestialJelly3DRigState,
  bellDynamics: JellyBellDynamics,
  time: number,
  dt: number,
  pointerWorldX: number | null,
  pointerWorldY: number | null,
  motionSpeed: number
): void {
  const safeDt = Math.min(0.04, Math.max(0.004, dt));
  const speedScale = 0.78 + motionSpeed * 0.34;
  const bellRadius = 1.14 * bellDynamics.radialScale;
  const bellRimY = -0.03 + (1.0 - bellDynamics.contraction) * 0.055;

  // --------------------------------------------------------------------------
  // 1. Step & Skin the 8 Elaborate Ruffled Oral Arms (64 spine rows × 13 cols)
  // --------------------------------------------------------------------------
  const oaPos = rig.oralArmsPositions;
  const oaNorm = rig.oralArmsNormals;
  const vertsPerArm = ORAL_ARM_SPINE_NODES * (ORAL_ARM_WIDTH_SEGS + 1);

  for (let aIdx = 0; aIdx < rig.oralArms.length; aIdx++) {
    const arm = rig.oralArms[aIdx];
    const nodes = arm.nodes;

    const anchorAngle = arm.baseAngle + Math.sin(time * 0.48 + arm.id * 1.1) * 0.09;
    const anchorR = arm.radialOffset * (1.0 - bellDynamics.contraction * 0.14);
    nodes[0].x = Math.cos(anchorAngle) * anchorR;
    // Anchor at y = -0.15 right below the glowing Internal Corona filaments!
    nodes[0].y = -0.15 + bellDynamics.contraction * 0.045;
    nodes[0].z = Math.sin(anchorAngle) * anchorR;

    const armFanSpreadTable = [-0.30, -0.19, -0.08, 0.04, 0.15, 0.28, -0.13, 0.11];
    const armFanBiasX = armFanSpreadTable[aIdx % 8];

    for (let n = 1; n < nodes.length; n++) {
      const prev = nodes[n - 1];
      const curr = nodes[n];
      const frac = n / (nodes.length - 1);

      const wavePhase =
        time * (1.35 * speedScale) - frac * 4.4 + arm.phaseOffset;
      const secondaryOsc =
        Math.cos(time * 0.92 - frac * 3.1 + aIdx * 1.3) * 0.085 * frac;

      const crownSpread = Math.exp(-Math.pow((frac - 0.12) * 4.6, 2.0)) * 0.14;
      const lowerFanSpread = Math.pow(frac, 1.25) * 0.18;
      const swayR =
        arm.radialOffset * (0.98 + Math.sin(frac * Math.PI * 0.82) * 0.78) +
        crownSpread +
        lowerFanSpread +
        (1.0 - bellDynamics.contraction) * frac * 0.14;

      const swirlAngle =
        anchorAngle +
        Math.sin(wavePhase) * (0.36 + frac * 0.44) +
        frac * 0.52 * (aIdx % 2 === 0 ? 1 : -1);

      const currentSweepX =
        -frac * frac * 0.14 +
        armFanBiasX * Math.pow(frac, 0.75) +
        Math.sin(wavePhase * 0.72 + aIdx * 1.4) * 0.08 * frac;
      const targetX = Math.cos(swirlAngle) * swayR + currentSweepX + secondaryOsc;
      const targetZ =
        Math.sin(swirlAngle) * swayR +
        Math.cos(wavePhase * 0.82 - aIdx * 1.2) * 0.08 * frac;
      const targetY =
        prev.y - arm.segmentLength * (0.94 + bellDynamics.contraction * 0.07);

      const springK = 16.5 - frac * 6.2;
      let ax = (targetX - curr.x) * springK;
      let ay = (targetY - curr.y) * springK;
      let az = (targetZ - curr.z) * springK;

      if (pointerWorldX !== null && pointerWorldY !== null) {
        const dx = curr.x - pointerWorldX;
        const dy = curr.y - pointerWorldY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 0.88 && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const push = (1.0 - dist / 0.94) * 3.6 * (0.35 + frac * 0.65);
          ax += (dx / dist) * push;
          ay += (dy / dist) * push;
        }
      }

      curr.vx = (curr.vx + ax * safeDt) * 0.82;
      curr.vy = (curr.vy + ay * safeDt) * 0.82;
      curr.vz = (curr.vz + az * safeDt) * 0.82;

      curr.x += curr.vx * safeDt * 18.0;
      curr.y += curr.vy * safeDt * 18.0;
      curr.z += curr.vz * safeDt * 18.0;

      const sdx = curr.x - prev.x;
      const sdy = curr.y - prev.y;
      const sdz = curr.z - prev.z;
      const sDist = Math.hypot(sdx, sdy, sdz) || 0.0001;
      const diff = (sDist - arm.segmentLength) / sDist;
      curr.x -= sdx * diff * 0.85;
      curr.y -= sdy * diff * 0.85;
      curr.z -= sdz * diff * 0.85;
    }

    // Skin 64-row silky-smooth billowing 3D oral arm curtain (all fine frilling is done pixel-accurately in fragment shader!)
    const baseV = aIdx * vertsPerArm;
    for (let r = 0; r < ORAL_ARM_SPINE_NODES; r++) {
      const node = nodes[r];
      const vFrac = r / (ORAL_ARM_SPINE_NODES - 1);

      const cauliflowerCrown =
        Math.exp(-Math.pow((vFrac - 0.10) * 4.8, 2.0)) * 0.52;
      const midPlumeBell =
        Math.exp(-Math.pow((vFrac - 0.48) * 2.5, 2.0)) * 0.28;
      const lowerFlounce =
        Math.exp(-Math.pow((vFrac - 0.78) * 3.4, 2.0)) * 0.18;
      const widthEnvelope =
        Math.sin(Math.pow(vFrac, 0.45) * Math.PI * 0.96) * 0.84 +
        cauliflowerCrown +
        midPlumeBell +
        lowerFlounce;
      const halfW = arm.ribbonHalfWidth * Math.max(0.07, widthEnvelope);

      const foldBreath =
        Math.sin(time * 1.15 - vFrac * 3.0 + arm.phaseOffset) * 0.48;
      const twistTheta =
        arm.baseAngle * 0.55 + vFrac * arm.twistRate + foldBreath;

      const binormX = Math.cos(twistTheta) * 0.68 + (aIdx % 2 === 0 ? 0.32 : -0.32);
      const binormZ = Math.sin(twistTheta) * 0.82;
      const bLen = Math.hypot(binormX, binormZ) || 1.0;
      const bx = binormX / bLen;
      const bz = binormZ / bLen;
      const nx = -bz;
      const nz = bx;

      for (let c = 0; c <= ORAL_ARM_WIDTH_SEGS; c++) {
        const uFrac = c / ORAL_ARM_WIDTH_SEGS;
        const signedCross = uFrac * 2.0 - 1.0;
        const edgeAbs = Math.abs(signedCross);

        // Smooth, well-sampled 3D curtain waves (~16 vertices per cycle = zero sharp corners)
        const rufflePhase1 =
          vFrac * arm.ruffleFrequency * Math.PI * 2.0 -
          time * 1.55 +
          arm.phaseOffset +
          signedCross * 1.15;
        const rufflePhase2 =
          vFrac * (arm.ruffleFrequency * 1.65) * Math.PI * 2.0 +
          time * 1.1 -
          arm.id * 0.95;

        const edgeFrillAmp =
          Math.pow(edgeAbs, 1.25) *
          halfW *
          0.38 *
          (0.55 + 0.45 * widthEnvelope);
        const ruffleNormalOffset =
          (Math.sin(rufflePhase1) * 0.72 + Math.cos(rufflePhase2) * 0.28) *
          edgeFrillAmp;
        const ruffleVerticalCurl =
          Math.sin(rufflePhase1 + 0.75) * edgeFrillAmp * 0.24;

        const vx =
          node.x + bx * (signedCross * halfW) + nx * ruffleNormalOffset;
        const vy = node.y + ruffleVerticalCurl;
        const vz =
          node.z + bz * (signedCross * halfW) + nz * ruffleNormalOffset;

        const vPtr = (baseV + r * (ORAL_ARM_WIDTH_SEGS + 1) + c) * 3;
        oaPos[vPtr] = vx;
        oaPos[vPtr + 1] = vy;
        oaPos[vPtr + 2] = vz;

        const dRuffle = Math.cos(rufflePhase1) * edgeAbs * 0.52;
        const fnx = nx + bx * dRuffle;
        const fny = 0.2 * Math.sin(rufflePhase1);
        const fnz = nz + bz * dRuffle;
        const fnLen = Math.hypot(fnx, fny, fnz) || 1.0;

        oaNorm[vPtr] = fnx / fnLen;
        oaNorm[vPtr + 1] = fny / fnLen;
        oaNorm[vPtr + 2] = fnz / fnLen;
      }
    }
  }

  rig.oralArmsGeometry.attributes.position.needsUpdate = true;
  rig.oralArmsGeometry.attributes.normal.needsUpdate = true;

  // --------------------------------------------------------------------------
  // 2. Step & Skin the 16 Fine Marginal Filaments + 8 Feathery Pinnate Fronds
  // --------------------------------------------------------------------------
  const filPos = rig.filamentsPositions;
  const pinPos = rig.pinnateFrondsPositions;
  const vertsPerFilament = FILAMENT_SPINE_NODES * 2;
  const vertsPerPlume = (PINNATE_SEGS_U + 1) * 2;
  let pinnateCounter = 0;

  for (let tIdx = 0; tIdx < rig.tentacles.length; tIdx++) {
    const chain = rig.tentacles[tIdx];
    const nodes = chain.nodes;

    const anchorR = bellRadius * chain.anchorRadiusRatio;
    const lobeCos = Math.cos(chain.anchorAngle * JELLY_RADIAL_LOBES);
    const scallopDrop = -0.055 * Math.pow(0.5 + 0.5 * lobeCos, 0.54);
    const lobeWave =
      Math.sin(
        chain.anchorAngle * JELLY_RADIAL_LOBES + bellDynamics.marginWavePhase
      ) * 0.026;

    nodes[0].x = Math.cos(chain.anchorAngle) * anchorR;
    nodes[0].y = bellRimY + scallopDrop + lobeWave;
    nodes[0].z = Math.sin(chain.anchorAngle) * anchorR;

    const radialDirX = Math.cos(chain.anchorAngle);
    const radialDirZ = Math.sin(chain.anchorAngle);
    const tangentDirX = -radialDirZ;
    const tangentDirZ = radialDirX;

    for (let n = 1; n < nodes.length; n++) {
      const prev = nodes[n - 1];
      const curr = nodes[n];
      const depthFrac = n / (nodes.length - 1);

      const wavePhase1 =
        time * chain.frequency * speedScale -
        depthFrac * 5.2 +
        chain.phaseOffset;
      const wavePhase2 =
        time * (chain.frequency * 0.58) * speedScale -
        depthFrac * 2.9 -
        chain.id * 1.25;

      const outwardBellArch =
        Math.sin(depthFrac * Math.PI * 0.8) *
        (0.36 - bellDynamics.contraction * 0.15);
      const radialWave =
        Math.sin(wavePhase1) * (0.12 + depthFrac * 0.30) +
        Math.cos(wavePhase2) * (0.09 * depthFrac);
      const tangentialWave =
        Math.cos(wavePhase1 * 0.84 + chain.id) * (0.08 + depthFrac * 0.24);

      const radialSpread = anchorR + outwardBellArch + radialWave;
      const pelagicSweepX = -depthFrac * depthFrac * 0.25;

      const targetX =
        radialDirX * radialSpread +
        tangentDirX * tangentialWave +
        pelagicSweepX;
      const targetZ =
        radialDirZ * radialSpread + tangentDirZ * tangentialWave;
      const targetY =
        prev.y -
        chain.segmentLength *
          (0.92 - (1.0 - bellDynamics.contraction) * 0.06 * depthFrac);

      const springK = 13.5 - depthFrac * 5.2;
      let ax = (targetX - curr.x) * springK;
      let ay = (targetY - curr.y) * springK;
      let az = (targetZ - curr.z) * springK;

      if (pointerWorldX !== null && pointerWorldY !== null) {
        const dx = curr.x - pointerWorldX;
        const dy = curr.y - pointerWorldY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 0.95 && distSq > 0.001) {
          const dist = Math.sqrt(distSq);
          const push = (1.0 - dist / 0.97) * 4.2 * (0.3 + depthFrac * 0.7);
          ax += (dx / dist) * push;
          ay += (dy / dist) * push;
        }
      }

      curr.vx = (curr.vx + ax * safeDt) * 0.82;
      curr.vy = (curr.vy + ay * safeDt) * 0.82;
      curr.vz = (curr.vz + az * safeDt) * 0.82;

      curr.x += curr.vx * safeDt * 18.0;
      curr.y += curr.vy * safeDt * 18.0;
      curr.z += curr.vz * safeDt * 18.0;

      const sdx = curr.x - prev.x;
      const sdy = curr.y - prev.y;
      const sdz = curr.z - prev.z;
      const sDist = Math.hypot(sdx, sdy, sdz) || 0.0001;
      const diff = (sDist - chain.segmentLength) / sDist;
      curr.x -= sdx * diff * 0.85;
      curr.y -= sdy * diff * 0.85;
      curr.z -= sdz * diff * 0.85;
    }

    // Write fine, graceful 3D Filament Ribbon Vertices
    const baseFilV = tIdx * vertsPerFilament;
    for (let n = 0; n < FILAMENT_SPINE_NODES; n++) {
      const curr = nodes[n];
      const depthFrac = n / (FILAMENT_SPINE_NODES - 1);
      const halfW = chain.baseWidth * (1.0 - depthFrac * 0.68);

      const prevNode = nodes[Math.max(0, n - 1)];
      const nextNode = nodes[Math.min(FILAMENT_SPINE_NODES - 1, n + 1)];
      const tx = nextNode.x - prevNode.x;
      const ty = nextNode.y - prevNode.y;
      const tLen = Math.hypot(tx, ty) || 1.0;

      const perpX = (-ty / tLen) * halfW;
      const perpY = (tx / tLen) * halfW;
      const perpZ = tangentDirZ * halfW * 0.45;

      const idx0 = (baseFilV + n * 2) * 3;
      const idx1 = (baseFilV + n * 2 + 1) * 3;

      filPos[idx0] = curr.x - perpX;
      filPos[idx0 + 1] = curr.y - perpY;
      filPos[idx0 + 2] = curr.z - perpZ;

      filPos[idx1] = curr.x + perpX;
      filPos[idx1 + 1] = curr.y + perpY;
      filPos[idx1 + 2] = curr.z + perpZ;
    }

    // STAGE D: Populate Delicate Feathery Pinnules for the 8 Pinnate Fronds
    if (chain.kind === 'pinnate-frond') {
      const plumesPerFrond = PINNATE_BARBULE_PAIRS * 2;
      const frondBasePlume = pinnateCounter * plumesPerFrond;

      for (let b = 0; b < PINNATE_BARBULE_PAIRS; b++) {
        const spineFloat =
          4.0 +
          (b / (PINNATE_BARBULE_PAIRS - 1)) * (FILAMENT_SPINE_NODES - 6);
        const sIdx = Math.min(FILAMENT_SPINE_NODES - 2, Math.floor(spineFloat));
        const sFrac = spineFloat - sIdx;

        const nA = nodes[sIdx];
        const nB = nodes[sIdx + 1];
        const rootX = nA.x + (nB.x - nA.x) * sFrac;
        const rootY = nA.y + (nB.y - nA.y) * sFrac;
        const rootZ = nA.z + (nB.z - nA.z) * sFrac;

        const spineDx = nB.x - nA.x;
        const spineDy = nB.y - nA.y;
        const spineDz = nB.z - nA.z;
        const spineLen = Math.hypot(spineDx, spineDy) || 1.0;
        const tangX = spineDx / spineLen;
        const tangY = spineDy / spineLen;
        const latX = -tangY;
        const latY = tangX;

        const barbEnvelope = Math.sin(
          ((b + 1) / (PINNATE_BARBULE_PAIRS + 1)) * Math.PI
        );
        const barbLen =
          (0.056 + barbEnvelope * 0.068) *
          (1.0 - 0.22 * (b / PINNATE_BARBULE_PAIRS));
        const baseHalfThick = 0.0085 * (0.65 + 0.35 * barbEnvelope);

        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? -1 : 1;
          const plumeIdx = frondBasePlume + b * 2 + side;
          const plumeBaseV = plumeIdx * vertsPerPlume;

          const currentFlutter =
            Math.sin(time * 2.4 - b * 0.6 + chain.phaseOffset + side * 1.1) *
            0.016;

          for (let s = 0; s <= PINNATE_SEGS_U; s++) {
            const u = s / PINNATE_SEGS_U;
            const lateralReach = Math.sin(u * Math.PI * 0.58) * barbLen * 0.78;
            const downwardReach = Math.pow(u, 1.15) * barbLen * 0.78;

            const px =
              rootX +
              latX * sign * lateralReach +
              tangX * downwardReach +
              currentFlutter * u;
            const py =
              rootY +
              latY * sign * lateralReach * 0.68 +
              tangY * downwardReach +
              currentFlutter * u;
            const pz =
              rootZ +
              tangentDirZ * sign * lateralReach * 0.5 +
              spineDz * u;

            const thick = baseHalfThick * (1.0 - u * 0.78);

            const v0 = (plumeBaseV + s * 2) * 3;
            const v1 = (plumeBaseV + s * 2 + 1) * 3;

            pinPos[v0] = px - tangX * thick;
            pinPos[v0 + 1] = py - tangY * thick;
            pinPos[v0 + 2] = pz;

            pinPos[v1] = px + tangX * thick;
            pinPos[v1 + 1] = py + tangY * thick;
            pinPos[v1 + 2] = pz;
          }
        }
      }
      pinnateCounter++;
    }
  }

  rig.filamentsGeometry.attributes.position.needsUpdate = true;
  rig.pinnateFrondsGeometry.attributes.position.needsUpdate = true;

  // --------------------------------------------------------------------------
  // 3. Update 3D Bioluminescent Node Beads Positions
  // --------------------------------------------------------------------------
  const bioPos = rig.biolumeNodesPositions;
  let bioIdx = 0;

  for (let l = 0; l < JELLY_RADIAL_LOBES; l++) {
    const theta = ((l + 0.5) / JELLY_RADIAL_LOBES) * Math.PI * 2.0;
    const r = bellRadius * 1.01;
    bioPos[bioIdx * 3] = Math.cos(theta) * r;
    bioPos[bioIdx * 3 + 1] = bellRimY - 0.01;
    bioPos[bioIdx * 3 + 2] = Math.sin(theta) * r;
    bioIdx++;
  }

  const nodesPerTentacle = 7;
  for (let tIdx = 0; tIdx < rig.tentacles.length; tIdx++) {
    const chain = rig.tentacles[tIdx];
    for (let k = 0; k < nodesPerTentacle; k++) {
      const nodeIdx = Math.min(
        FILAMENT_SPINE_NODES - 1,
        Math.round(((k + 1) / nodesPerTentacle) * (FILAMENT_SPINE_NODES - 1))
      );
      const n = chain.nodes[nodeIdx];
      bioPos[bioIdx * 3] = n.x;
      bioPos[bioIdx * 3 + 1] = n.y;
      bioPos[bioIdx * 3 + 2] = n.z;
      bioIdx++;
    }
  }

  const nodesPerOralArm = 8;
  for (let aIdx = 0; aIdx < rig.oralArms.length; aIdx++) {
    const arm = rig.oralArms[aIdx];
    for (let k = 0; k < nodesPerOralArm; k++) {
      const spineIdx = Math.min(
        ORAL_ARM_SPINE_NODES - 1,
        Math.round(
          ((k + 1) / (nodesPerOralArm + 1)) * (ORAL_ARM_SPINE_NODES - 1)
        )
      );
      const n = arm.nodes[spineIdx];
      const offsetAng = arm.baseAngle + k * 1.6;
      const offR = arm.ribbonHalfWidth * 0.45;
      bioPos[bioIdx * 3] = n.x + Math.cos(offsetAng) * offR;
      bioPos[bioIdx * 3 + 1] = n.y;
      bioPos[bioIdx * 3 + 2] = n.z + Math.sin(offsetAng) * offR;
      bioIdx++;
    }
  }

  rig.biolumeNodesGeometry.attributes.position.needsUpdate = true;
}

/**
 * 4. Builds the 3D Pelagic Plankton Particle Field Geometry
 */
export function buildPelagicPlanktonGeometry(count = 150): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const scales = new Float32Array(count);
  const colorMix = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const golden = i * 2.399963229728653;
    const rad = 0.45 + ((i * 37) % 100) / 52.0;
    const y = (((i * 53) % 100) / 100.0) * 3.5 - 1.95;

    positions[i * 3] = Math.cos(golden) * rad;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(golden) * rad * 0.85;

    phases[i] = ((i * 71) % 100) / 100.0;
    scales[i] = 0.5 + ((i * 29) % 100) / 98.0;
    colorMix[i] = (i % 3) / 2.0;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geo.setAttribute('aColorMix', new THREE.BufferAttribute(colorMix, 1));
  return geo;
}

// ============================================================================
// STAGE C & E: ADVANCED MATERIAL AND LIGHTING SHADERS (GLSL)
// ============================================================================

export const CELESTIAL_JELLY_BELL_VERTEX_SHADER = /* glsl */ `
attribute vec4 aBellParams;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPos;
varying vec4 vBellParams;

uniform float uTime;
uniform float uContraction;
uniform float uRadialScale;
uniform float uVerticalStretch;
uniform float uMarginWavePhase;
uniform float uAudioBass;
uniform vec2 uPointerWorld;

void main() {
  vUv = uv;
  vBellParams = aBellParams;

  float vMeridian = aBellParams.x;
  float theta = aBellParams.y;
  float lobeCrest = aBellParams.z;

  vec3 pos = position;

  // 1. Organic Asymmetric Bell Pulsation (matching celestial-jelly-pulsing-reference.mp4)
  float rimFactor = smoothstep(0.16, 0.86, vMeridian);
  float asymDeform =
    1.0 +
    0.028 * sin(theta * 2.0 + uTime * 0.9) * rimFactor +
    0.018 * cos(theta * 3.0 - uTime * 1.1) * rimFactor;

  float radialPulse = mix(
    1.0 + uContraction * 0.03,
    uRadialScale - uContraction * 0.11 * rimFactor,
    rimFactor
  ) * asymDeform;
  radialPulse += uAudioBass * 0.04 * sin(vMeridian * 3.14159);

  pos.xz *= radialPulse;
  pos.y *= uVerticalStretch;

  // 2. Travelling Scalloped Margin Undulation
  float marginWave =
    sin(theta * 8.0 + uMarginWavePhase) * 0.026 * rimFactor +
    cos(theta * 16.0 - uMarginWavePhase * 0.75) * 0.019 * rimFactor * lobeCrest;
  pos.y += marginWave;
  pos.xz *= (1.0 + marginWave * 0.34);

  // 3. Subtle 3D Pointer Hydrodynamic Deformation
  vec2 toPtr = pos.xy - uPointerWorld;
  float ptrDist = length(toPtr);
  if (ptrDist < 1.15 && ptrDist > 0.001) {
    float push = (1.0 - ptrDist / 1.15) * 0.065;
    pos.xy += (toPtr / ptrDist) * push;
  }

  vLocalPos = pos;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const CELESTIAL_JELLY_BELL_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPos;
varying vec4 vBellParams;

uniform float uTime;
uniform float uContraction;
uniform float uSubsurfacePulse;
uniform float uLuminescence;
uniform float uAudioAmp;
uniform float uPassOpacity;
uniform vec3 uColorCyan;
uniform vec3 uColorBlue;
uniform vec3 uColorViolet;
uniform vec3 uColorMagenta;
uniform vec3 uColorSubumbrellaPeach;
uniform vec3 uColorBiolumeGold;

float hash31(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0, 0, 0)), hash31(i + vec3(1, 0, 0)), u.x),
      mix(hash31(i + vec3(0, 1, 0)), hash31(i + vec3(1, 1, 0)), u.x),
      u.y
    ),
    mix(
      mix(hash31(i + vec3(0, 0, 1)), hash31(i + vec3(1, 0, 1)), u.x),
      mix(hash31(i + vec3(0, 1, 1)), hash31(i + vec3(1, 1, 1)), u.x),
      u.y
    ),
    u.z
  );
}

// High-definition branching 3D neural lightning veins + fine crystalline microstructure
vec2 neuralVeinAndCrystalField(vec3 p, float t) {
  vec3 warp = vec3(
    noise3D(p * 2.1 + vec3(0.0, t * 0.24, 0.0)),
    noise3D(p * 2.1 + vec3(3.1, -t * 0.19, 1.7)),
    noise3D(p * 2.1 + vec3(1.4, t * 0.17, 5.2))
  );
  vec3 q = p * 4.5 + (warp - 0.5) * 1.45;

  // Primary branching neural trunks
  float n1 = noise3D(q);
  float ridge1 = pow(clamp(1.0 - abs(n1 * 2.0 - 1.0), 0.0, 1.0), 12.0);

  // Secondary dendrite capillaries
  float n2 = noise3D(q * 2.4 + vec3(2.4, -1.8, 3.7));
  float ridge2 = pow(clamp(1.0 - abs(n2 * 2.0 - 1.0), 0.0, 1.0), 14.0);

  // Fine crystalline cellular surface microstructure
  float n3 = noise3D(p * 18.0);
  float crystalFacet = pow(clamp(1.0 - abs(n3 * 2.0 - 1.0), 0.0, 1.0), 6.0);

  return vec2(ridge1 * 0.85 + ridge2 * 0.65, crystalFacet);
}

void main() {
  float vMeridian = vBellParams.x;
  float theta = vBellParams.y;
  float lobeCrest = vBellParams.z;
  float isInnerLip = vBellParams.w;

  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) {
    N = -N;
  }
  vec3 V = normalize(vViewPosition);

  // 1. Crystalline Optical Fresnel & Spectral Iridescence
  float ndotv = clamp(abs(dot(N, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - ndotv, 2.5);
  float grazingRim = pow(1.0 - ndotv, 4.2);
  float thinFilmPhase = ndotv * 6.28318 + theta * 2.0 + vMeridian * 5.0 - uTime * 0.35;
  vec3 iridSpectrum = 0.5 + 0.5 * cos(thinFilmPhase + vec3(0.0, 1.9, 3.8));

  // 2. Radial Anatomical Structures, Concentric Inner Tier & Lobed Furrows
  float lobeFurrow = exp(-pow(lobeCrest, 2.0) * 18.0);
  float lobeHighlight = pow(lobeCrest, 2.8) * (1.0 - ndotv * 0.55);
  float radialCanal = exp(-pow(abs(sin(theta * 8.0 + 0.1 * sin(vMeridian * 12.0))), 2.0) * 60.0);
  float innerUmbrellaRing = exp(-pow((vMeridian - 0.44) * 14.0, 2.0)) * (0.45 + 0.55 * lobeCrest);

  // 3. Branching Neural Lightning Veins & Concentrated Synaptic Highlights
  vec2 bioFields = neuralVeinAndCrystalField(vLocalPos * 1.48, uTime);
  float veinPattern = bioFields.x;
  float crystalMicro = bioFields.y;

  float neuralWave = 0.5 + 0.5 * sin(vMeridian * 11.0 - uTime * 2.8 + uContraction * 2.2);
  float veinSignal =
    (veinPattern * 1.15 + radialCanal * 0.42 + lobeFurrow * 0.32 + innerUmbrellaRing * 0.38) *
    (0.6 + 0.65 * neuralWave);

  float synapseNoise = noise3D(vLocalPos * 11.5 + vec3(0.0, -uTime * 0.32, 0.0));
  float synapseSpark =
    smoothstep(0.66, 0.91, synapseNoise) *
    smoothstep(0.24, 0.82, veinPattern) *
    2.8;

  // 4. Irregular Scalloped Lower Rim Highlight (at vMeridian ~ 0.85)
  float scallopedEdgeMask = exp(-pow((vMeridian - 0.85) * 20.0, 2.0)) * (1.0 - isInnerLip * 0.45);

  // 5. Warm Luminous Subumbrella Corona Glow radiating from upper-central cavity
  float subCoreGlow =
    smoothstep(0.68, 0.08, length(vLocalPos.xz)) *
    smoothstep(0.65, 0.02, vLocalPos.y) *
    (0.55 + uSubsurfacePulse * 0.35);

  // 6. Construct Signature Crystalline Blue-Violet-Cyan-Magenta Bell Palette
  vec3 crystallineBase = mix(uColorBlue * 0.72, uColorViolet * 0.82, smoothstep(0.15, 0.78, vMeridian));
  crystallineBase = mix(crystallineBase, uColorCyan * 0.92, fresnel * 0.62 + (1.0 - vMeridian) * 0.28);
  crystallineBase = mix(crystallineBase, uColorMagenta * 0.78, lobeHighlight * 0.46 + iridSpectrum.r * 0.25);
  crystallineBase = mix(crystallineBase, uColorSubumbrellaPeach * 0.95, subCoreGlow * 0.85);

  vec3 veinHue = mix(uColorCyan, uColorMagenta, 0.48 + 0.48 * sin(theta * 5.0 + vMeridian * 8.0 - uTime * 0.7));
  veinHue = mix(veinHue, uColorBiolumeGold, lobeFurrow * 0.45 + subCoreGlow * 0.38);

  vec3 emission =
    veinHue * veinSignal * 1.28 +
    uColorBiolumeGold * (synapseSpark * 1.55 + scallopedEdgeMask * (1.0 - lobeCrest) * 0.85) +
    mix(uColorCyan, uColorBlue, iridSpectrum.b * 0.5) * (grazingRim * 1.35 + scallopedEdgeMask * 0.88) +
    mix(uColorMagenta, uColorCyan, iridSpectrum.g) * (innerUmbrellaRing * 0.65 + crystalMicro * fresnel * 0.42) +
    uColorSubumbrellaPeach * (lobeFurrow * 0.38 + subCoreGlow * 0.45);

  vec3 rawColor = (crystallineBase * 0.72 + emission) * uLuminescence * (1.0 + uAudioAmp * 0.16);
  vec3 mappedColor = rawColor / (vec3(1.0) + rawColor * 0.36);

  float frontCoronaWindow =
    smoothstep(0.45, 0.82, vMeridian) *
    smoothstep(0.55, 0.12, abs(vLocalPos.x)) *
    smoothstep(-0.1, 0.6, vLocalPos.z);

  float alpha =
    0.12 +
    fresnel * 0.46 +
    grazingRim * 0.28 +
    veinSignal * 0.38 +
    scallopedEdgeMask * 0.42 +
    innerUmbrellaRing * 0.22 +
    lobeFurrow * 0.18 +
    subCoreGlow * 0.20;

  alpha *= (1.0 - frontCoronaWindow * 0.42) * uPassOpacity;

  gl_FragColor = vec4(mappedColor, clamp(alpha, 0.05, 0.90));
}
`;

/**
 * STAGE B (PART 1): INTERNAL CORONA SHADERS
 * Renders the 84 individual luminous biological strands radiating downwards
 * from the upper central body in rose-pink, lavender, champagne, and warm amber.
 */
export const CELESTIAL_JELLY_MANUBRIUM_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

uniform float uTime;
uniform float uContraction;

void main() {
  vUv = uv;
  vec3 pos = position;
  float strandId = fract(uv.x) * 1000.0;
  float breath =
    1.0 -
    uContraction * 0.11 +
    sin(uTime * 1.8 + uv.y * 4.5 + strandId * 0.4) * 0.032;
  pos.xz *= breath;
  pos.y += uContraction * 0.045;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vViewPos = -mvPos.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mvPos;
}
`;

export const CELESTIAL_JELLY_MANUBRIUM_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;

uniform float uTime;
uniform float uLuminescence;
uniform vec3 uColorSubumbrellaPeach;
uniform vec3 uColorCoronaRose;
uniform vec3 uColorCoronaChampagne;
uniform vec3 uColorMidLavender;
uniform vec3 uColorBiolumeGold;

void main() {
  float sideCoord = floor(vUv.x);
  float strandSeed = fract(vUv.x) * 1000.0;
  float v = vUv.y; // 0 = upper subumbrella nexus, 1 = lower corona entering oral crown

  float crossCenter = 1.0 - abs(sideCoord * 2.0 - 1.0);
  float coreProfile = pow(clamp(crossCenter, 0.0, 1.0), 1.15);

  float pulse = 0.72 + 0.28 * sin(uTime * 2.4 - v * 6.0 + strandSeed * 2.1);

  vec3 strandColor = mix(uColorCoronaChampagne, uColorCoronaRose, smoothstep(0.06, 0.58, v));
  strandColor = mix(strandColor, uColorSubumbrellaPeach, 0.45 * (0.5 + 0.5 * sin(strandSeed * 1.7)));
  strandColor = mix(strandColor, uColorMidLavender, smoothstep(0.70, 1.0, v) * 0.45);

  vec3 col = strandColor * (1.05 + coreProfile * 0.85) + uColorBiolumeGold * coreProfile * pulse * 0.72;
  col *= uLuminescence;
  col = col / (vec3(1.0) + col * 0.26);

  float vertFade = smoothstep(0.0, 0.06, v) * smoothstep(1.0, 0.86, v);
  float alpha = (0.38 + coreProfile * 0.62) * vertFade;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.94));
}
`;

/**
 * STAGE B (PART 2): CENTRAL RUFFLED ORAL ARMS — HIGHEST PRIORITY
 * Reconstructs the elaborate central cluster of ruffled, flowing, translucent oral arms:
 * - Soft, rounded, pillowy coral-pink, rose, pearl, warm champagne & orchid-lavender ruffles
 * - Convex scalloped petal/sea-lettuce frilled edges (zero sharp sawtooth triangles)
 * - Soft subsurface internal folds & longitudinal biological filaments
 * - Concentrated bioluminescent highlights
 */
export const CELESTIAL_JELLY_ORAL_ARM_VERTEX_SHADER = /* glsl */ `
attribute vec3 aArmMeta;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vLocalPos;
varying vec3 vArmMeta;

void main() {
  vUv = uv;
  vArmMeta = aArmMeta;
  vLocalPos = position;

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPos = -mvPos.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPos;
}
`;

export const CELESTIAL_JELLY_ORAL_ARM_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPos;
varying vec3 vLocalPos;
varying vec3 vArmMeta;

uniform float uTime;
uniform float uLuminescence;
uniform float uAudioAmp;
uniform vec3 uColorCrownPink;
uniform vec3 uColorPearl;
uniform vec3 uColorCoronaChampagne;
uniform vec3 uColorMidLavender;
uniform vec3 uColorTipCyan;
uniform vec3 uColorBiolumeGold;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float smoothNoise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  float armIdNorm = vArmMeta.x;
  float spineFrac = vArmMeta.y;
  float signedCross = vArmMeta.z;
  float edgeDist = abs(signedCross);

  // 1. Convex Rounded Petal/Cauliflower Scalloped Edge Contour
  // Using sqrt(0.5 + 0.5 * sin(...)) creates soft, rounded coral-pink cauliflower lobes
  // with crisp inward notches — never spiky sawtooth triangles!
  float sidePhase = signedCross > 0.0 ? 0.0 : 2.2;
  float crownDensity = mix(1.35, 1.0, smoothstep(0.0, 0.32, spineFrac));

  float s1 = 0.5 + 0.5 * sin(spineFrac * 28.0 * crownDensity - uTime * 1.2 + armIdNorm * 18.8 + sidePhase);
  float s2 = 0.5 + 0.5 * cos(spineFrac * 68.0 * crownDensity + uTime * 0.85 - armIdNorm * 11.4 - sidePhase);
  float s3 = 0.5 + 0.5 * sin(spineFrac * 145.0 - uTime * 1.4 + sidePhase * 1.8);

  float roundLobe1 = pow(s1, 0.58);
  float roundLobe2 = pow(s2, 0.62);
  float roundLobe3 = pow(s3, 0.68);

  float lacyBoundary =
    0.46 +
    0.24 * roundLobe1 +
    0.15 * roundLobe2 +
    0.08 * roundLobe3;

  float tipTaper = smoothstep(0.0, 0.03, spineFrac) * smoothstep(1.0, 0.86, spineFrac);
  lacyBoundary *= tipTaper;

  if (edgeDist > lacyBoundary) {
    discard;
  }

  // Soft translucent veil inside the scalloped boundary + luminous pearlescent frill rim
  float distToFrillEdge = lacyBoundary - edgeDist;
  float edgeMask = smoothstep(0.0, 0.13, distToFrillEdge);
  float frillRimHighlight =
    exp(-pow(distToFrillEdge * 14.5, 2.0)) *
    smoothstep(0.004, 0.045, distToFrillEdge);

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) {
    N = -N;
  }
  vec3 V = normalize(vViewPos);
  float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 1.85);

  // 2. Signature Master Artwork Colour Progression:
  // - Upper Cauliflower Crown (0.0..0.36): Rich coral-pink, rose, warm champagne & luminous pearl
  // - Mid Flowing Plumes (0.32..0.74): Coral-rose blending into orchid-lavender & magenta-violet
  // - Lower Cascading Tips (0.66..1.0): Lavender & electric cyan-violet highlights
  vec3 crownHue = mix(uColorCoronaChampagne, uColorCrownPink, smoothstep(0.0, 0.14, spineFrac));
  vec3 bodyColor = mix(crownHue, uColorMidLavender, smoothstep(0.28, 0.68, spineFrac));
  bodyColor = mix(bodyColor, uColorTipCyan, smoothstep(0.64, 0.96, spineFrac) * 0.72);

  // 3. High-Contrast 3D Volumetric Folds, Depth Separation & Longitudinal Biological Filaments
  // Separate individual arms in depth (z) and azimuth so the 8 oral arms never merge into a flat pink mass
  float depthShade = smoothstep(-0.38, 0.32, vLocalPos.z);
  float armToneVar = 0.86 + 0.24 * sin(armIdNorm * 18.8495 + 0.6);

  float softPillowFold =
    0.5 +
    0.5 * sin(edgeDist * 16.0 - roundLobe1 * 2.8 + spineFrac * 24.0 + armIdNorm * 12.56);
  float foldCrest = pow(softPillowFold, 1.65);
  float secondaryRuffle =
    pow(0.5 + 0.5 * cos(edgeDist * 24.0 + roundLobe2 * 3.2 - spineFrac * 38.0), 3.2) *
    smoothstep(0.10, 0.62, edgeDist);

  float internalVeins =
    pow(0.5 + 0.5 * cos(signedCross * 32.0 + sin(spineFrac * 20.0) * 1.8), 6.5) *
    (1.0 - edgeDist * 0.50);
  float centralMidrib = exp(-edgeDist * edgeDist * 22.0) * (1.0 - spineFrac * 0.38);

  // 4. Concentrated Bioluminescent Micro-Highlights (amber-gold, pearl-pink, and electric cyan)
  vec2 sparkleUv = vec2(signedCross * 13.0 + armIdNorm * 23.0, spineFrac * 52.0 - uTime * 0.25);
  float sparkleNoise = smoothNoise2D(sparkleUv);
  float sparkle =
    pow(smoothstep(0.68, 0.93, sparkleNoise), 2.7) *
    (0.6 + 0.4 * sin(uTime * 2.8 + spineFrac * 30.0));

  // Deep translucent rose-plum valleys between luminous coral-pink, rose & pearl fold ridges
  vec3 valleyShadow = mix(vec3(0.18, 0.07, 0.30), bodyColor * 0.52, depthShade * 0.72);
  vec3 ridgeTissue = bodyColor * (0.86 + fresnel * 0.56 + foldCrest * 0.52) * armToneVar;
  vec3 finalColor = mix(valleyShadow, ridgeTissue, 0.32 + 0.68 * foldCrest);
  finalColor *= (0.72 + 0.38 * depthShade);

  // Luminous internal longitudinal filaments & midrib in coral-pink & warm champagne
  finalColor +=
    mix(uColorCrownPink * 1.15, uColorCoronaChampagne, 0.48) *
    (centralMidrib * 0.72 + internalVeins * 0.54) *
    (0.78 + 0.32 * depthShade);

  // Crisp Pearlescent / Coral-Rose / Cyan ruffled edge highlight defining each individual arm's contour
  vec3 frillEdgeHue = mix(uColorPearl, uColorCrownPink * 1.24, 0.42);
  frillEdgeHue = mix(frillEdgeHue, uColorTipCyan * 1.15, smoothstep(0.54, 0.94, spineFrac));
  finalColor += frillEdgeHue * (frillRimHighlight * 1.42 + secondaryRuffle * 0.50);

  // Embedded bioluminescent sparkles
  vec3 sparkHue = mix(uColorBiolumeGold, uColorTipCyan, smoothstep(0.38, 0.86, spineFrac));
  finalColor += sparkHue * sparkle * 1.65;

  finalColor *= uLuminescence * (1.0 + uAudioAmp * 0.14);
  finalColor = finalColor / (vec3(1.0) + finalColor * 0.34);

  float alpha =
    (0.13 +
      foldCrest * 0.24 +
      fresnel * 0.34 +
      frillRimHighlight * 0.65 +
      secondaryRuffle * 0.25 +
      centralMidrib * 0.28 +
      internalVeins * 0.21 +
      sparkle * 0.36) *
    (0.78 + 0.22 * depthShade) *
    edgeMask;

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.04, 0.92));
}
`;

/**
 * STAGE D: MARGINAL TENTACLES & DELICATE PINNATE FRONDS — VERTEX & FRAGMENT SHADERS
 */
export const CELESTIAL_JELLY_FILAMENT_VERTEX_SHADER = /* glsl */ `
attribute vec3 aFilamentMeta;

varying vec2 vUv;
varying vec3 vFilamentMeta;

void main() {
  vUv = uv;
  vFilamentMeta = aFilamentMeta;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CELESTIAL_JELLY_FILAMENT_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vFilamentMeta;

uniform float uTime;
uniform float uLuminescence;
uniform vec3 uColorCyan;
uniform vec3 uColorViolet;
uniform vec3 uColorMagenta;
uniform vec3 uColorBiolumeGold;

void main() {
  float chainNorm = vFilamentMeta.x;
  float depthFrac = vFilamentMeta.y;
  float colorVariant = vFilamentMeta.z;

  float crossCenter = 1.0 - abs(vUv.x * 2.0 - 1.0);
  float coreFiber = pow(clamp(crossCenter, 0.0, 1.0), 1.5);

  float pulseWave = 0.5 + 0.5 * sin(depthFrac * 18.0 - uTime * 2.2 + chainNorm * 18.84);
  float highlightBead = pow(pulseWave, 4.5);

  vec3 lavenderBase = mix(uColorViolet, uColorMagenta, 0.34);
  vec3 baseHue = colorVariant < 0.5
    ? mix(lavenderBase, uColorCyan, 0.68)
    : (colorVariant < 1.5 ? lavenderBase : mix(lavenderBase, uColorBiolumeGold, 0.52));

  vec3 col = mix(baseHue, uColorBiolumeGold, highlightBead * 0.55 + (1.0 - depthFrac) * 0.28);
  col = mix(col, uColorCyan, highlightBead * 0.38 * step(0.5, fract(chainNorm * 7.0)));
  col *= (0.78 + highlightBead * 0.92) * uLuminescence;

  float tipFade = smoothstep(1.0, 0.88, depthFrac);
  float alpha = coreFiber * (0.36 + (1.0 - depthFrac) * 0.38 + highlightBead * 0.28) * tipFade;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.88));
}
`;

export const CELESTIAL_JELLY_PINNATE_VERTEX_SHADER = /* glsl */ `
attribute vec2 aPinnateMeta;

varying vec2 vUv;
varying vec2 vPinnateMeta;

void main() {
  vUv = uv;
  vPinnateMeta = aPinnateMeta;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CELESTIAL_JELLY_PINNATE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec2 vPinnateMeta;

uniform float uTime;
uniform float uLuminescence;
uniform vec3 uColorCyan;
uniform vec3 uColorViolet;
uniform vec3 uColorMagenta;

void main() {
  float frondOrder = vPinnateMeta.x;
  float barbPhase = vPinnateMeta.y;

  float across = 1.0 - abs(vUv.y * 2.0 - 1.0);
  float featherProfile =
    pow(clamp(across, 0.0, 1.0), 1.3) *
    smoothstep(1.0, 0.08, vUv.x) *
    smoothstep(0.0, 0.10, vUv.x);

  float tipGlow = exp(-pow((vUv.x - 0.76) * 4.2, 2.0)) * 0.92;

  vec3 col = mix(uColorViolet, uColorCyan, vUv.x * 0.82 + 0.18 * sin(barbPhase));
  col = mix(col, uColorMagenta, (1.0 - frondOrder) * 0.24);
  col = (col * 0.88 + uColorCyan * tipGlow * 1.1) * uLuminescence;

  float alpha = featherProfile * (0.42 + tipGlow * 0.48);
  if (alpha < 0.02) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.86));
}
`;

/**
 * STAGE E: CONCENTRATED BIOLUMINESCENT NODES & PLANKTON PARTICLES
 */
export const CELESTIAL_JELLY_BIOLUME_NODES_VERTEX_SHADER = /* glsl */ `
attribute float aPhase;
attribute float aSize;
attribute float aColorType;

varying float vAlpha;
varying float vColorType;

uniform float uTime;
uniform float uPixelRatio;
uniform float uAudioAmp;

void main() {
  vColorType = aColorType;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float pulse = 0.62 + 0.38 * sin(uTime * 2.5 + aPhase * 18.8495);
  vAlpha = pulse;

  gl_PointSize = clamp(
    (aSize * (14.5 + pulse * 5.8 + uAudioAmp * 3.8) * uPixelRatio) / max(0.8, -mvPosition.z),
    2.5,
    24.0
  );
}
`;

export const CELESTIAL_JELLY_BIOLUME_NODES_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vColorType;

uniform float uLuminescence;
uniform vec3 uColorCyan;
uniform vec3 uColorBiolumeGold;
uniform vec3 uColorMagenta;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord) * 2.0;
  if (r > 1.0) discard;

  float core = exp(-r * r * 14.0);
  float halo = exp(-r * r * 3.6) * (1.0 - r);

  vec3 hue = vColorType < 0.5
    ? uColorCyan
    : (vColorType < 1.5 ? uColorBiolumeGold : uColorMagenta);

  vec3 col = mix(hue, vec3(1.0, 0.98, 0.94), core * 0.78) * uLuminescence;
  float alpha = (core * 0.96 + halo * 0.62) * vAlpha;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.96));
}
`;

export const CELESTIAL_JELLY_PLANKTON_VERTEX_SHADER = /* glsl */ `
attribute float aPhase;
attribute float aScale;
attribute float aColorMix;

varying float vAlpha;
varying float vColorMix;

uniform float uTime;
uniform float uPixelRatio;
uniform float uContraction;

void main() {
  vColorMix = aColorMix;

  vec3 pos = position;
  float angle = atan(pos.z, pos.x) + uTime * 0.07 * (0.5 + aPhase);
  float rad = length(pos.xz) + sin(uTime * 0.42 + aPhase * 6.28) * 0.06;
  pos.x = cos(angle) * rad;
  pos.z = sin(angle) * rad;
  pos.y = mod(pos.y + uTime * (0.055 + aPhase * 0.04) + 2.0, 3.6) - 1.9;
  pos.y -= uContraction * 0.04;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float centerDist = length(pos.xy);
  float centerClearance = smoothstep(0.24, 0.62, centerDist);
  float radialFade = 1.0 - smoothstep(1.35, 2.15, length(pos));
  float twinkle = 0.45 + 0.55 * sin(uTime * 1.8 + aPhase * 12.56);

  vAlpha = twinkle * centerClearance * radialFade;
  gl_PointSize = clamp(
    (aScale * 8.5 * uPixelRatio) / max(0.9, -mvPos.z),
    1.5,
    11.0
  );
}
`;

export const CELESTIAL_JELLY_PLANKTON_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vColorMix;

uniform float uLuminescence;
uniform vec3 uColorCyan;
uniform vec3 uColorViolet;
uniform vec3 uColorBiolumeGold;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord) * 2.0;
  if (r > 1.0) discard;

  float bokeh = exp(-r * r * 4.4) * (1.0 - r);
  vec3 col = mix(uColorCyan, uColorViolet, smoothstep(0.0, 0.5, vColorMix));
  col = mix(col, uColorBiolumeGold, smoothstep(0.5, 1.0, vColorMix));

  gl_FragColor = vec4(col * uLuminescence, bokeh * vAlpha * 0.48);
}
`;

export { computeOrbStateParameters };
