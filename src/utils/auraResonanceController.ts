import * as THREE from 'three';
import {
  ChamberId,
  FocusSceneConfig,
  FocusSceneId,
  OrbDesignId,
  TimerPhase,
  TimerStatus,
} from '../types/aura';
import { normalizeChamberId } from './focusEngine';
import {
  InfinityAuroraPalette,
  computeSceneAuroraPalette,
  hexToNormalizedRgb,
} from './infinityAuroraEngine';
import { AuraAudioEngine, auraAudioEngine } from './soundSynthesizer';

// ============================================================================
// PART 7 — EXPLICIT SESSION STATES & EVENTS
// ============================================================================

export type AuraSessionState =
  | 'IDLE'
  | 'STARTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ERROR';

export function timerStatusToAuraSessionState(
  status: TimerStatus,
  hasError = false
): AuraSessionState {
  if (hasError) return 'ERROR';
  switch (status) {
    case 'running':
      return 'RUNNING';
    case 'paused':
      return 'PAUSED';
    case 'completed':
      return 'COMPLETED';
    case 'idle':
    default:
      return 'IDLE';
  }
}

export function auraSessionStateToTimerStatus(
  state: AuraSessionState
): TimerStatus {
  switch (state) {
    case 'RUNNING':
    case 'STARTING':
      return 'running';
    case 'PAUSED':
      return 'paused';
    case 'COMPLETED':
      return 'completed';
    case 'IDLE':
    case 'ERROR':
    default:
      return 'idle';
  }
}

// ============================================================================
// PART 5 — RESONANCE COLOR INTELLIGENCE (SOUND-TO-VISUAL PROFILE SYSTEM)
// ============================================================================

export type ParticleDriftBehavior =
  | 'rainfall'
  | 'caustic-current'
  | 'organic-spores'
  | 'distant-stars'
  | 'floating-embers'
  | 'ethereal-bloom';

export interface ResonanceVisualProfile {
  chamberId: ChamberId;
  name: string;
  visualSignatureLabel: string;
  /** Primary color in hex & normalized RGB */
  primaryHex: string;
  primaryRgb: [number, number, number];
  /** Secondary color in hex & normalized RGB */
  secondaryHex: string;
  secondaryRgb: [number, number, number];
  /** Environmental lighting tint in normalized RGB */
  ambientLightRgb: [number, number, number];
  /** Key directional light tint in normalized RGB */
  keyLightRgb: [number, number, number];
  /** Central 3D object emissive illumination tint */
  organismEmissiveRgb: [number, number, number];
  /** Particle tint in normalized RGB */
  particleTintRgb: [number, number, number];
  /** Particle drift behavior identity */
  particleDriftBehavior: ParticleDriftBehavior;
  /** Velocity bias [vx, vy] for atmospheric particles */
  particleVelocityBias: [number, number];
  /** Multiplier on central object luminescence (0.88..1.22) */
  centralIlluminationMultiplier: number;
  /** Multiplier on environmental fluid/aurora motion (0.75..1.25) */
  atmosphericMotionMultiplier: number;
  /** Secondary layer blend weight over the base Atmosphere palette (0.28..0.42) */
  secondaryLayerWeight: number;
}

export const RESONANCE_VISUAL_PROFILES: Record<
  ChamberId,
  ResonanceVisualProfile
