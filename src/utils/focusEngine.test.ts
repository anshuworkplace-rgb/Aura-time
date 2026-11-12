import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRemainingTime,
  formatTodaySignal,
  radialFractionToMinutes,
  minutesToRadialFraction,
  calculateProgress,
  isNearCompletion,
  extendTimer,
  calculateDailyTotal,
  calculateStreak,
  calculateWeeklyRhythm,
  calculateTimeOfDayRhythm,
  calculateFavorites,
  FOCUS_SCENES,
  CHAMBERS,
} from './focusEngine';
import { SessionRecord } from '../types/aura';

test('formatRemainingTime and formatTodaySignal format durations cleanly', () => {
  assert.equal(formatRemainingTime(0), '00:00');
  assert.equal(formatRemainingTime(2700), '45:00');
  assert.equal(formatRemainingTime(5400), '1:30:00');

  assert.equal(formatTodaySignal(140), '2h 20m today');
  assert.equal(formatTodaySignal(45), '45m today');
  assert.equal(formatTodaySignal(120), '2h today');
});

test('radialFractionToMinutes snaps magnetically to 25, 45, 60, and 90', () => {
  assert.equal(radialFractionToMinutes(0), 15);
  assert.equal(radialFractionToMinutes(1), 120);

  // Near 25 min: (25 - 15) / 105 = 0.0952
  assert.equal(radialFractionToMinutes(0.11), 25);
  // Near 45 min: (45 - 15) / 105 = 0.2857
  assert.equal(radialFractionToMinutes(0.28), 45);
  // Near 60 min: (60 - 15) / 105 = 0.4285
  assert.equal(radialFractionToMinutes(0.42), 60);
  // Near 90 min: (90 - 15) / 105 = 0.714
  assert.equal(radialFractionToMinutes(0.71), 90);

  const frac45 = minutesToRadialFraction(45);
  assert.equal(radialFractionToMinutes(frac45), 45);
});

test('calculateProgress, isNearCompletion, and extendTimer work accurately', () => {
  assert.equal(calculateProgress(2700, 2700), 0);
  assert.equal(calculateProgress(1350, 2700), 0.5);
  assert.equal(calculateProgress(0, 2700), 1);

  assert.equal(isNearCompletion(600, 2700), false);
  assert.equal(isNearCompletion(120, 2700), true);

  const ext = extendTimer(300, 2700, 5);
  assert.equal(ext.remainingSeconds, 600);
  assert.equal(ext.totalSeconds, 3000);
});

test('Visual Journal analytics compute streaks, time-of-day, and favorites', () => {
  const records: SessionRecord[] = [
    {
      id: '1',
      label: 'Deep work',
      durationMinutes: 90,
      completedAt: '2026-11-10T10:00:00Z',
      isoDate: '2026-11-10',
      hourOfDay: 10,
      sceneId: 'deep-current',
      chamberId: 'rain-chamber',
    },
    {
      id: '2',
      label: 'Shader design',
      durationMinutes: 60,
      completedAt: '2026-11-11T22:00:00Z',
      isoDate: '2026-11-11',
      hourOfDay: 22,
      sceneId: 'deep-current',
      chamberId: 'rain-chamber',
    },
  ];

  assert.equal(calculateDailyTotal(records, '2026-11-11'), 60);
  const streak = calculateStreak(records, '2026-11-11');
  assert.equal(streak.currentStreak, 2);

  const weekly = calculateWeeklyRhythm(records, '2026-11-11');
  assert.equal(weekly.length, 7);
  assert.equal(weekly[6].minutes, 60);

  const tod = calculateTimeOfDayRhythm(records);
  assert.equal(tod[0].minutes, 90); // Morning
  assert.equal(tod[3].minutes, 60); // Night

  const favs = calculateFavorites(records);
  assert.equal(favs.favoriteScene.scene.id, 'deep-current');
  assert.equal(favs.favoriteChamber.chamber.id, 'rain-chamber');
});

