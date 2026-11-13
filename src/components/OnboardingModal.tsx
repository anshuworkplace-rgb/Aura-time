import React, { useState } from 'react';
import {
  ChamberId,
  FocusSceneId,
  OrbDesignId,
  UserSettings,
} from '../types/aura';
import {
  FOCUS_PRESET_MINUTES,
  FOCUS_SCENES,
  ORB_DESIGNS,
} from '../utils/focusEngine';
import { AuraButton } from './AuraButton';
import { Compass, Wind, BarChart3, Check, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  sceneId: FocusSceneId;
  durationMinutes: number;
  settings: UserSettings;
  onSelectScene: (id: FocusSceneId) => void;
  onSelectOrbDesign: (id: OrbDesignId) => void;
  onChangeDuration: (mins: number) => void;
  onCompleteOnboarding: (startFirstSessionNow: boolean) => void;
  onDismiss: () => void;
  onSelectSoundscape?: (id: ChamberId) => void;
}

const SCENE_LIST = Object.values(FOCUS_SCENES);

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  sceneId,
  durationMinutes,
  settings,
  onSelectScene,
  onSelectOrbDesign,
  onChangeDuration,
  onCompleteOnboarding,
  onDismiss,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Aura Time"
      data-testid="onboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050C]/80 backdrop-blur-xl p-4"
    >
      <div className="w-full max-w-xl rounded-3xl aura-glass-elevated p-6 sm:p-8 border border-white/15 shadow-2xl relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-[#A3A1BA]">
            <span>Step {step} of 3</span>
            <span>·</span>
            <span>No account required</span>
          </div>
          <button
            type="button"
            data-testid="onboarding-skip-btn"
            onClick={onDismiss}
            className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <span>Skip</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {step === 1 && (
          <div data-testid="onboarding-step-1" className="space-y-5">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight">
                Welcome to Aura Time
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
                A calm digital sanctuary designed around three pillars for
                meaningful work and sustainable recovery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <Compass className="w-4 h-4 text-[#2FE8FF] mb-2" />
                <h3 className="text-sm font-semibold text-[#F5F6FF]">
                  01. Focus
                </h3>
                <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                  Set a clear intention, enter a living 3D atmosphere, and work
                  without dashboard clutter.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <Wind className="w-4 h-4 text-[#38F8A8] mb-2" />
                <h3 className="text-sm font-semibold text-[#F5F6FF]">
                  02. Restore
                </h3>
                <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                  Decompress with guided breathing cadences and quiet nature
                  breaks kept separate from focus totals.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <BarChart3 className="w-4 h-4 text-[#8A5CFF] mb-2" />
                <h3 className="text-sm font-semibold text-[#F5F6FF]">
                  03. Reflect
                </h3>
                <p className="text-xs text-[#A3A1BA] mt-1 leading-relaxed">
                  Understand your real focus patterns and cultivate your
                  personal Aura Garden.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                Explore on my own
              </button>
              <AuraButton
                variant="primary"
                size="md"
                data-testid="onboarding-next-1"
                onClick={() => setStep(2)}
              >
                Choose Your Sanctuary
              </AuraButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div data-testid="onboarding-step-2" className="space-y-5">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] tracking-tight">
                Select Your Starting Environment
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#A3A1BA]">
                Choose a 3D organism and atmospheric world. You can switch
                anytime on the Focus stage.
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-[#D6D8EC] mb-2">
                Living 3D Organism
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {ORB_DESIGNS.map((orb) => {
                  const selected = settings.orbDesign === orb.id;
                  return (
                    <button
                      key={orb.id}
                      type="button"
                      data-testid={`onboarding-orb-${orb.id}`}
                      onClick={() => onSelectOrbDesign(orb.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#2FE8FF]/16 border-[#2FE8FF]/55 text-[#F5F6FF]'
                          : 'bg-white/[0.03] border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                      }`}
                    >
                      <div className="text-xs font-semibold text-[#F5F6FF]">
                        {orb.name}
                      </div>
                      <div className="text-[11px] text-[#A3A1BA] mt-0.5">
                        {orb.subtitle}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-[#D6D8EC] mb-2">
                Atmosphere & Paired Soundscape
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SCENE_LIST.map((sc) => {
                  const selected = sceneId === sc.id;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      data-testid={`onboarding-scene-${sc.id}`}
                      onClick={() => onSelectScene(sc.id)}
                      className={`p-3 rounded-2xl text-left border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        selected
                          ? 'bg-white/[0.09] border-[#2FE8FF]/55 text-[#F5F6FF]'
                          : 'bg-white/[0.03] border-white/10 text-[#A3A1BA] hover:text-[#F5F6FF]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#F5F6FF]">
                          {sc.name}
                        </div>
                        <div className="text-[11px] text-[#A3A1BA]">
                          {sc.tagline}
                        </div>
                      </div>
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${sc.colors.primary}, ${sc.colors.secondary})`,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                Back
              </button>
              <AuraButton
                variant="primary"
                size="md"
                data-testid="onboarding-next-2"
                onClick={() => setStep(3)}
              >
                Set Session Preference
              </AuraButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div data-testid="onboarding-step-3" className="space-y-5">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-semibold text-[#F5F6FF] tracking-tight">
                Choose Your Starting Session Length
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[#A3A1BA]">
                Start with a comfortable duration. Aura Intelligence adapts its
                recommendations as you complete real sessions.
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {FOCUS_PRESET_MINUTES.map((mins) => {
                const selected = durationMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    data-testid={`onboarding-duration-${mins}m`}
                    onClick={() => onChangeDuration(mins)}
                    className={`py-2.5 px-3 rounded-2xl font-mono text-xs font-medium border transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#2FE8FF]/22 border-[#2FE8FF]/60 text-[#2FE8FF]'
                        : 'bg-white/[0.03] border-white/10 text-[#D6D8EC] hover:text-[#F5F6FF]'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-[#A3A1BA] flex items-start gap-2.5">
              <Check className="w-4 h-4 text-[#38F8A8] shrink-0 mt-0.5" />
              <span>
                Your focus sessions and preferences are stored locally on your
                device first. You can start your first session immediately or
                explore the sanctuary first.
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
              >
                Back
              </button>
              <div className="flex items-center gap-2.5">
                <AuraButton
                  variant="secondary"
                  size="md"
                  data-testid="onboarding-finish-explore"
                  onClick={() => onCompleteOnboarding(false)}
                >
                  Enter Sanctuary
                </AuraButton>
                <AuraButton
                  variant="primary"
                  size="md"
                  data-testid="onboarding-finish-start"
                  onClick={() => onCompleteOnboarding(true)}
                >
                  Begin First {durationMinutes}m Session
                </AuraButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
