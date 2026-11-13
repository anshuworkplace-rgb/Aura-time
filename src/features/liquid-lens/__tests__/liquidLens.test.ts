import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BREATHING_CADENCE_PRESETS,
  LiquidLensExperience,
  SOUNDSCAPE_ENVIRONMENTS,
  STILLNESS_PRESETS,
  computeEqualPowerCrossfadeWeights,
  computeStillnessSettlingState,
  computeSynchronizedBreathingPhase,
  resolveActiveBreathingCadence,
} from '../index';

describe('Liquid Lens Restorative Feature Module', () => {
  it('exposes all curated breathing cadence presets, stillness presets, and soundscapes', () => {
    assert.equal(BREATHING_CADENCE_PRESETS.length, 5);
    const ids = BREATHING_CADENCE_PRESETS.map((p) => p.id);
    assert.deepEqual(ids, [
      'coherent-calm',
      'deep-rest',
      'equilibrium-box',
      'unhurried-wave',
      'custom',
    ]);

    assert.equal(STILLNESS_PRESETS.length, 4);
    assert.deepEqual(
      STILLNESS_PRESETS.map((p) => p.durationMinutes),
      [2, 5, 10, 15]
    );

    assert.equal(SOUNDSCAPE_ENVIRONMENTS.length, 4);
    assert.deepEqual(
      SOUNDSCAPE_ENVIRONMENTS.map((e) => e.id),
      ['rain-garden', 'ocean-drift', 'forest-stillness', 'celestial-night']
    );
  });

  it('resolves custom breathing cadences and respects optional breath-hold toggle', () => {
    const withHolds = resolveActiveBreathingCadence(
      'custom',
      { inhaleSeconds: 5, holdSeconds: 4, exhaleSeconds: 7, pauseSeconds: 3 },
      true
    );
    assert.equal(withHolds.inhaleSeconds, 5);
    assert.equal(withHolds.holdSeconds, 4);
    assert.equal(withHolds.exhaleSeconds, 7);
    assert.equal(withHolds.pauseSeconds, 3);

    const withoutHolds = resolveActiveBreathingCadence(
      'equilibrium-box',
      { inhaleSeconds: 4, holdSeconds: 4, exhaleSeconds: 4, pauseSeconds: 4 },
      false
    );
    assert.equal(withoutHolds.inhaleSeconds, 4);
    assert.equal(withoutHolds.holdSeconds, 0);
    assert.equal(withoutHolds.exhaleSeconds, 4);
    assert.equal(withoutHolds.pauseSeconds, 0);
  });

  it('synchronizes breathing phases (inhale, hold, exhale, pause) and organism geometry with elapsed time', () => {
    const boxCadence = {
      inhaleSeconds: 4,
      holdSeconds: 4,
      exhaleSeconds: 4,
      pauseSeconds: 4,
    };

    // Mid-inhale at t = 2s
    const inhaleSnap = computeSynchronizedBreathingPhase(boxCadence, 2);
    assert.equal(inhaleSnap.phase, 'inhale');
    assert.equal(inhaleSnap.phaseLabel, 'Inhale');
    assert.equal(inhaleSnap.phaseRemainingSeconds, 2);
    assert.ok(
      inhaleSnap.expansion > 0.4 && inhaleSnap.expansion < 0.6,
      'Inhale midpoint should be ~0.5 expansion'
    );

    // Hold phase at t = 5s
    const holdSnap = computeSynchronizedBreathingPhase(boxCadence, 5);
    assert.equal(holdSnap.phase, 'hold');
    assert.equal(holdSnap.expansion, 1);
    assert.equal(holdSnap.geometryStability, 1);
    assert.equal(holdSnap.phaseRemainingSeconds, 3);

    // Exhale phase at t = 10s (2s into 4s exhale)
    const exhaleSnap = computeSynchronizedBreathingPhase(boxCadence, 10);
    assert.equal(exhaleSnap.phase, 'exhale');
    assert.ok(
      exhaleSnap.expansion > 0.4 && exhaleSnap.expansion < 0.6,
      'Exhale midpoint should contract smoothly'
    );

    // Pause phase at t = 14s (2s into 4s pause)
    const pauseSnap = computeSynchronizedBreathingPhase(boxCadence, 14);
    assert.equal(pauseSnap.phase, 'pause');
    assert.equal(pauseSnap.expansion, 0);
    assert.equal(pauseSnap.completedCycles, 0);

    // Second cycle at t = 17s (1s into second inhale)
    const cycle2Snap = computeSynchronizedBreathingPhase(boxCadence, 17);
    assert.equal(cycle2Snap.phase, 'inhale');
    assert.equal(cycle2Snap.completedCycles, 1);
  });

  it('calculates Stillness settling progression and honors reducedMotion', () => {
    const startSnap = computeStillnessSettlingState(0, 300, 'balanced', false);
    const lateSnap = computeStillnessSettlingState(270, 300, 'balanced', false);
    assert.ok(
      lateSnap.settlingFactor > startSnap.settlingFactor,
      'Organism should settle progressively over time'
    );
    assert.ok(
      lateSnap.motionScale < startSnap.motionScale,
      'Motion scale should decrease as the organism settles into stillness'
    );
    assert.equal(lateSnap.calmStateLabel, 'Deep Optical Stillness');

    const reducedMotionSnap = computeStillnessSettlingState(
      120,
      300,
      'balanced',
      true
    );
    assert.equal(reducedMotionSnap.motionScale, 0);
  });

  it('maintains constant equal-power sum (1.0) across soundscape crossfades', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const weights = computeEqualPowerCrossfadeWeights(t);
      assert.ok(
        Math.abs(weights.powerSum - 1) < 0.001,
        `Expected equal-power sum ~1.0 at t=${t}, got ${weights.powerSum}`
      );
    }
  });

  it('renders LiquidLensExperience in Breathe, Stillness, and Soundscape modes via props', () => {
    const breatheMarkup = renderToStaticMarkup(
      React.createElement(LiquidLensExperience, {
        initialMode: 'breathe',
        restoreSessionsCount: 3,
      })
    );
    assert.ok(breatheMarkup.includes('Liquid Lens Sanctuary'));
    assert.ok(breatheMarkup.includes('Coherent Calm'));
    assert.ok(breatheMarkup.includes('Tune Cadence'));

    const stillnessMarkup = renderToStaticMarkup(
      React.createElement(LiquidLensExperience, {
        initialMode: 'stillness',
      })
    );
    assert.ok(stillnessMarkup.includes('5-Minute Stillness'));
    assert.ok(stillnessMarkup.includes('Begin Stillness'));

    const soundscapeMarkup = renderToStaticMarkup(
      React.createElement(LiquidLensExperience, {
        initialMode: 'soundscape',
      })
    );
    assert.ok(soundscapeMarkup.includes('Rain Garden'));
    assert.ok(soundscapeMarkup.includes('Ocean Drift'));
    assert.ok(soundscapeMarkup.includes('Forest Stillness'));
    assert.ok(soundscapeMarkup.includes('Celestial Night'));
  });
});