test('all 5 Focus Scenes and 9 Sound Chambers are defined', () => {
  assert.equal(Object.keys(FOCUS_SCENES).length, 5);
  assert.equal(CHAMBERS.length, 9);
});

test('Quantum Nebula fluid dynamics & spectrum helpers compute valid shader parameters', async () => {
  const {
    interpolateNebulaSpectrum,
    computeFluidTurbulenceGain,
    orbDesignToShaderMode,
    QUANTUM_NEBULA_WGSL,
  } = await import('./quantumNebulaShaders');

  const spec = interpolateNebulaSpectrum(FOCUS_SCENES['deep-current']);
  assert.equal(spec.violet.length, 3);
  assert.equal(spec.cyan.length, 3);
  assert.equal(spec.magenta.length, 3);

  assert.equal(orbDesignToShaderMode('original'), 0);
  assert.equal(orbDesignToShaderMode('celestial-jelly'), 1);
  assert.equal(orbDesignToShaderMode('living-bloom'), 2);

  const idleGain = computeFluidTurbulenceGain('idle', 0, 0, false);
  const runGain = computeFluidTurbulenceGain('running', 0.5, 0.4, false);
  assert.equal(runGain.flowSpeed > idleGain.flowSpeed, true);
  assert.equal(runGain.centralSanctuaryAlpha > 0.7, true);
  assert.equal(QUANTUM_NEBULA_WGSL.includes('evaluateQuantumNebula'), true);
});

test('multi-duration extensions (+1m, +5m, +10m) and acoustic presets work', async () => {
  const { CHAMBER_PRESETS, soundEngine } = await import('./soundSynthesizer');

  const ext1 = extendTimer(1200, 1500, 1);
  assert.equal(ext1.remainingSeconds, 1260);
  assert.equal(ext1.totalSeconds, 1560);

  const ext10 = extendTimer(1200, 1500, 10);
  assert.equal(ext10.remainingSeconds, 1800);
  assert.equal(ext10.totalSeconds, 2100);

  assert.equal(CHAMBER_PRESETS.length >= 4, true);
  const bands = soundEngine.getAudioBands();
  assert.equal(typeof bands.bass, 'number');
  assert.equal(typeof bands.treble, 'number');
  const spec = soundEngine.getFrequencySpectrum(8);
  assert.equal(spec.length, 8);

  const { computeBackgroundMixWeights, BACKGROUND_MIX_PRESETS } = await import(
    './quantumNebulaShaders'
  );
  assert.equal(BACKGROUND_MIX_PRESETS.length, 3);
  const fluidMix = computeBackgroundMixWeights(0.18);
  const nebulaMix = computeBackgroundMixWeights(0.85);
  assert.equal(fluidMix.fluidWeight > nebulaMix.fluidWeight, true);
  assert.equal(nebulaMix.nebulaWeight > fluidMix.nebulaWeight, true);
  assert.equal(nebulaMix.particleGain > fluidMix.particleGain, true);
  assert.equal(fluidMix.fluidPercentage + fluidMix.nebulaPercentage, 100);
});

