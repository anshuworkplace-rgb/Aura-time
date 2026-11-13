import { PerformanceMode, PerformanceProfileTier } from '../types/aura';

export interface DeviceCapabilitySnapshot {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemoryGb: number;
  coarsePointer: boolean;
  maxTouchPoints: number;
  isSoftwareGl: boolean;
  saveData: boolean;
  isMobileDevice: boolean;
  isPowerfulMobile: boolean;
}

export interface MobilePerformanceProfile {
  profileId: PerformanceProfileTier;
  label: 'Ultra' | 'Balanced';
  shortTag: string;
  description: string;
  /** Effective DPR cap applied to WebGLRenderer and 2D Canvas */
  pixelRatioCap: number;
  /** Internal resolution multiplier (0.82 .. 1.0) for adaptive fill-rate control */
  internalResolutionScale: number;
  /** Target frame rate (60 for Ultra, 42 for Balanced mobile 30-45 FPS sweet spot) */
  targetFps: number;
  /** Minimum interval in ms between frames (0 = uncapped rAF, ~22ms = ~45 FPS ceiling on mobile) */
  minFrameIntervalMs: number;
  /** Volumetric ray-marching slice count for Engine A Primary Aurora (compensated in shader so luminance is identical) */
  primaryAuroraSteps: number;
  /** Volumetric ray-marching slice count for Engine B Secondary Aurora (compensated in shader so luminance is identical) */
  secondaryAuroraSteps: number;
  /** Engine C Ping-Pong Navier-Stokes FBO grid resolution */
  fluidGridSize: number;
  /** Frame cadence for stepping the Navier-Stokes FBO (1 = every frame, 2 = alternating frames) */
  fluidStepCadence: number;
  /** Whether multi-pass ping-pong FBO fluid solver is active */
  enableMultiPassFluidFbo: boolean;
  /** Active draw fraction (0..1) of the 2,400 3D atmospheric background particles */
  particleDrawFraction: number;
  /** Active count of 3D atmospheric background particles */
  backgroundParticleCount: number;
  /** Point size multiplier to preserve identical visual density when particleDrawFraction < 1 */
  pointSizeCompensation: number;
  /** Active draw fraction (0..1) of 3D Celestial Jelly pelagic plankton particles */
  planktonDrawFraction: number;
  /** Active draw fraction (0..1) of 3D Celestial Jelly bioluminescent nodes */
  jellyBiolumeNodeFraction: number;
  /** Active draw fraction (0..1) of 3D Living Bloom golden pollen particles */
  pollenDrawFraction: number;
  /** Active count of 2D LivingLens caustic particles */
  lens2DParticleCount: number;
  /** Minimum ms between 2D LivingLens canvas redraws when a 3D organism is active in idle state */
  idle2DOverlayIntervalMs: number;
}

export const TOTAL_BACKGROUND_PARTICLES = 2400;
export const TOTAL_JELLY_PLANKTON_PARTICLES = 150;
export const TOTAL_JELLY_BIOLUME_NODES = 248;
export const TOTAL_BLOOM_POLLEN_PARTICLES = 180;
export const TOTAL_LENS_2D_PARTICLES = 38;

/**
 * Detects smartphone/desktop hardware capabilities safely in both browser and
 * Node test environments without throwing on missing globals.
 */
export function detectDeviceCapabilities(overrides?: {
  viewportWidth?: number;
  viewportHeight?: number;
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
  coarsePointer?: boolean;
  maxTouchPoints?: number;
  isSoftwareGl?: boolean;
  saveData?: boolean;
}): DeviceCapabilitySnapshot {
  const hasWindow = typeof window !== 'undefined';
  const hasNavigator = typeof navigator !== 'undefined';

  const viewportWidth =
    overrides?.viewportWidth ?? (hasWindow ? window.innerWidth || 1024 : 1024);
  const viewportHeight =
    overrides?.viewportHeight ?? (hasWindow ? window.innerHeight || 768 : 768);
  const devicePixelRatio =
    overrides?.devicePixelRatio ??
    (hasWindow ? Math.min(window.devicePixelRatio || 1, 3) : 1);

  const hardwareConcurrency =
    overrides?.hardwareConcurrency ??
    (hasNavigator && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 4);

  const navWithMemory = hasNavigator
    ? (navigator as unknown as {
        deviceMemory?: number;
        connection?: { saveData?: boolean };
      })
    : undefined;

  const deviceMemoryGb =
    overrides?.deviceMemoryGb ??
    (typeof navWithMemory?.deviceMemory === 'number'
      ? navWithMemory.deviceMemory
      : 4);

  const saveData =
    overrides?.saveData ?? Boolean(navWithMemory?.connection?.saveData);

  const maxTouchPoints =
    overrides?.maxTouchPoints ??
    (hasNavigator && typeof navigator.maxTouchPoints === 'number'
      ? navigator.maxTouchPoints
      : 0);

  let coarsePointer = overrides?.coarsePointer ?? false;
  if (
    overrides?.coarsePointer === undefined &&
    hasWindow &&
    typeof window.matchMedia === 'function'
  ) {
    try {
      coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    } catch {
      coarsePointer = false;
    }
  }

  const isSoftwareGl = Boolean(overrides?.isSoftwareGl);
  const minDim = Math.min(viewportWidth, viewportHeight);
  const isCompactViewport = minDim < 768 || viewportWidth < 820;
  const isMobileDevice =
    isCompactViewport || (coarsePointer && maxTouchPoints > 0 && minDim < 1024);

  // Flagship phones (e.g. Apple A16+/M-series or Snapdragon 8 Gen 2+ with >=8 cores & >=8GB RAM)
  const isPowerfulMobile =
    isMobileDevice &&
    hardwareConcurrency >= 8 &&
    deviceMemoryGb >= 8 &&
    !saveData &&
    !isSoftwareGl;

  return {
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    hardwareConcurrency,
    deviceMemoryGb,
    coarsePointer,
    maxTouchPoints,
    isSoftwareGl,
    saveData,
    isMobileDevice,
    isPowerfulMobile,
  };
}

