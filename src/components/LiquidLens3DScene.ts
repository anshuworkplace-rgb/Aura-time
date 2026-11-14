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

  private outerMat: THREE.MeshBasicMaterial;
  private innerMat: THREE.MeshBasicMaterial;
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
    const torusGeo = new THREE.TorusGeometry(0.92, 0.14, 20, 64);
    this.geometries.push(torusGeo);
    this.outerMat = new THREE.MeshBasicMaterial({
      color: this.currentPrimary,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.outerMeniscus = new THREE.Mesh(torusGeo, this.outerMat);
    this.rootGroup.add(this.outerMeniscus);

    // 2. Inner Fluid Core Sphere
    const sphereGeo = new THREE.IcosahedronGeometry(0.76, 2);
    this.geometries.push(sphereGeo);
    this.innerMat = new THREE.MeshBasicMaterial({
      color: this.currentSecondary,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
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

  public update(_params: LiquidLens3DUpdateParams): void {
    // Keep 3D torus/ring meshes hidden so Liquid Lens ("original") displays the clean
    // volumetric Quantum Nebula background with the 2D Refractive Liquid Lens orb centerpiece.
    this.currentOpacity = 0;
    this.rootGroup.visible = false;
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