test('strictly 3 ORB designs (Original, Celestial Jelly, Living Bloom) and organic simulation engines work across all 5 colour themes', async () => {
  const {
    ORB_DESIGNS,
    computeThemeOrganismPalette,
    computeJellyBellContraction,
    createJellyTentacles,
    stepJellyTentacles,
    computeBloomCycleState,
    computeBloomGrowthStage,
    generateBloomPetals,
  } = await import('./organicOrbEngine');

  // Strictly 3 ORB designs and 5 colour themes
  assert.equal(ORB_DESIGNS.length, 3);
  assert.deepEqual(
    ORB_DESIGNS.map((d) => d.id),
    ['original', 'celestial-jelly', 'living-bloom']
  );
  assert.equal(Object.keys(FOCUS_SCENES).length, 5);

  // Every colour theme produces valid RGB palettes
  for (const scene of Object.values(FOCUS_SCENES)) {
    const pal = computeThemeOrganismPalette(scene, 'focus');
    assert.equal(pal.primaryRgb.length, 3);
    assert.equal(pal.secondaryRgb.length, 3);
  }

  // Celestial Jelly bell propulsion & 18 spring-spline tentacles
  const bell = computeJellyBellContraction(1.2);
  assert.equal(bell.contraction >= 0 && bell.contraction <= 1, true);
  const tentacles = createJellyTentacles(310, 304);
  assert.equal(tentacles.length, 18);
  stepJellyTentacles(tentacles, 310, 304, 175, bell, 1.5, 0.016, 260, 290, 0.8);
  assert.equal(Number.isFinite(tentacles[0].nodes[5].x), true);

  // Living Bloom 7-stage biological cycle & session-driven cosmetic growth
  const bloomIdle = computeBloomCycleState(2.4, 'idle', 0);
  const bloomComplete = computeBloomCycleState(2.4, 'completed', 1);
  assert.equal(bloomComplete.outerOpenness >= bloomIdle.outerOpenness, true);

  const stage1 = computeBloomGrowthStage(1);
  const stage4 = computeBloomGrowthStage(14);
  assert.equal(stage4.stageLevel > stage1.stageLevel, true);
  const petals = generateBloomPetals(stage4);
  assert.equal(petals.length > 30, true);
});

test('Infinity Aurora Engine A, Engine B, Engine C palettes, WGSL shaders, and timer-aware states work across all 5 Focus Scenes', async () => {
  const {
    computeSceneAuroraPalette,
    computeTimerAwareAtmosphereState,
    computeAdaptiveQualityTier,
    INFINITY_AURORA_WGSL_SOURCE,
  } = await import('./infinityAuroraEngine');
  const { NEBULA_FLUID_FRAGMENT_SHADER } = await import('./quantumNebulaShaders');

  // 1. All 5 Focus Scenes produce distinct Engine A, Engine B, and Engine C spectra
  for (const scene of Object.values(FOCUS_SCENES)) {
    const pal = computeSceneAuroraPalette(scene, 'focus');
    assert.equal(pal.engineAPrimary.length, 3);
    assert.equal(pal.engineBPrimary.length, 3);
    assert.equal(pal.engineCCyanCurrent.length, 3);
    assert.equal(pal.turbulenceScale > 0, true);
  }

  // Electric Quiet has reduced turbulence compared to Chromatic Flow
  const electricPal = computeSceneAuroraPalette(FOCUS_SCENES['electric-quiet'], 'focus');
  const chromaticPal = computeSceneAuroraPalette(FOCUS_SCENES['chromatic-flow'], 'focus');
  assert.equal(electricPal.turbulenceScale < chromaticPal.turbulenceScale, true);

  // Break phase softens turbulence and warms palette
  const breakPal = computeSceneAuroraPalette(FOCUS_SCENES['deep-current'], 'break');
  const focusPal = computeSceneAuroraPalette(FOCUS_SCENES['deep-current'], 'focus');
  assert.equal(breakPal.turbulenceScale < focusPal.turbulenceScale, true);

  // 2. Timer-aware visual state machine: Engine A and Engine B never move in synchronization
  const idleState = computeTimerAwareAtmosphereState({
    status: 'idle',
    phase: 'focus',
    remainingSeconds: 2700,
    totalSeconds: 2700,
    progress: 0,
    audioAmplitude: 0,
    reducedMotion: false,
    secondsSinceStart: 999,
    secondsSinceCompletion: 999,
  });
  assert.notEqual(idleState.engineATimeScale, idleState.engineBTimeScale);

  // Session start convergence pulse triggers right after Begin
  const beginState = computeTimerAwareAtmosphereState({
    status: 'running',
    phase: 'focus',
    remainingSeconds: 2699,
    totalSeconds: 2700,
    progress: 0.001,
    audioAmplitude: 0,
    reducedMotion: false,
    secondsSinceStart: 1.0,
    secondsSinceCompletion: 999,
  });
  assert.equal(beginState.convergencePulse > 0.2, true);

  // Final 5 minutes (<= 300s) triggers subtle atmospheric energy increase
  const finalFiveState = computeTimerAwareAtmosphereState({
    status: 'running',
    phase: 'focus',
    remainingSeconds: 120,
    totalSeconds: 2700,
    progress: 0.95,
    audioAmplitude: 0,
    reducedMotion: false,
    secondsSinceStart: 2580,
    secondsSinceCompletion: 999,
  });
  assert.equal(finalFiveState.finalFiveMinBoost > 0, true);
  assert.equal(finalFiveState.auroraLuminousIntensity > idleState.auroraLuminousIntensity, true);

  // Completion triggers energy-release transition
  const completedState = computeTimerAwareAtmosphereState({
    status: 'completed',
    phase: 'focus',
    remainingSeconds: 0,
    totalSeconds: 2700,
    progress: 1,
    audioAmplitude: 0,
    reducedMotion: false,
    secondsSinceStart: 2700,
    secondsSinceCompletion: 0.8,
  });
  assert.equal(completedState.completionRelease > 0.4, true);

  // 3. Adaptive quality tier scales appropriately
  const swTier = computeAdaptiveQualityTier(60, true, false);
  const ultraTier = computeAdaptiveQualityTier(60, false, false);
  assert.equal(swTier.tier, 'software-safe');
  assert.equal(swTier.enableMultiPassFluidFbo, false);
  assert.equal(ultraTier.tier, 'ultra');
  assert.equal(ultraTier.enableMultiPassFluidFbo, true);

  // 4. Shaders include Engine A, Engine B, and Engine C implementations
  assert.equal(INFINITY_AURORA_WGSL_SOURCE.includes('samplePrimaryAuroraDensity'), true);
  assert.equal(INFINITY_AURORA_WGSL_SOURCE.includes('sampleSecondaryAuroraDensity'), true);
  assert.equal(INFINITY_AURORA_WGSL_SOURCE.includes('computeFluidStep'), true);
  assert.equal(NEBULA_FLUID_FRAGMENT_SHADER.includes('renderEngineAPrimaryAurora'), true);
  assert.equal(NEBULA_FLUID_FRAGMENT_SHADER.includes('renderEngineBSecondaryAurora'), true);
});