/**
 * Builds the concrete rendering parameters for either the 'ultra' or 'balanced'
 * profile, honoring software-WebGL safety when running in headless Chromium.
 */
export function buildPerformanceProfile(
  tier: PerformanceProfileTier,
  capabilities: DeviceCapabilitySnapshot
): MobilePerformanceProfile {
  const { isSoftwareGl, isMobileDevice, devicePixelRatio } = capabilities;

  if (tier === 'ultra') {
    const dprCap = isSoftwareGl ? 0.55 : isMobileDevice ? 1.75 : 2.0;
    const effectiveDpr = Math.min(devicePixelRatio, dprCap);
    return {
      profileId: 'ultra',
      label: 'Ultra',
      shortTag: 'Max Fidelity · 60 FPS',
      description:
        'For powerful phones & desktops. Maximum visual fidelity, higher particle density, and full rendering resolution.',
      pixelRatioCap: Number(effectiveDpr.toFixed(2)),
      internalResolutionScale: isSoftwareGl ? 0.55 : 1.0,
      targetFps: 60,
      minFrameIntervalMs: 0,
      primaryAuroraSteps: isSoftwareGl ? 4 : 8,
      secondaryAuroraSteps: isSoftwareGl ? 3 : 6,
      fluidGridSize: isSoftwareGl ? 64 : 128,
      fluidStepCadence: 1,
      enableMultiPassFluidFbo: !isSoftwareGl,
      particleDrawFraction: isSoftwareGl ? 0.6 : 1.0,
      backgroundParticleCount: Math.round(
        TOTAL_BACKGROUND_PARTICLES * (isSoftwareGl ? 0.6 : 1.0)
      ),
      pointSizeCompensation: isSoftwareGl ? 1.18 : 1.0,
      planktonDrawFraction: 1.0,
      jellyBiolumeNodeFraction: 1.0,
      pollenDrawFraction: 1.0,
      lens2DParticleCount: TOTAL_LENS_2D_PARTICLES,
      idle2DOverlayIntervalMs: 24,
    };
  }

  // 'balanced' — Default smartphone profile:
  // Preserves 100% of visual appearance, scenes, organisms, shaders, and particles
  // while optimizing pixel fill rate, ray-marching slices (with brightness compensation),
  // particle draw count (with point-size compensation), and 30–45 FPS frame pacing.
  const dprCap = isSoftwareGl ? 0.55 : isMobileDevice ? 1.25 : 1.5;
  const effectiveDpr = Math.min(devicePixelRatio, dprCap);
  const particleDrawFraction = 0.65;

  return {
    profileId: 'balanced',
    label: 'Balanced',
    shortTag: 'Smart Mobile · 30–45 FPS',
    description:
      'Default smartphone profile. Preserves full visual appearance while optimizing resolution, particle workload, and animation scheduling for stable 30–45 FPS.',
    pixelRatioCap: Number(effectiveDpr.toFixed(2)),
    internalResolutionScale: isSoftwareGl ? 0.55 : 0.92,
    targetFps: 42,
    minFrameIntervalMs: isSoftwareGl ? 0 : 22, // ~45 FPS ceiling on mobile hardware
    primaryAuroraSteps: isSoftwareGl ? 4 : 5,
    secondaryAuroraSteps: isSoftwareGl ? 3 : 4,
    fluidGridSize: isSoftwareGl ? 64 : 96,
    fluidStepCadence: 2,
    enableMultiPassFluidFbo: !isSoftwareGl,
    particleDrawFraction,
    backgroundParticleCount: Math.round(
      TOTAL_BACKGROUND_PARTICLES * particleDrawFraction
    ),
    pointSizeCompensation: 1.14,
    planktonDrawFraction: 0.72,
    jellyBiolumeNodeFraction: 0.85,
    pollenDrawFraction: 0.72,
    lens2DParticleCount: 24,
    idle2DOverlayIntervalMs: 42,
  };
}

