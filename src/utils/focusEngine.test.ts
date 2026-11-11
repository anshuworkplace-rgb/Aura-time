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
    QUANTUM_NEBULA_WGSL,
  } = await import('./quantumNebulaShaders');

  const spec = interpolateNebulaSpectrum(FOCUS_SCENES['deep-current']);
  assert.equal(spec.violet.length, 3);
  assert.equal(spec.cyan.length, 3);
  assert.equal(spec.magenta.length, 3);

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
});


