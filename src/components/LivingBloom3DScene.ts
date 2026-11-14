import * as THREE from 'three';
import {
  ChamberConfig,
  ChamberId,
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import { AURA_SOUND_REGISTRY } from '../utils/soundSynthesizer';
import { getResonanceVisualProfile } from '../utils/auraResonanceController';
import {
  LIVING_BLOOM_ANTHER_FRAGMENT_SHADER,
  LIVING_BLOOM_ANTHER_VERTEX_SHADER,
  LIVING_BLOOM_CALYX_FRAGMENT_SHADER,
  LIVING_BLOOM_CALYX_VERTEX_SHADER,
  LIVING_BLOOM_PETAL_FRAGMENT_SHADER,
  LIVING_BLOOM_PETAL_VERTEX_SHADER,
  LIVING_BLOOM_POLLEN_FRAGMENT_SHADER,
  LIVING_BLOOM_POLLEN_VERTEX_SHADER,
  LIVING_BLOOM_STAMEN_FRAGMENT_SHADER,
  LIVING_BLOOM_STAMEN_VERTEX_SHADER,
  buildLivingBloomCorollaGeometry,
  buildLivingBloomPollenGeometry,
  buildLivingBloomReproductiveCentreGeometry,
  buildLivingBloomStemAndSepalsGeometry,
  computeBloomCycleState,
  computeLivingBloomColorRig,
  computeOrbStateParameters,
} from '../utils/livingBloom3D';

export interface LivingBloom3DUpdateInput {
  orbDesign: OrbDesignId;
  scene: FocusSceneConfig;
  chamber?: ChamberConfig;
  status: TimerStatus;
  phase: TimerPhase;
  totalSeconds: number;
  progress: number;
  audioBands: {
    bass: number;
    mid: number;
    treble: number;
    overall: number;
  };
  reducedMotion: boolean;
  dt: number;
  pointerNormX: number; // 0..1 across viewport
  pointerNormY: number; // 0..1 across viewport (bottom=0, top=1)
  pointerActive: boolean;
  viewportWidth: number;
  viewportHeight: number;
  camera: THREE.PerspectiveCamera;
  pollenDrawFraction?: number;
  resonanceOpen?: boolean;
  hoveredChamberId?: ChamberId | null;
  resonancePulseTimestamp?: number;
  resonancePulseChamberId?: ChamberId | null;
}

/**
 * Builds a miniature 3-sepal/petal cupped botanical resonance bud in local space
 * so the 6 Harmonic Bloom buds look organically grown from the same botanical material.
 */
function buildHarmonicBotanicalBudGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const petalCount = 3;
  const uSegs = 6;
  const vSegs = 8;

  for (let p = 0; p < petalCount; p++) {
    const baseAngle = (p / petalCount) * Math.PI * 2;
    const baseVertexOffset = positions.length / 3;

    for (let iv = 0; iv <= vSegs; iv++) {
      const v = iv / vSegs; // 0 at receptacle base -> 1 at bud tip
      const verticalY = v * 0.13;
      const cupRadius = Math.sin(v * Math.PI) * 0.048 + 0.012 * (1.0 - v);

      for (let iu = 0; iu <= uSegs; iu++) {
        const u = iu / uSegs; // 0..1 across petal width
        const uCentered = (u - 0.5) * 2.0;
        const angularSpread = uCentered * 0.92 * Math.sin(v * Math.PI * 0.85 + 0.15);
        const theta = baseAngle + angularSpread;

        const r = cupRadius * (1.0 - 0.18 * uCentered * uCentered);
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = verticalY - 0.04;

        positions.push(x, y, z);
        const nx = Math.cos(theta);
        const nz = Math.sin(theta);
        const ny = 0.35;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        normals.push(nx / nLen, ny / nLen, nz / nLen);
        uvs.push(u, v);
      }
    }

    const stride = uSegs + 1;
    for (let iv = 0; iv < vSegs; iv++) {
      for (let iu = 0; iu < uSegs; iu++) {
        const a = baseVertexOffset + iv * stride + iu;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

const HARMONIC_BUD_VERTEX_SHADER = /* glsl */ `
  uniform float uBudOpenness;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normal;
    vec3 pos = position;
    // Subtle botanical unfurling when hovered or active
    float flare = uBudOpenness * smoothstep(0.15, 1.0, uv.y) * 0.032;
    vec2 radialDir = normalize(pos.xz + vec2(0.0001));
    pos.xz += radialDir * flare;
    pos.y -= flare * 0.22;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const HARMONIC_BUD_FRAGMENT_SHADER = /* glsl */ `
  uniform float uVisibility;
  uniform float uIllumination;
  uniform vec3 uColorPearlPink;
  uniform vec3 uColorCoralRose;
  uniform vec3 uColorLavender;
  uniform vec3 uColorGoldenPollen;
  uniform vec3 uColorTranslucentWhite;

  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    if (uVisibility <= 0.005) discard;
    float centerMask = 1.0 - abs(vUv.x - 0.5) * 2.0;
    vec3 basePetal = mix(uColorCoralRose, uColorPearlPink, smoothstep(0.0, 0.75, vUv.y));
    basePetal = mix(basePetal, uColorLavender, (1.0 - centerMask) * 0.45);
    vec3 tipGlow = mix(uColorTranslucentWhite, uColorGoldenPollen, uIllumination * 0.65);
    vec3 col = mix(basePetal, tipGlow, smoothstep(0.55, 1.0, vUv.y) * (0.45 + uIllumination * 0.55));
    col += uColorGoldenPollen * (1.0 - smoothstep(0.0, 0.45, vUv.y)) * (0.28 + uIllumination * 0.55);

    float alpha = uVisibility * (0.68 + uIllumination * 0.28);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.95));
  }
`;

// Pre-allocated color targets for zero-GC per-frame damping
const _cPearlPink = new THREE.Color();
const _cCoralRose = new THREE.Color();
const _cLavender = new THREE.Color();
const _cTranslucentWhite = new THREE.Color();
const _cIridescentViolet = new THREE.Color();
const _cGoldenPollen = new THREE.Color();
const _cCyanReflection = new THREE.Color();
const _cVeinChampagne = new THREE.Color();
const _cCarpelMagenta = new THREE.Color();
const _cStemRoseOlive = new THREE.Color();

/**
 * Modular 3D Living Bloom Controller that mounts directly into the shared
 * Three.js scene & renderer in QuantumNebulaBackground.tsx, preserving
 * Celestial Jelly and Original Liquid Lens without creating duplicate renderers.
 */
export class LivingBloom3DSceneController {
  public readonly rootGroup: THREE.Group;
  public readonly postureGroup: THREE.Group;

  private readonly corollaGeometry: THREE.BufferGeometry;
  private readonly filamentsAndCarpelsGeometry: THREE.BufferGeometry;
  private readonly goldenAnthersGeometry: THREE.BufferGeometry;
  private readonly stemAndSepalsGeometry: THREE.BufferGeometry;
  private readonly pollenGeometry: THREE.BufferGeometry;
  private readonly harmonicBudGeometry: THREE.BufferGeometry;

  private readonly petalBackMaterial: THREE.ShaderMaterial;
  private readonly petalFrontMaterial: THREE.ShaderMaterial;
  private readonly stamenMaterial: THREE.ShaderMaterial;
  private readonly antherMaterial: THREE.ShaderMaterial;
  private readonly calyxMaterial: THREE.ShaderMaterial;
  private readonly pollenMaterial: THREE.ShaderMaterial;
  private readonly harmonicBudMeshes: Array<{
    id: ChamberId;
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    openness: number;
    illumination: number;
    visibility: number;
  }> = [];

  private simTime = 0;
  private lastPulseTimestamp = 0;
  private harmonicWaveBoost = 0;
  private harmonicPollenBoost = 0;

  private lensElement: HTMLElement | null = null;
  private lastRectQueryMs = 0;
  private cachedLensCenterWorld = new THREE.Vector2(0, 0.04);
  private cachedLensDiameterWorld = 1.95;
  private cachedLensVisible = true;

  private currentPearlPink = new THREE.Color();
  private currentCoralRose = new THREE.Color();
  private currentLavender = new THREE.Color();
  private currentTranslucentWhite = new THREE.Color();
  private currentIridescentViolet = new THREE.Color();
  private currentGoldenPollen = new THREE.Color();
  private currentCyanReflection = new THREE.Color();
  private currentVeinChampagne = new THREE.Color();
  private currentCarpelMagenta = new THREE.Color();
  private currentStemRoseOlive = new THREE.Color();

  constructor(options: {
    parentScene: THREE.Scene;
    pixelRatio: number;
    isSoftwareGl: boolean;
    initialScene: FocusSceneConfig;
    initialPhase?: TimerPhase;
  }) {
    const {
      parentScene,
      pixelRatio,
      isSoftwareGl,
      initialScene,
      initialPhase = 'focus',
    } = options;

    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'LivingBloom3DRoot';
    this.postureGroup = new THREE.Group();
    this.postureGroup.name = 'LivingBloom3DBotanicalPosture';
    this.rootGroup.add(this.postureGroup);

    const initColors = computeLivingBloomColorRig(initialScene, initialPhase);
    this.currentPearlPink.setRGB(...initColors.pearlPink);
    this.currentCoralRose.setRGB(...initColors.coralRose);
    this.currentLavender.setRGB(...initColors.lavender);
    this.currentTranslucentWhite.setRGB(...initColors.translucentWhite);
    this.currentIridescentViolet.setRGB(...initColors.iridescentViolet);
    this.currentGoldenPollen.setRGB(...initColors.goldenPollen);
    this.currentCyanReflection.setRGB(...initColors.cyanReflection);
    this.currentVeinChampagne.setRGB(...initColors.veinChampagne);
    this.currentCarpelMagenta.setRGB(...initColors.carpelMagenta);
    this.currentStemRoseOlive.setRGB(...initColors.stemRoseOlive);

    // 1. Build Procedural 3D Botanical Geometries (Systems A, C, E, F)
    this.corollaGeometry = buildLivingBloomCorollaGeometry(isSoftwareGl);
    const reproGeos = buildLivingBloomReproductiveCentreGeometry(isSoftwareGl);
    this.filamentsAndCarpelsGeometry = reproGeos.filamentsAndCarpelsGeometry;
    this.goldenAnthersGeometry = reproGeos.goldenAnthersGeometry;
    this.stemAndSepalsGeometry = buildLivingBloomStemAndSepalsGeometry(
      isSoftwareGl
    );
    this.pollenGeometry = buildLivingBloomPollenGeometry(
      isSoftwareGl ? 120 : 180
    );
    this.harmonicBudGeometry = buildHarmonicBotanicalBudGeometry();

    // 2. Build Custom Translucent, Iridescent & Vascular Botanical Shaders
    const makePetalUniforms = (passOpacity: number) => ({
      uTime: { value: 0 },
      uOuterOpenness: { value: 0.72 },
      uMidOpenness: { value: 0.68 },
      uInnerOpenness: { value: 0.64 },
      uNectaryPulse: { value: 0.75 },
      uLuminescence: { value: 0.96 },
      uPassOpacity: { value: passOpacity },
      uAudioBass: { value: 0 },
      uAudioAmp: { value: 0 },
      uPointerLocal: { value: new THREE.Vector2(10, 10) },
      uColorPearlPink: { value: this.currentPearlPink.clone() },
      uColorCoralRose: { value: this.currentCoralRose.clone() },
      uColorLavender: { value: this.currentLavender.clone() },
      uColorTranslucentWhite: { value: this.currentTranslucentWhite.clone() },
      uColorIridescentViolet: { value: this.currentIridescentViolet.clone() },
      uColorGoldenPollen: { value: this.currentGoldenPollen.clone() },
      uColorCyanReflection: { value: this.currentCyanReflection.clone() },
      uColorVeinChampagne: { value: this.currentVeinChampagne.clone() },
    });

    // Pass 1: Back-facing petal surfaces (rendered behind the reproductive centre)
    this.petalBackMaterial = new THREE.ShaderMaterial({
      uniforms: makePetalUniforms(0.62),
      vertexShader: LIVING_BLOOM_PETAL_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_PETAL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
    });

    // Pass 2: Front-facing petal surfaces (rendered with translucent subsurface glow & branching veins)
    this.petalFrontMaterial = new THREE.ShaderMaterial({
      uniforms: makePetalUniforms(0.88),
      vertexShader: LIVING_BLOOM_PETAL_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_PETAL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });

    // Reproductive Centre: Curled pink/lavender carpels + 128 curved stamen filaments
    this.stamenMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uInnerOpenness: { value: 0.64 },
        uNectaryPulse: { value: 0.75 },
        uLuminescence: { value: 0.96 },
        uAudioTreble: { value: 0 },
        uPointerLocal: { value: new THREE.Vector2(10, 10) },
        uColorCoralRose: { value: this.currentCoralRose.clone() },
        uColorLavender: { value: this.currentLavender.clone() },
        uColorPearlPink: { value: this.currentPearlPink.clone() },
        uColorCarpelMagenta: { value: this.currentCarpelMagenta.clone() },
        uColorGoldenPollen: { value: this.currentGoldenPollen.clone() },
        uColorTranslucentWhite: { value: this.currentTranslucentWhite.clone() },
      },
      vertexShader: LIVING_BLOOM_STAMEN_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_STAMEN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    // Reproductive Centre: 128 Golden Bilobed Pollen Anthers
    this.antherMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uInnerOpenness: { value: 0.64 },
        uNectaryPulse: { value: 0.75 },
        uLuminescence: { value: 0.98 },
        uAudioTreble: { value: 0 },
        uPointerLocal: { value: new THREE.Vector2(10, 10) },
        uColorGoldenPollen: { value: this.currentGoldenPollen.clone() },
        uColorCoralRose: { value: this.currentCoralRose.clone() },
        uColorTranslucentWhite: { value: this.currentTranslucentWhite.clone() },
      },
      vertexShader: LIVING_BLOOM_ANTHER_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_ANTHER_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });

    // Supporting Stem, Receptacle & 7 Detailed Calyx Sepals
    this.calyxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOuterOpenness: { value: 0.72 },
        uLuminescence: { value: 0.94 },
        uColorStemRoseOlive: { value: this.currentStemRoseOlive.clone() },
        uColorCoralRose: { value: this.currentCoralRose.clone() },
        uColorLavender: { value: this.currentLavender.clone() },
        uColorIridescentViolet: { value: this.currentIridescentViolet.clone() },
        uColorPearlPink: { value: this.currentPearlPink.clone() },
      },
      vertexShader: LIVING_BLOOM_CALYX_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_CALYX_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    // Floating Golden Pollen & Luminous Dust Particles
    this.pollenMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uOuterOpenness: { value: 0.72 },
        uLuminescence: { value: 0.95 },
        uPointerLocal: { value: new THREE.Vector2(10, 10) },
        uColorGoldenPollen: { value: this.currentGoldenPollen.clone() },
        uColorPearlPink: { value: this.currentPearlPink.clone() },
        uColorCyanReflection: { value: this.currentCyanReflection.clone() },
      },
      vertexShader: LIVING_BLOOM_POLLEN_VERTEX_SHADER,
      fragmentShader: LIVING_BLOOM_POLLEN_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    // 3. Assemble Depth-Sorted 3D Botanical Hierarchy (renderOrder 20..26)
    const calyxMesh = new THREE.Mesh(
      this.stemAndSepalsGeometry,
      this.calyxMaterial
    );
    calyxMesh.frustumCulled = false;
    calyxMesh.renderOrder = 20;

    const petalBackMesh = new THREE.Mesh(
      this.corollaGeometry,
      this.petalBackMaterial
    );
    petalBackMesh.frustumCulled = false;
    petalBackMesh.renderOrder = 21;

    const stamensMesh = new THREE.Mesh(
      this.filamentsAndCarpelsGeometry,
      this.stamenMaterial
    );
    stamensMesh.frustumCulled = false;
    stamensMesh.renderOrder = 22;

    const anthersMesh = new THREE.Mesh(
      this.goldenAnthersGeometry,
      this.antherMaterial
    );
    anthersMesh.frustumCulled = false;
    anthersMesh.renderOrder = 23;

    const petalFrontMesh = new THREE.Mesh(
      this.corollaGeometry,
      this.petalFrontMaterial
    );
    petalFrontMesh.frustumCulled = false;
    petalFrontMesh.renderOrder = 24;

    const pollenPoints = new THREE.Points(
      this.pollenGeometry,
      this.pollenMaterial
    );
    pollenPoints.frustumCulled = false;
    pollenPoints.renderOrder = 25;

    this.postureGroup.add(
      calyxMesh,
      petalBackMesh,
      stamensMesh,
      anthersMesh,
      petalFrontMesh,
      pollenPoints
    );

    // Resonance 2.0: 6 very small 3D botanical resonance buds positioned around the flower's outer structure
    AURA_SOUND_REGISTRY.forEach((entry) => {
      const budMat = new THREE.ShaderMaterial({
        uniforms: {
          uBudOpenness: { value: 0.25 },
          uVisibility: { value: 0.0 },
          uIllumination: { value: 0.15 },
          uColorPearlPink: { value: this.currentPearlPink.clone() },
          uColorCoralRose: { value: this.currentCoralRose.clone() },
          uColorLavender: { value: this.currentLavender.clone() },
          uColorGoldenPollen: { value: this.currentGoldenPollen.clone() },
          uColorTranslucentWhite: { value: this.currentTranslucentWhite.clone() },
        },
        vertexShader: HARMONIC_BUD_VERTEX_SHADER,
        fragmentShader: HARMONIC_BUD_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
      });

      const budMesh = new THREE.Mesh(this.harmonicBudGeometry, budMat);
      const azRad = THREE.MathUtils.degToRad(entry.bloomAzimuthDeg);
      const rLocal = entry.bloomRadiusLocal * 1.16;
      const bx = Math.cos(azRad) * rLocal;
      const bz = Math.sin(azRad) * rLocal;
      const by = entry.bloomElevationLocal + 0.14;

      budMesh.position.set(bx, by, bz);
      // Tilt each small botanical bud slightly outward from the flower's calyx
      budMesh.rotation.set(
        Math.sin(azRad) * 0.36,
        -azRad + Math.PI * 0.5,
        -Math.cos(azRad) * 0.36
      );
      budMesh.frustumCulled = false;
      budMesh.renderOrder = 26;
      budMesh.visible = false;

      this.postureGroup.add(budMesh);
      this.harmonicBudMeshes.push({
        id: entry.id,
        mesh: budMesh,
        material: budMat,
        openness: 0.25,
        illumination: 0.15,
        visibility: 0.0,
      });
    });

    // Initial three-quarter elevated botanical viewing posture matching living-bloom-master.png
    this.postureGroup.rotation.set(0.50, 0.14, -0.08);

    parentScene.add(this.rootGroup);
  }

  private lastViewportW = 0;
  private lastViewportH = 0;

  private syncLensContainerBounds(
    nowMs: number,
    viewportWidth: number,
    viewportHeight: number,
    camera: THREE.PerspectiveCamera
  ): void {
    const sizeChanged =
      viewportWidth !== this.lastViewportW ||
      viewportHeight !== this.lastViewportH;
    if (
      sizeChanged ||
      nowMs - this.lastRectQueryMs > 600 ||
      !this.lensElement
    ) {
      this.lastRectQueryMs = nowMs;
      this.lastViewportW = viewportWidth;
      this.lastViewportH = viewportHeight;
      if (!this.lensElement || !this.lensElement.isConnected) {
        this.lensElement = document.querySelector(
          '[data-testid="living-lens-container"]'
        );
      }
      if (this.lensElement) {
        const rect = this.lensElement.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          this.cachedLensVisible = true;
          const halfFovRad = THREE.MathUtils.degToRad(camera.fov * 0.5);
          const halfWorldH = camera.position.z * Math.tan(halfFovRad);
          const aspect = viewportWidth / Math.max(1, viewportHeight);
          const halfWorldW = halfWorldH * aspect;

          const cx = rect.left + rect.width * 0.5;
          const cy = rect.top + rect.height * 0.5;
          const ndcX = (cx / Math.max(1, viewportWidth)) * 2.0 - 1.0;
          const ndcY = 1.0 - (cy / Math.max(1, viewportHeight)) * 2.0;

          this.cachedLensCenterWorld.set(
            ndcX * halfWorldW,
            ndcY * halfWorldH
          );
          this.cachedLensDiameterWorld =
            (rect.height / Math.max(1, viewportHeight)) * (halfWorldH * 2.0);
        } else {
          this.cachedLensVisible = false;
        }
      } else {
        this.cachedLensVisible = false;
      }
    }
  }

  public update(input: LivingBloom3DUpdateInput): void {
    const isActive = input.orbDesign === 'living-bloom';
    if (!isActive) {
      this.rootGroup.visible = false;
      return;
    }

    const nowMs = performance.now();
    this.syncLensContainerBounds(
      nowMs,
      input.viewportWidth,
      input.viewportHeight,
      input.camera
    );

    if (!this.cachedLensVisible) {
      this.rootGroup.visible = false;
      return;
    }

    this.rootGroup.visible = true;

    const totalPollen =
      this.pollenGeometry.getAttribute('position')?.count || 180;
    const activePollen = Math.max(
      36,
      Math.round(totalPollen * (input.pollenDrawFraction ?? 1.0))
    );
    this.pollenGeometry.setDrawRange(0, activePollen);

    const stateParams = computeOrbStateParameters(
      input.status,
      input.phase,
      input.progress,
      input.audioBands.overall,
      input.reducedMotion,
      input.totalSeconds
    );

    // Advance elapsed-time biological simulation clock
    const dt = Math.min(0.05, Math.max(0.001, input.dt));
    this.simTime += dt * stateParams.motionSpeed * input.scene.motion.flowSpeed;

    // Compute continuous 7-stage biological blooming cycle (irrational harmonic phases)
    const bloomCycle = computeBloomCycleState(
      this.simTime,
      input.status,
      input.progress
    );

    // STAGE 3: Maintain permanent intrinsic Living Bloom colour identity + coordinated Resonance secondary layer
    const targetRig = computeLivingBloomColorRig(input.scene, input.phase);
    const soundProfile = getResonanceVisualProfile(
      input.chamber?.id || 'ocean-drift'
    );
    _cCyanReflection.setRGB(...soundProfile.organismEmissiveRgb);

    _cPearlPink.setRGB(...targetRig.pearlPink);
    _cCoralRose.setRGB(...targetRig.coralRose).lerp(_cCyanReflection, 0.22);
    _cLavender.setRGB(...targetRig.lavender).lerp(_cCyanReflection, 0.24);
    _cTranslucentWhite.setRGB(...targetRig.translucentWhite);
    _cIridescentViolet
      .setRGB(...targetRig.iridescentViolet)
      .lerp(_cCyanReflection, 0.3);
    _cGoldenPollen
      .setRGB(...targetRig.goldenPollen)
      .lerp(_cCyanReflection, 0.24);
    _cCyanReflection
      .setRGB(...targetRig.cyanReflection)
      .lerp(new THREE.Color(...soundProfile.primaryRgb), 0.36);
    _cVeinChampagne.setRGB(...targetRig.veinChampagne);
    _cCarpelMagenta.setRGB(...targetRig.carpelMagenta);
    _cStemRoseOlive.setRGB(...targetRig.stemRoseOlive);

    const colorLerp = 1.0 - Math.exp(-3.5 * dt);
    this.currentPearlPink.lerp(_cPearlPink, colorLerp);
    this.currentCoralRose.lerp(_cCoralRose, colorLerp);
    this.currentLavender.lerp(_cLavender, colorLerp);
    this.currentTranslucentWhite.lerp(_cTranslucentWhite, colorLerp);
    this.currentIridescentViolet.lerp(_cIridescentViolet, colorLerp);
    this.currentGoldenPollen.lerp(_cGoldenPollen, colorLerp);
    this.currentCyanReflection.lerp(_cCyanReflection, colorLerp);
    this.currentVeinChampagne.lerp(_cVeinChampagne, colorLerp);
    this.currentCarpelMagenta.lerp(_cCarpelMagenta, colorLerp);
    this.currentStemRoseOlive.lerp(_cStemRoseOlive, colorLerp);

    // Scale and position the 3D blossom inside the central lens sanctuary
    const baseScale =
      this.cachedLensDiameterWorld * 0.355 * stateParams.expansionScale;

    // Gentle organic buoyant drift responding to imaginary environmental currents
    const driftX =
      Math.sin(this.simTime * 0.31) * 0.022 +
      Math.cos(this.simTime * 0.19) * 0.012;
    const driftY =
      Math.cos(this.simTime * 0.37) * 0.021 +
      (bloomCycle.outerOpenness - 0.68) * 0.028;
    const driftZ = Math.sin(this.simTime * 0.23) * 0.028;

    this.rootGroup.position.set(
      this.cachedLensCenterWorld.x + driftX,
      this.cachedLensCenterWorld.y +
        this.cachedLensDiameterWorld * 0.045 +
        driftY,
      driftZ
    );
    this.rootGroup.scale.setScalar(baseScale);

    // Three-quarter elevated botanical viewing posture matching living-bloom-master.png
    // Reveals both the cupped multi-layer petals + golden stamen core AND the lower sepals + stem
    const ptrOffsetX = input.pointerActive ? input.pointerNormX - 0.5 : 0;
    const ptrOffsetY = input.pointerActive ? input.pointerNormY - 0.5 : 0;

    const targetRotX =
      0.50 +
      Math.sin(this.simTime * 0.27) * 0.036 -
      ptrOffsetY * 0.14;
    const targetRotY =
      0.14 +
      bloomCycle.corollaRotation * 0.85 +
      ptrOffsetX * 0.18;
    const targetRotZ =
      -0.08 +
      Math.cos(this.simTime * 0.23 + 0.6) * 0.032 -
      ptrOffsetX * 0.05;

    this.postureGroup.rotation.x = THREE.MathUtils.damp(
      this.postureGroup.rotation.x,
      targetRotX,
      3.6,
      dt
    );
    this.postureGroup.rotation.y = THREE.MathUtils.damp(
      this.postureGroup.rotation.y,
      targetRotY,
      3.6,
      dt
    );
    this.postureGroup.rotation.z = THREE.MathUtils.damp(
      this.postureGroup.rotation.z,
      targetRotZ,
      3.6,
      dt
    );

    // Convert normalized pointer to local flower space for interactive petal & stamen breeze deflection
    let localPtrX = 10.0;
    let localPtrZ = 10.0;
    if (input.pointerActive) {
      const halfFovRad = THREE.MathUtils.degToRad(input.camera.fov * 0.5);
      const halfWorldH = input.camera.position.z * Math.tan(halfFovRad);
      const aspect = input.viewportWidth / Math.max(1, input.viewportHeight);
      const halfWorldW = halfWorldH * aspect;

      const worldPtrX = (input.pointerNormX * 2.0 - 1.0) * halfWorldW;
      const worldPtrY = (input.pointerNormY * 2.0 - 1.0) * halfWorldH;

      localPtrX =
        (worldPtrX - this.rootGroup.position.x) / Math.max(0.1, baseScale);
      // Map screen Y offset into the tilted flower's XZ plane
      localPtrZ =
        -(worldPtrY - this.rootGroup.position.y) / Math.max(0.1, baseScale);
    }

    // Resonance 2.0: Harmonic Bloom 3D Botanical Buds, Inward Nectary Wave & Restrained Pollen Response
    if (
      input.resonancePulseTimestamp &&
      input.resonancePulseTimestamp !== this.lastPulseTimestamp
    ) {
      this.lastPulseTimestamp = input.resonancePulseTimestamp;
      this.harmonicWaveBoost = 0.42;
      this.harmonicPollenBoost = 0.28;
    }

    this.harmonicWaveBoost = THREE.MathUtils.damp(
      this.harmonicWaveBoost,
      0.0,
      2.4,
      dt
    );
    this.harmonicPollenBoost = THREE.MathUtils.damp(
      this.harmonicPollenBoost,
      0.0,
      1.8,
      dt
    );

    // Keep legacy tiny 3D buds hidden; Living Bloom uses the Harmonic Petal Array markers around its outer silhouette
    for (let i = 0; i < this.harmonicBudMeshes.length; i++) {
      this.harmonicBudMeshes[i].mesh.visible = false;
    }

    const baseLumi =
      stateParams.luminescence *
      soundProfile.centralIlluminationMultiplier *
      (input.status === 'paused' ? 0.68 : 1.0);
    const lumi = Math.min(1.32, baseLumi + this.harmonicWaveBoost * 0.65);
    const nectaryPulse = Math.min(
      1.38,
      bloomCycle.nectaryPulse + this.harmonicWaveBoost
    );

    const updatePetalUniforms = (u: Record<string, THREE.IUniform>) => {
      u.uTime.value = this.simTime;
      u.uOuterOpenness.value = bloomCycle.outerOpenness;
      u.uMidOpenness.value = bloomCycle.midOpenness;
      u.uInnerOpenness.value = bloomCycle.innerOpenness;
      u.uNectaryPulse.value = nectaryPulse;
      u.uLuminescence.value = lumi;
      u.uAudioBass.value = input.audioBands.bass;
      u.uAudioAmp.value = Math.min(
        1.0,
        input.audioBands.overall + this.harmonicWaveBoost * 0.4
      );
      u.uPointerLocal.value.set(localPtrX, localPtrZ);
      u.uColorPearlPink.value.copy(this.currentPearlPink);
      u.uColorCoralRose.value.copy(this.currentCoralRose);
      u.uColorLavender.value.copy(this.currentLavender);
      u.uColorTranslucentWhite.value.copy(this.currentTranslucentWhite);
      u.uColorIridescentViolet.value.copy(this.currentIridescentViolet);
      u.uColorGoldenPollen.value.copy(this.currentGoldenPollen);
      u.uColorCyanReflection.value.copy(this.currentCyanReflection);
      u.uColorVeinChampagne.value.copy(this.currentVeinChampagne);
    };

    updatePetalUniforms(this.petalBackMaterial.uniforms);
    updatePetalUniforms(this.petalFrontMaterial.uniforms);

    const stU = this.stamenMaterial.uniforms;
    stU.uTime.value = this.simTime;
    stU.uInnerOpenness.value = bloomCycle.innerOpenness;
    stU.uNectaryPulse.value = nectaryPulse;
    stU.uLuminescence.value = lumi;
    stU.uAudioTreble.value = Math.min(
      1.0,
      input.audioBands.treble + this.harmonicWaveBoost * 0.5
    );
    stU.uPointerLocal.value.set(localPtrX, localPtrZ);
    stU.uColorCoralRose.value.copy(this.currentCoralRose);
    stU.uColorLavender.value.copy(this.currentLavender);
    stU.uColorPearlPink.value.copy(this.currentPearlPink);
    stU.uColorCarpelMagenta.value.copy(this.currentCarpelMagenta);
    stU.uColorGoldenPollen.value.copy(this.currentGoldenPollen);
    stU.uColorTranslucentWhite.value.copy(this.currentTranslucentWhite);

    const anU = this.antherMaterial.uniforms;
    anU.uTime.value = this.simTime;
    anU.uInnerOpenness.value = bloomCycle.innerOpenness;
    anU.uNectaryPulse.value = nectaryPulse;
    anU.uLuminescence.value = lumi;
    anU.uAudioTreble.value = Math.min(
      1.0,
      input.audioBands.treble + this.harmonicWaveBoost * 0.5
    );
    anU.uPointerLocal.value.set(localPtrX, localPtrZ);
    anU.uColorGoldenPollen.value.copy(this.currentGoldenPollen);
    anU.uColorCoralRose.value.copy(this.currentCoralRose);
    anU.uColorTranslucentWhite.value.copy(this.currentTranslucentWhite);

    const calU = this.calyxMaterial.uniforms;
    calU.uTime.value = this.simTime;
    calU.uOuterOpenness.value = bloomCycle.outerOpenness;
    calU.uLuminescence.value = lumi;
    calU.uColorStemRoseOlive.value.copy(this.currentStemRoseOlive);
    calU.uColorCoralRose.value.copy(this.currentCoralRose);
    calU.uColorLavender.value.copy(this.currentLavender);
    calU.uColorIridescentViolet.value.copy(this.currentIridescentViolet);
    calU.uColorPearlPink.value.copy(this.currentPearlPink);

    const polU = this.pollenMaterial.uniforms;
    polU.uTime.value = this.simTime;
    polU.uOuterOpenness.value = Math.min(
      1.0,
      bloomCycle.outerOpenness + this.harmonicPollenBoost * 0.35
    );
    polU.uLuminescence.value = Math.min(1.3, lumi + this.harmonicPollenBoost * 0.5);
    polU.uPointerLocal.value.set(localPtrX, localPtrZ);
    polU.uColorGoldenPollen.value.copy(this.currentGoldenPollen);
    polU.uColorPearlPink.value.copy(this.currentPearlPink);
    polU.uColorCyanReflection.value.copy(this.currentCyanReflection);
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.corollaGeometry.dispose();
    this.filamentsAndCarpelsGeometry.dispose();
    this.goldenAnthersGeometry.dispose();
    this.stemAndSepalsGeometry.dispose();
    this.pollenGeometry.dispose();
    this.harmonicBudGeometry.dispose();

    this.petalBackMaterial.dispose();
    this.petalFrontMaterial.dispose();
    this.stamenMaterial.dispose();
    this.antherMaterial.dispose();
    this.calyxMaterial.dispose();
    this.pollenMaterial.dispose();
    this.harmonicBudMeshes.forEach((b) => b.material.dispose());
  }
}
