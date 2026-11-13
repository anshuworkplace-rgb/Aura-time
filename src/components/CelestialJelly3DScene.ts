import * as THREE from 'three';
import {
  ChamberConfig,
  ChamberId,
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import {
  computeJellyResonancePulseState,
  getResonancePresetByChamberId,
} from '../utils/auraResonance';
import {
  CELESTIAL_JELLY_BELL_FRAGMENT_SHADER,
  CELESTIAL_JELLY_BELL_VERTEX_SHADER,
  CELESTIAL_JELLY_BIOLUME_NODES_FRAGMENT_SHADER,
  CELESTIAL_JELLY_BIOLUME_NODES_VERTEX_SHADER,
  CELESTIAL_JELLY_FILAMENT_FRAGMENT_SHADER,
  CELESTIAL_JELLY_FILAMENT_VERTEX_SHADER,
  CELESTIAL_JELLY_MANUBRIUM_FRAGMENT_SHADER,
  CELESTIAL_JELLY_MANUBRIUM_VERTEX_SHADER,
  CELESTIAL_JELLY_ORAL_ARM_FRAGMENT_SHADER,
  CELESTIAL_JELLY_ORAL_ARM_VERTEX_SHADER,
  CELESTIAL_JELLY_PINNATE_FRAGMENT_SHADER,
  CELESTIAL_JELLY_PINNATE_VERTEX_SHADER,
  CELESTIAL_JELLY_PLANKTON_FRAGMENT_SHADER,
  CELESTIAL_JELLY_PLANKTON_VERTEX_SHADER,
  CelestialJelly3DRigState,
  buildCelestialJellyBellGeometry,
  buildInnerManubriumCoreGeometry,
  buildPelagicPlanktonGeometry,
  computeCelestialJellyColorRig,
  computeOrbStateParameters,
  createCelestialJelly3DRig,
  stepCelestialJelly3DPhysics,
} from '../utils/celestialJelly3D';
import { computeJellyBellContraction } from '../utils/organicOrbEngine';

export interface CelestialJelly3DUpdateInput {
  orbDesign: OrbDesignId;
  scene: FocusSceneConfig;
  chamber?: ChamberConfig;
  activeChamberId?: ChamberId;
  resonancePulseTimestamp?: number;
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
  planktonDrawFraction?: number;
  jellyBiolumeNodeFraction?: number;
}

// Pre-allocated color targets for zero-GC per-frame damping
const _cCyan = new THREE.Color();
const _cBlue = new THREE.Color();
const _cViolet = new THREE.Color();
const _cMagenta = new THREE.Color();
const _cSubPeach = new THREE.Color();
const _cCoronaRose = new THREE.Color();
const _cCoronaChampagne = new THREE.Color();
const _cCrownPink = new THREE.Color();
const _cPearl = new THREE.Color();
const _cMidLavender = new THREE.Color();
const _cTipCyan = new THREE.Color();
const _cBiolumeGold = new THREE.Color();

/**
 * Modular 3D Celestial Jellyfish Controller that mounts directly into the
 * existing Three.js scene & renderer in QuantumNebulaBackground.tsx, avoiding
 * duplicate WebGL renderers while maintaining strict component modularity and
 * complete GPU resource disposal.
 */
export class CelestialJelly3DSceneController {
  public readonly rootGroup: THREE.Group;
  public readonly swimGroup: THREE.Group;

  private readonly rig: CelestialJelly3DRigState;
  private readonly bellGeometry: THREE.BufferGeometry;
  private readonly manubriumGeometry: THREE.BufferGeometry;
  private readonly planktonGeometry: THREE.BufferGeometry;

  private readonly bellBackMaterial: THREE.ShaderMaterial;
  private readonly bellInnerTissueMaterial: THREE.ShaderMaterial;
  private readonly bellFrontMaterial: THREE.ShaderMaterial;
  private readonly manubriumMaterial: THREE.ShaderMaterial;
  private readonly oralArmsMaterial: THREE.ShaderMaterial;
  private readonly filamentsMaterial: THREE.ShaderMaterial;
  private readonly pinnateMaterial: THREE.ShaderMaterial;
  private readonly biolumeNodesMaterial: THREE.ShaderMaterial;
  private readonly planktonMaterial: THREE.ShaderMaterial;

  private simTime = 0;
  private lensElement: HTMLElement | null = null;
  private lastRectQueryMs = 0;
  private cachedLensCenterWorld = new THREE.Vector2(0, 0.04);
  private cachedLensDiameterWorld = 1.95;
  private cachedLensVisible = true;

  private currentCyan = new THREE.Color();
  private currentBlue = new THREE.Color();
  private currentViolet = new THREE.Color();
  private currentMagenta = new THREE.Color();
  private currentSubPeach = new THREE.Color();
  private currentCoronaRose = new THREE.Color();
  private currentCoronaChampagne = new THREE.Color();
  private currentCrownPink = new THREE.Color();
  private currentPearl = new THREE.Color();
  private currentMidLavender = new THREE.Color();
  private currentTipCyan = new THREE.Color();
  private currentBiolumeGold = new THREE.Color();

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
    this.rootGroup.name = 'CelestialJelly3DRoot';
    this.swimGroup = new THREE.Group();
    this.swimGroup.name = 'CelestialJelly3DSwimPosture';
    this.rootGroup.add(this.swimGroup);

    const initColors = computeCelestialJellyColorRig(initialScene, initialPhase);
    this.currentCyan.setRGB(...initColors.domeCyan);
    this.currentBlue.setRGB(...initColors.domeBlue);
    this.currentViolet.setRGB(...initColors.domeViolet);
    this.currentMagenta.setRGB(...initColors.domeMagenta);
    this.currentSubPeach.setRGB(...initColors.subumbrellaPeach);
    this.currentCoronaRose.setRGB(...initColors.coronaRose);
    this.currentCoronaChampagne.setRGB(...initColors.coronaChampagne);
    this.currentCrownPink.setRGB(...initColors.oralArmCrownPink);
    this.currentPearl.setRGB(...initColors.oralArmPearl);
    this.currentMidLavender.setRGB(...initColors.oralArmMidLavender);
    this.currentTipCyan.setRGB(...initColors.oralArmTipCyan);
    this.currentBiolumeGold.setRGB(...initColors.biolumeGold);

    // 1. Build Procedural 3D Geometries (Crystalline Bell, 72-Strand Internal Corona, 8 Ruffled Oral Arms, 24 Tentacles)
    const radialSegs = isSoftwareGl ? 72 : 128;
    const meridionalRings = isSoftwareGl ? 40 : 72;
    this.bellGeometry = buildCelestialJellyBellGeometry(
      radialSegs,
      meridionalRings
    );
    this.manubriumGeometry = buildInnerManubriumCoreGeometry(
      isSoftwareGl ? 56 : 72,
      isSoftwareGl ? 14 : 18
    );
    this.rig = createCelestialJelly3DRig();
    stepCelestialJelly3DPhysics(
      this.rig,
      computeJellyBellContraction(0),
      0,
      0.016,
      null,
      null,
      1.0
    );
    this.planktonGeometry = buildPelagicPlanktonGeometry(
      isSoftwareGl ? 96 : 150
    );

    // 2. Build Custom Translucent, Iridescent & Bioluminescent ShaderMaterials
    const sharedBellUniforms = {
      uTime: { value: 0 },
      uContraction: { value: 0.35 },
      uRadialScale: { value: 1.0 },
      uVerticalStretch: { value: 1.0 },
      uMarginWavePhase: { value: 0 },
      uSubsurfacePulse: { value: 0.8 },
      uLuminescence: { value: 0.94 },
      uPassOpacity: { value: 0.92 },
      uAudioBass: { value: 0 },
      uAudioAmp: { value: 0 },
      uPointerWorld: { value: new THREE.Vector2(10, 10) },
      uColorCyan: { value: this.currentCyan.clone() },
      uColorBlue: { value: this.currentBlue.clone() },
      uColorViolet: { value: this.currentViolet.clone() },
      uColorMagenta: { value: this.currentMagenta.clone() },
      uColorSubumbrellaPeach: { value: this.currentSubPeach.clone() },
      uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
    };

    // Layer 1: Back-face pass of the 16-lobe crystalline bell
    this.bellBackMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedBellUniforms,
        uPassOpacity: { value: 0.38 },
      },
      vertexShader: CELESTIAL_JELLY_BELL_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_BELL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
    });

    // Layer 2: Inner translucent subumbrella tissue layer for multi-layered biological depth
    this.bellInnerTissueMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...sharedBellUniforms,
        uPassOpacity: { value: 0.22 },
      },
      vertexShader: CELESTIAL_JELLY_BELL_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_BELL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });

    // Layer 3: Front-face pass of the crystalline bell (renders blue-violet dome & branching neural veins)
    this.bellFrontMaterial = new THREE.ShaderMaterial({
      uniforms: sharedBellUniforms,
      vertexShader: CELESTIAL_JELLY_BELL_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_BELL_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });

    // Internal Corona Material (72 luminous rose-pink, champagne, lavender & amber strands)
    this.manubriumMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uContraction: { value: 0.35 },
        uLuminescence: { value: 0.95 },
        uColorSubumbrellaPeach: { value: this.currentSubPeach.clone() },
        uColorCoronaRose: { value: this.currentCoronaRose.clone() },
        uColorCoronaChampagne: { value: this.currentCoronaChampagne.clone() },
        uColorMidLavender: { value: this.currentMidLavender.clone() },
        uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
      },
      vertexShader: CELESTIAL_JELLY_MANUBRIUM_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_MANUBRIUM_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    // Central Ruffled Oral Arms Material
    this.oralArmsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLuminescence: { value: 0.95 },
        uAudioAmp: { value: 0 },
        uColorCrownPink: { value: this.currentCrownPink.clone() },
        uColorPearl: { value: this.currentPearl.clone() },
        uColorCoronaChampagne: { value: this.currentCoronaChampagne.clone() },
        uColorMidLavender: { value: this.currentMidLavender.clone() },
        uColorTipCyan: { value: this.currentTipCyan.clone() },
        uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
      },
      vertexShader: CELESTIAL_JELLY_ORAL_ARM_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_ORAL_ARM_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.filamentsMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLuminescence: { value: 0.92 },
        uColorCyan: { value: this.currentCyan.clone() },
        uColorViolet: { value: this.currentViolet.clone() },
        uColorMagenta: { value: this.currentMagenta.clone() },
        uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
      },
      vertexShader: CELESTIAL_JELLY_FILAMENT_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_FILAMENT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.pinnateMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uLuminescence: { value: 0.92 },
        uColorCyan: { value: this.currentCyan.clone() },
        uColorViolet: { value: this.currentViolet.clone() },
        uColorMagenta: { value: this.currentMagenta.clone() },
      },
      vertexShader: CELESTIAL_JELLY_PINNATE_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_PINNATE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.biolumeNodesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uAudioAmp: { value: 0 },
        uLuminescence: { value: 0.96 },
        uColorCyan: { value: this.currentCyan.clone() },
        uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
        uColorMagenta: { value: this.currentMagenta.clone() },
      },
      vertexShader: CELESTIAL_JELLY_BIOLUME_NODES_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_BIOLUME_NODES_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    this.planktonMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uContraction: { value: 0.35 },
        uLuminescence: { value: 0.9 },
        uColorCyan: { value: this.currentCyan.clone() },
        uColorViolet: { value: this.currentViolet.clone() },
        uColorBiolumeGold: { value: this.currentBiolumeGold.clone() },
      },
      vertexShader: CELESTIAL_JELLY_PLANKTON_VERTEX_SHADER,
      fragmentShader: CELESTIAL_JELLY_PLANKTON_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    // 3. Assemble Depth-Sorted 3D Anatomical Hierarchy
    const planktonPoints = new THREE.Points(
      this.planktonGeometry,
      this.planktonMaterial
    );
    planktonPoints.frustumCulled = false;
    planktonPoints.renderOrder = 10;

    const bellBackMesh = new THREE.Mesh(
      this.bellGeometry,
      this.bellBackMaterial
    );
    bellBackMesh.frustumCulled = false;
    bellBackMesh.renderOrder = 11;

    const filamentsMesh = new THREE.Mesh(
      this.rig.filamentsGeometry,
      this.filamentsMaterial
    );
    filamentsMesh.frustumCulled = false;
    filamentsMesh.renderOrder = 12;

    const pinnateMesh = new THREE.Mesh(
      this.rig.pinnateFrondsGeometry,
      this.pinnateMaterial
    );
    pinnateMesh.frustumCulled = false;
    pinnateMesh.renderOrder = 13;

    const manubriumMesh = new THREE.Mesh(
      this.manubriumGeometry,
      this.manubriumMaterial
    );
    manubriumMesh.frustumCulled = false;
    manubriumMesh.renderOrder = 14;

    const oralArmsMesh = new THREE.Mesh(
      this.rig.oralArmsGeometry,
      this.oralArmsMaterial
    );
    oralArmsMesh.frustumCulled = false;
    oralArmsMesh.renderOrder = 15;

    // Inner translucent tissue bell layer (creates multi-layer mesoglea depth)
    const bellInnerTissueMesh = new THREE.Mesh(
      this.bellGeometry,
      this.bellInnerTissueMaterial
    );
    bellInnerTissueMesh.scale.set(0.92, 0.89, 0.92);
    bellInnerTissueMesh.position.set(0, 0.02, 0);
    bellInnerTissueMesh.frustumCulled = false;
    bellInnerTissueMesh.renderOrder = 16;

    const bellFrontMesh = new THREE.Mesh(
      this.bellGeometry,
      this.bellFrontMaterial
    );
    bellFrontMesh.frustumCulled = false;
    bellFrontMesh.renderOrder = 17;

    const biolumeNodesPoints = new THREE.Points(
      this.rig.biolumeNodesGeometry,
      this.biolumeNodesMaterial
    );
    biolumeNodesPoints.frustumCulled = false;
    biolumeNodesPoints.renderOrder = 18;

    this.swimGroup.add(
      planktonPoints,
      bellBackMesh,
      filamentsMesh,
      pinnateMesh,
      manubriumMesh,
      oralArmsMesh,
      bellInnerTissueMesh,
      bellFrontMesh,
      biolumeNodesPoints
    );

    // Set initial master reference swimming posture matching celestial-jelly-master.png
    this.swimGroup.rotation.set(0.07, 0.0, -0.21);

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
      !this.lensElement ||
      !this.lensElement.isConnected
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

  public update(input: CelestialJelly3DUpdateInput): void {
    const isActive = input.orbDesign === 'celestial-jelly';
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

    // Apply adaptive particle draw ranges without reallocating buffers
    const totalPlankton =
      this.planktonGeometry.getAttribute('position')?.count || 150;
    const activePlankton = Math.max(
      32,
      Math.round(totalPlankton * (input.planktonDrawFraction ?? 1.0))
    );
    this.planktonGeometry.setDrawRange(0, activePlankton);

    const activeBiolume = Math.max(
      64,
      Math.round(
        this.rig.biolumeNodeCount * (input.jellyBiolumeNodeFraction ?? 1.0)
      )
    );
    this.rig.biolumeNodesGeometry.setDrawRange(0, activeBiolume);

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

    // Compute asymmetric systolic/diastolic bell propulsion cycle (matching motion video)
    const bellDyn = computeJellyBellContraction(this.simTime);

    // STAGE G: Maintain permanent intrinsic Celestial Jelly colour identity + subtle soundscape sync
    const targetRig = computeCelestialJellyColorRig(
      input.scene,
      input.phase,
      input.chamber
    );
    const soundPreset = getResonancePresetByChamberId(
      input.activeChamberId || input.chamber?.id || 'rain-chamber'
    );
    const pulseElapsedSec =
      input.resonancePulseTimestamp && input.resonancePulseTimestamp > 0
        ? (Date.now() - input.resonancePulseTimestamp) / 1000
        : -1;
    const pulseState = computeJellyResonancePulseState(pulseElapsedSec);

    const soundTintStrength = 0.28 + pulseState.bellGlowBoost * 0.45;
    _cCyan.setRGB(
      THREE.MathUtils.lerp(
        targetRig.domeCyan[0],
        soundPreset.primaryRgb[0],
        soundTintStrength
      ),
      THREE.MathUtils.lerp(
        targetRig.domeCyan[1],
        soundPreset.primaryRgb[1],
        soundTintStrength
      ),
      THREE.MathUtils.lerp(
        targetRig.domeCyan[2],
        soundPreset.primaryRgb[2],
        soundTintStrength
      )
    );
    _cBlue.setRGB(...targetRig.domeBlue);
    _cViolet.setRGB(
      THREE.MathUtils.lerp(
        targetRig.domeViolet[0],
        soundPreset.secondaryRgb[0],
        soundTintStrength * 0.85
      ),
      THREE.MathUtils.lerp(
        targetRig.domeViolet[1],
        soundPreset.secondaryRgb[1],
        soundTintStrength * 0.85
      ),
      THREE.MathUtils.lerp(
        targetRig.domeViolet[2],
        soundPreset.secondaryRgb[2],
        soundTintStrength * 0.85
      )
    );
    _cMagenta.setRGB(...targetRig.domeMagenta);
    _cSubPeach.setRGB(...targetRig.subumbrellaPeach);
    _cCoronaRose.setRGB(...targetRig.coronaRose);
    _cCoronaChampagne.setRGB(...targetRig.coronaChampagne);
    _cCrownPink.setRGB(...targetRig.oralArmCrownPink);
    _cPearl.setRGB(...targetRig.oralArmPearl);
    _cMidLavender.setRGB(...targetRig.oralArmMidLavender);
    _cTipCyan.setRGB(
      THREE.MathUtils.lerp(
        targetRig.oralArmTipCyan[0],
        soundPreset.primaryRgb[0],
        0.35 + pulseState.tentacleGlowBoost * 0.55
      ),
      THREE.MathUtils.lerp(
        targetRig.oralArmTipCyan[1],
        soundPreset.primaryRgb[1],
        0.35 + pulseState.tentacleGlowBoost * 0.55
      ),
      THREE.MathUtils.lerp(
        targetRig.oralArmTipCyan[2],
        soundPreset.primaryRgb[2],
        0.35 + pulseState.tentacleGlowBoost * 0.55
      )
    );
    _cBiolumeGold.setRGB(
      THREE.MathUtils.lerp(
        targetRig.biolumeGold[0],
        soundPreset.primaryRgb[0],
        0.25 + pulseState.tentacleGlowBoost * 0.45
      ),
      THREE.MathUtils.lerp(
        targetRig.biolumeGold[1],
        soundPreset.primaryRgb[1],
        0.25 + pulseState.tentacleGlowBoost * 0.45
      ),
      THREE.MathUtils.lerp(
        targetRig.biolumeGold[2],
        soundPreset.primaryRgb[2],
        0.25 + pulseState.tentacleGlowBoost * 0.45
      )
    );

    const colorLerp = 1.0 - Math.exp(-3.5 * dt);
    this.currentCyan.lerp(_cCyan, colorLerp);
    this.currentBlue.lerp(_cBlue, colorLerp);
    this.currentViolet.lerp(_cViolet, colorLerp);
    this.currentMagenta.lerp(_cMagenta, colorLerp);
    this.currentSubPeach.lerp(_cSubPeach, colorLerp);
    this.currentCoronaRose.lerp(_cCoronaRose, colorLerp);
    this.currentCoronaChampagne.lerp(_cCoronaChampagne, colorLerp);
    this.currentCrownPink.lerp(_cCrownPink, colorLerp);
    this.currentPearl.lerp(_cPearl, colorLerp);
    this.currentMidLavender.lerp(_cMidLavender, colorLerp);
    this.currentTipCyan.lerp(_cTipCyan, colorLerp);
    this.currentBiolumeGold.lerp(_cBiolumeGold, colorLerp);

    // STAGE F & H: Full-Body Frustum Composition & Continuous 3D Swimming Trajectory
    // Frame the complete Crystalline Bell, Internal Corona, Central Oral Arms, and
    // trailing tentacles with ~10–12% visual breathing room across all viewports.
    const halfFovRad = THREE.MathUtils.degToRad(input.camera.fov * 0.5);
    const visibleWorldHeight = 2.0 * input.camera.position.z * Math.tan(halfFovRad);
    const aspect = input.viewportWidth / Math.max(1, input.viewportHeight);
    const visibleWorldWidth = visibleWorldHeight * aspect;

    // Complete organism spans ~3.32 local vertical units (+0.97 bell apex to -2.35 filament tips)
    // and ~2.60 local horizontal units. Target ~63.5% of vertical frustum for ~10-12% breathing room
    // below the top header pill and above the lower controls.
    const scaleByHeight = (visibleWorldHeight * 0.585) / 3.32;
    const scaleByWidth =
      (visibleWorldWidth * (aspect < 0.85 ? 0.64 : 0.48)) / 2.60;
    const frustumFitScale = Math.min(scaleByHeight, scaleByWidth);
    const gentleStateScale =
      1.0 + (stateParams.expansionScale - 1.0) * 0.18;
    const baseScale = frustumFitScale * gentleStateScale;

    // Zero-mean 3D underwater buoyancy drift + systolic jet thrust along the swimming axis
    const propulsionSurge = (bellDyn.contraction - 0.36) * 0.036;
    const floatX =
      Math.sin(this.simTime * 0.38) * 0.028 +
      Math.cos(this.simTime * 0.21) * 0.014 +
      propulsionSurge * 0.24;
    const floatY =
      Math.cos(this.simTime * 0.46) * 0.02 + propulsionSurge * 0.52;
    const floatZ = Math.sin(this.simTime * 0.29) * 0.04;

    const targetStageY =
      aspect < 0.85 ? visibleWorldHeight * 0.045 : -visibleWorldHeight * 0.015;
    const stageCenterWorldY = THREE.MathUtils.lerp(
      this.cachedLensCenterWorld.y,
      targetStageY,
      0.78
    );
    const organismMidpointLocalY = -0.50;
    const anchorWorldY =
      stageCenterWorldY - organismMidpointLocalY * baseScale;

    this.rootGroup.position.set(
      this.cachedLensCenterWorld.x * 0.35 + floatX,
      anchorWorldY + floatY,
      floatZ
    );
    this.rootGroup.scale.setScalar(baseScale);

    // Continuous 3D orientation changes matching celestial-jelly-pulsing-reference.mp4
    // Slight upward subumbrella view angle (targetRotX ~ 0.065) reveals the glowing Internal Corona
    const ptrOffsetX = input.pointerActive ? input.pointerNormX - 0.5 : 0;
    const ptrOffsetY = input.pointerActive ? input.pointerNormY - 0.5 : 0;

    const targetRotX =
      0.065 +
      Math.sin(this.simTime * 0.34) * 0.045 +
      bellDyn.contraction * 0.028 -
      ptrOffsetY * 0.12;
    const targetRotY =
      Math.sin(this.simTime * 0.24) * 0.12 +
      Math.cos(this.simTime * 0.41) * 0.045 +
      ptrOffsetX * 0.15;
    const targetRotZ =
      -0.16 +
      Math.cos(this.simTime * 0.29 + 0.8) * 0.052 -
      bellDyn.contraction * 0.02;

    this.swimGroup.rotation.x = THREE.MathUtils.damp(
      this.swimGroup.rotation.x,
      targetRotX,
      3.8,
      dt
    );
    this.swimGroup.rotation.y = THREE.MathUtils.damp(
      this.swimGroup.rotation.y,
      targetRotY,
      3.8,
      dt
    );
    this.swimGroup.rotation.z = THREE.MathUtils.damp(
      this.swimGroup.rotation.z,
      targetRotZ,
      3.8,
      dt
    );

    // Convert normalized pointer to local jellyfish space for interactive tentacle & bell deflection
    let localPtrX: number | null = null;
    let localPtrY: number | null = null;
    if (input.pointerActive) {
      const halfFovRad = THREE.MathUtils.degToRad(input.camera.fov * 0.5);
      const halfWorldH = input.camera.position.z * Math.tan(halfFovRad);
      const aspect = input.viewportWidth / Math.max(1, input.viewportHeight);
      const halfWorldW = halfWorldH * aspect;

      const worldPtrX = (input.pointerNormX * 2.0 - 1.0) * halfWorldW;
      const worldPtrY = (input.pointerNormY * 2.0 - 1.0) * halfWorldH;

      localPtrX =
        (worldPtrX - this.rootGroup.position.x) / Math.max(0.1, baseScale);
      localPtrY =
        (worldPtrY - this.rootGroup.position.y) / Math.max(0.1, baseScale);
    }

    // Step Stage F 3D Spring-Verlet Physics for 8 Ruffled Oral Arms, 16 Filaments, and 8 Pinnate Fronds
    if (!input.reducedMotion && input.status !== 'paused') {
      stepCelestialJelly3DPhysics(
        this.rig,
        bellDyn,
        this.simTime,
        dt,
        localPtrX,
        localPtrY,
        stateParams.motionSpeed
      );
    }

    // Update Shader Uniforms across all anatomical layers (including traveling Resonance Halo light pulse)
    const baseLumi =
      stateParams.luminescence * (input.status === 'paused' ? 0.68 : 1.0);
    const bellLumi = Math.min(1.45, baseLumi + pulseState.bellGlowBoost * 0.48);
    const tentacleLumi = Math.min(
      1.5,
      baseLumi + pulseState.tentacleGlowBoost * 0.55
    );

    const updateBellUniforms = (u: Record<string, THREE.IUniform>) => {
      u.uTime.value = this.simTime;
      u.uContraction.value = bellDyn.contraction;
      u.uRadialScale.value = bellDyn.radialScale;
      u.uVerticalStretch.value = bellDyn.verticalStretch;
      u.uMarginWavePhase.value = bellDyn.marginWavePhase;
      u.uSubsurfacePulse.value = Math.min(
        1.35,
        bellDyn.subsurfacePulse + pulseState.bellGlowBoost * 0.45
      );
      u.uLuminescence.value = bellLumi;
      u.uAudioBass.value = input.audioBands.bass;
      u.uAudioAmp.value =
        input.audioBands.overall + pulseState.bellGlowBoost * 0.35;
      u.uPointerWorld.value.set(
        localPtrX !== null ? localPtrX : 10.0,
        localPtrY !== null ? localPtrY : 10.0
      );
      u.uColorCyan.value.copy(this.currentCyan);
      u.uColorBlue.value.copy(this.currentBlue);
      u.uColorViolet.value.copy(this.currentViolet);
      u.uColorMagenta.value.copy(this.currentMagenta);
      u.uColorSubumbrellaPeach.value.copy(this.currentSubPeach);
      u.uColorBiolumeGold.value.copy(this.currentBiolumeGold);
    };

    updateBellUniforms(this.bellFrontMaterial.uniforms);
    updateBellUniforms(this.bellBackMaterial.uniforms);
    updateBellUniforms(this.bellInnerTissueMaterial.uniforms);

    const manU = this.manubriumMaterial.uniforms;
    manU.uTime.value = this.simTime;
    manU.uContraction.value = bellDyn.contraction;
    manU.uLuminescence.value = bellLumi;
    manU.uColorSubumbrellaPeach.value.copy(this.currentSubPeach);
    manU.uColorCoronaRose.value.copy(this.currentCoronaRose);
    manU.uColorCoronaChampagne.value.copy(this.currentCoronaChampagne);
    manU.uColorMidLavender.value.copy(this.currentMidLavender);
    manU.uColorBiolumeGold.value.copy(this.currentBiolumeGold);

    const oaU = this.oralArmsMaterial.uniforms;
    oaU.uTime.value = this.simTime;
    oaU.uLuminescence.value = tentacleLumi;
    oaU.uAudioAmp.value =
      input.audioBands.overall + pulseState.tentacleGlowBoost * 0.4;
    oaU.uColorCrownPink.value.copy(this.currentCrownPink);
    oaU.uColorPearl.value.copy(this.currentPearl);
    oaU.uColorCoronaChampagne.value.copy(this.currentCoronaChampagne);
    oaU.uColorMidLavender.value.copy(this.currentMidLavender);
    oaU.uColorTipCyan.value.copy(this.currentTipCyan);
    oaU.uColorBiolumeGold.value.copy(this.currentBiolumeGold);

    const filU = this.filamentsMaterial.uniforms;
    filU.uTime.value = this.simTime;
    filU.uLuminescence.value = tentacleLumi;
    filU.uColorCyan.value.copy(this.currentCyan);
    filU.uColorViolet.value.copy(this.currentViolet);
    filU.uColorMagenta.value.copy(this.currentMagenta);
    filU.uColorBiolumeGold.value.copy(this.currentBiolumeGold);

    const pinU = this.pinnateMaterial.uniforms;
    pinU.uTime.value = this.simTime;
    pinU.uLuminescence.value = tentacleLumi;
    pinU.uColorCyan.value.copy(this.currentCyan);
    pinU.uColorViolet.value.copy(this.currentViolet);
    pinU.uColorMagenta.value.copy(this.currentMagenta);

    const bioU = this.biolumeNodesMaterial.uniforms;
    bioU.uTime.value = this.simTime;
    bioU.uAudioAmp.value =
      input.audioBands.overall + pulseState.tentacleGlowBoost * 0.5;
    bioU.uLuminescence.value = tentacleLumi;
    bioU.uColorCyan.value.copy(this.currentCyan);
    bioU.uColorBiolumeGold.value.copy(this.currentBiolumeGold);
    bioU.uColorMagenta.value.copy(this.currentMagenta);

    const plankU = this.planktonMaterial.uniforms;
    plankU.uTime.value = this.simTime;
    plankU.uContraction.value = bellDyn.contraction;
    plankU.uLuminescence.value = baseLumi;
    plankU.uColorCyan.value.copy(this.currentCyan);
    plankU.uColorViolet.value.copy(this.currentViolet);
    plankU.uColorBiolumeGold.value.copy(this.currentBiolumeGold);
  }

  public dispose(): void {
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
    this.bellGeometry.dispose();
    this.manubriumGeometry.dispose();
    this.rig.oralArmsGeometry.dispose();
    this.rig.filamentsGeometry.dispose();
    this.rig.pinnateFrondsGeometry.dispose();
    this.rig.biolumeNodesGeometry.dispose();
    this.planktonGeometry.dispose();

    this.bellBackMaterial.dispose();
    this.bellInnerTissueMaterial.dispose();
    this.bellFrontMaterial.dispose();
    this.manubriumMaterial.dispose();
    this.oralArmsMaterial.dispose();
    this.filamentsMaterial.dispose();
    this.pinnateMaterial.dispose();
    this.biolumeNodesMaterial.dispose();
    this.planktonMaterial.dispose();
  }
}
