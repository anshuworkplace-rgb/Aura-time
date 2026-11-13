import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionRecord, UserSettings } from '../../../types/aura';
import {
  AuraConsole,
  AuraConsoleTrigger,
  AuraContextPanel,
  AuraQuickControls,
  buildAuraDataExportBundle,
  computeMyRhythmSummary,
  mapOrbDesignToPrimaryOrganism,
  mapPrimaryOrganismToOrbDesign,
} from '../index';

const MOCK_SETTINGS: UserSettings = {
  dailyGoalMinutes: 120,
  weeklyGoalMinutes: 600,
  dailySessionsGoal: 4,
  breakMinutes: 5,
  ambienceVolume: 0.75,
  secondaryVolume: 0.35,
  alertVolume: 0.65,
  soundMuted: false,
  selectedChamberId: 'ocean-drift',
  audioReactive: true,
  reducedMotion: false,
  highContrast: false,
  timerTextScale: 'default',
  desktopNotifications: true,
  backgroundMix: 0.5,
  orbDesign: 'celestial-jelly',
  preferredDurationMinutes: 25,
  preferredSceneId: 'deep-current',
  gardenProgressionEnabled: true,
  excludeSampleDataInInsights: false,
  aiProcessingConsent: false,
};

describe('Aura Console & Control Center Integration Module', () => {
  it('returns honest empty states when no focus sessions exist', () => {
    const summary = computeMyRhythmSummary(
      [],
      [],
      MOCK_SETTINGS,
      '2026-11-13'
    );
    assert.equal(summary.todayActualMinutes, 0);
    assert.equal(summary.weeklyActualMinutes, 0);
    assert.equal(summary.totalCompletedCount, 0);
    assert.equal(summary.observation.hasSufficientData, false);
    assert.ok(
      summary.observation.headline.includes('No focus sessions recorded yet')
    );
    assert.equal(summary.recentSessions.length, 0);
  });

  it('computes accurate today/weekly actual focus duration, completed counts, and evidence-based observation', () => {
    const sessions: SessionRecord[] = [
      {
        id: 's1',
        label: 'Systems Architecture',
        durationMinutes: 50,
        plannedMinutes: 50,
        actualMinutes: 50,
        completionStatus: 'completed',
        orbDesign: 'celestial-jelly',
        completedAt: '2026-11-13T09:30:00.000Z',
        isoDate: '2026-11-13',
        hourOfDay: 9,
        sceneId: 'deep-current',
        chamberId: 'ocean-drift',
      },
      {
        id: 's2',
        label: 'Shader Refinement',
        durationMinutes: 25,
        plannedMinutes: 45,
        actualMinutes: 25,
        completionStatus: 'interrupted',
        orbDesign: 'living-bloom',
        completedAt: '2026-11-13T10:45:00.000Z',
        isoDate: '2026-11-13',
        hourOfDay: 10,
        sceneId: 'chromatic-flow',
        chamberId: 'rain-chamber',
      },
      {
        id: 's3',
        label: 'Deep Research',
        durationMinutes: 40,
        plannedMinutes: 40,
        actualMinutes: 40,
        completionStatus: 'completed',
        orbDesign: 'celestial-jelly',
        completedAt: '2026-11-11T08:15:00.000Z',
        isoDate: '2026-11-11',
        hourOfDay: 8,
        sceneId: 'deep-current',
        chamberId: 'ocean-drift',
      },
    ];

    const summary = computeMyRhythmSummary(
      sessions,
      [
        {
          id: 'r1',
          mode: 'breathing',
          presetName: 'Coherent Calm',
          durationSeconds: 180,
          elapsedSeconds: 180,
          environmentId: 'ocean-drift',
          completedAt: '2026-11-13T11:00:00.000Z',
          isoDate: '2026-11-13',
        },
      ],
      MOCK_SETTINGS,
      '2026-11-13'
    );

    assert.equal(summary.todayActualMinutes, 75);
    assert.equal(summary.todayCompletedCount, 1);
    assert.equal(summary.todayInterruptedCount, 1);
    assert.equal(summary.weeklyActualMinutes, 115);
    assert.equal(summary.totalCompletedCount, 2);
    assert.equal(summary.totalInterruptedCount, 1);
    assert.equal(summary.restorativeSessionsCount, 1);
    assert.equal(summary.observation.hasSufficientData, true);
    assert.ok(summary.observation.headline.includes('Morning (05–11h)'));
    assert.equal(summary.gardenNodes.length, 4);
  });

  it('maps between the three primary organisms and OrbDesignId cleanly', () => {
    assert.equal(mapOrbDesignToPrimaryOrganism('original'), 'liquid-lens');
    assert.equal(
      mapOrbDesignToPrimaryOrganism('celestial-jelly'),
      'celestial-jelly'
    );
    assert.equal(mapOrbDesignToPrimaryOrganism('living-bloom'), 'living-bloom');

    assert.equal(mapPrimaryOrganismToOrbDesign('liquid-lens'), 'original');
    assert.equal(
      mapPrimaryOrganismToOrbDesign('celestial-jelly'),
      'celestial-jelly'
    );
    assert.equal(mapPrimaryOrganismToOrbDesign('living-bloom'), 'living-bloom');
  });

  it('builds a complete JSON export bundle for Personal Data', () => {
    const bundle = buildAuraDataExportBundle(MOCK_SETTINGS, [
      {
        id: 's1',
        label: 'Focus Block',
        durationMinutes: 30,
        actualMinutes: 30,
        completedAt: '2026-11-13T10:00:00.000Z',
        isoDate: '2026-11-13',
        hourOfDay: 10,
        sceneId: 'deep-current',
        chamberId: 'ocean-drift',
      },
    ]);
    assert.equal(bundle.product, 'AURA TIME');
    assert.equal(bundle.summary.totalFocusSessions, 1);
    assert.equal(bundle.summary.totalActualFocusMinutes, 30);
  });

  it('renders AuraConsole across My Rhythm, Preferences, and Personal Data destinations', () => {
    const closedMarkup = renderToStaticMarkup(
      React.createElement(AuraConsole, {
        isOpen: false,
        onClose: () => {},
        settings: MOCK_SETTINGS,
        onUpdateSettings: () => {},
      })
    );
    assert.equal(closedMarkup, '');

    const rhythmMarkup = renderToStaticMarkup(
      React.createElement(AuraConsole, {
        isOpen: true,
        activeDestination: 'my-rhythm',
        onClose: () => {},
        settings: MOCK_SETTINGS,
        onUpdateSettings: () => {},
      })
    );
    assert.ok(rhythmMarkup.includes('Aura Console'));
    assert.ok(rhythmMarkup.includes('Evidence-Based Observation'));
    assert.ok(rhythmMarkup.includes('Recent Session History'));

    const prefsMarkup = renderToStaticMarkup(
      React.createElement(AuraConsole, {
        isOpen: true,
        activeDestination: 'preferences',
        onClose: () => {},
        settings: MOCK_SETTINGS,
        onUpdateSettings: () => {},
      })
    );
    assert.ok(prefsMarkup.includes('Primary Organism'));
    assert.ok(prefsMarkup.includes('Liquid Lens'));
    assert.ok(prefsMarkup.includes('Celestial Jelly'));
    assert.ok(prefsMarkup.includes('Living Bloom'));

    const personalDataMarkup = renderToStaticMarkup(
      React.createElement(AuraConsole, {
        isOpen: true,
        activeDestination: 'personal-data',
        onClose: () => {},
        settings: MOCK_SETTINGS,
        onUpdateSettings: () => {},
      })
    );
    assert.ok(personalDataMarkup.includes('Local-Only Sanctuary'));
    assert.ok(personalDataMarkup.includes('Export Session Archive (JSON)'));
    assert.ok(personalDataMarkup.includes('Delete All Local Data'));
  });

  it('renders Control Center integration components (AuraConsoleTrigger, AuraQuickControls, AuraContextPanel)', () => {
    const triggerHtml = renderToStaticMarkup(
      React.createElement(AuraConsoleTrigger, {
        onOpenConsole: () => {},
        todayActualMinutes: 45,
        dailyTargetMinutes: 120,
        activeOrganism: 'celestial-jelly',
      })
    );
    assert.ok(triggerHtml.includes('Aura Console'));
    assert.ok(triggerHtml.includes('45m'));

    const quickControlsHtml = renderToStaticMarkup(
      React.createElement(AuraQuickControls, {
        onOpenConsole: () => {},
        activeOrganism: 'living-bloom',
        onSelectOrganism: () => {},
      })
    );
    assert.ok(quickControlsHtml.includes('My Rhythm'));
    assert.ok(quickControlsHtml.includes('Preferences'));
    assert.ok(quickControlsHtml.includes('Personal Data'));

    const contextPanelHtml = renderToStaticMarkup(
      React.createElement(AuraContextPanel, {
        activeOrganism: 'liquid-lens',
        todayActualMinutes: 60,
        dailyTargetMinutes: 120,
        onOpenConsole: () => {},
      })
    );
    assert.ok(contextPanelHtml.includes('Liquid Lens'));
    assert.ok(contextPanelHtml.includes('60m / 120m'));
  });
});
