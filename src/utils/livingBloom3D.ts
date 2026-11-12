import * as THREE from 'three';
import { FocusSceneConfig, TimerPhase } from '../types/aura';
import {
  BloomCycleState,
  OrbStateParameters,
  computeBloomCycleState,
  computeOrbStateParameters,
  computeThemeOrganismPalette,
} from './organicOrbEngine';
import { hexToNormalizedRgb } from './quantumNebulaShaders';

export { computeBloomCycleState, computeOrbStateParameters };
export type { BloomCycleState, OrbStateParameters };

// ============================================================================
// CONSTANTS & ANATOMICAL SPECIFICATIONS (LIVING BLOOM MASTER RECONSTRUCTION)
// ============================================================================

export const BLOOM_OUTER_GUARD_PETAL_COUNT = 12;
export const BLOOM_LOWER_MID_PETAL_COUNT = 12;
export const BLOOM_UPPER_MID_PETAL_COUNT = 11;
export const BLOOM_INNER_CROWN_PETAL_COUNT = 9;
export const BLOOM_TOTAL_PETAL_COUNT =
  BLOOM_OUTER_GUARD_PETAL_COUNT +
  BLOOM_LOWER_MID_PETAL_COUNT +
  BLOOM_UPPER_MID_PETAL_COUNT +
  BLOOM_INNER_CROWN_PETAL_COUNT; // 44 individually generated petals across 4 whorls

export const BLOOM_CENTRAL_CARPEL_COUNT = 28;
export const BLOOM_STAMEN_FILAMENT_COUNT = 128;
export const BLOOM_SEPAL_COUNT = 7;
export const BLOOM_POLLEN_PARTICLE_COUNT = 180;

export interface LivingBloomColorRig {
  pearlPink: [number, number, number];
  coralRose: [number, number, number];
  lavender: [number, number, number];
  translucentWhite: [number, number, number];
  iridescentViolet: [number, number, number];
  goldenPollen: [number, number, number];
  cyanReflection: [number, number, number];
  veinChampagne: [number, number, number];
  carpelMagenta: [number, number, number];
  stemRoseOlive: [number, number, number];
}

/**
 * STAGE 3 — PERMANENT VISUAL IDENTITY & ATMOSPHERE INDEPENDENCE
 *
 * Preserves >= 93% of the intrinsic botanical colour palette from
 * `living-bloom-master.png` across all 5 Aura Time Focus Scenes:
 * - Pearl pink (#FFD4E8)
 * - Coral rose (#FA5C8C)
 * - Lavender (#D89EFF)
 * - Translucent white (#FFF8FC)
 * - Iridescent violet (#9C54FF)
 * - Golden yellow pollen (#FFD438)
 * - Subtle cyan reflections (#4CF2FF)
 */
export function computeLivingBloomColorRig(
  scene: FocusSceneConfig,
  phase: TimerPhase = 'focus'
): LivingBloomColorRig {
  const theme = computeThemeOrganismPalette(scene, phase);
  const scenePrimary = hexToNormalizedRgb(theme.primaryHex);
  const sceneSecondary = hexToNormalizedRgb(theme.secondaryHex);
  const sceneTertiary = hexToNormalizedRgb(theme.tertiaryHex);
  const sceneIridescent = hexToNormalizedRgb(theme.iridescentHex);

  // Master Reference Intrinsic Palette (from living-bloom-master.png)
  const refPearlPink: [number, number, number] = [1.0, 0.83, 0.91]; // #FFD4E8
  const refCoralRose: [number, number, number] = [0.98, 0.36, 0.56]; // #FA5C8F
  const refLavender: [number, number, number] = [0.85, 0.62, 0.99]; // #D99EFF
  const refTranslucentWhite: [number, number, number] = [1.0, 0.97, 0.99]; // #FFF8FC
  const refIridescentViolet: [number, number, number] = [0.61, 0.33, 1.0]; // #9C54FF
  const refGoldenPollen: [number, number, number] = [1.0, 0.83, 0.22]; // #FFD438
  const refCyanReflection: [number, number, number] = [0.3, 0.95, 1.0]; // #4CF2FF
  const refVeinChampagne: [number, number, number] = [1.0, 0.86, 0.68]; // #FFDBAD
  const refCarpelMagenta: [number, number, number] = [0.95, 0.34, 0.66]; // #F257A8
  const refStemRoseOlive: [number, number, number] = [0.48, 0.41, 0.33]; // Warm botanical rose-olive stem

  const mix3 = (
    a: [number, number, number],
    b: [number, number, number],
    t: number
  ): [number, number, number] => [
    Number((a[0] + (b[0] - a[0]) * t).toFixed(4)),
    Number((a[1] + (b[1] - a[1]) * t).toFixed(4)),
    Number((a[2] + (b[2] - a[2]) * t).toFixed(4)),
  ];

  // Keep intrinsic identity >= 93% permanent; atmosphere provides subtle 5-7% environmental tint
  const envTint = scene.id === 'deep-current' && phase === 'focus' ? 0.04 : 0.07;

  return {
    pearlPink: mix3(refPearlPink, sceneIridescent, envTint * 0.5),
    coralRose: mix3(refCoralRose, sceneTertiary, envTint * 0.6),
    lavender: mix3(refLavender, scenePrimary, envTint * 0.65),
    translucentWhite: refTranslucentWhite,
    iridescentViolet: mix3(refIridescentViolet, scenePrimary, envTint * 0.7),
    goldenPollen: mix3(refGoldenPollen, sceneIridescent, envTint * 0.25),
    cyanReflection: mix3(refCyanReflection, sceneSecondary, envTint * 0.6),
    veinChampagne: mix3(refVeinChampagne, sceneIridescent, envTint * 0.35),
    carpelMagenta: mix3(refCarpelMagenta, sceneTertiary, envTint * 0.5),
    stemRoseOlive: mix3(refStemRoseOlive, scenePrimary, envTint * 0.3),
  };
}

// ============================================================================
// SYSTEM A: PROCEDURAL 4-TIER PETAL COROLLA GEOMETRY BUILDER
// ============================================================================

export interface PetalSpec {
  whorlIndex: number; // 0 = outer guard, 1 = lower-mid, 2 = upper-mid, 3 = inner crown
  petalIndexInWhorl: number;
  azimuthAngle: number;
  baseElevation: number; // radians from horizontal plane
  baseLength: number;
  baseWidth: number;
  cupConcavity: number; // positive = concave upward bowl cradling the flower center
  lipReflex: number; // outward flare of the scalloped top margin
  ruffleFreq: number;
  ruffleAmp: number;
  asymmetrySkew: number;
  phaseOffset: number;
  colorVariant: number;
  radialAnchorOffset: number;
  verticalAnchorOffset: number;
}

/**
 * Generates deterministic, individually varied botanical specifications for all
 * 44 broad obovate peony petals across 4 overlapping whorls so no two petals are identical,
 * forming an open upward-cupping bowl that frames the central stamen sanctuary.
 */
export function generateLivingBloomPetalSpecs(): PetalSpec[] {
  const whorls = [
    {
      whorlIndex: 0,
      count: BLOOM_OUTER_GUARD_PETAL_COUNT,
      baseLength: 1.18,
      baseWidth: 1.06, // Broad, lush outer guard petals
      baseElevation: -0.06, // Sweeping outward & slightly reflexed at the outer perimeter
      cupConcavity: 0.22,
      lipReflex: 0.16,
      radialAnchor: 0.28,
      verticalAnchor: -0.11,
      angleStart: 0.0,
    },
    {
      whorlIndex: 1,
      count: BLOOM_LOWER_MID_PETAL_COUNT,
      baseLength: 1.04,
      baseWidth: 0.94,
      baseElevation: 0.22, // Cupping gently upward
      cupConcavity: 0.26,
      lipReflex: 0.12,
      radialAnchor: 0.25,
      verticalAnchor: -0.07,
      angleStart: Math.PI / 12 + 0.09,
    },
    {
      whorlIndex: 2,
      count: BLOOM_UPPER_MID_PETAL_COUNT,
      baseLength: 0.88,
      baseWidth: 0.80,
      baseElevation: 0.46, // Open bowl cradling the inner crown
      cupConcavity: 0.28,
      lipReflex: 0.09,
      radialAnchor: 0.23,
      verticalAnchor: -0.035,
      angleStart: 0.34,
    },
    {
      whorlIndex: 3,
      count: BLOOM_INNER_CROWN_PETAL_COUNT,
      baseLength: 0.70,
      baseWidth: 0.64,
      baseElevation: 0.68, // Framing the outer rim of the stamen ring without covering it
      cupConcavity: 0.25,
      lipReflex: 0.08,
      radialAnchor: 0.22,
      verticalAnchor: -0.005,
      angleStart: 0.68,
    },
  ];

  const specs: PetalSpec[] = [];

  for (const w of whorls) {
    const stepAngle = (Math.PI * 2.0) / w.count;
    for (let i = 0; i < w.count; i++) {
      const seed = (w.whorlIndex + 1) * 71 + i * 113;
      const n1 = Math.sin(seed * 1.37) * 0.5 + 0.5; // 0..1
      const n2 = Math.cos(seed * 2.53) * 0.5 + 0.5; // 0..1
      const n3 = Math.sin(seed * 3.89); // -1..1
      const n4 = Math.cos(seed * 5.17); // -1..1

      const azimuthJitter = n3 * stepAngle * 0.14;
      const azimuthAngle = w.angleStart + i * stepAngle + azimuthJitter;

      const baseLength = w.baseLength * (0.91 + n1 * 0.18);
      const baseWidth = w.baseWidth * (0.89 + n2 * 0.22);
      const baseElevation = w.baseElevation + n3 * 0.065;
      const cupConcavity = w.cupConcavity * (0.88 + n2 * 0.24);
      const lipReflex = w.lipReflex + n4 * 0.04;
      const ruffleFreq = 3.0 + Math.floor(n1 * 4.5); // 3 to 7 marginal ruffle lobes
      const ruffleAmp = (0.055 + n2 * 0.042) * (w.whorlIndex <= 1 ? 1.15 : 0.95);
      const asymmetrySkew = n3 * 0.075;
      const phaseOffset = w.whorlIndex * 1.15 + i * 0.79 + n1 * 0.85;
      const colorVariant = Number(
        ((i * 0.37 + w.whorlIndex * 0.23 + n2 * 0.4) % 1.0).toFixed(4)
      );

      specs.push({
        whorlIndex: w.whorlIndex,
        petalIndexInWhorl: i,
        azimuthAngle,
        baseElevation,
        baseLength,
        baseWidth,
        cupConcavity,
        lipReflex,
        ruffleFreq,
        ruffleAmp,
        asymmetrySkew,
        phaseOffset,
        colorVariant,
        radialAnchorOffset: w.radialAnchor + n4 * 0.012,
        verticalAnchorOffset: w.verticalAnchor + n3 * 0.008,
      });
    }
  }

  return specs;
}