> = {
  'rain-chamber': {
    chamberId: 'rain-chamber',
    name: 'Rain Chamber',
    visualSignatureLabel: 'Cool blue · Diffused light · Subtle rainfall',
    primaryHex: '#38BDF8',
    primaryRgb: hexToNormalizedRgb('#38BDF8'),
    secondaryHex: '#60A5FA',
    secondaryRgb: hexToNormalizedRgb('#60A5FA'),
    ambientLightRgb: [0.22, 0.68, 0.96],
    keyLightRgb: [0.68, 0.86, 1.0],
    organismEmissiveRgb: [0.28, 0.76, 0.98],
    particleTintRgb: [0.58, 0.86, 1.0],
    particleDriftBehavior: 'rainfall',
    particleVelocityBias: [0.02, -0.34],
    centralIlluminationMultiplier: 1.05,
    atmosphericMotionMultiplier: 0.94,
    secondaryLayerWeight: 0.36,
  },
  'ocean-drift': {
    chamberId: 'ocean-drift',
    name: 'Ocean Drift',
    visualSignatureLabel: 'Aqua cyan · Underwater caustics · Fluid movement',
    primaryHex: '#2FE8FF',
    primaryRgb: hexToNormalizedRgb('#2FE8FF'),
    secondaryHex: '#00C2D1',
    secondaryRgb: hexToNormalizedRgb('#00C2D1'),
    ambientLightRgb: [0.14, 0.88, 0.96],
    keyLightRgb: [0.42, 0.96, 1.0],
    organismEmissiveRgb: [0.18, 0.92, 1.0],
    particleTintRgb: [0.26, 0.95, 1.0],
    particleDriftBehavior: 'caustic-current',
    particleVelocityBias: [0.22, 0.08],
    centralIlluminationMultiplier: 1.12,
    atmosphericMotionMultiplier: 1.08,
    secondaryLayerWeight: 0.36,
  },
  'forest-echo': {
    chamberId: 'forest-echo',
    name: 'Forest Echo',
    visualSignatureLabel: 'Emerald green · Organic spores · Natural illumination',
    primaryHex: '#34D399',
    primaryRgb: hexToNormalizedRgb('#34D399'),
    secondaryHex: '#6EE7B7',
    secondaryRgb: hexToNormalizedRgb('#6EE7B7'),
    ambientLightRgb: [0.18, 0.82, 0.58],
    keyLightRgb: [0.64, 0.96, 0.78],
    organismEmissiveRgb: [0.24, 0.88, 0.64],
    particleTintRgb: [0.46, 0.94, 0.72],
    particleDriftBehavior: 'organic-spores',
    particleVelocityBias: [0.12, 0.14],
    centralIlluminationMultiplier: 1.08,
    atmosphericMotionMultiplier: 0.92,
    secondaryLayerWeight: 0.36,
  },
  'cosmic-silence': {
    chamberId: 'cosmic-silence',
    name: 'Cosmic Silence',
    visualSignatureLabel: 'Deep violet · Distant stars · Restrained nebula',
    primaryHex: '#8A5CFF',
    primaryRgb: hexToNormalizedRgb('#8A5CFF'),
    secondaryHex: '#A78BFA',
    secondaryRgb: hexToNormalizedRgb('#A78BFA'),
    ambientLightRgb: [0.48, 0.32, 0.96],
    keyLightRgb: [0.72, 0.58, 1.0],
    organismEmissiveRgb: [0.58, 0.42, 1.0],
    particleTintRgb: [0.78, 0.68, 1.0],
    particleDriftBehavior: 'distant-stars',
    particleVelocityBias: [0.03, 0.02],
    centralIlluminationMultiplier: 0.96,
    atmosphericMotionMultiplier: 0.78,
    secondaryLayerWeight: 0.36,
  },
  'ember-glow': {
    chamberId: 'ember-glow',
    name: 'Ember Glow',
    visualSignatureLabel: 'Warm amber · Floating embers · Golden illumination',
    primaryHex: '#F59E0B',
    primaryRgb: hexToNormalizedRgb('#F59E0B'),
    secondaryHex: '#FB923C',
    secondaryRgb: hexToNormalizedRgb('#FB923C'),
    ambientLightRgb: [0.96, 0.58, 0.18],
    keyLightRgb: [1.0, 0.78, 0.42],
    organismEmissiveRgb: [1.0, 0.68, 0.28],
    particleTintRgb: [1.0, 0.76, 0.36],
    particleDriftBehavior: 'floating-embers',
    particleVelocityBias: [0.06, 0.32],
    centralIlluminationMultiplier: 1.15,
    atmosphericMotionMultiplier: 0.96,
    secondaryLayerWeight: 0.38,
  },
  'celestial-tone': {
    chamberId: 'celestial-tone',
    name: 'Celestial Tone',
    visualSignatureLabel: 'Rose lavender · Ethereal particles · Soft luminous light',
    primaryHex: '#F472B6',
    primaryRgb: hexToNormalizedRgb('#F472B6'),
    secondaryHex: '#C084FC',
    secondaryRgb: hexToNormalizedRgb('#C084FC'),
    ambientLightRgb: [0.92, 0.48, 0.82],
    keyLightRgb: [0.98, 0.72, 0.94],
    organismEmissiveRgb: [0.95, 0.54, 0.86],
    particleTintRgb: [0.96, 0.68, 0.92],
    particleDriftBehavior: 'ethereal-bloom',
    particleVelocityBias: [0.08, 0.18],
    centralIlluminationMultiplier: 1.14,
    atmosphericMotionMultiplier: 0.9,
    secondaryLayerWeight: 0.36,
  },
};