test('Phase 1: 3D Celestial Jelly geometry, 16-lobe bell, 8 ruffled oral arms, 16 marginal filaments, 8 pinnate fronds, bioluminescent nodes, and 3D physics work accurately', async () => {
  const {
    JELLY_RADIAL_LOBES,
    JELLY_ORAL_ARM_COUNT,
    JELLY_MARGINAL_FILAMENT_COUNT,
    JELLY_PINNATE_FROND_COUNT,
    JELLY_TOTAL_TENTACLE_CHAINS,
    buildCelestialJellyBellGeometry,
    buildInnerManubriumCoreGeometry,
    buildPelagicPlanktonGeometry,
    computeCelestialJellyColorRig,
    createCelestialJelly3DRig,
    stepCelestialJelly3DPhysics,
    CELESTIAL_JELLY_BELL_FRAGMENT_SHADER,
    CELESTIAL_JELLY_ORAL_ARM_FRAGMENT_SHADER,
  } = await import('./celestialJelly3D');
  const { computeJellyBellContraction } = await import('./organicOrbEngine');

  // 1. Anatomical counts match specification
  assert.equal(JELLY_RADIAL_LOBES, 16);
  assert.equal(JELLY_ORAL_ARM_COUNT, 8);
  assert.equal(JELLY_MARGINAL_FILAMENT_COUNT, 16);
  assert.equal(JELLY_PINNATE_FROND_COUNT, 8);
  assert.equal(JELLY_TOTAL_TENTACLE_CHAINS, 24);

  // 2. 16-lobe bell & inner manubrium geometries
  const bellGeo = buildCelestialJellyBellGeometry(48, 28);
  assert.equal(bellGeo.getAttribute('position').count > 1000, true);
  assert.equal(bellGeo.getAttribute('aBellParams').itemSize, 4);

  const manubriumGeo = buildInnerManubriumCoreGeometry(32, 16);
  assert.equal(manubriumGeo.getAttribute('position').count > 400, true);

  // 3. 3D Physics Rig: 8 oral arms, 16 marginal filaments, 8 pinnate fronds, 248 biolume nodes
  const rig = createCelestialJelly3DRig();
  assert.equal(rig.oralArms.length, 8);
  assert.equal(
    rig.tentacles.filter((t) => t.kind === 'marginal-filament').length,
    16
  );
  assert.equal(
    rig.tentacles.filter((t) => t.kind === 'pinnate-frond').length,
    8
  );
  assert.equal(rig.biolumeNodeCount, 248);

  // Step 3D physics and verify finite 3D coordinates and dynamic buffer updates
  const bellPulse = computeJellyBellContraction(2.1);
  stepCelestialJelly3DPhysics(rig, bellPulse, 2.1, 0.016, 0.15, -0.25, 0.85);
  assert.equal(Number.isFinite(rig.oralArms[0].nodes[10].x), true);
  assert.equal(Number.isFinite(rig.oralArms[0].nodes[10].y), true);
  assert.equal(Number.isFinite(rig.oralArms[0].nodes[10].z), true);
  assert.equal(Number.isFinite(rig.tentacles[20].nodes[12].z), true);
  assert.equal(Number.isFinite(rig.oralArmsPositions[15]), true);
  assert.equal(Number.isFinite(rig.pinnateFrondsPositions[15]), true);
  assert.equal(Number.isFinite(rig.biolumeNodesPositions[15]), true);

  // 4. Plankton geometry & neural-vein + crystalline shaders
  const planktonGeo = buildPelagicPlanktonGeometry(100);
  assert.equal(planktonGeo.getAttribute('position').count, 100);
  assert.equal(
    CELESTIAL_JELLY_BELL_FRAGMENT_SHADER.includes('neuralVeinAndCrystalField'),
    true
  );
  assert.equal(
    CELESTIAL_JELLY_ORAL_ARM_FRAGMENT_SHADER.includes('uColorCrownPink'),
    true
  );

  // 5. Permanent intrinsic color identity across all 5 Focus Scenes (Stage G)
  const deepCurrentRig = computeCelestialJellyColorRig(
    FOCUS_SCENES['deep-current'],
    'focus'
  );
  for (const scene of Object.values(FOCUS_SCENES)) {
    const colorRig = computeCelestialJellyColorRig(scene, 'focus');
    assert.equal(colorRig.domeCyan.length, 3);
    assert.equal(colorRig.domeBlue.length, 3);
    assert.equal(colorRig.coronaRose.length, 3);
    assert.equal(colorRig.oralArmPearl.length, 3);
    assert.equal(colorRig.subumbrellaPeach.length, 3);
    assert.equal(colorRig.biolumeGold.length, 3);

    // Ensure organism retains >= 96.5% locked intrinsic coral-pink crown and blue-violet bell across all 5 atmospheres
    const crownDiff = Math.abs(
      colorRig.oralArmCrownPink[0] - deepCurrentRig.oralArmCrownPink[0]
    );
    const blueDiff = Math.abs(colorRig.domeBlue[2] - deepCurrentRig.domeBlue[2]);
    assert.equal(crownDiff < 0.04, true);
    assert.equal(blueDiff < 0.04, true);
  }

  // 6. Phase 3: Verify distinct 3D spatial separation and staggered lengths across all 8 oral arms
  const uniqueSegmentLengths = new Set(
    rig.oralArms.map((a) => a.segmentLength.toFixed(4))
  );
  assert.equal(uniqueSegmentLengths.size >= 6, true);
  const tipXPositions = rig.oralArms.map(
    (a) => a.nodes[a.nodes.length - 1].x
  );
  const minTipX = Math.min(...tipXPositions);
  const maxTipX = Math.max(...tipXPositions);
  assert.equal(maxTipX - minTipX > 0.25, true);
});