/**
 * Evaluates a single 3D point on an individual broad obovate peony petal.
 * Key botanical geometry:
 * - Narrow attachment claw at v=0 widening into a lush fan-shaped obovate belly (v=0.55..0.88)
 * - Rounded, ruffled, scalloped apical margin (v=0.82..1.0)
 * - Upward-cupping concave bowl profile (scooping downward in the middle and rising toward the tip/edges)
 *   so the entire flower opens upward like `living-bloom-master.png`.
 */
function samplePetalSurfacePoint(
  spec: PetalSpec,
  uNorm: number, // 0..1 across width
  vNorm: number, // 0..1 from claw base to apical margin
  target: THREE.Vector3
): void {
  const s = (uNorm - 0.5) * 2.0; // -1..1 across petal width
  const v = vNorm; // 0..1 base to tip

  // 1. Broad obovate peony silhouette: narrow claw at base, wide fan belly at v ~ 0.72,
  //    rounded scalloped top margin (never sharp/spiky)
  const fanBelly = Math.pow(v, 0.44);
  const roundedCrown = Math.pow(
    Math.max(0.0001, 1.0 - Math.pow(Math.max(0.0, (v - 0.15) / 0.85), 4.8)),
    0.34
  );
  const baseEnvelope = (0.14 + 0.86 * fanBelly) * roundedCrown;

  // Irregular organic edge scallops & gentle bilobed waves along the top/outer margin
  const edgeScallop =
    Math.sin(s * Math.PI * spec.ruffleFreq + spec.phaseOffset) *
      0.065 *
      Math.pow(v, 1.5) +
    Math.cos(s * Math.PI * (spec.ruffleFreq + 2.0) - spec.phaseOffset * 0.7) *
      0.038 *
      Math.pow(v, 2.0);
  const apicalCleft =
    -Math.exp(-Math.pow(s * 3.2 - spec.asymmetrySkew * 2.0, 2.0)) *
    Math.pow(v, 3.2) *
    0.042;

  const halfSpan =
    spec.baseWidth * 0.5 * Math.max(0.05, baseEnvelope + edgeScallop * 0.5);
  const localX = s * halfSpan + spec.asymmetrySkew * v * v * 0.12;

  // 2. Longitudinal upward-cupping bowl profile:
  //    In local petal coordinates, negative normal offset scoops the belly *downward*
  //    so the tip and lateral edges curve *upward* into a lush open cup!
  const reachV = Math.max(0.02, v + apicalCleft + edgeScallop * 0.42);
  const radialDist = spec.baseLength * reachV;

  // Concave upward spoon/bowl arch: belly dips down (-spec.cupConcavity), tip rises & flares out
  const longitudinalBowl =
    -Math.sin(reachV * Math.PI * 0.86) * spec.cupConcavity +
    Math.pow(reachV, 2.4) * (spec.cupConcavity * 0.75 - spec.lipReflex);

  // Transverse bowl concavity: lateral edges (|s| -> 1) curl upward toward the inside of the petal
  const transverseCup =
    Math.pow(Math.abs(s), 1.75) *
    Math.sin(reachV * Math.PI * 0.92) *
    (spec.cupConcavity * 0.95);

  // 3D Marginal ruffling / plication wave along the broad outer rim
  const rimWeight =
    Math.pow(Math.abs(s), 1.5) * 0.55 + Math.pow(reachV, 1.85) * 0.75;
  const ruffleWave =
    Math.sin(s * Math.PI * spec.ruffleFreq + spec.phaseOffset * 1.3) *
      spec.ruffleAmp *
      rimWeight +
    Math.cos(
      s * Math.PI * (spec.ruffleFreq * 1.6) - reachV * 3.8 + spec.phaseOffset
    ) *
      (spec.ruffleAmp * 0.48) *
      Math.pow(reachV, 1.6);

  const localNormalLift = longitudinalBowl + transverseCup + ruffleWave;

  const cosElev = Math.cos(spec.baseElevation);
  const sinElev = Math.sin(spec.baseElevation);

  const rOut =
    spec.radialAnchorOffset +
    radialDist * cosElev -
    localNormalLift * sinElev;
  const yHeight =
    spec.verticalAnchorOffset +
    radialDist * sinElev +
    localNormalLift * cosElev;

  const cosAz = Math.cos(spec.azimuthAngle);
  const sinAz = Math.sin(spec.azimuthAngle);

  const worldX = rOut * cosAz - localX * sinAz;
  const worldZ = rOut * sinAz + localX * cosAz;

  target.set(worldX, yHeight, worldZ);
}

/**
 * Builds the complete 44-petal, 4-whorl procedural corolla as a single batched
 * THREE.BufferGeometry with per-vertex attributes for independent GPU petal articulation.
 */