export function getResonanceVisualProfile(
  chamberId: ChamberId
): ResonanceVisualProfile {
  const normalized = normalizeChamberId(chamberId);
  return (
    RESONANCE_VISUAL_PROFILES[normalized] ||
    RESONANCE_VISUAL_PROFILES['ocean-drift']
  );
}

function lerpRgbTuple(
  base: [number, number, number],
  overlay: [number, number, number],
  weight: number
): [number, number, number] {
  const w = Math.max(0, Math.min(1, weight));
  return [
    Number((base[0] + (overlay[0] - base[0]) * w).toFixed(4)),
    Number((base[1] + (overlay[1] - base[1]) * w).toFixed(4)),
    Number((base[2] + (overlay[2] - base[2]) * w).toFixed(4)),
  ];
}

/**
 * Applies the selected sound's visual signature as a coordinated secondary visual layer
 * over the user's selected Atmosphere base palette.
 * Never overwrites the base Atmosphere state; both contribute to the final world.
 */
export function computeCoordinatedResonancePalette(
  scene: FocusSceneConfig,
  chamberId: ChamberId,
  phase: TimerPhase = 'focus',
  customBlendWeight?: number
): {
  basePalette: InfinityAuroraPalette;
  soundProfile: ResonanceVisualProfile;
  coordinatedPalette: InfinityAuroraPalette;
} {
  const basePalette = computeSceneAuroraPalette(scene, phase);
  const soundProfile = getResonanceVisualProfile(chamberId);
  const weight =
    customBlendWeight !== undefined
      ? Math.max(0, Math.min(0.75, customBlendWeight))
      : soundProfile.secondaryLayerWeight;

  const coordinatedPalette: InfinityAuroraPalette = {
    ...basePalette,
    zenithTint: lerpRgbTuple(
      basePalette.zenithTint,
      soundProfile.ambientLightRgb,
      weight * 0.25
    ),
    engineAPrimary: lerpRgbTuple(
      basePalette.engineAPrimary,
      soundProfile.primaryRgb,
      weight
    ),
    engineASecondary: lerpRgbTuple(
      basePalette.engineASecondary,
      soundProfile.secondaryRgb,
      weight
    ),
    engineAHighlight: lerpRgbTuple(
      basePalette.engineAHighlight,
      soundProfile.keyLightRgb,
      weight * 0.85
    ),
    engineBPrimary: lerpRgbTuple(
      basePalette.engineBPrimary,
      soundProfile.secondaryRgb,
      weight * 0.8
    ),
    engineBCoralHighlight: lerpRgbTuple(
      basePalette.engineBCoralHighlight,
      soundProfile.primaryRgb,
      weight * 0.9
    ),
    engineCCyanCurrent: lerpRgbTuple(
      basePalette.engineCCyanCurrent,
      soundProfile.primaryRgb,
      weight
    ),
    engineCVioletCurrent: lerpRgbTuple(
      basePalette.engineCVioletCurrent,
      soundProfile.secondaryRgb,
      weight * 0.85
    ),
    engineCMagentaInterference: lerpRgbTuple(
      basePalette.engineCMagentaInterference,
      soundProfile.organismEmissiveRgb,
      weight * 0.9
    ),
    turbulenceScale: Number(
      (
        basePalette.turbulenceScale * soundProfile.atmosphericMotionMultiplier
      ).toFixed(4)
    ),
  };

  return {
    basePalette,
    soundProfile,
    coordinatedPalette,
  };
}

// ============================================================================
// PART 3 & PART 4 — 3D OBJECT ANCHORS & SCREEN-SPACE PROJECTION
// ============================================================================

export interface Organism3DAnchorSpec {
  chamberId: ChamberId;
  /** Local 3D coordinates [x, y, z] relative to the 3D organism's anatomical rig */
  localPosition: [number, number, number];
  /** Anatomical region label for inspection and accessibility */
  anatomicalAnchorName: string;
  /** Preferred radial angle in radians around the silhouette */
  polarAngleRad: number;
}