/**
 * Resolves the active MobilePerformanceProfile based on user preference ('auto' | 'balanced' | 'ultra'),
 * device capabilities, reduced motion setting, and live rolling FPS telemetry.
 */
export function resolveMobilePerformanceProfile(options: {
  performanceMode?: PerformanceMode;
  capabilities: DeviceCapabilitySnapshot;
  reducedMotion?: boolean;
  rollingFps?: number;
}): MobilePerformanceProfile {
  const {
    performanceMode = 'auto',
    capabilities,
    reducedMotion = false,
    rollingFps = 60,
  } = options;

  // Explicit user selection overrides automatic tier selection
  if (performanceMode === 'ultra') {
    return buildPerformanceProfile('ultra', capabilities);
  }
  if (performanceMode === 'balanced') {
    return buildPerformanceProfile('balanced', capabilities);
  }

  // Automatic ('auto') intelligent detection:
  // 1. If reducedMotion or data-saver is active, or hardware GPU rolling FPS drops below 34, use 'balanced'
  const hasHardwareFpsDrop = !capabilities.isSoftwareGl && rollingFps < 34;
  if (reducedMotion || capabilities.saveData || hasHardwareFpsDrop) {
    return buildPerformanceProfile('balanced', capabilities);
  }

  // 2. On smartphones: 'balanced' is the default smartphone profile, unless it is a
  //    detected flagship phone running smoothly above 54 FPS.
  if (capabilities.isMobileDevice) {
    if (capabilities.isPowerfulMobile && rollingFps >= 54) {
      return buildPerformanceProfile('ultra', capabilities);
    }
    return buildPerformanceProfile('balanced', capabilities);
  }

  // 3. On desktop/tablet with strong frame rate (>= 45 FPS or software-paced desktop), use 'ultra'; otherwise 'balanced'
  if (capabilities.isSoftwareGl || rollingFps >= 45) {
    return buildPerformanceProfile('ultra', capabilities);
  }

  return buildPerformanceProfile('balanced', capabilities);
}

/**
 * Stateful frame-rate governor for the 3D/2D render loop with hysteresis so
 * quality transitions never oscillate rapidly.
 */
export class AdaptivePerformanceGovernor {
  private rollingFps = 60;
  private lowFpsAccumulatedSeconds = 0;
  private highFpsAccumulatedSeconds = 0;
  private dynamicResolutionMultiplier = 1.0;
  private forcedFallbackBalanced = false;
  private frameCounter = 0;

  public recordFrame(dtSeconds: number): {
    rollingFps: number;
    frameIndex: number;
    dynamicResolutionMultiplier: number;
    shouldStepFluid: (cadence: number) => boolean;
  } {
    this.frameCounter = (this.frameCounter + 1) % 1000000;
    const clampedDt = Math.max(0.004, Math.min(0.25, dtSeconds));
    const instantFps = 1.0 / clampedDt;
    this.rollingFps =
      this.rollingFps * 0.92 + Math.min(120, instantFps) * 0.08;

    if (this.rollingFps < 28) {
      this.lowFpsAccumulatedSeconds += clampedDt;
      this.highFpsAccumulatedSeconds = 0;
      if (this.lowFpsAccumulatedSeconds > 1.6) {
        this.forcedFallbackBalanced = true;
        this.dynamicResolutionMultiplier = Math.max(
          0.82,
          this.dynamicResolutionMultiplier - 0.04
        );
        this.lowFpsAccumulatedSeconds = 0;
      }
    } else if (this.rollingFps > 42) {
      this.highFpsAccumulatedSeconds += clampedDt;
      this.lowFpsAccumulatedSeconds = Math.max(
        0,
        this.lowFpsAccumulatedSeconds - clampedDt * 0.5
      );
      if (this.highFpsAccumulatedSeconds > 2.4) {
        this.dynamicResolutionMultiplier = Math.min(
          1.0,
          this.dynamicResolutionMultiplier + 0.04
        );
        if (this.rollingFps > 52) {
          this.forcedFallbackBalanced = false;
        }
        this.highFpsAccumulatedSeconds = 0;
      }
    }

    const currentFrame = this.frameCounter;
    return {
      rollingFps: this.rollingFps,
      frameIndex: currentFrame,
      dynamicResolutionMultiplier: this.dynamicResolutionMultiplier,
      shouldStepFluid: (cadence: number) =>
        cadence <= 1 || currentFrame % cadence === 0,
    };
  }

  public getEffectiveRollingFps(): number {
    return this.forcedFallbackBalanced
      ? Math.min(this.rollingFps, 30)
      : this.rollingFps;
  }
}