export function buildLivingBloomCorollaGeometry(
  isSoftwareGl = false
): THREE.BufferGeometry {
  const specs = generateLivingBloomPetalSpecs();
  const cols = isSoftwareGl ? 16 : 24;
  const rows = isSoftwareGl ? 18 : 28;

  const vertsPerPetal = (rows + 1) * (cols + 1);
  const trisPerPetal = rows * cols * 2;
  const totalVerts = specs.length * vertsPerPetal;
  const totalIndices = specs.length * trisPerPetal * 3;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  // aPetalParams: [whorlIndex (0..3), phaseOffset, colorVariant, edgeThicknessFactor]
  const petalParams = new Float32Array(totalVerts * 4);
  // aPetalKinematics: [azimuthAngle, baseElevation, radialAnchorOffset, ruffleFreq]
  const petalKinematics = new Float32Array(totalVerts * 4);
  const indices = new Uint32Array(totalIndices);

  const pCenter = new THREE.Vector3();
  const pRight = new THREE.Vector3();
  const pUp = new THREE.Vector3();
  const tangentU = new THREE.Vector3();
  const tangentV = new THREE.Vector3();
  const normalVec = new THREE.Vector3();
  const eps = 0.004;

  let vCursor = 0;
  let iCursor = 0;

  for (let pIdx = 0; pIdx < specs.length; pIdx++) {
    const spec = specs[pIdx];
    const baseVertexOffset = vCursor;

    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      for (let c = 0; c <= cols; c++) {
        const u = c / cols;
        const s = (u - 0.5) * 2.0;

        samplePetalSurfacePoint(spec, u, v, pCenter);
        samplePetalSurfacePoint(spec, Math.min(1.0, u + eps), v, pRight);
        samplePetalSurfacePoint(spec, u, Math.min(1.0, v + eps), pUp);

        tangentU.subVectors(pRight, pCenter);
        tangentV.subVectors(pUp, pCenter);
        normalVec.crossVectors(tangentV, tangentU).normalize();
        if (normalVec.lengthSq() < 0.0001) {
          normalVec.set(0, 1, 0);
        }

        positions[vCursor * 3] = pCenter.x;
        positions[vCursor * 3 + 1] = pCenter.y;
        positions[vCursor * 3 + 2] = pCenter.z;

        normals[vCursor * 3] = normalVec.x;
        normals[vCursor * 3 + 1] = normalVec.y;
        normals[vCursor * 3 + 2] = normalVec.z;

        uvs[vCursor * 2] = u;
        uvs[vCursor * 2 + 1] = v;

        const edgeDist = Math.min(1.0 - Math.abs(s), 1.0 - v * 0.88);
        const thicknessFactor = Math.max(
          0.06,
          Math.min(
            1.0,
            (1.0 - v * 0.62) * smoothstepScalar(0.0, 0.38, edgeDist)
          )
        );

        petalParams[vCursor * 4] = spec.whorlIndex;
        petalParams[vCursor * 4 + 1] = spec.phaseOffset;
        petalParams[vCursor * 4 + 2] = spec.colorVariant;
        petalParams[vCursor * 4 + 3] = thicknessFactor;

        petalKinematics[vCursor * 4] = spec.azimuthAngle;
        petalKinematics[vCursor * 4 + 1] = spec.baseElevation;
        petalKinematics[vCursor * 4 + 2] = spec.radialAnchorOffset;
        petalKinematics[vCursor * 4 + 3] = spec.ruffleFreq;

        vCursor++;
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = baseVertexOffset + r * (cols + 1) + c;
        const i1 = i0 + 1;
        const i2 = baseVertexOffset + (r + 1) * (cols + 1) + c;
        const i3 = i2 + 1;

        indices[iCursor++] = i0;
        indices[iCursor++] = i1;
        indices[iCursor++] = i2;

        indices[iCursor++] = i1;
        indices[iCursor++] = i3;
        indices[iCursor++] = i2;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute(
    'aPetalParams',
    new THREE.BufferAttribute(petalParams, 4)
  );
  geometry.setAttribute(
    'aPetalKinematics',
    new THREE.BufferAttribute(petalKinematics, 4)
  );
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

function smoothstepScalar(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ============================================================================
// SYSTEM C: REPRODUCTIVE CENTRE (CARPELS, CURVED STAMEN FILAMENTS & ANTHERS)
// ============================================================================

export interface ReproductiveCentreGeometries {
  filamentsAndCarpelsGeometry: THREE.BufferGeometry;
  goldenAnthersGeometry: THREE.BufferGeometry;
}

interface StamenOrCarpelStrand {
  isCarpel: boolean; // true = central curled pink/lavender gynoecium structure, false = stamen filament
  whorlRatio: number; // 0..1 radial ring placement
  azimuthAngle: number;
  baseRadius: number;
  baseY: number;
  height: number;
  outwardFlare: number;
  tipCurl: number;
  phaseOffset: number;
  thicknessBase: number;
  thicknessTip: number;
}

function sampleStrandSpine(
  strand: StamenOrCarpelStrand,
  t: number, // 0 (receptacle base) .. 1 (tip)
  outPoint: THREE.Vector3,
  outTangent: THREE.Vector3
): void {
  const eps = 0.01;
  const evalPos = (u: number, target: THREE.Vector3) => {
    const flare =
      strand.outwardFlare * Math.pow(u, 1.25) +
      strand.tipCurl * Math.sin(Math.pow(u, 2.0) * Math.PI * 1.15);
    const r = Math.max(0.01, strand.baseRadius + flare);

    const hookDrop = strand.isCarpel
      ? Math.pow(Math.max(0, u - 0.68) / 0.32, 2.0) * 0.065
      : Math.pow(Math.max(0, u - 0.80) / 0.20, 2.0) * 0.025;

    const y =
      strand.baseY +
      strand.height * Math.pow(u, 0.82) -
      hookDrop;

    const twistAz =
      strand.azimuthAngle +
      Math.sin(u * Math.PI + strand.phaseOffset) *
        (strand.isCarpel ? 0.22 : 0.08);

    target.set(Math.cos(twistAz) * r, y, Math.sin(twistAz) * r);
  };

  evalPos(t, outPoint);
  const pNext = new THREE.Vector3();
  evalPos(Math.min(1.0, t + eps), pNext);
  outTangent.subVectors(pNext, outPoint).normalize();
  if (outTangent.lengthSq() < 0.0001) {
    outTangent.set(0, 1, 0);
  }
}

/**
 * Reconstructs System C matching the rich focal sanctuary of `living-bloom-master.png`:
 * 1. Central gynoecium cluster of 28 curled pink-and-lavender carpels/stigmas
 * 2. 128 delicate curved stamen filaments arranged in 3 dense concentric whorls
 * 3. 128 sculpted 3D bilobed golden pollen anthers locked to each filament tip
 */
export function buildLivingBloomReproductiveCentreGeometry(
  isSoftwareGl = false
): ReproductiveCentreGeometries {
  const strands: StamenOrCarpelStrand[] = [];

  // 1. 28 Central Curled Pink & Lavender Carpels / Stigmas (innermost sanctuary)
  for (let i = 0; i < BLOOM_CENTRAL_CARPEL_COUNT; i++) {
    const frac = i / BLOOM_CENTRAL_CARPEL_COUNT;
    const goldenAngle = i * 2.399963229728653;
    const ringR = 0.022 + Math.pow(frac, 0.72) * 0.115;
    const seed = i * 67 + 19;
    const n1 = Math.sin(seed * 1.7) * 0.5 + 0.5;
    const n2 = Math.cos(seed * 2.9);

    strands.push({
      isCarpel: true,
      whorlRatio: frac * 0.35,
      azimuthAngle: goldenAngle + n2 * 0.08,
      baseRadius: ringR,
      baseY: 0.03 + (1.0 - frac) * 0.04,
      height: 0.28 + n1 * 0.11,
      outwardFlare: 0.045 + frac * 0.075,
      tipCurl: (i % 2 === 0 ? 1 : -1) * (0.055 + n1 * 0.045),
      phaseOffset: i * 0.83,
      thicknessBase: 0.014,
      thicknessTip: 0.0085,
    });
  }

  // 2. 128 Curved Stamen Filaments across 3 concentric whorls surrounding the carpels
  for (let s = 0; s < BLOOM_STAMEN_FILAMENT_COUNT; s++) {
    const frac = s / BLOOM_STAMEN_FILAMENT_COUNT;
    const whorlIdx = s < 38 ? 0 : s < 82 ? 1 : 2;
    const goldenAngle = s * 2.399963229728653;
    const seed = s * 97 + 41;
    const n1 = Math.sin(seed * 1.43) * 0.5 + 0.5;
    const n2 = Math.cos(seed * 2.71);

    const baseRadius =
      whorlIdx === 0
        ? 0.125 + n1 * 0.035
        : whorlIdx === 1
        ? 0.175 + n1 * 0.042
        : 0.225 + n1 * 0.048;

    const height =
      whorlIdx === 0
        ? 0.32 + n1 * 0.08
        : whorlIdx === 1
        ? 0.36 + n1 * 0.09
        : 0.40 + n1 * 0.10;

    const outwardFlare =
      whorlIdx === 0
        ? 0.11 + n1 * 0.06
        : whorlIdx === 1
        ? 0.18 + n1 * 0.08
        : 0.26 + n1 * 0.09;

    strands.push({
      isCarpel: false,
      whorlRatio: 0.38 + frac * 0.62,
      azimuthAngle: goldenAngle + n2 * 0.06,
      baseRadius,
      baseY: 0.01 - whorlIdx * 0.012,
      height,
      outwardFlare,
      tipCurl: -0.045 + n2 * 0.03,
      phaseOffset: s * 0.61 + whorlIdx * 1.3,
      thicknessBase: 0.0068,
      thicknessTip: 0.0034,
    });
  }

  // Build tubular geometry for all 156 strands (28 carpels + 128 filaments)
  const radialSides = isSoftwareGl ? 5 : 6;
  const lengthSegs = isSoftwareGl ? 10 : 14;
  const vertsPerStrand = (lengthSegs + 1) * (radialSides + 1);
  const trisPerStrand = lengthSegs * radialSides * 2;

  const totalStrandVerts = strands.length * vertsPerStrand;
  const totalStrandIndices = strands.length * trisPerStrand * 3;

  const fPositions = new Float32Array(totalStrandVerts * 3);
  const fNormals = new Float32Array(totalStrandVerts * 3);
  const fUvs = new Float32Array(totalStrandVerts * 2);
  // aStamenParams: [isCarpel (1 or 0), phaseOffset, whorlRatio, azimuthAngle]
  const fParams = new Float32Array(totalStrandVerts * 4);
  const fIndices = new Uint32Array(totalStrandIndices);

  const spinePt = new THREE.Vector3();
  const spineTan = new THREE.Vector3();
  const upRef = new THREE.Vector3(0, 1, 0);
  const sideRef = new THREE.Vector3(1, 0, 0);
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();

  let fvCursor = 0;
  let fiCursor = 0;

  // Also collect tip positions & orientations for the 128 golden pollen anthers
  const antherTipTransforms: Array<{
    tipPos: THREE.Vector3;
    tipTan: THREE.Vector3;
    strand: StamenOrCarpelStrand;
  }> = [];

  for (let idx = 0; idx < strands.length; idx++) {
    const strand = strands[idx];
    const baseVertexOffset = fvCursor;

    for (let l = 0; l <= lengthSegs; l++) {
      const v = l / lengthSegs;
      sampleStrandSpine(strand, v, spinePt, spineTan);

      if (l === lengthSegs && !strand.isCarpel) {
        antherTipTransforms.push({
          tipPos: spinePt.clone(),
          tipTan: spineTan.clone(),
          strand,
        });
      }

      const refVec = Math.abs(spineTan.y) > 0.92 ? sideRef : upRef;
      binormal.crossVectors(spineTan, refVec).normalize();
      normal.crossVectors(binormal, spineTan).normalize();

      const radius =
        strand.thicknessBase * (1.0 - v * 0.62) +
        strand.thicknessTip * (v * 0.62) +
        (strand.isCarpel && v > 0.75
          ? Math.sin(((v - 0.75) / 0.25) * Math.PI) * 0.006
          : 0.0);

      for (let c = 0; c <= radialSides; c++) {
        const u = c / radialSides;
        const theta = u * Math.PI * 2.0;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);

        const nx = binormal.x * cosT + normal.x * sinT;
        const ny = binormal.y * cosT + normal.y * sinT;
        const nz = binormal.z * cosT + normal.z * sinT;

        fPositions[fvCursor * 3] = spinePt.x + nx * radius;
        fPositions[fvCursor * 3 + 1] = spinePt.y + ny * radius;
        fPositions[fvCursor * 3 + 2] = spinePt.z + nz * radius;

        fNormals[fvCursor * 3] = nx;
        fNormals[fvCursor * 3 + 1] = ny;
        fNormals[fvCursor * 3 + 2] = nz;

        fUvs[fvCursor * 2] = u;
        fUvs[fvCursor * 2 + 1] = v;

        fParams[fvCursor * 4] = strand.isCarpel ? 1.0 : 0.0;
        fParams[fvCursor * 4 + 1] = strand.phaseOffset;
        fParams[fvCursor * 4 + 2] = strand.whorlRatio;
        fParams[fvCursor * 4 + 3] = strand.azimuthAngle;

        fvCursor++;
      }
    }

    for (let l = 0; l < lengthSegs; l++) {
      for (let c = 0; c < radialSides; c++) {
        const i0 = baseVertexOffset + l * (radialSides + 1) + c;
        const i1 = i0 + 1;
        const i2 = baseVertexOffset + (l + 1) * (radialSides + 1) + c;
        const i3 = i2 + 1;

        fIndices[fiCursor++] = i0;
        fIndices[fiCursor++] = i1;
        fIndices[fiCursor++] = i2;

        fIndices[fiCursor++] = i1;
        fIndices[fiCursor++] = i3;
        fIndices[fiCursor++] = i2;
      }
    }
  }

  const filamentsAndCarpelsGeometry = new THREE.BufferGeometry();
  filamentsAndCarpelsGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(fPositions, 3)
  );
  filamentsAndCarpelsGeometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(fNormals, 3)
  );
  filamentsAndCarpelsGeometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(fUvs, 2)
  );
  filamentsAndCarpelsGeometry.setAttribute(
    'aStamenParams',
    new THREE.BufferAttribute(fParams, 4)
  );
  filamentsAndCarpelsGeometry.setIndex(new THREE.BufferAttribute(fIndices, 1));
  filamentsAndCarpelsGeometry.computeBoundingSphere();

  // 3. Build Sculpted 3D Bilobed Golden Pollen Anthers for all 128 stamens
  const uSegs = isSoftwareGl ? 8 : 10;
  const vSegs = isSoftwareGl ? 6 : 8;
  const vertsPerAnther = (vSegs + 1) * (uSegs + 1);
  const trisPerAnther = vSegs * uSegs * 2;

  const totalAntherVerts = antherTipTransforms.length * vertsPerAnther;
  const totalAntherIndices = antherTipTransforms.length * trisPerAnther * 3;

  const aPositions = new Float32Array(totalAntherVerts * 3);
  const aNormals = new Float32Array(totalAntherVerts * 3);
  const aUvs = new Float32Array(totalAntherVerts * 2);
  // aAntherParams: [phaseOffset, whorlRatio, azimuthAngle, lobeCrest]
  const aParams = new Float32Array(totalAntherVerts * 4);
  const aIndices = new Uint32Array(totalAntherIndices);

  let avCursor = 0;
  let aiCursor = 0;

  for (let aIdx = 0; aIdx < antherTipTransforms.length; aIdx++) {
    const { tipPos, tipTan, strand } = antherTipTransforms[aIdx];
    const baseVertexOffset = avCursor;

    const refVec = Math.abs(tipTan.y) > 0.92 ? sideRef : upRef;
    binormal.crossVectors(tipTan, refVec).normalize();
    normal.crossVectors(binormal, tipTan).normalize();

    for (let r = 0; r <= vSegs; r++) {
      const v = r / vSegs;
      const phi = v * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let c = 0; c <= uSegs; c++) {
        const u = c / uSegs;
        const theta = u * Math.PI * 2.0;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);

        // Rich, distinctly visible bilobed golden pollen sac
        const bilobePinch = 1.0 - 0.34 * Math.pow(Math.abs(cosTheta), 2.0);
        const rx = 0.025 * sinPhi * cosTheta;
        const ry = 0.035 * cosPhi * bilobePinch;
        const rz = 0.018 * sinPhi * sinTheta * bilobePinch;

        const wx =
          tipPos.x + binormal.x * rx + tipTan.x * ry + normal.x * rz;
        const wy =
          tipPos.y + binormal.y * rx + tipTan.y * ry + normal.y * rz;
        const wz =
          tipPos.z + binormal.z * rx + tipTan.z * ry + normal.z * rz;

        const nLocalX = sinPhi * cosTheta;
        const nLocalY = cosPhi;
        const nLocalZ = sinPhi * sinTheta;
        const nWorldX =
          binormal.x * nLocalX + tipTan.x * nLocalY + normal.x * nLocalZ;
        const nWorldY =
          binormal.y * nLocalX + tipTan.y * nLocalY + normal.y * nLocalZ;
        const nWorldZ =
          binormal.z * nLocalX + tipTan.z * nLocalY + normal.z * nLocalZ;
        const nLen = Math.hypot(nWorldX, nWorldY, nWorldZ) || 1.0;

        aPositions[avCursor * 3] = wx;
        aPositions[avCursor * 3 + 1] = wy;
        aPositions[avCursor * 3 + 2] = wz;

        aNormals[avCursor * 3] = nWorldX / nLen;
        aNormals[avCursor * 3 + 1] = nWorldY / nLen;
        aNormals[avCursor * 3 + 2] = nWorldZ / nLen;

        aUvs[avCursor * 2] = u;
        aUvs[avCursor * 2 + 1] = v;

        aParams[avCursor * 4] = strand.phaseOffset;
        aParams[avCursor * 4 + 1] = strand.whorlRatio;
        aParams[avCursor * 4 + 2] = strand.azimuthAngle;
        aParams[avCursor * 4 + 3] = bilobePinch;

        avCursor++;
      }
    }

    for (let r = 0; r < vSegs; r++) {
      for (let c = 0; c < uSegs; c++) {
        const i0 = baseVertexOffset + r * (uSegs + 1) + c;
        const i1 = i0 + 1;
        const i2 = baseVertexOffset + (r + 1) * (uSegs + 1) + c;
        const i3 = i2 + 1;

        aIndices[aiCursor++] = i0;
        aIndices[aiCursor++] = i1;
        aIndices[aiCursor++] = i2;

        aIndices[aiCursor++] = i1;
        aIndices[aiCursor++] = i3;
        aIndices[aiCursor++] = i2;
      }
    }
  }

  const goldenAnthersGeometry = new THREE.BufferGeometry();
  goldenAnthersGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(aPositions, 3)
  );
  goldenAnthersGeometry.setAttribute(
    'normal',
    new THREE.BufferAttribute(aNormals, 3)
  );
  goldenAnthersGeometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(aUvs, 2)
  );
  goldenAnthersGeometry.setAttribute(
    'aAntherParams',
    new THREE.BufferAttribute(aParams, 4)
  );
  goldenAnthersGeometry.setIndex(new THREE.BufferAttribute(aIndices, 1));
  goldenAnthersGeometry.computeBoundingSphere();

  return {
    filamentsAndCarpelsGeometry,
    goldenAnthersGeometry,
  };
}

