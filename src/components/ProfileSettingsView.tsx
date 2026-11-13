import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Bell,
  Sliders,
  Sparkles,
  Download,
  Trash2,
  RotateCcw,
  Check,
  ShieldCheck,
  Play,
} from 'lucide-react';
import {
  ChamberId,
  OrbDesignId,
  PerformanceMode,
  SessionRecord,
  UserSettings,
} from '../types/aura';
import {
  CATEGORIZED_SOUND_OPTIONS,
  ORB_DESIGNS,
  formatDurationCompact,
} from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { AuraButton } from './AuraButton';

interface ProfileSettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  sessions: SessionRecord[];
  soundscapePlaying: boolean;
  onToggleSoundscape: (playing: boolean) => void;
  onClearSeedSessions: () => void;
  onRestoreSeedSessions: () => void;
  onResetAllData: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  sessions,
  soundscapePlaying,
  onToggleSoundscape,
  onClearSeedSessions,
  onRestoreSeedSessions,
  onResetAllData,
}) => {
  const [notifStatus, setNotifStatus] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unavailable';
    }
    return Notification.permission;
  });
  const [confirmReset, setConfirmReset] = useState(false);

  const focusSounds = CATEGORIZED_SOUND_OPTIONS.filter(
    (s) => s.category === 'focus'
  );
  const restoreSounds = CATEGORIZED_SOUND_OPTIONS.filter(
    (s) => s.category === 'restore'
  );

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifStatus('unavailable');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
    } catch {
      setNotifStatus('denied');
    }
  };

  const handleExportSessions = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-time-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewSound = (chamberId: ChamberId) => {
    onUpdateSettings({ selectedChamberId: chamberId, soundMuted: false });
    soundEngine.previewSoundscape(chamberId, settings.ambienceVolume);
  };

  return (
    <section
      data-testid="profile-settings-view"
      aria-label="Sanctuary Profile and Settings"
      className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 flex flex-col"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2FE8FF]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#2FE8FF]">
            PROFILE & SANCTUARY CALIBRATION
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight mt-1">
          Personal Sanctuary Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#A3A1BA] mt-0.5">
          Customize your organisms, soundscapes, focus goals, and local data
          privacy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Audio & Soundscape Studio + Organism Selection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Smart Audio & Soundscape Controls */}
          <div className="aura-glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#2FE8FF]" />
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  SMART AUDIO & SOUNDSCAPE STUDIO
                </h2>
              </div>

              <button
                type="button"
                data-testid="profile-mute-toggle"
                onClick={() => {
                  const nextMuted = !settings.soundMuted;
                  onUpdateSettings({ soundMuted: nextMuted });
                  if (nextMuted) {
                    onToggleSoundscape(false);
                  } else {
                    onToggleSoundscape(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                  settings.soundMuted
                    ? 'bg-[#FF4FA3]/15 text-[#FF4FA3] border-[#FF4FA3]/40'
                    : 'bg-[#2FE8FF]/15 text-[#F5F6FF] border-[#2FE8FF]/40'
                }`}
              >
                {settings.soundMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
                    <span>Audio Active</span>
                  </>
                )}
              </button>
            </div>

            {/* Separate Volume Sliders: Ambience & Completion Chime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#F5F6FF] font-medium">
                    Ambience Volume
                  </span>
                  <span className="font-mono text-[#2FE8FF]">
                    {Math.round(settings.ambienceVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.ambienceVolume * 100)}
                  onChange={(e) =>
                    onUpdateSettings({
                      ambienceVolume: Number(e.target.value) / 100,
                      soundMuted: false,
                    })
                  }
                  aria-label="Ambience volume"
                  className="w-full accent-[#2FE8FF]"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#F5F6FF] font-medium">
                    Completion Alert Volume
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      soundEngine.playCompletionChime(settings.alertVolume)
                    }
                    className="text-[11px] font-mono text-[#2FE8FF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Test Chime</span>
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(settings.alertVolume * 100)}
                  onChange={(e) =>
                    onUpdateSettings({
                      alertVolume: Number(e.target.value) / 100,
                    })
                  }
                  aria-label="Completion alert volume"
                  className="w-full accent-[#2FE8FF]"
                />
              </div>
            </div>

            {/* Focus Soundscapes */}
            <div className="mb-4">
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A3A1BA] block mb-2">
                FOCUS SOUNDSCAPES
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {focusSounds.map((sound) => {
                  const isSelected =
                    settings.selectedChamberId === sound.chamberId;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      data-testid={`profile-sound-${sound.id}`}
                      onClick={() => handlePreviewSound(sound.chamberId)}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2FE8FF]/14 border-[#2FE8FF]/50 text-[#F5F6FF]'
                          : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#F5F6FF]">
                          {sound.name}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: sound.primaryHex }}
                        />
                      </div>
                      <p className="text-[11px] text-[#A3A1BA] mt-0.5 line-clamp-1">
                        {sound.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Restore Soundscapes */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A3A1BA] block mb-2">
                RESTORE SOUNDSCAPES
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {restoreSounds.map((sound) => {
                  const isSelected =
                    settings.selectedChamberId === sound.chamberId;
                  return (
                    <button
                      key={sound.id}
                      type="button"
                      data-testid={`profile-sound-${sound.id}`}
                      onClick={() => handlePreviewSound(sound.chamberId)}
                      className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#2FE8FF]/14 border-[#2FE8FF]/50 text-[#F5F6FF]'
                          : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#F5F6FF]">
                          {sound.name}
                        </span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: sound.primaryHex }}
                        />
                      </div>
                      <p className="text-[11px] text-[#A3A1BA] mt-0.5 line-clamp-1">
                        {sound.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Signature Organism & Visual Calibration */}
          <div className="aura-glass rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#8A5CFF]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                SIGNATURE 3D ORGANISM & VISUAL ENGINE
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-5">
              {ORB_DESIGNS.map((orb) => {
                const isSelected = settings.orbDesign === orb.id;
                return (
                  <button
                    key={orb.id}
                    type="button"
                    data-testid={`profile-orb-${orb.id}`}
                    onClick={() =>
                      onUpdateSettings({ orbDesign: orb.id as OrbDesignId })
                    }
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#8A5CFF]/18 border-[#2FE8FF]/55 text-[#F5F6FF]'
                        : 'bg-white/[0.02] border-white/8 text-[#A3A1BA] hover:text-[#F5F6FF]'
                    }`}
                  >
                    <span className="text-[10px] font-mono text-[#2FE8FF] block">
                      {orb.badge}
                    </span>
                    <span className="text-xs font-semibold text-[#F5F6FF] mt-0.5 block">
                      {orb.name}
                    </span>
                    <span className="text-[11px] text-[#A3A1BA] mt-1 block line-clamp-2">
                      {orb.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Performance & Accessibility Toggles */}
            <div className="space-y-3 pt-3 border-t border-white/10 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F5F6FF] font-medium block">
                    Reduced Motion Mode
                  </span>
                  <span className="text-[11px] text-[#A3A1BA]">
                    Calms fluid turbulence and 3D organism movement
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.reducedMotion}
                  data-testid="profile-reduced-motion-toggle"
                  onClick={() =>
                    onUpdateSettings({
                      reducedMotion: !settings.reducedMotion,
                    })
                  }
                  className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                    settings.reducedMotion ? 'bg-[#2FE8FF]' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                      settings.reducedMotion ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F5F6FF] font-medium block">
                    Audio-Reactive Organism Pulse
                  </span>
                  <span className="text-[11px] text-[#A3A1BA]">
                    Synchronize organism luminescence with soundscape harmonics
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.audioReactive}
                  onClick={() =>
                    onUpdateSettings({
                      audioReactive: !settings.audioReactive,
                    })
                  }
                  className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                    settings.audioReactive ? 'bg-[#2FE8FF]' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                      settings.audioReactive ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#F5F6FF] font-medium">
                  GPU Rendering Profile
                </span>
                <div className="flex items-center gap-1.5">
                  {(['auto', 'ultra', 'balanced'] as PerformanceMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({ performanceMode: mode })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono uppercase cursor-pointer ${
                          settings.performanceMode === mode
                            ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                            : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                        }`}
                      >
                        {mode}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Goals, Browser Notifications & Local Data Sanctuary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 3. Timer & Goal Defaults */}
          <div className="aura-glass rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-[#FFB08A]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#FFB08A]">
                ROUTINE & GOAL TARGETS
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#A3A1BA]">Daily Focus Goal</span>
                  <span className="font-mono text-[#F5F6FF]">
                    {formatDurationCompact(settings.dailyGoalMinutes)}
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={360}
                  step={15}
                  value={settings.dailyGoalMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      dailyGoalMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#2FE8FF]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#A3A1BA]">Weekly Focus Goal</span>
                  <span className="font-mono text-[#F5F6FF]">
                    {formatDurationCompact(settings.weeklyGoalMinutes || 600)}
                  </span>
                </div>
                <input
                  type="range"
                  min={120}
                  max={1800}
                  step={60}
                  value={settings.weeklyGoalMinutes || 600}
                  onChange={(e) =>
                    onUpdateSettings({
                      weeklyGoalMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#2FE8FF]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#A3A1BA]">
                    Default Restorative Break Length
                  </span>
                  <span className="font-mono text-[#F5F6FF]">
                    {settings.breakMinutes} min
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => onUpdateSettings({ breakMinutes: mins })}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                        settings.breakMinutes === mins
                          ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                          : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Gentle Browser Notifications */}
          <div className="aura-glass rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-[#2FE8FF]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                SESSION COMPLETION NOTIFICATIONS
              </h2>
            </div>
            <p className="text-xs text-[#A3A1BA] leading-relaxed mb-4">
              Receive a quiet desktop notification when a focus session finishes
              while Aura Time is in a background tab. Permission is requested
              only when you choose.
            </p>

            {notifStatus === 'granted' ? (
              <div className="flex items-center gap-2 text-xs text-[#38F8A8] font-medium">
                <Check className="w-4 h-4" />
                <span>Desktop notifications enabled</span>
              </div>
            ) : (
              <AuraButton
                variant="secondary"
                size="sm"
                onClick={handleRequestNotifications}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {notifStatus === 'denied'
                    ? 'Notifications Blocked in Browser'
                    : 'Enable Gentle Notifications'}
                </span>
              </AuraButton>
            )}
          </div>

          {/* 5. Local Data Sanctuary & Export */}
          <div className="aura-glass rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#38F8A8]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#38F8A8]">
                LOCAL-FIRST DATA PRIVACY
              </h2>
            </div>
            <p className="text-xs text-[#A3A1BA] leading-relaxed mb-4">
              Your focus sessions, intentions, and preferences are stored
              locally on your device. Export your journal or clear sample data
              at any time.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="export-journal-btn"
                onClick={handleExportSessions}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F6FF] border border-white/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#2FE8FF]" />
                <span>Export Journal JSON</span>
              </button>

              <button
                type="button"
                onClick={onClearSeedSessions}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Sample Data</span>
              </button>

              <button
                type="button"
                onClick={onRestoreSeedSessions}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Sample Data</span>
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="text-xs text-[#FF4FA3] hover:underline cursor-pointer"
                >
                  Reset All Local Sanctuary Data…
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#FFB08A]">
                    Clear all sessions and reset settings?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetAllData();
                      setConfirmReset(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FF4FA3]/20 text-[#FF4FA3] border border-[#FF4FA3]/40 text-xs font-medium cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="text-xs text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