/**
 * Celestial Jelly — Resonance Orbit 3D Bell Anchors
 * Positioned around the actual 16-lobe jellyfish bell perimeter and upper margin
 * (avoiding top navigation at -90° and bottom countdown numerals at +90°).
 */
export const CELESTIAL_JELLY_3D_ANCHORS: Record<
  ChamberId,
  Organism3DAnchorSpec
> = {
  'rain-chamber': {
    chamberId: 'rain-chamber',
    localPosition: [-1.58, 0.52, 0.18],
    anatomicalAnchorName: 'Upper-Left Exumbrella Lobe',
    polarAngleRad: (-148 * Math.PI) / 180,
  },
  'cosmic-silence': {
    chamberId: 'cosmic-silence',
    localPosition: [-0.96, 1.06, 0.14],
    anatomicalAnchorName: 'Crown-Left Bell Apex',
    polarAngleRad: (-118 * Math.PI) / 180,
  },
  'celestial-tone': {
    chamberId: 'celestial-tone',
    localPosition: [0.96, 1.06, 0.14],
    anatomicalAnchorName: 'Crown-Right Bell Apex',
    polarAngleRad: (-62 * Math.PI) / 180,
  },
  'ocean-drift': {
    chamberId: 'ocean-drift',
    localPosition: [1.62, 0.52, 0.18],
    anatomicalAnchorName: 'Upper-Right Exumbrella Lobe',
    polarAngleRad: (-32 * Math.PI) / 180,
  },
  'forest-echo': {
    chamberId: 'forest-echo',
    localPosition: [1.74, -0.16, 0.22],
    anatomicalAnchorName: 'Lower-Right Bell Margin',
    polarAngleRad: (14 * Math.PI) / 180,
  },
  'ember-glow': {
    chamberId: 'ember-glow',
    localPosition: [-1.68, -0.16, 0.22],
    anatomicalAnchorName: 'Lower-Left Bell Margin',
    polarAngleRad: (166 * Math.PI) / 180,
  },
};

/**
 * Living Bloom — Harmonic Petal Array 3D Petal-Cluster Anchors
 * Positioned around the natural outer guard-petal and mid-whorl silhouette of the 44-petal flower.
 */
export const LIVING_BLOOM_3D_ANCHORS: Record<ChamberId, Organism3DAnchorSpec> =
  {
    'rain-chamber': {
      chamberId: 'rain-chamber',
      localPosition: [-1.34, 0.36, -0.44],
      anatomicalAnchorName: 'North-West Outer Guard Petal Cluster',
      polarAngleRad: (-150 * Math.PI) / 180,
    },
    'cosmic-silence': {
      chamberId: 'cosmic-silence',
      localPosition: [-0.78, 0.54, -0.88],
      anatomicalAnchorName: 'Upper-Left Corolla Crown Cluster',
      polarAngleRad: (-116 * Math.PI) / 180,
    },
    'celestial-tone': {
      chamberId: 'celestial-tone',
      localPosition: [0.78, 0.54, -0.88],
      anatomicalAnchorName: 'Upper-Right Corolla Crown Cluster',
      polarAngleRad: (-64 * Math.PI) / 180,
    },
    'ocean-drift': {
      chamberId: 'ocean-drift',
      localPosition: [1.34, 0.36, -0.44],
      anatomicalAnchorName: 'North-East Outer Guard Petal Cluster',
      polarAngleRad: (-30 * Math.PI) / 180,
    },
    'forest-echo': {
      chamberId: 'forest-echo',
      localPosition: [1.42, -0.04, 0.38],
      anatomicalAnchorName: 'South-East Lateral Petal Cluster',
      polarAngleRad: (16 * Math.PI) / 180,
    },
    'ember-glow': {
      chamberId: 'ember-glow',
      localPosition: [-1.42, -0.04, 0.38],
      anatomicalAnchorName: 'South-West Lateral Petal Cluster',
      polarAngleRad: (164 * Math.PI) / 180,
    },
  };

