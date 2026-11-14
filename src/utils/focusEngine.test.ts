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
import {
  RESONANCE_SOUND_PRESETS,
  buildEqualPowerCrossfadeCurves,
  computeBloomResonanceBurstState,
  computeDropletMergeState,
  computeEqualPowerCrossfadeGains,
  computeJellyResonancePulseState,
  computeResonanceNodesLayout,
  getResonancePresetByChamberId,
} from './auraResonance';
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

test('all 5 Focus Scenes and 6 Curated Smart Soundscapes are defined with backward-compatible normalizer', async () => {
  const { normalizeChamberId } = await import('./focusEngine');

  assert.equal(Object.keys(FOCUS_SCENES).length, 5);
  assert.equal(CHAMBERS.length, 6);

  assert.deepEqual(
    CHAMBERS.map((c) => ({
      id: c.id,
      name: c.name,
      shortDescription: c.shortDescription,
    })),
    [
      {
        id: 'rain-chamber',
        name: 'Rain Chamber',
        shortDescription: 'Rain ambience',
      },
      {
        id: 'ocean-drift',
        name: 'Ocean Drift',
        shortDescription: 'Ocean waves',
      },
      {
        id: 'forest-echo',
        name: 'Forest Echo',
        shortDescription: 'Forest ambience',
      },
      {
        id: 'cosmic-silence',
        name: 'Cosmic Silence',
        shortDescription: 'Space-inspired ambience',
      },
      {
        id: 'ember-glow',
        name: 'Ember Glow',
        shortDescription: 'Fireplace ambience',
      },
      {
        id: 'celestial-tone',
        name: 'Celestial Tone',
        shortDescription: 'Soft atmospheric tones',
      },
    ]
  );

  // Verify default soundscape is Ocean Drift and legacy persisted IDs normalize cleanly
  const { DEFAULT_CHAMBER_ID } = await import('./focusEngine');
  assert.equal(DEFAULT_CHAMBER_ID, 'ocean-drift');
  assert.equal(normalizeChamberId(undefined), 'ocean-drift');
  assert.equal(normalizeChamberId('coastal-static'), 'ocean-drift');
  assert.equal(normalizeChamberId('forest-2am'), 'forest-echo');
  assert.equal(normalizeChamberId('low-orbit'), 'cosmic-silence');
  assert.equal(normalizeChamberId('vinyl-library'), 'ember-glow');
  assert.equal(normalizeChamberId('soft-drone'), 'celestial-tone');
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

test('multi-duration extensions (+1m, +5m, +10m), 700ms equal-power crossfades, and 6 soundscape presets work', async () => {
  const {
    SOUNDSCAPE_PRESETS,
    CROSSFADE_DURATION_MS,
    computeEqualPowerCrossfadeCurve,
    soundEngine,
  } = await import('./soundSynthesizer');

  const ext1 = extendTimer(1200, 1500, 1);
  assert.equal(ext1.remainingSeconds, 1260);
  assert.equal(ext1.totalSeconds, 1560);

  const ext10 = extendTimer(1200, 1500, 10);
  assert.equal(ext10.remainingSeconds, 1800);
  assert.equal(ext10.totalSeconds, 2100);

  assert.equal(SOUNDSCAPE_PRESETS.length, 6);
  assert.equal(CROSSFADE_DURATION_MS, 700);

  // Verify equal-power crossfade curves (sin^2 + cos^2 == 1 at midpoint)
  const fadeIn = computeEqualPowerCrossfadeCurve(65, 'in', 1.0, 0.0);
  const fadeOut = computeEqualPowerCrossfadeCurve(65, 'out', 1.0, 1.0);
  const midIdx = 32;
  const powerSum =
    fadeIn[midIdx] * fadeIn[midIdx] + fadeOut[midIdx] * fadeOut[midIdx];
  assert.equal(Math.abs(powerSum - 1.0) < 0.001, true);
  assert.equal(fadeIn[64], 1.0);
  assert.equal(fadeOut[64] < 0.0001, true);

  soundEngine.syncChambers({
    playing: true,
    primaryChamberId: 'ember-glow',
    ambienceVolume: 0.75,
  });
  const state = soundEngine.getSoundscapeState();
  assert.equal(state.activeChamberId, 'ember-glow');
  assert.equal(state.crossfadeDurationMs, 700);

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
  const { DEFAULT_USER_SETTINGS } = await import('./focusEngine');

  // Default organism is Celestial Jelly and Electric Quiet theme exists
  assert.equal(DEFAULT_USER_SETTINGS.orbDesign, 'celestial-jelly');
  assert.equal(FOCUS_SCENES['electric-quiet'].name, 'Electric Quiet');

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

    // Ensure organism retains its intrinsic coral-pink crown and blue-violet bell across all atmospheres
    const crownDiff = Math.abs(
      colorRig.oralArmCrownPink[0] - deepCurrentRig.oralArmCrownPink[0]
    );
    const blueDiff = Math.abs(colorRig.domeBlue[2] - deepCurrentRig.domeBlue[2]);
    assert.equal(crownDiff < 0.1, true);
    assert.equal(blueDiff < 0.1, true);
  }
});

test('Phase 2: 3D Living Bloom 44-petal 4-whorl corolla, branching vascular veins, 28 central carpels, 128 stamens & golden anthers, stem & 7 sepals, pollen particles, and permanent botanical colour identity work accurately', async () => {
  const {
    BLOOM_OUTER_GUARD_PETAL_COUNT,
    BLOOM_LOWER_MID_PETAL_COUNT,
    BLOOM_UPPER_MID_PETAL_COUNT,
    BLOOM_INNER_CROWN_PETAL_COUNT,
    BLOOM_TOTAL_PETAL_COUNT,
    BLOOM_CENTRAL_CARPEL_COUNT,
    BLOOM_STAMEN_FILAMENT_COUNT,
    BLOOM_SEPAL_COUNT,
    BLOOM_POLLEN_PARTICLE_COUNT,
    computeLivingBloomColorRig,
    generateLivingBloomPetalSpecs,
    buildLivingBloomCorollaGeometry,
    buildLivingBloomReproductiveCentreGeometry,
    buildLivingBloomStemAndSepalsGeometry,
    buildLivingBloomPollenGeometry,
    LIVING_BLOOM_PETAL_FRAGMENT_SHADER,
    LIVING_BLOOM_ANTHER_FRAGMENT_SHADER,
  } = await import('./livingBloom3D');

  // 1. Anatomical counts across all 6 procedural systems
  assert.equal(BLOOM_OUTER_GUARD_PETAL_COUNT, 12);
  assert.equal(BLOOM_LOWER_MID_PETAL_COUNT, 12);
  assert.equal(BLOOM_UPPER_MID_PETAL_COUNT, 11);
  assert.equal(BLOOM_INNER_CROWN_PETAL_COUNT, 9);
  assert.equal(BLOOM_TOTAL_PETAL_COUNT, 44);
  assert.equal(BLOOM_CENTRAL_CARPEL_COUNT, 28);
  assert.equal(BLOOM_STAMEN_FILAMENT_COUNT, 128);
  assert.equal(BLOOM_SEPAL_COUNT, 7);
  assert.equal(BLOOM_POLLEN_PARTICLE_COUNT, 180);

  // 2. Individually generated 44 petals across 4 whorls (no two identical)
  const petalSpecs = generateLivingBloomPetalSpecs();
  assert.equal(petalSpecs.length, 44);
  assert.notEqual(petalSpecs[0].baseLength, petalSpecs[1].baseLength);
  assert.notEqual(petalSpecs[0].phaseOffset, petalSpecs[1].phaseOffset);

  const corollaGeo = buildLivingBloomCorollaGeometry(true);
  assert.equal(corollaGeo.getAttribute('position').count > 10000, true);
  assert.equal(corollaGeo.getAttribute('aPetalParams').itemSize, 4);
  assert.equal(corollaGeo.getAttribute('aPetalKinematics').itemSize, 4);

  // 3. Reproductive centre: 28 central curled carpels + 128 filaments + 128 golden bilobed anthers
  const reproGeos = buildLivingBloomReproductiveCentreGeometry(true);
  assert.equal(
    reproGeos.filamentsAndCarpelsGeometry.getAttribute('position').count > 5000,
    true
  );
  assert.equal(
    reproGeos.goldenAnthersGeometry.getAttribute('position').count > 4000,
    true
  );

  // 4. Stem, receptacle & 7 detailed calyx sepals
  const stemSepalsGeo = buildLivingBloomStemAndSepalsGeometry(true);
  assert.equal(stemSepalsGeo.getAttribute('position').count > 1000, true);
  assert.equal(stemSepalsGeo.getAttribute('aCalyxParams').itemSize, 4);

  // 5. Floating golden pollen & luminous dust
  const pollenGeo = buildLivingBloomPollenGeometry(120);
  assert.equal(pollenGeo.getAttribute('position').count, 120);
  assert.equal(pollenGeo.getAttribute('aPollenParams').itemSize, 4);

  // 6. Vascular & subsurface shaders
  assert.equal(
    LIVING_BLOOM_PETAL_FRAGMENT_SHADER.includes('evaluateBotanicalVeinNetwork'),
    true
  );
  assert.equal(
    LIVING_BLOOM_ANTHER_FRAGMENT_SHADER.includes('uColorGoldenPollen'),
    true
  );

  // 7. Permanent visual identity across all 5 Focus Scenes
  const baseRig = computeLivingBloomColorRig(
    FOCUS_SCENES['deep-current'],
    'focus'
  );
  for (const scene of Object.values(FOCUS_SCENES)) {
    const rig = computeLivingBloomColorRig(scene, 'focus');
    assert.equal(rig.pearlPink.length, 3);
    assert.equal(rig.coralRose.length, 3);
    assert.equal(rig.lavender.length, 3);
    assert.equal(rig.translucentWhite.length, 3);
    assert.equal(rig.iridescentViolet.length, 3);
    assert.equal(rig.goldenPollen.length, 3);
    assert.equal(rig.cyanReflection.length, 3);

    // Ensure flower preserves pearl pink, coral rose, and golden pollen across all themes
    const pinkDiff = Math.abs(rig.pearlPink[0] - baseRig.pearlPink[0]);
    const coralDiff = Math.abs(rig.coralRose[0] - baseRig.coralRose[0]);
    const pollenDiff = Math.abs(rig.goldenPollen[0] - baseRig.goldenPollen[0]);
    assert.equal(pinkDiff < 0.08, true);
    assert.equal(coralDiff < 0.08, true);
    assert.equal(pollenDiff < 0.08, true);
  }
});

test('Intelligent Mobile Performance Engine detects smartphone vs desktop capabilities, resolves Ultra and Balanced profiles, and paces frames accurately', async () => {
  const {
    detectDeviceCapabilities,
    buildPerformanceProfile,
    resolveMobilePerformanceProfile,
    AdaptivePerformanceGovernor,
  } = await import('./mobilePerformanceEngine');

  // 1. Smartphone detection (iPhone/Android viewport 390x844)
  const mobileCaps = detectDeviceCapabilities({
    viewportWidth: 390,
    viewportHeight: 844,
    devicePixelRatio: 3,
    coarsePointer: true,
    maxTouchPoints: 5,
    hardwareConcurrency: 6,
    deviceMemoryGb: 4,
    saveData: false,
    isSoftwareGl: false,
  });
  assert.equal(mobileCaps.isMobileDevice, true);
  assert.equal(mobileCaps.isPowerfulMobile, false);

  // Default 'auto' on smartphone selects 'balanced' profile targeting 30-45 FPS
  const autoMobileProfile = resolveMobilePerformanceProfile({
    performanceMode: 'auto',
    capabilities: mobileCaps,
  });
  assert.equal(autoMobileProfile.profileId, 'balanced');
  assert.equal(autoMobileProfile.targetFps >= 30 && autoMobileProfile.targetFps <= 45, true);
  assert.equal(autoMobileProfile.pixelRatioCap, 1.25);
  assert.equal(autoMobileProfile.primaryAuroraSteps, 5);
  assert.equal(autoMobileProfile.secondaryAuroraSteps, 4);
  assert.equal(autoMobileProfile.particleDrawFraction, 0.65);
  assert.equal(autoMobileProfile.pointSizeCompensation > 1.0, true);

  // Explicit 'ultra' on smartphone selects 'ultra' profile
  const forcedUltraMobile = resolveMobilePerformanceProfile({
    performanceMode: 'ultra',
    capabilities: mobileCaps,
  });
  assert.equal(forcedUltraMobile.profileId, 'ultra');
  assert.equal(forcedUltraMobile.primaryAuroraSteps, 8);
  assert.equal(forcedUltraMobile.secondaryAuroraSteps, 6);
  assert.equal(forcedUltraMobile.particleDrawFraction, 1.0);

  // Flagship mobile with >=8 cores, >=8GB RAM, and >=54 rolling FPS upgrades to 'ultra'
  const flagshipMobileCaps = detectDeviceCapabilities({
    viewportWidth: 430,
    viewportHeight: 932,
    devicePixelRatio: 3,
    coarsePointer: true,
    maxTouchPoints: 5,
    hardwareConcurrency: 8,
    deviceMemoryGb: 8,
    saveData: false,
    isSoftwareGl: false,
  });
  assert.equal(flagshipMobileCaps.isPowerfulMobile, true);
  const flagshipPromoted = resolveMobilePerformanceProfile({
    performanceMode: 'auto',
    capabilities: flagshipMobileCaps,
    rollingFps: 58,
  });
  assert.equal(flagshipPromoted.profileId, 'ultra');

  // 2. Desktop detection (1440x900) defaults to 'ultra'
  const desktopCaps = detectDeviceCapabilities({
    viewportWidth: 1440,
    viewportHeight: 900,
    devicePixelRatio: 2,
    coarsePointer: false,
    maxTouchPoints: 0,
    hardwareConcurrency: 8,
    deviceMemoryGb: 16,
    saveData: false,
    isSoftwareGl: false,
  });
  assert.equal(desktopCaps.isMobileDevice, false);
  const autoDesktopProfile = resolveMobilePerformanceProfile({
    performanceMode: 'auto',
    capabilities: desktopCaps,
  });
  assert.equal(autoDesktopProfile.profileId, 'ultra');
  assert.equal(autoDesktopProfile.targetFps, 60);

  // 3. AdaptivePerformanceGovernor tracks FPS and schedules fluid FBO steps
  const governor = new AdaptivePerformanceGovernor();
  const sample1 = governor.recordFrame(0.025); // 40 FPS
  assert.equal(sample1.shouldStepFluid(2), false);
  const sample2 = governor.recordFrame(0.025);
  assert.equal(sample2.shouldStepFluid(2), true);
  assert.equal(sample2.dynamicResolutionMultiplier, 1.0);
  assert.equal(sample2.rollingFps > 35 && sample2.rollingFps <= 60, true);
  assert.equal(buildPerformanceProfile('balanced', mobileCaps).profileId, 'balanced');
});

test('Stage 2: createActualSessionRecord strictly credits actual elapsed time and distinguishes completed vs interrupted sessions', async () => {
  const { createActualSessionRecord } = await import('./focusEngine');

  // 1. Accidental immediate stop (< 15 seconds elapsed) returns null and does not pollute history
  const accidental = createActualSessionRecord({
    label: 'Physics chapter',
    plannedTotalSeconds: 2700,
    remainingSecondsAtEnd: 2692,
    endedEarly: true,
    sceneId: 'electric-quiet',
    chamberId: 'ocean-drift',
    orbDesign: 'celestial-jelly',
  });
  assert.equal(accidental, null);

  // 2. Early stop after 12 minutes of a 45-minute planned session records 12m actual, 45m planned, and 'interrupted' status
  const earlyStop = createActualSessionRecord({
    label: 'Complete my physics chapter',
    plannedTotalSeconds: 45 * 60,
    remainingSecondsAtEnd: 33 * 60,
    endedEarly: true,
    sceneId: 'electric-quiet',
    chamberId: 'ocean-drift',
    orbDesign: 'celestial-jelly',
    nowDate: new Date('2026-11-12T14:30:00Z'),
  });
  assert.notEqual(earlyStop, null);
  assert.equal(earlyStop?.plannedMinutes, 45);
  assert.equal(earlyStop?.actualMinutes, 12);
  assert.equal(earlyStop?.durationMinutes, 12); // Never awards planned time when actual time was lower
  assert.equal(earlyStop?.completionStatus, 'interrupted');

  // 3. Full natural completion of a 25-minute session records 25m actual, 25m planned, and 'completed' status
  const completed = createActualSessionRecord({
    label: 'Build my website',
    plannedTotalSeconds: 25 * 60,
    remainingSecondsAtEnd: 0,
    endedEarly: false,
    sceneId: 'deep-current',
    chamberId: 'rain-chamber',
    orbDesign: 'living-bloom',
    nowDate: new Date('2026-11-12T16:00:00Z'),
  });
  assert.notEqual(completed, null);
  assert.equal(completed?.plannedMinutes, 25);
  assert.equal(completed?.actualMinutes, 25);
  assert.equal(completed?.durationMinutes, 25);
  assert.equal(completed?.completionStatus, 'completed');
});

test('Stage 2: Reflect TodaySummary, WeeklyOverview, PersonalFocusPatterns (including empty state), and My Aura Garden rules work accurately', async () => {
  const {
    calculateTodaySummary,
    calculateWeeklyOverview,
    calculatePersonalFocusPatterns,
    computeAuraGardenState,
    calculateBreathingPhaseAtTime,
    BREATHING_PRESETS,
    QUIET_MOMENT_PRESETS,
    RESTORE_ENVIRONMENTS,
    FOCUS_PRESET_MINUTES,
    CATEGORIZED_SOUND_OPTIONS,
  } = await import('./focusEngine');

  // Verify presets and categories
  assert.deepEqual(FOCUS_PRESET_MINUTES, [15, 25, 45, 50, 60, 90]);
  assert.equal(
    CATEGORIZED_SOUND_OPTIONS.filter((s) => s.category === 'focus').length,
    4
  );
  assert.equal(
    CATEGORIZED_SOUND_OPTIONS.filter((s) => s.category === 'restore').length,
    4
  );
  assert.equal(RESTORE_ENVIRONMENTS.length, 4);
  assert.equal(QUIET_MOMENT_PRESETS.length, 3);
  assert.equal(BREATHING_PRESETS.length, 3); // Strictly three breathing purposes

  // Liquid Lens exposes three distinct, no-forced-hold breathing purposes.
  assert.deepEqual(
    BREATHING_PRESETS.map((preset) => preset.name),
    ['Find Your Balance', 'Release Tension', 'Prepare for Rest']
  );
  assert.deepEqual(
    BREATHING_PRESETS.map((preset) => [
      preset.inhaleSeconds,
      preset.holdInSeconds,
      preset.exhaleSeconds,
      preset.holdOutSeconds,
    ]),
    [
      [5, 0, 5, 0],
      [4, 0, 6, 0],
      [5, 0, 7, 0],
    ]
  );

  // Verify a cadence transitions directly from inhale to exhale without a forced hold.
  const balancePreset = BREATHING_PRESETS[0];
  const inhalePhase = calculateBreathingPhaseAtTime(balancePreset, 2.0);
  assert.equal(inhalePhase.phase, 'inhale');
  assert.equal(inhalePhase.expansion > 0 && inhalePhase.expansion < 1, true);
  const exhalePeak = calculateBreathingPhaseAtTime(balancePreset, 5.0);
  assert.equal(exhalePeak.phase, 'exhale');
  const exhalePhase = calculateBreathingPhaseAtTime(balancePreset, 5.5);
  assert.equal(exhalePhase.phase, 'exhale');
  assert.equal(exhalePhase.expansion < 1, true);

  // Verify empty state for PersonalFocusPatterns and AuraGarden
  const emptyPatterns = calculatePersonalFocusPatterns([]);
  assert.equal(emptyPatterns.hasData, false);
  assert.equal(emptyPatterns.frequentLengths.length, 0);

  const emptyGarden = computeAuraGardenState([], 600, '2026-11-12');
  assert.equal(emptyGarden.totalCompletedSessions, 0);
  assert.equal(emptyGarden.growthStageIndex, 0);
  assert.equal(emptyGarden.floraNodes.length, 0);

  // Verify mixed completed + interrupted sessions
  const sampleSessions: SessionRecord[] = [
    {
      id: 's1',
      label: 'Finish my assignment',
      durationMinutes: 45,
      plannedMinutes: 45,
      actualMinutes: 45,
      completionStatus: 'completed',
      completedAt: '2026-11-12T09:30:00Z',
      isoDate: '2026-11-12',
      hourOfDay: 9,
      sceneId: 'electric-quiet',
      chamberId: 'ocean-drift',
      orbDesign: 'celestial-jelly',
    },
    {
      id: 's2',
      label: 'Read 30 pages',
      durationMinutes: 15,
      plannedMinutes: 45,
      actualMinutes: 15,
      completionStatus: 'interrupted',
      completedAt: '2026-11-12T14:00:00Z',
      isoDate: '2026-11-12',
      hourOfDay: 14,
      sceneId: 'deep-current',
      chamberId: 'rain-chamber',
      orbDesign: 'living-bloom',
    },
  ];

  const todaySum = calculateTodaySummary(sampleSessions, 120, '2026-11-12');
  assert.equal(todaySum.actualMinutes, 60); // 45 + 15 actual minutes
  assert.equal(todaySum.completedCount, 1);
  assert.equal(todaySum.interruptedCount, 1);
  assert.equal(todaySum.goalProgressPercent, 50);
  assert.equal(todaySum.intentions.length, 2);

  const weekly = calculateWeeklyOverview(sampleSessions, 600, '2026-11-12');
  assert.equal(weekly.totalActualMinutes, 60);
  assert.equal(weekly.totalCompletedSessions, 1);
  assert.equal(weekly.weeklyGoalProgressPercent, 10);

  const garden = computeAuraGardenState(sampleSessions, 600, '2026-11-12');
  // Interrupted sessions do not increment totalCompletedSessions or award full completion bloom
  assert.equal(garden.totalCompletedSessions, 1);
  assert.equal(
    garden.floraNodes.filter((n) => n.completed).length,
    1
  );
  assert.equal(
    garden.floraNodes.filter((n) => !n.completed).length,
    1
  );
});

test('Stage 3: Aura Intelligence smart recommendations, 30-day monthly analytics, verified garden achievements, task breakdown, and product health metrics work accurately', async () => {
  const {
    DEFAULT_FOCUS_ROUTINES,
    computeSmartRecommendations,
    calculateMonthlyAnalytics,
    computeAuraGardenAchievements,
    generateLocalTaskBreakdown,
    generateLocalWeeklyReflection,
    computePreferredSoundscapes,
  } = await import('./auraIntelligence');
  const { computeProductMetricsSummary } = await import('./productAnalytics');
  const { DEFAULT_USER_SETTINGS } = await import('./focusEngine');

  // 1. Default personalized routines include 5 curated presets
  assert.equal(DEFAULT_FOCUS_ROUTINES.length, 5);
  assert.equal(DEFAULT_FOCUS_ROUTINES[0].name, 'Morning Clarity');

  // 2. Smart recommendations adapt when long sessions are frequently interrupted
  const historyWithInterruptedLong: SessionRecord[] = [
    {
      id: 'int-1',
      label: 'Study calculus',
      durationMinutes: 20,
      plannedMinutes: 60,
      actualMinutes: 20,
      completionStatus: 'interrupted',
      completedAt: '2026-11-11T09:00:00Z',
      isoDate: '2026-11-11',
      hourOfDay: 9,
      sceneId: 'electric-quiet',
      chamberId: 'ocean-drift',
    },
    {
      id: 'int-2',
      label: 'Study linear algebra',
      durationMinutes: 22,
      plannedMinutes: 60,
      actualMinutes: 22,
      completionStatus: 'interrupted',
      completedAt: '2026-11-12T09:00:00Z',
      isoDate: '2026-11-12',
      hourOfDay: 9,
      sceneId: 'electric-quiet',
      chamberId: 'ocean-drift',
    },
    {
      id: 'comp-1',
      label: 'Focused sprint',
      durationMinutes: 25,
      plannedMinutes: 25,
      actualMinutes: 25,
      completionStatus: 'completed',
      completedAt: '2026-11-12T11:00:00Z',
      isoDate: '2026-11-12',
      hourOfDay: 11,
      sceneId: 'electric-quiet',
      chamberId: 'ocean-drift',
    },
  ];

  const recs = computeSmartRecommendations({
    sessions: historyWithInterruptedLong,
    todayIsoDate: '2026-11-12',
    currentDurationMinutes: 60,
    currentSceneId: 'electric-quiet',
    settings: DEFAULT_USER_SETTINGS,
  });
  assert.equal(recs.length >= 1, true);
  assert.equal(
    recs.some((r) => r.id === 'rec-step-down-duration'),
    true
  );
  assert.equal(
    recs.every((r) => r.explanation.length > 15),
    true
  );

  // 3. 30-day Monthly Analytics computes 4-week buckets and % change vs previous 30 days
  const monthly = calculateMonthlyAnalytics(
    historyWithInterruptedLong,
    '2026-11-12',
    180
  );
  assert.equal(monthly.totalActualMinutes, 67);
  assert.equal(monthly.completedSessionsCount, 1);
  assert.equal(monthly.interruptedSessionsCount, 2);
  assert.equal(monthly.activeDaysCount, 2);
  assert.equal(monthly.weeklyTrends.length, 4);

  // 4. Verified Garden Milestones deduplicate session IDs and never fabricated
  const duplicateSessionArray: SessionRecord[] = [
    historyWithInterruptedLong[2],
    historyWithInterruptedLong[2], // duplicate ID
  ];
  const achievements = computeAuraGardenAchievements(
    duplicateSessionArray,
    900,
    false
  );
  const firstDrop = achievements.find((a) => a.id === 'ach-first-session')!;
  assert.equal(firstDrop.unlocked, true);
  assert.equal(firstDrop.progressText, '1 / 1 session');

  // 5. Local Task Breakdown produces structured steps
  const steps = generateLocalTaskBreakdown(
    'Prepare physics exam chapter and practice problems',
    25
  );
  assert.equal(steps.length, 4);
  assert.equal(steps[0].durationMinutes, 25);

  // 6. Weekly Reflection & Preferred Soundscapes
  const reflection = generateLocalWeeklyReflection({
    completedSessions: 1,
    interruptedSessions: 2,
    totalActualMinutes: 67,
    mostUsedEnvironment: 'Electric Quiet',
    bestDayLabel: 'Thu',
    averageMinutes: 25,
  });
  assert.equal(reflection.summary.includes('1 focus session'), true);

  const prefSounds = computePreferredSoundscapes(historyWithInterruptedLong);
  assert.equal(prefSounds.length, 1);
  assert.equal(prefSounds[0].chamberId, 'ocean-drift');

  // 7. Product Health Metrics Summary excludes sample seed sessions
  const metrics = computeProductMetricsSummary(
    historyWithInterruptedLong,
    [],
    '2026-11-12'
  );
  assert.equal(metrics.activated, true);
  assert.equal(metrics.sessionCompletionRatePercent, 33);
});




test('AURA RESONANCE 6 shared sound presets, equal-power crossfades, and theme-specific kinematics work accurately', () => {
  assert.equal(RESONANCE_SOUND_PRESETS.length, 6);
  const expectedNames = [
    'Rain Chamber',
    'Ocean Drift',
    'Forest Echo',
    'Cosmic Silence',
    'Ember Glow',
    'Celestial Tone',
  ];
  assert.deepEqual(
    RESONANCE_SOUND_PRESETS.map((p) => p.name),
    expectedNames
  );

  // Verify canonical and legacy resolution
  assert.equal(getResonancePresetByChamberId('ocean-drift').name, 'Ocean Drift');
  assert.equal(getResonancePresetByChamberId('coastal-static').name, 'Ocean Drift');
  assert.equal(getResonancePresetByChamberId('ember-glow').name, 'Ember Glow');

  // Verify equal-power crossfade energy conservation (fadeOut^2 + fadeIn^2 = 1)
  const mid = computeEqualPowerCrossfadeGains(0.5);
  assert.equal(
    Math.abs(mid.fadeOutGain ** 2 + mid.fadeInGain ** 2 - 1.0) < 0.001,
    true
  );
  const curves = buildEqualPowerCrossfadeCurves(16, 0.8, 0.8);
  assert.equal(curves.fadeInCurve.length, 16);
  assert.equal(curves.fadeOutCurve.length, 16);

  // Verify 6 orbital nodes across all 3 visual themes
  for (const orb of ['original', 'celestial-jelly', 'living-bloom'] as const) {
    const layout = computeResonanceNodesLayout({
      orbDesign: orb,
      timeSec: 1.5,
      revealProgress: 1.0,
      hoveredIndex: 1,
      activeChamberId: 'ocean-drift',
    });
    assert.equal(layout.length, 6);
    assert.equal(layout[1].interactionFactor, 1.0);
  }

  // Verify droplet merge, jellyfish pulse, and flower bloom burst states
  const mergeEnd = computeDropletMergeState({
    startX: 480,
    startY: 160,
    progress: 1.0,
  });
  assert.equal(Math.abs(mergeEnd.x - 310) < 0.01, true);
  assert.equal(Math.abs(mergeEnd.y - 310) < 0.01, true);

  const jellyPulse = computeJellyResonancePulseState(0.5);
  assert.equal(jellyPulse.active, true);
  assert.equal(jellyPulse.bellGlowBoost > 0, true);

  const bloomBurst = computeBloomResonanceBurstState(0.6);
  assert.equal(bloomBurst.active, true);
  assert.equal(bloomBurst.opennessBoost > 0, true);
  assert.equal(bloomBurst.pollenAlpha > 0, true);
});

test('Final Integration: versioned storage migration preserves legacy settings/sessions, respects SEED_CLEARED empty state, and keeps restorative sessions separate from focus totals', async () => {
  const {
    STORAGE_KEYS,
    loadAndMigrateSettings,
    loadAndMigrateSessions,
    loadAndMigrateRestoreSessions,
  } = await import('./storageMigration');
  const { calculateTodaySummary } = await import('./focusEngine');

  // Create an in-memory mock Storage
  const createMockStorage = (initial: Record<string, string> = {}) => {
    const store = new Map<string, string>(Object.entries(initial));
    return {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
  };

  // 1. Legacy v2 settings migrate to v3 without resetting user preferences
  const legacySettingsStorage = createMockStorage({
    [STORAGE_KEYS.LEGACY_SETTINGS_V2]: JSON.stringify({
      dailyGoalMinutes: 210,
      orbDesign: 'living-bloom',
      reducedMotion: true,
      selectedChamberId: 'coastal-static', // legacy ID -> ocean-drift
    }),
  });
  const migratedSettings = loadAndMigrateSettings(legacySettingsStorage);
  assert.equal(migratedSettings.dailyGoalMinutes, 210);
  assert.equal(migratedSettings.orbDesign, 'living-bloom');
  assert.equal(migratedSettings.reducedMotion, true);
  assert.equal(migratedSettings.selectedChamberId, 'ocean-drift');
  assert.notEqual(
    legacySettingsStorage.getItem(STORAGE_KEYS.SETTINGS),
    null
  );

  // 2. Legacy v1 sessions migrate to v2 and preserve actual user records
  const legacySession: SessionRecord = {
    id: 'legacy-1',
    label: 'Architecture review',
    durationMinutes: 50,
    completedAt: '2026-11-12T10:00:00Z',
    isoDate: '2026-11-12',
    hourOfDay: 10,
    sceneId: 'electric-quiet',
    chamberId: 'rain-chamber',
  };
  const legacySessionStorage = createMockStorage({
    [STORAGE_KEYS.LEGACY_SESSIONS_V1]: JSON.stringify([legacySession]),
  });
  const migratedSessions = loadAndMigrateSessions(
    '2026-11-12',
    legacySessionStorage
  );
  assert.equal(migratedSessions.length, 1);
  assert.equal(migratedSessions[0].id, 'legacy-1');
  assert.equal(migratedSessions[0].actualMinutes, 50);

  // 3. When user clears sample data (SEED_CLEARED === 'true'), empty array is preserved on reload
  const clearedStorage = createMockStorage({
    [STORAGE_KEYS.SEED_CLEARED]: 'true',
    [STORAGE_KEYS.SESSIONS]: JSON.stringify([]),
  });
  const afterClearReload = loadAndMigrateSessions('2026-11-12', clearedStorage);
  assert.equal(afterClearReload.length, 0);

  // 4. Restorative sessions never inflate actual focus totals
  const restoreStorage = createMockStorage({
    [STORAGE_KEYS.RESTORE_SESSIONS]: JSON.stringify([
      {
        id: 'rest-1',
        mode: 'breathing',
        presetName: '4-6 Calm Breathing',
        durationSeconds: 180,
        elapsedSeconds: 180,
        completedAt: '2026-11-12T12:00:00Z',
        isoDate: '2026-11-12',
      },
    ]),
  });
  const restoreList = loadAndMigrateRestoreSessions(restoreStorage);
  assert.equal(restoreList.length, 1);
  assert.equal(restoreList[0].mode, 'breathing');

  // Focus daily total and TodaySummary remain 0 when focus sessions are empty, regardless of restorative sessions
  assert.equal(calculateDailyTotal(afterClearReload, '2026-11-12'), 0);
  const focusSummary = calculateTodaySummary(
    afterClearReload,
    180,
    '2026-11-12'
  );
  assert.equal(focusSummary.actualMinutes, 0);
  assert.equal(focusSummary.completedCount, 0);

  // 5. Corrupted localStorage entries (bad dates, invalid numbers, broken routines) sanitize safely
  const {
    loadAndMigrateRoutines,
    sanitizeRoutines,
    sanitizeSessionRecords,
    sanitizeUserSettings,
  } = await import('./storageMigration');

  const corruptedStorage = createMockStorage({
    [STORAGE_KEYS.SETTINGS]: '{broken-json',
    [STORAGE_KEYS.ROUTINES]: JSON.stringify([
      null,
      { id: 'r1', name: 'Bad Routine', focusDurationMinutes: 'NaN', sceneId: 'unknown' },
    ]),
  });
  const recoveredSettings = loadAndMigrateSettings(corruptedStorage);
  assert.equal(recoveredSettings.orbDesign, 'celestial-jelly');

  const safeSettings = sanitizeUserSettings({
    orbDesign: 'bad-design',
    preferredSceneId: 'nonexistent',
    dailyGoalMinutes: -50,
    preferredDurationMinutes: Number.NaN,
    ambienceVolume: 5,
  });
  assert.equal(safeSettings.orbDesign, 'celestial-jelly');
  assert.equal(safeSettings.preferredSceneId, 'electric-quiet');
  assert.equal(safeSettings.dailyGoalMinutes, 180);
  assert.equal(safeSettings.preferredDurationMinutes, 45);
  assert.equal(safeSettings.ambienceVolume, 1);

  const safeSessions = sanitizeSessionRecords(
    [
      null,
      {
        id: 'corrupt-date-1',
        durationMinutes: 25,
        isoDate: 'invalid-date',
        sceneId: 'unknown-scene',
      },
    ],
    '2026-11-12',
    false
  );
  assert.equal(safeSessions.length, 1);
  assert.equal(safeSessions[0].isoDate, '2026-11-12');
  assert.equal(safeSessions[0].sceneId, 'electric-quiet');

  const safeRoutines = loadAndMigrateRoutines(corruptedStorage);
  assert.equal(safeRoutines.length, 1);
  assert.equal(safeRoutines[0].focusDurationMinutes, 25);
  assert.equal(safeRoutines[0].sceneId, 'electric-quiet');

  const fallbackRoutines = sanitizeRoutines([]);
  assert.equal(fallbackRoutines.length >= 5, true);
});

test('Liquid Lens Three-Purpose Breathing Engine: drift-corrected timing, exponential smoothing, discrete state gating, and safe legacy preset migration', async () => {
  const {
    BREATHING_DURATION_OPTIONS,
    CURATED_BREATHING_PRESETS,
    computeClockElapsed,
    dampValue,
    getBreathingPresetById,
    hasDiscreteBreathingStateChanged,
    normalizeBreathingPresetId,
  } = await import('./breathingEngine');
  const { sanitizeUserSettings } = await import('./storageMigration');

  // Strictly three curated presets with zero holds
  assert.equal(CURATED_BREATHING_PRESETS.length, 3);
  assert.deepEqual(BREATHING_DURATION_OPTIONS, [120, 180, 240, 300, 600]);
  for (const preset of CURATED_BREATHING_PRESETS) {
    assert.equal(preset.holdInSeconds, 0);
    assert.equal(preset.holdOutSeconds, 0);
  }

  // Legacy preset IDs migrate cleanly (including removed Equilibrium Box & custom)
  assert.equal(normalizeBreathingPresetId('box-4-4-4-4'), 'coherent-5-5');
  assert.equal(normalizeBreathingPresetId('custom'), 'coherent-5-5');
  assert.equal(normalizeBreathingPresetId('deep-rest'), 'deep-rest-4-7-8');
  assert.equal(normalizeBreathingPresetId('simple-flow'), 'wave-6-2-7');
  assert.equal(getBreathingPresetById('box-4-4-4-4').name, 'Find Your Balance');

  const migrated = sanitizeUserSettings({
    defaultBreathingPresetId: 'box-4-4-4-4',
    defaultRestoreMode: 'quiet-moment',
    soundMuted: true,
  });
  assert.equal(migrated.defaultBreathingPresetId, 'coherent-5-5');
  assert.equal(migrated.defaultRestoreMode, 'breathing');
  assert.equal(migrated.soundMuted, true);

  // Drift-corrected monotonic clock computation across pause/resume segments
  const runningClock = computeClockElapsed({
    accumulatedSeconds: 12.4,
    segmentStartPerfMs: 10_000,
    nowPerfMs: 14_750,
    targetDurationSeconds: 180,
  });
  assert.equal(Math.abs(runningClock.elapsedFloatSeconds - 17.15) < 1e-6, true);
  assert.equal(runningClock.elapsedWholeSeconds, 17);
  assert.equal(runningClock.remainingSeconds, 163);
  assert.equal(runningClock.isComplete, false);

  const completedClock = computeClockElapsed({
    accumulatedSeconds: 179.0,
    segmentStartPerfMs: 10_000,
    nowPerfMs: 11_500,
    targetDurationSeconds: 180,
  });
  assert.equal(completedClock.elapsedFloatSeconds, 180);
  assert.equal(completedClock.elapsedWholeSeconds, 180);
  assert.equal(completedClock.remainingSeconds, 0);
  assert.equal(completedClock.isComplete, true);

  // Smooth exponential damping converges monotonically without overshoot
  const step1 = dampValue(0.2, 0.9, 7.5, 0.016);
  const step2 = dampValue(step1, 0.9, 7.5, 0.016);
  assert.equal(step1 > 0.2 && step2 > step1 && step2 < 0.9, true);

  // Discrete React state update gating avoids per-frame re-renders
  const baseUi = {
    elapsedSeconds: 5,
    phase: 'exhale' as const,
    phaseRemainingSeconds: 5,
    completedCycles: 0,
  };
  assert.equal(hasDiscreteBreathingStateChanged(baseUi, { ...baseUi }), false);
  assert.equal(
    hasDiscreteBreathingStateChanged(baseUi, { ...baseUi, elapsedSeconds: 6 }),
    true
  );
  assert.equal(
    hasDiscreteBreathingStateChanged(baseUi, { ...baseUi, phase: 'inhale' }),
    true
  );
});

test('Living Breathing Intelligence, Adaptive Atmosphere Engine, and Spatial Sound Experience', async () => {
  const {
    ADAPTIVE_ATMOSPHERE_PROFILES,
    INTELLIGENT_BREATHING_PATTERNS,
    SPATIAL_SOUND_CATALOG,
    computeBreathingOrbKinematics,
    formatPatternCadenceSummary,
    getBreathingPhaseInstruction,
    resolveIntelligentBreathingPattern,
    sanitizeCustomBreathingPattern,
  } = await import('./breathingEngine');
  const { calculateBreathingPhaseAtTime } = await import('./focusEngine');

  // 1. Configurable intelligent patterns (Balanced, Box, Relaxing, Restorative, Custom)
  assert.equal(INTELLIGENT_BREATHING_PATTERNS.length, 5);

  const boxPattern = resolveIntelligentBreathingPattern('box-4-4-4-4');
  assert.equal(boxPattern.inhaleSeconds, 4);
  assert.equal(boxPattern.holdInSeconds, 4);
  assert.equal(boxPattern.exhaleSeconds, 4);
  assert.equal(boxPattern.holdOutSeconds, 4);
  assert.equal(
    formatPatternCadenceSummary(boxPattern),
    '4s in · 4s hold · 4s out · 4s rest'
  );

  const customTiming = sanitizeCustomBreathingPattern({
    inhaleSeconds: 6,
    holdInSeconds: 3,
    exhaleSeconds: 7,
    holdOutSeconds: 2,
  });
  const customPattern = resolveIntelligentBreathingPattern('custom', customTiming);
  assert.equal(customPattern.inhaleSeconds, 6);
  assert.equal(customPattern.holdInSeconds, 3);
  assert.equal(customPattern.exhaleSeconds, 7);
  assert.equal(customPattern.holdOutSeconds, 2);

  // Cycle timing across 4 phases in Box 4-4-4-4 (total 16s)
  const inhaleCycle = calculateBreathingPhaseAtTime(boxPattern, 2.0);
  assert.equal(inhaleCycle.phase, 'inhale');
  const holdInCycle = calculateBreathingPhaseAtTime(boxPattern, 5.5);
  assert.equal(holdInCycle.phase, 'hold-in');
  const exhaleCycle = calculateBreathingPhaseAtTime(boxPattern, 10.0);
  assert.equal(exhaleCycle.phase, 'exhale');
  const restCycle = calculateBreathingPhaseAtTime(boxPattern, 14.0);
  assert.equal(restCycle.phase, 'hold-out');

  // 2. 4-State Orb Kinematics & Instructions
  assert.equal(getBreathingPhaseInstruction('inhale'), 'Breathe In');
  assert.equal(getBreathingPhaseInstruction('hold-in'), 'Hold');
  assert.equal(getBreathingPhaseInstruction('exhale'), 'Breathe Out');
  assert.equal(getBreathingPhaseInstruction('hold-out'), 'Rest');

  const inhaleKin = computeBreathingOrbKinematics({
    sessionState: 'running',
    phase: 'inhale',
    phaseProgress: 0.75,
    expansion: 0.85,
    ambientTimeSec: 1.0,
  });
  assert.equal(inhaleKin.instruction, 'Breathe In');
  assert.equal(inhaleKin.radialDriftVelocity > 0, true);
  assert.equal(inhaleKin.targetExpansion > 0.5, true);

  const holdKin = computeBreathingOrbKinematics({
    sessionState: 'running',
    phase: 'hold-in',
    phaseProgress: 0.5,
    expansion: 1.0,
    ambientTimeSec: 2.0,
  });
  assert.equal(holdKin.instruction, 'Hold');
  assert.equal(holdKin.targetExpansion, 1);
  assert.equal(holdKin.radialDriftVelocity, 0);
  assert.equal(holdKin.surfaceElasticityScale <= 0.25, true);

  const exhaleKin = computeBreathingOrbKinematics({
    sessionState: 'running',
    phase: 'exhale',
    phaseProgress: 0.75,
    expansion: 0.15,
    ambientTimeSec: 3.0,
  });
  assert.equal(exhaleKin.instruction, 'Breathe Out');
  assert.equal(exhaleKin.radialDriftVelocity < 0, true);
  assert.equal(exhaleKin.targetExpansion < 0.5, true);

  const restKin = computeBreathingOrbKinematics({
    sessionState: 'running',
    phase: 'hold-out',
    phaseProgress: 0.5,
    expansion: 0.0,
    ambientTimeSec: 4.0,
  });
  assert.equal(restKin.instruction, 'Rest');
  assert.equal(restKin.targetExpansion, 0);

  // 3. Adaptive Atmosphere Engine (all 5 themes)
  const expectedScenes = [
    'deep-current',
    'chromatic-flow',
    'night-signal',
    'electric-quiet',
    'solar-drift',
  ] as const;
  for (const sceneId of expectedScenes) {
    const profile = ADAPTIVE_ATMOSPHERE_PROFILES[sceneId];
    assert.ok(profile, `Missing profile for ${sceneId}`);
    assert.equal(profile.radialGradientCss.includes('radial-gradient'), true);
    assert.equal(profile.lavenderTintRgb.length, 3);
  }

  // 4. Spatial Sound Catalog (6 spatial soundscapes)
  assert.equal(SPATIAL_SOUND_CATALOG.length, 6);
  assert.deepEqual(
    SPATIAL_SOUND_CATALOG.map((item) => item.label),
    ['Ocean', 'Rain', 'Forest', 'Wind', 'Singing Bowls', 'Deep Ambient']
  );
});
