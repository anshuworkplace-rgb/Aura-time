import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  Sliders,
  Waves,
  Wind,
} from 'lucide-react';
import { BreatheControls } from './components/BreatheControls';
import { LiquidLensOrganismStage } from './components/LiquidLensOrganismStage';
import { SoundscapeControls } from './components/SoundscapeControls';
import { StillnessControls } from './components/StillnessControls';
import { useLiquidLensEngine } from './hooks/useLiquidLensEngine';
import { LIQUID_LENS_TOKENS } from './styles/liquidLens.styles';
import type {
  LiquidLensExperienceProps,
  LiquidLensMode,
} from './types/liquidLens.types';

const MODE_TABS: {
  id: LiquidLensMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'breathe', label: 'Breathe', icon: Wind },
  { id: 'stillness', label: 'Stillness', icon: Compass },
  { id: 'soundscape', label: 'Soundscape', icon: Waves },
];

/**
 * LiquidLensExperience — Isolated, production-grade restorative organism environment.
 * Replaces the separate Restore tab with a continuous optical sanctuary featuring
 * Breathe, Stillness, and Soundscape modes.
 */
export const LiquidLensExperience: React.FC<LiquidLensExperienceProps> = ({
  initialMode = 'breathe',
  settings,
  onUpdateSettings,
  audioAdapter,
  onSessionComplete,
  onRecordRestoreSession,
  onReturnToFocus,
  onOpenAuraConsole,
  restoreSessionsCount,
  className = '',
}) => {
  const engine = useLiquidLensEngine({
    initialMode,
    settings,
    onUpdateSettings,
    audioAdapter,
    onSessionComplete,
    onRecordRestoreSession,
  });

  const handleOrganismPrimaryAction = () => {
    if (engine.mode === 'soundscape') {
      engine.toggleAudioPlay();
      return;
    }
    if (engine.status === 'idle' || engine.status === 'completed') {
      engine.startSession();
    } else if (engine.status === 'running') {
      engine.pauseSession();
    } else if (engine.status === 'paused') {
      engine.resumeSession();
    }
  };

  return (
    <section
      aria-label="Liquid Lens Restorative Experience"
      className={`${LIQUID_LENS_TOKENS.surfaces.stageContainer} ${className}`}
    >
      {/* Top Contextual Mode Bar */}
      <header className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          {onReturnToFocus && (
            <button
              type="button"
              onClick={onReturnToFocus}
              className={`${LIQUID_LENS_TOKENS.surfaces.subtlePill} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Focus</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.24em] text-[#2FE8FF]/85 font-semibold">
              Liquid Lens Sanctuary
            </span>
            <span className="text-xs text-[#A3A1BA]">
              {engine.activeEnvironment.name} ·{' '}
              {restoreSessionsCount !== undefined && restoreSessionsCount > 0
                ? `${restoreSessionsCount} restorative ${
                    restoreSessionsCount === 1 ? 'session' : 'sessions'
                  }`
                : 'Continuous restorative organism'}
            </span>
          </div>
        </div>

        {/* Continuous Mode Switcher: Breathe | Stillness | Soundscape */}
        <nav
          aria-label="Liquid Lens modes"
          className="flex items-center gap-1 p-1 rounded-2xl bg-[#090D1E]/85 border border-white/[0.08]"
        >
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = engine.mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => engine.setMode(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? LIQUID_LENS_TOKENS.surfaces.activePill
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Optional Aura Console Quick Trigger */}
        {onOpenAuraConsole && (
          <button
            type="button"
            onClick={() => onOpenAuraConsole('my-rhythm')}
            className={`${LIQUID_LENS_TOKENS.surfaces.subtlePill} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Aura Console</span>
          </button>
        )}
      </header>

      {/* Center Stage: Interactive Liquid Lens Organism */}
      <div className="relative flex-1 flex flex-col items-center justify-center w-full my-2">
        <LiquidLensOrganismStage
          mode={engine.mode}
          status={engine.status}
          remainingSeconds={engine.remainingSeconds}
          targetDurationSeconds={engine.targetDurationSeconds}
          breathingSnapshot={engine.breathingSnapshot}
          stillnessSnapshot={engine.stillnessSnapshot}
          activeEnvironment={engine.activeEnvironment}
          isAudioPlaying={engine.isAudioPlaying && !engine.isAudioMuted}
          ambienceVolume={engine.ambienceVolume}
          harmonicVolume={engine.harmonicVolume}
          reducedMotion={Boolean(settings?.reducedMotion)}
          onPrimaryAction={handleOrganismPrimaryAction}
        />

        {/* Non-Intrusive Completion Banner */}
        {engine.status === 'completed' && engine.lastCompletedPayload && (
          <div
            role="status"
            className="mt-2 px-4 py-2.5 rounded-2xl bg-[#090D1E]/90 border border-[#5EF2C4]/35 flex flex-wrap items-center gap-3 text-xs text-[#F5F6FF] shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4 text-[#5EF2C4] shrink-0" />
            <span>
              Completed{' '}
              <strong>{engine.lastCompletedPayload.presetName}</strong> (
              {Math.max(
                1,
                Math.round(
                  engine.lastCompletedPayload.actualDurationSeconds / 60
                )
              )}
              m) in {engine.activeEnvironment.name}
            </span>
            <button
              type="button"
              onClick={engine.resetSession}
              className="text-[#2FE8FF] hover:underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Bottom Contextual Controls */}
      <footer className="w-full z-10">
        {engine.mode === 'breathe' && (
          <BreatheControls
            status={engine.status}
            selectedPresetId={engine.selectedPresetId}
            activeCadence={engine.activeCadence}
            customCadence={engine.customCadence}
            includeBreathHolds={engine.includeBreathHolds}
            sessionDurationMinutes={engine.breatheDurationMinutes}
            isTuningOpen={engine.isTuningOpen}
            onStart={engine.startSession}
            onPause={engine.pauseSession}
            onResume={engine.resumeSession}
            onEnd={engine.endSession}
            onSelectPreset={engine.selectBreathingPreset}
            onUpdateCustomCadence={engine.updateCustomCadence}
            onToggleBreathHolds={engine.setIncludeBreathHolds}
            onSelectDurationMinutes={engine.setBreatheDurationMinutes}
            onToggleTuning={engine.setIsTuningOpen}
          />
        )}

        {engine.mode === 'stillness' && (
          <StillnessControls
            status={engine.status}
            durationMinutes={engine.stillnessDurationMinutes}
            visualIntensity={engine.stillnessVisualIntensity}
            ambientSoundEnabled={engine.stillnessAmbientSoundEnabled}
            onStart={engine.startSession}
            onPause={engine.pauseSession}
            onResume={engine.resumeSession}
            onEnd={engine.endSession}
            onSelectDurationMinutes={engine.setStillnessDurationMinutes}
            onSelectVisualIntensity={engine.setStillnessVisualIntensity}
            onToggleAmbientSound={engine.setStillnessAmbientSoundEnabled}
          />
        )}

        {engine.mode === 'soundscape' && (
          <SoundscapeControls
            selectedEnvironmentId={engine.selectedEnvironmentId}
            activeEnvironment={engine.activeEnvironment}
            isPlaying={engine.isAudioPlaying}
            isMuted={engine.isAudioMuted}
            ambienceVolume={engine.ambienceVolume}
            harmonicVolume={engine.harmonicVolume}
            crossfadeStatusText={engine.crossfadeStatusText}
            onSelectEnvironment={engine.selectEnvironment}
            onPreviewEnvironment={engine.previewEnvironment}
            onChangeAmbienceVolume={engine.changeAmbienceVolume}
            onChangeHarmonicVolume={engine.changeHarmonicVolume}
            onTogglePlay={engine.toggleAudioPlay}
            onToggleMute={engine.toggleMute}
          />
        )}
      </footer>
    </section>
  );
};

export default LiquidLensExperience;