export interface ProjectedScreenAnchor {
  chamberId: ChamberId;
  /** X coordinate in 620x620 stage space */
  stageX: number;
  /** Y coordinate in 620x620 stage space */
  stageY: number;
  /** Percentage X relative to the LivingLens stage container */
  leftPct: number;
  /** Percentage Y relative to the LivingLens stage container */
  topPct: number;
  /** Polar angle in radians from organism center */
  angleRad: number;
  /** Anatomical anchor description */
  anatomicalAnchorName: string;
}

const _anchorVec = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Derives screen-space coordinates in the 620x620 LivingLens stage directly from
 * the 3D organism's actual model bounds, posture rotation, and viewport dimensions,
 * while enforcing collision-free clearance from the top navigation and bottom timer.
 */
export function computeProjectedOrganismAnchors(
  orbDesign: OrbDesignId,
  viewportWidth = 1440,
  viewportHeight = 900
): ProjectedScreenAnchor[] {
  const isCompactViewport = viewportWidth < 640;
  // Responsive radial scale so nodes never clip off narrow mobile screens or collide with desktop rails
  const radialScaleX = isCompactViewport ? 0.68 : viewportWidth < 1024 ? 0.84 : 1.0;
  const radialScaleY = isCompactViewport ? 0.72 : viewportWidth < 1024 ? 0.86 : 1.0;

  const anchorMap =
    orbDesign === 'living-bloom'
      ? LIVING_BLOOM_3D_ANCHORS
      : CELESTIAL_JELLY_3D_ANCHORS;

  // Organism stage center & model-to-stage scale derived from 3D scene controllers:
  // CelestialJelly3DSceneController: baseScale = lensDiameterWorld * 0.252, swimGroup.rotation = (0.07, 0.0, -0.21)
  // LivingBloom3DSceneController: baseScale = lensDiameterWorld * 0.355, postureGroup.rotation = (0.50, 0.14, -0.08)
  const centerStageX = 310;
  const centerStageY = orbDesign === 'living-bloom' ? 242 : 236;
  const modelToStageScale = orbDesign === 'living-bloom' ? 268 : 272;

  if (orbDesign === 'living-bloom') {
    _euler.set(0.5, 0.14, -0.08, 'XYZ');
  } else {
    _euler.set(0.07, 0.0, -0.04, 'XYZ');
  }

  const order: ChamberId[] = [
    'rain-chamber',
    'cosmic-silence',
    'celestial-tone',
    'ocean-drift',
    'forest-echo',
    'ember-glow',
  ];

  return order.map((id) => {
    const spec = anchorMap[id];
    _anchorVec.set(
      spec.localPosition[0],
      spec.localPosition[1],
      spec.localPosition[2]
    );
    _anchorVec.applyEuler(_euler);

    const rawOffsetX = _anchorVec.x * modelToStageScale * radialScaleX;
    const rawOffsetY = -_anchorVec.y * modelToStageScale * radialScaleY;

    // Enforce safe vertical clearance so nodes never collide with top nav (y >= -52)
    // and never overlap the countdown timer numerals below the organism (y <= 346)
    const stageX = Number((centerStageX + rawOffsetX).toFixed(2));
    const stageY = Number(
      Math.max(-48, Math.min(338, centerStageY + rawOffsetY)).toFixed(2)
    );
    const angleRad = Math.atan2(stageY - centerStageY, stageX - centerStageX);

    return {
      chamberId: id,
      stageX,
      stageY,
      leftPct: Number(((stageX / 620) * 100).toFixed(2)),
      topPct: Number(((stageY / 620) * 100).toFixed(2)),
      angleRad,
      anatomicalAnchorName: spec.anatomicalAnchorName,
    };
  });
}

// ============================================================================
// PART 6 & PART 7 — CENTRALIZED AURA SESSION CONTROLLER
// ============================================================================

export interface AuraSessionControllerSnapshot {
  state: AuraSessionState;
  sessionState: AuraSessionState;
  timerStatus: TimerStatus;
  orbDesign: OrbDesignId;
  sceneId: FocusSceneId;
  selectedSoundId: ChamberId;
  activeSoundId: ChamberId;
  isAudioPlaying: boolean;
  durationMinutes: number;
  remainingSeconds: number;
  totalSeconds: number;
  resonanceVisible: boolean;
  errorMessage: string | null;
}