// ============================================================================
// SYSTEM E: SUPPORTING BOTANICAL STEM, RECEPTACLE & DETAILED CALYX SEPALS
// ============================================================================

/**
 * Reconstructs System E matching `living-bloom-master.png`:
 * - Curved, fluted botanical stem descending beneath the flower with a natural
 *   graceful lean to the lower-left
 * - Swollen botanical receptacle transition beneath the outer petals
 * - 7 pointed, recurved, veined calyx sepals framing the underside of the corolla
 */
export function buildLivingBloomStemAndSepalsGeometry(
  isSoftwareGl = false
): THREE.BufferGeometry {
  const stemRadial = isSoftwareGl ? 16 : 24;
  const stemRows = isSoftwareGl ? 24 : 36;
  const stemVerts = (stemRows + 1) * (stemRadial + 1);
  const stemTris = stemRows * stemRadial * 2;

  const sepalCols = isSoftwareGl ? 10 : 14;
  const sepalRows = isSoftwareGl ? 12 : 18;
  const vertsPerSepal = (sepalRows + 1) * (sepalCols + 1);
  const trisPerSepal = sepalRows * sepalCols * 2;

  const totalVerts = stemVerts + BLOOM_SEPAL_COUNT * vertsPerSepal;
  const totalIndices = (stemTris + BLOOM_SEPAL_COUNT * trisPerSepal) * 3;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  // aCalyxParams: [partType (0=stem/receptacle, 1=sepal), phaseOffset, fluteOrVein, edgeFactor]
  const calyxParams = new Float32Array(totalVerts * 4);
  const indices = new Uint32Array(totalIndices);

  let vCursor = 0;
  let iCursor = 0;

  // 1. Curved Fluted Botanical Stem + Swollen Upper Receptacle
  for (let r = 0; r <= stemRows; r++) {
    const v = r / stemRows; // 0 = top receptacle under petals, 1 = lower stem base
    const spineX = -0.26 * Math.pow(v, 1.35) - 0.06 * Math.sin(v * Math.PI);
    const spineY = -0.16 - v * 1.55;
    // Project slightly forward (+Z) in local space so under +X botanical tilt the stem emerges cleanly beneath the lower petals
    const spineZ = 0.24 + 0.34 * Math.pow(v, 1.15);

    const tx = -0.35 * Math.pow(Math.max(0.01, v), 0.35);
    const ty = -1.55;
    const tz = 0.38 * Math.pow(Math.max(0.01, v), 0.25);
    const tLen = Math.hypot(tx, ty, tz) || 1.0;
    const tanX = tx / tLen;

    const receptacleFlare = Math.exp(-Math.pow(v / 0.16, 2.0)) * 0.21;
    const baseStemRadius = 0.074 * (1.0 - v * 0.20) + receptacleFlare;

    for (let c = 0; c <= stemRadial; c++) {
      const u = c / stemRadial;
      const theta = u * Math.PI * 2.0;

      const flute = 0.5 + 0.5 * Math.cos(theta * 8.0 + v * 1.8);
      const rad =
        baseStemRadius * (1.0 + 0.07 * flute * (1.0 - receptacleFlare * 2.5));

      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const nx = cosT * (1.0 - tanX * tanX * 0.3);
      const ny = -cosT * tanX * 0.22;
      const nz = sinT;
      const nLen = Math.hypot(nx, ny, nz) || 1.0;

      positions[vCursor * 3] = spineX + (nx / nLen) * rad;
      positions[vCursor * 3 + 1] = spineY + (ny / nLen) * rad;
      positions[vCursor * 3 + 2] = spineZ + (nz / nLen) * rad;

      normals[vCursor * 3] = nx / nLen;
      normals[vCursor * 3 + 1] = ny / nLen;
      normals[vCursor * 3 + 2] = nz / nLen;

      uvs[vCursor * 2] = u;
      uvs[vCursor * 2 + 1] = v;

      calyxParams[vCursor * 4] = 0.0; // stem/receptacle
      calyxParams[vCursor * 4 + 1] = v * 2.0;
      calyxParams[vCursor * 4 + 2] = flute;
      calyxParams[vCursor * 4 + 3] = v;

      vCursor++;
    }
  }

  for (let r = 0; r < stemRows; r++) {
    for (let c = 0; c < stemRadial; c++) {
      const i0 = r * (stemRadial + 1) + c;
      const i1 = i0 + 1;
      const i2 = (r + 1) * (stemRadial + 1) + c;
      const i3 = i2 + 1;

      indices[iCursor++] = i0;
      indices[iCursor++] = i2;
      indices[iCursor++] = i1;

      indices[iCursor++] = i1;
      indices[iCursor++] = i2;
      indices[iCursor++] = i3;
    }
  }

  // 2. 7 Detailed Acuminate Recurved Calyx Sepals Beneath the Lower Corolla
  const pCenter = new THREE.Vector3();
  const pRight = new THREE.Vector3();
  const pUp = new THREE.Vector3();
  const tangentU = new THREE.Vector3();
  const tangentV = new THREE.Vector3();
  const normalVec = new THREE.Vector3();

  // Concentrate 5 sepals toward the front/lower-left/lower-right camera-facing underside
  // and 2 toward the rear so the pointed sepals below the flower match living-bloom-master.png
  const sepalAzimuths = [0.72, 1.18, 1.58, 1.98, 2.42, 3.85, 5.45];

  const sampleSepalPoint = (
    sIdx: number,
    u: number,
    v: number,
    target: THREE.Vector3
  ) => {
    const isPrimary = sIdx < 5;
    const azBase = sepalAzimuths[sIdx % sepalAzimuths.length];
    const sepalLen = isPrimary ? 0.88 + (sIdx % 3) * 0.09 : 0.68;
    const sepalWid = isPrimary ? 0.30 : 0.24;

    const s = (u - 0.5) * 2.0; // -1..1
    const widthEnv =
      Math.sin(Math.pow(v, 0.48) * Math.PI) * Math.pow(1.0 - v, 0.42);
    const localX =
      s * sepalWid * widthEnv + Math.sin(v * 3.8 + sIdx) * 0.032 * v;

    // Arch outward and curve downward beneath the lower petals
    const rOut = 0.28 + sepalLen * Math.sin(v * Math.PI * 0.62) * 0.78;
    const dropY =
      -0.16 -
      sepalLen * Math.pow(v, 1.02) * 0.86 +
      Math.sin(v * Math.PI) * 0.05;

    const keel = -Math.exp(-s * s * 10.0) * 0.02 * (1.0 - v * 0.5);
    const edgeCurl = Math.pow(Math.abs(s), 2.0) * 0.028 * v;

    const cosAz = Math.cos(azBase);
    const sinAz = Math.sin(azBase);

    const rFinal = rOut + keel + edgeCurl;
    target.set(
      rFinal * cosAz - localX * sinAz,
      dropY,
      0.18 + rFinal * sinAz + localX * cosAz
    );
  };

  const eps = 0.005;
  for (let sIdx = 0; sIdx < BLOOM_SEPAL_COUNT; sIdx++) {
    const baseVertexOffset = vCursor;

    for (let r = 0; r <= sepalRows; r++) {
      const v = r / sepalRows;
      for (let c = 0; c <= sepalCols; c++) {
        const u = c / sepalCols;
        const s = (u - 0.5) * 2.0;

        sampleSepalPoint(sIdx, u, v, pCenter);
        sampleSepalPoint(sIdx, Math.min(1.0, u + eps), v, pRight);
        sampleSepalPoint(sIdx, u, Math.min(1.0, v + eps), pUp);

        tangentU.subVectors(pRight, pCenter);
        tangentV.subVectors(pUp, pCenter);
        normalVec.crossVectors(tangentV, tangentU).normalize();
        if (normalVec.lengthSq() < 0.0001) {
          normalVec.set(0, -1, 0);
        }

        positions[vCursor * 3] = pCenter.x;
        positions[vCursor * 3 + 1] = pCenter.y;
        positions[vCursor * 3 + 2] = pCenter.z;

        normals[vCursor * 3] = normalVec.x;
        normals[vCursor * 3 + 1] = normalVec.y;
        normals[vCursor * 3 + 2] = normalVec.z;

        uvs[vCursor * 2] = u;
        uvs[vCursor * 2 + 1] = v;

        calyxParams[vCursor * 4] = 1.0; // sepal
        calyxParams[vCursor * 4 + 1] = sIdx * 1.17;
        calyxParams[vCursor * 4 + 2] = Math.exp(-s * s * 12.0);
        calyxParams[vCursor * 4 + 3] = Math.abs(s);

        vCursor++;
      }
    }

    for (let r = 0; r < sepalRows; r++) {
      for (let c = 0; c < sepalCols; c++) {
        const i0 = baseVertexOffset + r * (sepalCols + 1) + c;
        const i1 = i0 + 1;
        const i2 = baseVertexOffset + (r + 1) * (sepalCols + 1) + c;
        const i3 = i2 + 1;

        indices[iCursor++] = i0;
        indices[iCursor++] = i1;
        indices[iCursor++] = i2;

        indices[iCursor++] = i1;
        indices[iCursor++] = i3;
        indices[iCursor++] = i2;
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute(
    'aCalyxParams',
    new THREE.BufferAttribute(calyxParams, 4)
  );
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  return geometry;
}

// ============================================================================
// SYSTEM F: FLOATING GOLDEN POLLEN & LUMINOUS BOTANICAL DUST GEOMETRY
// ============================================================================

export function buildLivingBloomPollenGeometry(
  count = BLOOM_POLLEN_PARTICLE_COUNT
): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  // aPollenParams: [phase, driftSpeed, sizeScale, particleType (0=golden pollen, 1=luminous dust)]
  const pollenParams = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const frac = i / count;
    const goldenAngle = i * 2.399963229728653;
    const isGoldenPollen = i % 4 !== 0; // 75% warm golden pollen grains, 25% fine iridescent dust

    // Halo around the upper corolla perimeter and above the stamen ring (like master PNG)
    const radius = isGoldenPollen
      ? 0.35 + Math.pow(frac, 0.65) * 1.28
      : 0.45 + Math.pow(frac, 0.6) * 1.42;
    const y =
      -0.05 +
      Math.sin(i * 1.71) * 0.42 +
      Math.pow(frac, 0.78) * 0.72;

    positions[i * 3] = Math.cos(goldenAngle) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(goldenAngle) * radius;

    pollenParams[i * 4] = ((i * 59) % 1000) / 1000;
    pollenParams[i * 4 + 1] = 0.2 + ((i * 37) % 100) / 170;
    pollenParams[i * 4 + 2] = isGoldenPollen
      ? 0.92 + ((i * 23) % 100) / 80
      : 0.58 + ((i * 19) % 100) / 110;
    pollenParams[i * 4 + 3] = isGoldenPollen ? 0.0 : 1.0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    'aPollenParams',
    new THREE.BufferAttribute(pollenParams, 4)
  );
  geometry.computeBoundingSphere();

  return geometry;
}

// ============================================================================
// STAGE 4 & 5: CUSTOM GLSL BOTANICAL SHADERS (PETALS, VEINS, STAMENS, POLLEN)
// ============================================================================

/**
 * SYSTEM A, B & D: TRANSLUCENT IRIDESCENT PETAL & VASCULAR VERTEX SHADER
 */
export const LIVING_BLOOM_PETAL_VERTEX_SHADER = /* glsl */ `
attribute vec4 aPetalParams;     // x: whorlIndex, y: phaseOffset, z: colorVariant, w: thicknessFactor
attribute vec4 aPetalKinematics; // x: azimuthAngle, y: baseElevation, z: radialAnchor, w: ruffleFreq

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec4 vPetalParams;
varying float vMarginalWave;

uniform float uTime;
uniform float uOuterOpenness;
uniform float uMidOpenness;
uniform float uInnerOpenness;
uniform float uNectaryPulse;
uniform float uAudioBass;
uniform float uAudioAmp;
uniform vec2 uPointerLocal;

void main() {
  vUv = uv;
  vPetalParams = aPetalParams;

  float whorlIdx = aPetalParams.x;
  float phase = aPetalParams.y;
  float azAngle = aPetalKinematics.x;
  float radialAnchor = aPetalKinematics.z;
  float ruffleFreq = aPetalKinematics.w;

  float u = uv.x;
  float v = uv.y;
  float s = (u - 0.5) * 2.0;

  // 1. Staggered whorl openness factor (outer -> lower-mid -> upper-mid -> inner crown)
  float whorlOpen = uOuterOpenness;
  if (whorlIdx > 2.5) {
    whorlOpen = uInnerOpenness;
  } else if (whorlIdx > 1.5) {
    whorlOpen = mix(uMidOpenness, uInnerOpenness, 0.55);
  } else if (whorlIdx > 0.5) {
    whorlOpen = uMidOpenness;
  }

  // 2. Independent per-petal non-periodic breathing & unfurling angle
  float slowBreath = sin(uTime * 0.58 + phase) * 0.062
                   + cos(uTime * 0.3584 - phase * 1.17) * 0.042;
  float openDelta = (whorlOpen - 0.68) * (0.24 + (3.0 - whorlIdx) * 0.05) + slowBreath;

  vec2 radialDirXZ = vec2(cos(azAngle), sin(azAngle));
  vec2 tangentDirXZ = vec2(-sin(azAngle), cos(azAngle));

  vec3 pos = position;
  vec3 norm = normal;

  float relR = dot(pos.xz, radialDirXZ) - radialAnchor;
  float relY = pos.y;

  // Pitch outward when blooming open, relax gently inward when inhaling
  float pitchAngle = -openDelta * pow(v, 0.85);
  float cosP = cos(pitchAngle);
  float sinP = sin(pitchAngle);

  float rotatedR = radialAnchor + relR * cosP - relY * sinP;
  float rotatedY = relR * sinP + relY * cosP;

  // 3. Longitudinal camber flexing & natural apical curling
  float camberFlex = sin(v * 3.14159 - uTime * 0.74 + phase) * 0.028 * pow(v, 1.35)
                   + uAudioBass * 0.022 * v;

  // 4. Travelling organic marginal ruffle wave (matches Living Bloom motion video)
  float edgeMask = pow(abs(s), 1.35) * 0.65 + pow(v, 1.85) * 0.58;
  float marginalFlutter = (
    sin(s * 3.14159 * ruffleFreq + uTime * 1.12 + phase) * 0.024 +
    cos(v * 5.0 - uTime * 0.88 + phase * 1.4) * 0.016
  ) * edgeMask;
  vMarginalWave = marginalFlutter;

  float lateralSway = sin(uTime * 0.49 + phase * 0.9) * 0.024 * pow(v, 1.4);

  pos.xz = radialDirXZ * (rotatedR + camberFlex * 0.42)
         + tangentDirXZ * (dot(position.xz, tangentDirXZ) + lateralSway);
  pos.y = rotatedY + camberFlex + marginalFlutter;

  // 5. Interactive environmental current response to pointer proximity
  vec2 diffPtr = pos.xz - uPointerLocal;
  float distPtr = length(diffPtr);
  if (distPtr < 1.15 && distPtr > 0.001) {
    float push = pow(1.0 - distPtr / 1.15, 2.0) * 0.14 * pow(v, 1.1);
    pos.xz += (diffPtr / distPtr) * push;
    pos.y -= push * 0.32;
  }

  norm = normalize(norm + vec3(radialDirXZ.x * marginalFlutter * 2.2, camberFlex * 1.6, radialDirXZ.y * marginalFlutter * 2.2));

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vWorldPosition = worldPos.xyz;

  vec4 mvPosition = viewMatrix * worldPos;
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * norm);

  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * SYSTEM A, B & STAGE 4: TRANSLUCENT IRIDESCENT PETAL & VASCULAR FRAGMENT SHADER
 */
export const LIVING_BLOOM_PETAL_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec4 vPetalParams; // x: whorlIndex, y: phaseOffset, z: colorVariant, w: thicknessFactor
varying float vMarginalWave;

uniform float uTime;
uniform float uLuminescence;
uniform float uPassOpacity;
uniform float uNectaryPulse;
uniform float uAudioAmp;

uniform vec3 uColorPearlPink;
uniform vec3 uColorCoralRose;
uniform vec3 uColorLavender;
uniform vec3 uColorTranslucentWhite;
uniform vec3 uColorIridescentViolet;
uniform vec3 uColorGoldenPollen;
uniform vec3 uColorCyanReflection;
uniform vec3 uColorVeinChampagne;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float smoothNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

/**
 * Evaluates System B: 3-Level Hierarchical Botanical Vein Network inside each petal
 * Returns vec2(totalVeinMask, primarySecondaryMask)
 */
vec2 evaluateBotanicalVeinNetwork(vec2 uv, float phase) {
  float s = (uv.x - 0.5) * 2.0; // -1..1 across petal width
  float v = uv.y;                // 0..1 base to tip
  float absS = abs(s);

  float warpA = (smoothNoise(vec2(s * 4.8 + phase, v * 5.8)) - 0.5) * 0.068;
  float warpB = (smoothNoise(vec2(s * 12.0, v * 12.0 - phase)) - 0.5) * 0.028;
  float ws = s + warpA;
  float wv = v + warpB;

  // 1. Primary Central Midrib & Basal Fan Bundle
  float midribDist = abs(ws * (1.0 + v * 0.9));
  float primaryMidrib = exp(-midribDist * 40.0) * (1.0 - v * 0.32);

  // Fanning primary longitudinal ribs radiating from the claw through the broad obovate lamina
  float fanAngle = atan(ws, wv + 0.16);
  float primaryFanSin = abs(sin(fanAngle * 11.0 + sin(wv * 6.5 + phase) * 0.32));
  float primaryFanVeins = exp(-primaryFanSin * 11.0) * smoothstep(0.02, 0.22, v) * (1.0 - v * 0.18);

  // 2. Secondary Dichotomous / Arcuate Lateral Branches curving outward toward margins
  float branchCoord = abs(ws) * 9.2 - pow(max(0.0, wv), 0.76) * 6.2 + sin(wv * 9.5 + phase) * 0.25;
  float secondarySin = abs(sin(branchCoord * 3.14159));
  float secondaryVeins = exp(-secondarySin * 12.5) * smoothstep(0.04, 0.28, absS) * smoothstep(0.06, 0.92, v);

  // 3. Tertiary Anastomosing Reticulate Capillary Mesh near translucent outer petal zone
  float retA = abs(sin((ws * 18.0 + wv * 15.0 + warpA * 8.0) * 3.14159));
  float retB = abs(sin((ws * 16.0 - wv * 19.0 + warpB * 9.0) * 3.14159));
  float tertiaryMesh = (exp(-retA * 13.5) + exp(-retB * 13.5)) * 0.45 * smoothstep(0.24, 0.96, v);

  float mainVeins = clamp(primaryMidrib * 0.95 + primaryFanVeins * 0.82 + secondaryVeins * 0.72, 0.0, 1.0);
  float totalVeins = clamp(mainVeins + tertiaryMesh * 0.52, 0.0, 1.0);

  return vec2(totalVeins, mainVeins);
}

void main() {
  float whorlIdx = vPetalParams.x;
  float phase = vPetalParams.y;
  float colorVar = vPetalParams.z;
  float thickness = vPetalParams.w;

  float u = vUv.x;
  float v = vUv.y;
  float s = (u - 0.5) * 2.0;

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) {
    N = -N;
  }
  vec3 V = normalize(vViewPosition);

  // Epidermal cellular microstructure sparkle & golden pollen micro-dust on inner petals
  float cellNoiseA = smoothNoise(vUv * vec2(74.0, 92.0) + phase);
  float cellNoiseB = smoothNoise(vUv * vec2(142.0, 160.0) - phase);
  vec3 microNormal = normalize(N + vec3((cellNoiseA - 0.5) * 0.14, (cellNoiseB - 0.5) * 0.14, 0.0));

  float NdotV = clamp(abs(dot(microNormal, V)), 0.0, 1.0);
  float fresnel = pow(1.0 - NdotV, 2.5);

  // --------------------------------------------------------------------------
  // 1. MULTI-TIER BOTANICAL BASE PALETTE & SUBSURFACE SCATTERING APPROXIMATION
  // --------------------------------------------------------------------------
  float outerWeight = clamp(1.0 - whorlIdx * 0.36, 0.0, 1.0);
  float innerWeight = clamp(whorlIdx / 3.0, 0.0, 1.0);

  // Warm coral-rose & golden-peach basal claw glow
  vec3 basalColor = mix(uColorCoralRose, uColorVeinChampagne, 0.38 * (1.0 - innerWeight * 0.4));
  basalColor = mix(basalColor, uColorGoldenPollen, 0.22 * innerWeight * uNectaryPulse);

  // Rich coral-rose and pearl-pink mid lamina with warm champagne blush
  vec3 midLaminaColor = mix(
    mix(uColorPearlPink, uColorLavender, 0.48 * outerWeight + colorVar * 0.22),
    mix(uColorCoralRose, uColorPearlPink, 0.38 + colorVar * 0.18),
    0.42 + innerWeight * 0.52
  );

  // Iridescent lavender-violet & translucent pearl-white scalloped margins
  vec3 apicalMarginColor = mix(
    mix(uColorLavender, uColorIridescentViolet, 0.55 * outerWeight + 0.22),
    mix(uColorPearlPink, uColorTranslucentWhite, 0.62),
    smoothstep(0.62, 0.96, v) * (0.58 + 0.25 * innerWeight)
  );

  vec3 petalAlbedo = mix(basalColor, midLaminaColor, smoothstep(0.0, 0.44, v));
  petalAlbedo = mix(petalAlbedo, apicalMarginColor, smoothstep(0.44, 0.94, v));

  // Studio 3-point botanical lighting + wrapped subsurface scattering (SSS)
  vec3 keyLightDir = normalize(vec3(0.38, 0.82, 0.44));
  float wrapDiff = clamp((dot(microNormal, keyLightDir) + 0.58) / 1.58, 0.0, 1.0);
  float sssTranslucency = pow(clamp(dot(V, -keyLightDir + microNormal * 0.35), 0.0, 1.0), 2.2) * (1.0 - thickness * 0.52);
  float nectaryCoreScatter = exp(-length(vWorldPosition) * 1.95) * (0.48 + 0.24 * uNectaryPulse);

  vec3 sssColor = mix(uColorCoralRose, uColorVeinChampagne, 0.44) * (sssTranslucency * 0.56 + nectaryCoreScatter * 0.54);

  // --------------------------------------------------------------------------
  // 2. SYSTEM B: INTRICATE BRANCHING BOTANICAL VEINS & TRAVELLING ILLUMINATION
  // --------------------------------------------------------------------------
  vec2 veins = evaluateBotanicalVeinNetwork(vUv, phase);
  float totalVeinMask = veins.x;
  float mainVeinMask = veins.y;

  float sapWave = 0.55 + 0.45 * sin(v * 7.5 - uTime * 1.25 + phase * 0.8);
  vec3 veinColor = mix(uColorVeinChampagne, uColorTranslucentWhite, 0.48 * sapWave);
  veinColor = mix(veinColor, uColorCoralRose, 0.32 * (1.0 - v));
  vec3 vascularGlow = veinColor * (totalVeinMask * 0.38 + mainVeinMask * sapWave * (0.36 + uAudioAmp * 0.18));

  // --------------------------------------------------------------------------
  // 3. IRIDESCENT THIN-FILM INTERFERENCE & SUBTLE CYAN / VIOLET REFLECTIONS
  // --------------------------------------------------------------------------
  float filmPhase = (1.0 - NdotV) * 5.4 + v * 2.3 + vMarginalWave * 15.0 + colorVar * 1.8;
  float cyanBand = pow(0.5 + 0.5 * sin(filmPhase), 2.5);
  float violetBand = pow(0.5 + 0.5 * cos(filmPhase * 0.85 + 1.1), 2.0);

  vec3 thinFilmIridescence =
    uColorIridescentViolet * (violetBand * fresnel * 0.52) +
    uColorCyanReflection * (cyanBand * fresnel * (0.28 + 0.24 * outerWeight)) +
    uColorTranslucentWhite * (pow(fresnel, 1.9) * 0.24);

  // Delicate epidermal sparkle + golden pollen speckles settled on the petals (like master PNG)
  float sparkle = pow(cellNoiseA * cellNoiseB, 3.4);
  vec3 cellularSheen =
    mix(uColorTranslucentWhite, uColorCyanReflection, 0.32) * (sparkle * wrapDiff * 0.34) +
    uColorGoldenPollen * (step(0.84, cellNoiseA * cellNoiseB) * (1.0 - v * 0.4) * 0.42);

  // --------------------------------------------------------------------------
  // 4. GOSSAMER TRANSLUCENT BOUNDARY & COMPOSITE OPACITY
  // --------------------------------------------------------------------------
  float outerBoundaryFeather = smoothstep(1.0, 0.94, abs(s)) * smoothstep(1.0, 0.95, v);
  float rimLume = smoothstep(0.76, 0.97, max(abs(s), v)) * outerBoundaryFeather;

  vec3 finalColor =
    petalAlbedo * (0.48 + wrapDiff * 0.54) +
    sssColor +
    vascularGlow +
    thinFilmIridescence +
    cellularSheen +
    mix(uColorPearlPink, uColorTranslucentWhite, 0.55) * (rimLume * 0.24);

  // Controlled exposure clamp to avoid excessive bloom or white-out
  finalColor = min(finalColor * uLuminescence, vec3(1.16));

  float alpha = (
    0.25 +
    thickness * 0.34 +
    fresnel * 0.26 +
    totalVeinMask * 0.16 +
    rimLume * 0.12
  ) * outerBoundaryFeather * uPassOpacity;

  gl_FragColor = vec4(finalColor, clamp(alpha, 0.02, 0.88));
}
`;

/**
 * SYSTEM C: REPRODUCTIVE CENTRE (CURLED CARPELS & STAMEN FILAMENTS) VERTEX SHADER
 */
export const LIVING_BLOOM_STAMEN_VERTEX_SHADER = /* glsl */ `
attribute vec4 aStamenParams; // x: isCarpel, y: phaseOffset, z: whorlRatio, w: azimuthAngle

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vStamenParams;

uniform float uTime;
uniform float uInnerOpenness;
uniform float uAudioTreble;
uniform vec2 uPointerLocal;

void main() {
  vUv = uv;
  vStamenParams = aStamenParams;

  float isCarpel = aStamenParams.x;
  float phase = aStamenParams.y;
  float whorlRatio = aStamenParams.z;
  float azAngle = aStamenParams.w;
  float v = uv.y; // 0 = base, 1 = tip

  vec3 pos = position;

  // Independent organic swaying of each filament & carpel
  float swayRadius = pow(v, 1.45) * (isCarpel > 0.5 ? 0.026 : 0.042 + uAudioTreble * 0.018);
  float waveX = sin(uTime * 0.92 + phase + whorlRatio * 3.1) * swayRadius
              + cos(uTime * 0.57 - phase * 0.8) * (swayRadius * 0.45);
  float waveZ = cos(uTime * 0.84 + phase * 1.15) * swayRadius
              + sin(uTime * 0.61 + whorlRatio * 4.0) * (swayRadius * 0.45);

  float radialBreath = (uInnerOpenness - 0.65) * 0.058 * pow(v, 1.2) * (1.0 - isCarpel * 0.45);
  pos.x += waveX + cos(azAngle) * radialBreath;
  pos.z += waveZ + sin(azAngle) * radialBreath;

  vec2 diffPtr = pos.xz - uPointerLocal;
  float distPtr = length(diffPtr);
  if (distPtr < 0.75 && distPtr > 0.001) {
    float push = pow(1.0 - distPtr / 0.75, 2.0) * 0.085 * pow(v, 1.3);
    pos.xz += (diffPtr / distPtr) * push;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * SYSTEM C: REPRODUCTIVE CENTRE (CURLED CARPELS & STAMEN FILAMENTS) FRAGMENT SHADER
 */
export const LIVING_BLOOM_STAMEN_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vStamenParams; // x: isCarpel, y: phaseOffset, z: whorlRatio, w: azimuthAngle

uniform float uTime;
uniform float uLuminescence;
uniform float uNectaryPulse;

uniform vec3 uColorCoralRose;
uniform vec3 uColorLavender;
uniform vec3 uColorPearlPink;
uniform vec3 uColorCarpelMagenta;
uniform vec3 uColorGoldenPollen;
uniform vec3 uColorTranslucentWhite;

void main() {
  float isCarpel = vStamenParams.x;
  float phase = vStamenParams.y;
  float v = vUv.y;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);
  float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);

  vec3 baseCol;
  if (isCarpel > 0.5) {
    // Central gynoecium structures: rich magenta-rose base -> orchid lavender body -> golden-peach curled stigma tip
    baseCol = mix(uColorCarpelMagenta, uColorLavender, smoothstep(0.08, 0.68, v));
    baseCol = mix(baseCol, mix(uColorGoldenPollen, uColorPearlPink, 0.38), smoothstep(0.68, 1.0, v));
  } else {
    // Delicate stamen filaments: coral-rose base -> translucent pearl-pink mid -> warm golden-amber below anther
    baseCol = mix(uColorCoralRose, uColorPearlPink, smoothstep(0.0, 0.62, v));
    baseCol = mix(baseCol, mix(uColorGoldenPollen, uColorTranslucentWhite, 0.35), smoothstep(0.62, 1.0, v));
  }

  float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + phase - v * 3.0);
  vec3 rimGlow = mix(uColorPearlPink, uColorGoldenPollen, v) * fresnel * 0.45;

  vec3 finalColor = min((baseCol * pulse + rimGlow) * uLuminescence, vec3(1.18));
  gl_FragColor = vec4(finalColor, 0.96);
}
`;

/**
 * SYSTEM C: GOLDEN POLLEN ANTHER TIPS VERTEX SHADER
 */
export const LIVING_BLOOM_ANTHER_VERTEX_SHADER = /* glsl */ `
attribute vec4 aAntherParams; // x: phaseOffset, y: whorlRatio, z: azimuthAngle, w: lobeCrest

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vAntherParams;

uniform float uTime;
uniform float uInnerOpenness;
uniform float uAudioTreble;
uniform vec2 uPointerLocal;

void main() {
  vUv = uv;
  vAntherParams = aAntherParams;

  float phase = aAntherParams.x;
  float whorlRatio = aAntherParams.y;
  float azAngle = aAntherParams.z;

  vec3 pos = position;

  // Match filament tip displacement (v = 1.0, isCarpel = 0.0)
  float swayRadius = 0.042 + uAudioTreble * 0.018;
  float waveX = sin(uTime * 0.92 + phase + whorlRatio * 3.1) * swayRadius
              + cos(uTime * 0.57 - phase * 0.8) * (swayRadius * 0.45);
  float waveZ = cos(uTime * 0.84 + phase * 1.15) * swayRadius
              + sin(uTime * 0.61 + whorlRatio * 4.0) * (swayRadius * 0.45);

  float radialBreath = (uInnerOpenness - 0.65) * 0.058;
  pos.x += waveX + cos(azAngle) * radialBreath;
  pos.z += waveZ + sin(azAngle) * radialBreath;

  vec2 diffPtr = pos.xz - uPointerLocal;
  float distPtr = length(diffPtr);
  if (distPtr < 0.75 && distPtr > 0.001) {
    float push = pow(1.0 - distPtr / 0.75, 2.0) * 0.085;
    pos.xz += (diffPtr / distPtr) * push;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

/**
 * SYSTEM C: GOLDEN POLLEN ANTHER TIPS FRAGMENT SHADER
 */
export const LIVING_BLOOM_ANTHER_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vAntherParams; // x: phaseOffset, y: whorlRatio, z: azimuthAngle, w: lobeCrest

uniform float uTime;
uniform float uLuminescence;
uniform float uNectaryPulse;

uniform vec3 uColorGoldenPollen;
uniform vec3 uColorCoralRose;
uniform vec3 uColorTranslucentWhite;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  float phase = vAntherParams.x;
  float lobeCrest = vAntherParams.w;

  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewPosition);
  vec3 L = normalize(vec3(0.35, 0.85, 0.45));

  float grain = hash21(floor(vUv * 28.0) + phase);
  float diff = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);

  vec3 deepAmber = mix(uColorGoldenPollen * 0.75, uColorCoralRose, 0.22);
  vec3 brightGold = mix(uColorGoldenPollen * 1.12, uColorTranslucentWhite, 0.16);

  vec3 pollenColor = mix(deepAmber, uColorGoldenPollen * 1.08, diff * lobeCrest);
  pollenColor = mix(pollenColor, brightGold, grain * 0.35 + rim * 0.42);

  float shimmer = 0.90 + 0.10 * sin(uTime * 1.6 + phase * 2.0);
  vec3 finalColor = min(pollenColor * shimmer * uLuminescence, vec3(1.18));

  gl_FragColor = vec4(finalColor, 0.99);
}
`;

/**
 * SYSTEM E: SUPPORTING STEM, RECEPTACLE & DETAILED CALYX SEPALS SHADERS
 */
export const LIVING_BLOOM_CALYX_VERTEX_SHADER = /* glsl */ `
attribute vec4 aCalyxParams; // x: partType (0=stem, 1=sepal), y: phaseOffset, z: fluteOrVein, w: edgeFactor

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vCalyxParams;

uniform float uTime;
uniform float uOuterOpenness;

void main() {
  vUv = uv;
  vCalyxParams = aCalyxParams;

  float partType = aCalyxParams.x;
  float phase = aCalyxParams.y;
  float v = uv.y;

  vec3 pos = position;

  if (partType > 0.5) {
    float sepalFlex = sin(uTime * 0.58 + phase) * 0.018 * pow(v, 1.4)
                    - (uOuterOpenness - 0.65) * 0.035 * v;
    pos.y += sepalFlex;
  } else {
    float stemSway = sin(uTime * 0.42 - v * 1.8) * 0.014 * pow(v, 1.3);
    pos.x += stemSway;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalize(normalMatrix * normal);

  gl_Position = projectionMatrix * mvPosition;
}
`;

export const LIVING_BLOOM_CALYX_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec4 vCalyxParams; // x: partType (0=stem, 1=sepal), y: phaseOffset, z: fluteOrVein, w: edgeFactor

uniform float uTime;
uniform float uLuminescence;

uniform vec3 uColorStemRoseOlive;
uniform vec3 uColorCoralRose;
uniform vec3 uColorLavender;
uniform vec3 uColorIridescentViolet;
uniform vec3 uColorPearlPink;

void main() {
  float partType = vCalyxParams.x;
  float fluteOrVein = vCalyxParams.z;
  float edgeFactor = vCalyxParams.w;
  float v = vUv.y;

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(vViewPosition);
  vec3 L = normalize(vec3(0.4, 0.75, 0.5));

  float diff = clamp((dot(N, L) + 0.5) / 1.5, 0.0, 1.0);
  float rim = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.2);

  vec3 col;
  float alpha = 0.96;

  if (partType < 0.5) {
    vec3 stemBase = mix(uColorStemRoseOlive * 0.78, uColorCoralRose * 0.58, (1.0 - v) * 0.55);
    vec3 ridgeHighlight = mix(uColorStemRoseOlive, uColorPearlPink, 0.38) * fluteOrVein;
    col = mix(stemBase, ridgeHighlight, 0.48) * (0.48 + diff * 0.64);
    col += mix(uColorCoralRose, uColorLavender, 0.5) * rim * 0.36;
    alpha = smoothstep(1.0, 0.85, v);
  } else {
    float veinStrike = abs(sin((vUv.x - 0.5) * 26.0 - v * 10.0));
    float fineVein = exp(-veinStrike * 9.0) * 0.48 + fluteOrVein * 0.55;

    vec3 sepalBase = mix(uColorStemRoseOlive, uColorCoralRose, 0.52);
    vec3 sepalTip = mix(uColorPearlPink, uColorIridescentViolet, 0.56);
    col = mix(sepalBase, sepalTip, smoothstep(0.12, 0.88, v)) * (0.52 + diff * 0.58);
    col += uColorPearlPink * fineVein * 0.32 + uColorIridescentViolet * rim * 0.42;
    alpha = (0.82 + (1.0 - edgeFactor) * 0.16) * smoothstep(1.0, 0.95, v);
  }

  gl_FragColor = vec4(min(col * uLuminescence, vec3(1.08)), alpha);
}
`;

/**
 * SYSTEM F: FLOATING GOLDEN POLLEN & LUMINOUS BOTANICAL DUST SHADERS
 */
export const LIVING_BLOOM_POLLEN_VERTEX_SHADER = /* glsl */ `
attribute vec4 aPollenParams; // x: phase, y: driftSpeed, z: sizeScale, w: particleType (0=pollen, 1=dust)

