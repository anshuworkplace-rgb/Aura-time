import * as THREE from 'three';
import {
  ChamberConfig,
  FocusSceneConfig,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';

export interface LiquidLens3DControllerInitOptions {
  parentScene: THREE.Scene;
  pixelRatio: number;
  isSoftwareGl: boolean;
  initialScene: FocusSceneConfig;
  initialPhase: TimerPhase;
}

export interface LiquidLens3DUpdateParams {
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
  pointerNormX: number;
  pointerNormY: number;
  pointerActive: boolean;
}

/**
 * 3D Refractive Liquid Lens Controller for `orbDesign === 'original'`.
 * Shares the main Three.js scene and renderer alongside Celestial Jelly and Living Bloom,
 * providing a multi-layered 3D refractive torus/meniscus, concentric caustic light rings,
 * and suspended bioluminescent fluid motes.
 */
export class LiquidLens3DSceneController {
  private rootGroup: THREE.Group;
  private outerMeniscus: THREE.Mesh;
  private innerRefractor: THREE.Mesh;
  private causticRings: THREE.Mesh[] = [];
  private suspendedMotes: THREE.Points;

  private outerMat: THREE.MeshPhysicalMaterial;
  private innerMat: THREE.MeshPhysicalMaterial;
  private ringMats: THREE.MeshBasicMaterial[] = [];
  private motesMat: THREE.PointsMaterial;
  private geometries: THREE.BufferGeometry[] = [];

  private simTime = 0;
  private currentOpacity = 0;
  private currentPrimary = new THREE.Color();
  private currentSecondary = new THREE.Color();
  private currentTertiary = new THREE.Color();
  private targetColor = new THREE.Color();

  constructor(options: LiquidLens3DControllerInitOptions) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'LiquidLens3DOrganism';
    this.rootGroup.position.set(0, 0.08, 0.2);
    this.rootGroup.visible = false;

    this.currentPrimary.set(options.initialScene.colors.primary);
    this.currentSecondary.set(options.initialScene.colors.secondary);
    this.currentTertiary.set(options.initialScene.colors.tertiary);

    // 1. Outer Refractive Liquid Torus Meniscus
    const torusGeo = new THREE.TorusGeometry(0.92, 0.16, 28, 96);
    this.geometries.push(torusGeo);
    this.outerMat = new THREE.MeshPhysicalMaterial({
      color: this.currentPrimary,
      emissive: this.currentSecondary,
      emissiveIntensity: 0.28,
      roughness: 0.12,
      metalness: 0.05,
      transmission: 0,
      ior: 1.42,
      iridescence: 0.85,
      iridescenceIOR: 1.33,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.outerMeniscus = new THREE.Mesh(torusGeo, this.outerMat);
    this.rootGroup.add(this.outerMeniscus);

    // 2. Inner Fluid Core Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(0.76, 4);
    this.geometries.push(sphereGeo);
    this.innerMat = new THREE.MeshPhysicalMaterial({
      color: this.currentSecondary,
      emissive: this.currentPrimary,
      emissiveIntensity: 0.22,
      roughness: 0.16,
      metalness: 0.02,
      transmission: 0,
      ior: 1.36,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.innerRefractor = new THREE.Mesh(sphereGeo, this.innerMat);
    this.rootGroup.add(this.innerRefractor);

    // 3. Three Harmonic Caustic Wave Rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(0.55 + i * 0.22, 0.012, 12, 72);
      this.geometries.push(ringGeo);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? this.currentSecondary : this.currentTertiary,
        transparent: true,
        opacity: 0.28 - i * 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.ringMats.push(ringMat);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = (i - 1) * 0.24;
      ringMesh.rotation.y = i * 0.38;
      this.causticRings.push(ringMesh);
      this.rootGroup.add(ringMesh);
    }

    // 4. Suspended Bioluminescent Fluid Motes
    const moteCount = 96;
    const motePositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      const angle = i * 2.39996;
      const radius = 0.22 + ((i * 19) % 100) / 100 * 0.95;
      const z = (((i * 31) % 100) / 100 - 0.5) * 0.55;
      motePositions[i * 3] = Math.cos(angle) * radius;
      motePositions[i * 3 + 1] = Math.sin(angle) * radius;
      motePositions[i * 3 + 2] = z;
    }
    const motesGeo = new THREE.BufferGeometry();
    motesGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(motePositions, 3)
    );
    this.geometries.push(motesGeo);

    this.motesMat = new THREE.PointsMaterial({
      color: this.currentSecondary,
      size: 0.032 * options.pixelRatio,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.suspendedMotes = new THREE.Points(motesGeo, this.motesMat);
    this.rootGroup.add(this.suspendedMotes);

    options.parentScene.add(this.rootGroup);
  }

  public update(params: LiquidLens3DUpdateParams): void {
    const isActive = params.orbDesign === 'original';
    const targetOpacity = isActive ? 1 : 0;
    this.currentOpacity = THREE.MathUtils.damp(
      this.currentOpacity,
      targetOpacity,
      5.0,
      params.dt
    );

    if (this.currentOpacity < 0.01) {
      this.rootGroup.visible = false;
      return;
    }
    this.rootGroup.visible = true;

    const speedMult = params.reducedMotion
      ? 0.15
      : params.status === 'paused'
      ? 0.25
      : params.status === 'running'
      ? 1.15
      : 0.85;

    this.simTime += params.dt * speedMult;

    // Smooth color transitions
    const colorDamp = 1 - Math.exp(-3.0 * params.dt);
    this.targetColor.set(params.scene.colors.primary);
    this.currentPrimary.lerp(this.targetColor, colorDamp);

    this.targetColor.set(params.scene.colors.secondary);
    this.currentSecondary.lerp(this.targetColor, colorDamp);

    this.targetColor.set(params.scene.colors.tertiary);
    this.currentTertiary.lerp(this.targetColor, colorDamp);

    this.outerMat.color.copy(this.currentPrimary);
    this.outerMat.emissive.copy(this.currentSecondary);
    this.outerMat.opacity = 0.48 * this.currentOpacity;

    this.innerMat.color.copy(this.currentSecondary);
    this.innerMat.emissive.copy(this.currentPrimary);
    this.innerMat.opacity = 0.32 * this.currentOpacity;

    // Gentle breathing and audio-reactive pulse
    const breathScale =
      1 +
      Math.sin(this.simTime * 1.1) * 0.035 +
      params.audioBands.bass * 0.06;
    this.outerMeniscus.scale.set(breathScale, breathScale, 1 + Math.cos(this.simTime * 0.9) * 0.08);
    this.outerMeniscus.rotation.z = this.simTime * 0.18;
    this.outerMeniscus.rotation.x = Math.sin(this.simTime * 0.45) * 0.16;
    this.outerMeniscus.rotation.y = Math.cos(this.simTime * 0.38) * 0.16;

    const innerScale =
      0.96 +
      Math.cos(this.simTime * 1.35) * 0.04 +
      params.audioBands.mid * 0.05;
    this.innerRefractor.scale.setScalar(innerScale);
    this.innerRefractor.rotation.y = -this.simTime * 0.22;

    this.causticRings.forEach((ring, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      ring.rotation.z = this.simTime * 0.32 * dir;
      ring.rotation.x = Math.sin(this.simTime * 0.5 + idx) * 0.28;
      const ringPulse = 1 + Math.sin(this.simTime * 1.4 + idx * 1.2) * 0.045;
      ring.scale.setScalar(ringPulse);
      this.ringMats[idx].color.copy(
        idx % 2 === 0 ? this.currentSecondary : this.currentTertiary
      );
      this.ringMats[idx].opacity = (0.26 - idx * 0.05) * this.currentOpacity;
    });

    this.suspendedMotes.rotation.z = this.simTime * 0.09;
    this.motesMat.color.copy(this.currentSecondary);
    this.motesMat.opacity = 0.42 * this.currentOpacity;

    // Subtle pointer tilt
    const tiltX = params.pointerActive ? (params.pointerNormY - 0.5) * 0.18 : 0;
    const tiltY = params.pointerActive ? (params.pointerNormX - 0.5) * 0.18 : 0;
    this.rootGroup.rotation.x = THREE.MathUtils.damp(
      this.rootGroup.rotation.x,
      tiltX,
      3.5,
      params.dt
    );
    this.rootGroup.rotation.y = THREE.MathUtils.damp(
      this.rootGroup.rotation.y,
      tiltY,
      3.5,
      params.dt
    );
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.outerMat.dispose();
    this.innerMat.dispose();
    this.ringMats.forEach((m) => m.dispose());
    this.motesMat.dispose();
    if (this.rootGroup.parent) {
      this.rootGroup.parent.remove(this.rootGroup);
    }
  }
}