export interface SelectSoundActivationResult {
  success: boolean;
  sessionState: AuraSessionState;
  timerStatus: TimerStatus;
  nextTimerStatus: TimerStatus;
  selectedSoundId: ChamberId;
  soundId: ChamberId;
  isAudioPlaying: boolean;
  timerAutoStarted: boolean;
  timerPreservedWithoutReset: boolean;
  nextRemainingSeconds: number;
  visualProfile: ResonanceVisualProfile;
  errorMessage: string | null;
}

/**
 * Centralized AuraSessionController (AURA TIME 3.0)
 * Coordinates:
 * - AuraAudioEngine playback & confirmation
 * - Automatic focus timer activation upon sound selection
 * - Synchronized Pause / Resume of both audio and timer
 * - Preservation of both audio and timer during Theme or Atmosphere switches
 * - Explicit IDLE | STARTING | RUNNING | PAUSED | COMPLETED | ERROR state machine
 */
export class AuraSessionController {
  private audioEngine: AuraAudioEngine;
  private state: AuraSessionControllerSnapshot;
  private listeners: Set<(snapshot: AuraSessionControllerSnapshot) => void> =
    new Set();

  constructor(
    audioEngine: AuraAudioEngine = auraAudioEngine,
    initial?: Partial<AuraSessionControllerSnapshot>
  ) {
    this.audioEngine = audioEngine;
    const durMins = initial?.durationMinutes ?? 45;
    const initialState = initial?.sessionState ?? initial?.state ?? 'IDLE';
    const initialSound =
      initial?.selectedSoundId ?? initial?.activeSoundId ?? 'ocean-drift';
    this.state = {
      state: initialState,
      sessionState: initialState,
      timerStatus: initial?.timerStatus ?? 'idle',
      orbDesign: initial?.orbDesign ?? 'celestial-jelly',
      sceneId: initial?.sceneId ?? 'electric-quiet',
      selectedSoundId: initialSound,
      activeSoundId: initialSound,
      isAudioPlaying: initial?.isAudioPlaying ?? false,
      durationMinutes: durMins,
      remainingSeconds: initial?.remainingSeconds ?? durMins * 60,
      totalSeconds: initial?.totalSeconds ?? durMins * 60,
      resonanceVisible: initial?.resonanceVisible ?? true,
      errorMessage: null,
    };
  }

  public getSnapshot(): AuraSessionControllerSnapshot {
    return {
      ...this.state,
      state: this.state.sessionState,
      activeSoundId: this.state.selectedSoundId,
    };
  }