varying float vAlpha;
varying float vParticleType;
varying float vPhase;

uniform float uTime;
uniform float uPixelRatio;
uniform float uOuterOpenness;
uniform vec2 uPointerLocal;

void main() {
  float phase = aPollenParams.x;
  float speed = aPollenParams.y;
  float sizeScale = aPollenParams.z;
  vParticleType = aPollenParams.w;
  vPhase = phase;

  vec3 basePos = position;
  float angle = atan(basePos.z, basePos.x) + uTime * speed * 0.22;
  float baseRad = length(basePos.xz) * (0.92 + uOuterOpenness * 0.14);

  float cycleY = mod(basePos.y + uTime * speed * 0.14 + phase * 1.4, 1.45) - 0.30;
  float radialWave = sin(uTime * 0.55 + phase * 6.2831) * 0.08;
  float verticalWave = cos(uTime * 0.48 + phase * 9.42) * 0.05;

  vec3 pos = vec3(
    cos(angle) * (baseRad + radialWave),
    cycleY + verticalWave,
    sin(angle) * (baseRad + radialWave)
  );

  vec2 diffPtr = pos.xz - uPointerLocal;
  float distPtr = length(diffPtr);
  if (distPtr < 0.95 && distPtr > 0.001) {
    pos.xz += (diffPtr / distPtr) * (1.0 - distPtr / 0.95) * 0.12;
  }

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float heightFade = smoothstep(-0.30, 0.05, pos.y) * (1.0 - smoothstep(0.78, 1.15, pos.y));
  float twinkle = 0.52 + 0.48 * sin(uTime * (1.35 + speed) + phase * 18.84);
  vAlpha = heightFade * twinkle;

  gl_PointSize = clamp(
    (sizeScale * 10.5 * uPixelRatio) / max(0.8, -mvPosition.z),
    2.0,
    12.5
  );
}
`;

export const LIVING_BLOOM_POLLEN_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying float vAlpha;
varying float vParticleType;
varying float vPhase;

uniform float uLuminescence;
uniform vec3 uColorGoldenPollen;
uniform vec3 uColorPearlPink;
uniform vec3 uColorCyanReflection;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float r = length(coord) * 2.0;
  if (r > 1.0) discard;

  float core = exp(-r * r * 4.6) * (1.0 - r);
  vec3 dustCol = mix(uColorPearlPink, uColorCyanReflection, 0.38 * sin(vPhase * 6.28) + 0.38);
  vec3 col = mix(uColorGoldenPollen * 1.1, dustCol, vParticleType);

  gl_FragColor = vec4(min(col * uLuminescence, vec3(1.18)), core * vAlpha * 0.92);
}
`;