  public subscribe(
    listener: (snapshot: AuraSessionControllerSnapshot) => void
  ): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snap));
  }

  public syncExternalState(partial: Partial<AuraSessionControllerSnapshot>) {
    this.state = {
      ...this.state,
      ...partial,
      state: partial.sessionState ?? partial.state ?? this.state.sessionState,
      activeSoundId:
        partial.selectedSoundId ??
        partial.activeSoundId ??
        this.state.selectedSoundId,
    };
  }

  /**
   * PART 6: THE MOST IMPORTANT PRODUCT REQUIREMENT
   * Selecting a sound MUST start the sound and automatically start the focus timer.
   * Sequence:
   * 1. User explicitly selects a sound.
   * 2. Transition to STARTING (if not already RUNNING) & resume browser AudioContext.
   * 3. Load or retrieve preloaded audio asset.
   * 4. Start actual audio playback.
   * 5. Confirm successful playback activation.
   * 6. Start the focus timer at the same logical session-start moment (without resetting if already RUNNING).
   * 7. Return the coordinated visual transition profile.
   */
  public selectSoundAndActivateSession(
    rawChamberId: ChamberId,
    options?: {
      volume?: number;
      currentStatus?: TimerStatus;
      currentRemainingSeconds?: number;
      currentTotalSeconds?: number;
      durationMinutes?: number;
      simulatePlaybackFailure?: boolean;
    }
  ): SelectSoundActivationResult {
    const normalizedId = normalizeChamberId(rawChamberId);
    const visualProfile = getResonanceVisualProfile(normalizedId);

    if (options?.currentStatus) {
      this.state.timerStatus = options.currentStatus;
      const mapped = timerStatusToAuraSessionState(options.currentStatus);
      this.state.sessionState = mapped;
      this.state.state = mapped;
    }
    if (typeof options?.durationMinutes === 'number') {
      this.state.durationMinutes = options.durationMinutes;
    }
    if (typeof options?.currentTotalSeconds === 'number') {
      this.state.totalSeconds = options.currentTotalSeconds;
    }
    if (typeof options?.currentRemainingSeconds === 'number') {
      this.state.remainingSeconds = options.currentRemainingSeconds;
    }

    const wasRunning = this.state.sessionState === 'RUNNING';
    const wasPaused = this.state.sessionState === 'PAUSED';

    // Step 2: Transition to STARTING if not already RUNNING
    if (!wasRunning) {
      this.state.sessionState = 'STARTING';
      this.state.state = 'STARTING';
      this.state.errorMessage = null;
      this.emit();
    }

    // Handle explicit playback failure guard: do not falsely report success or start a silent session
    if (options?.simulatePlaybackFailure) {
      this.audioEngine.syncChambers({
        playing: false,
        primaryChamberId: normalizedId,
        ambienceVolume: 0,
        muted: true,
      });
      this.state.sessionState = 'ERROR';
      this.state.state = 'ERROR';
      this.state.timerStatus = 'idle';
      this.state.isAudioPlaying = false;
      this.state.errorMessage = `Audio playback failed for ${visualProfile.name}`;
      this.emit();

      return {
        success: false,
        sessionState: 'ERROR',
        timerStatus: 'idle',
        nextTimerStatus: 'idle',
        selectedSoundId: this.state.selectedSoundId,
        soundId: this.state.selectedSoundId,
        isAudioPlaying: false,
        timerAutoStarted: false,
        timerPreservedWithoutReset: false,
        nextRemainingSeconds: this.state.remainingSeconds,
        visualProfile,
        errorMessage: this.state.errorMessage,
      };
    }

    // Steps 2, 3, 4, 5: Resume AudioContext, retrieve preloaded buffer, start playback & confirm
    const targetVolume = Math.max(0.05, Math.min(1, options?.volume ?? 0.75));
    try {
      this.audioEngine.playResonanceSelectionPulse?.(
        normalizedId,
        targetVolume
      );
    } catch {
      // ignore pulse synthesis error in non-browser environment
    }

    const audioResult = this.audioEngine.selectAndStartSound(normalizedId, {
      volume: targetVolume,
    });

    if (!audioResult.confirmed || audioResult.playing === false) {
      this.state.sessionState = 'ERROR';
      this.state.state = 'ERROR';
      this.state.timerStatus = wasRunning ? 'running' : 'idle';
      this.state.isAudioPlaying = false;
      this.state.errorMessage = `Unable to activate audio playback for ${visualProfile.name}`;
      this.emit();

      return {
        success: false,
        sessionState: 'ERROR',
        timerStatus: this.state.timerStatus,
        nextTimerStatus: this.state.timerStatus,
        selectedSoundId: this.state.selectedSoundId,
        soundId: this.state.selectedSoundId,
        isAudioPlaying: false,
        timerAutoStarted: false,
        timerPreservedWithoutReset: false,
        nextRemainingSeconds: this.state.remainingSeconds,
        visualProfile,
        errorMessage: this.state.errorMessage,
      };
    }

    // Step 6: Confirm playback and synchronize focus timer activation
    this.state.selectedSoundId = normalizedId;
    this.state.activeSoundId = normalizedId;
    this.state.isAudioPlaying = true;
    this.state.errorMessage = null;

    let timerAutoStarted = false;
    let timerPreservedWithoutReset = false;

    if (wasRunning) {
      // Changing sound during an active session MUST NOT reset the timer
      this.state.sessionState = 'RUNNING';
      this.state.state = 'RUNNING';
      this.state.timerStatus = 'running';
      timerPreservedWithoutReset = true;
    } else if (wasPaused) {
      // Resuming from PAUSED via sound selection preserves remaining time and resumes session
      this.state.sessionState = 'RUNNING';
      this.state.state = 'RUNNING';
      this.state.timerStatus = 'running';
      timerAutoStarted = true;
      timerPreservedWithoutReset = true;
    } else {
      // Initial sound selection from IDLE or COMPLETED starts the focus timer automatically
      const fullSecs = this.state.durationMinutes * 60;
      this.state.totalSeconds = fullSecs;
      this.state.remainingSeconds = fullSecs;
      this.state.sessionState = 'RUNNING';
      this.state.state = 'RUNNING';
      this.state.timerStatus = 'running';
      timerAutoStarted = true;
    }

    this.emit();

    return {
      success: true,
      sessionState: this.state.sessionState,
      timerStatus: this.state.timerStatus,
      nextTimerStatus: this.state.timerStatus,
      selectedSoundId: normalizedId,
      soundId: normalizedId,
      isAudioPlaying: true,
      timerAutoStarted,
      timerPreservedWithoutReset,
      nextRemainingSeconds: this.state.remainingSeconds,
      visualProfile,
      errorMessage: null,
    };
  }

  /**
   * Pause pauses BOTH audio and timer.
   */
  public pauseSession(
    currentRemainingSeconds?: number
  ): AuraSessionControllerSnapshot {
    if (typeof currentRemainingSeconds === 'number') {
      this.state.remainingSeconds = Math.max(0, currentRemainingSeconds);
    }
    this.state.sessionState = 'PAUSED';
    this.state.state = 'PAUSED';
    this.state.timerStatus = 'paused';
    this.state.isAudioPlaying = false;
    this.audioEngine.syncChambers({
      playing: false,
      primaryChamberId: this.state.selectedSoundId,
      ambienceVolume: 0.75,
      muted: false,
    });
    this.emit();
    return this.getSnapshot();
  }

  /**
   * Resume resumes BOTH audio and timer.
   */
  public resumeSession(volume = 0.75): AuraSessionControllerSnapshot {
    this.state.sessionState = 'RUNNING';
    this.state.state = 'RUNNING';
    this.state.timerStatus = 'running';
    this.state.isAudioPlaying = true;
    this.state.errorMessage = null;
    this.audioEngine.selectAndStartSound(this.state.selectedSoundId, {
      volume,
    });
    this.emit();
    return this.getSnapshot();
  }

  /**
   * Completes the current focus session and stops ambient playback cleanly.
   */
  public completeSession(): AuraSessionControllerSnapshot {
    this.state.sessionState = 'COMPLETED';
    this.state.state = 'COMPLETED';
    this.state.timerStatus = 'completed';
    this.state.remainingSeconds = 0;
    this.state.isAudioPlaying = false;
    this.audioEngine.syncChambers({
      playing: false,
      primaryChamberId: this.state.selectedSoundId,
      ambienceVolume: 0.75,
      muted: false,
    });
    this.emit();
    return this.getSnapshot();
  }

  /**
   * Resets the focus session back to IDLE and stops ambient playback cleanly.
   */
  public resetSession(durationMinutes?: number): AuraSessionControllerSnapshot {
    if (typeof durationMinutes === 'number') {
      this.state.durationMinutes = durationMinutes;
    }
    const fullSecs = this.state.durationMinutes * 60;
    this.state.totalSeconds = fullSecs;
    this.state.remainingSeconds = fullSecs;
    this.state.sessionState = 'IDLE';
    this.state.state = 'IDLE';
    this.state.timerStatus = 'idle';
    this.state.isAudioPlaying = false;
    this.state.errorMessage = null;
    this.audioEngine.syncChambers({
      playing: false,
      primaryChamberId: this.state.selectedSoundId,
      ambienceVolume: 0.75,
      muted: false,
    });
    this.emit();
    return this.getSnapshot();
  }

  /**
   * Theme switching preserves both audio and timer state.
   */
  public switchTheme(
    nextOrbDesign: OrbDesignId
  ): AuraSessionControllerSnapshot {
    this.state.orbDesign = nextOrbDesign;
    if (nextOrbDesign === 'original') {
      this.state.resonanceVisible = false;
    } else {
      this.state.resonanceVisible = true;
    }
    this.emit();
    return this.getSnapshot();
  }

  /**
   * Atmosphere switching preserves both audio and timer state.
   */
  public switchAtmosphere(
    nextSceneId: FocusSceneId
  ): AuraSessionControllerSnapshot {
    this.state.sceneId = nextSceneId;
    this.emit();
    return this.getSnapshot();
  }
}

export const auraSessionController = new AuraSessionController(auraAudioEngine);

