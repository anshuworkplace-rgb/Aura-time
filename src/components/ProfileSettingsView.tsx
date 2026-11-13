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
  Cloud,
  UserCheck,
  LogOut,
  Compass,
  Activity,
  Lock,
  BookOpen,
} from 'lucide-react';
import {
  AnimationIntensity,
  ChamberId,
  FocusRoutine,
  FocusSceneId,
  OrbDesignId,
  PerformanceMode,
  PreferredWorkPeriod,
  RestoreSessionRecord,
  SessionRecord,
  UserSettings,
} from '../types/aura';
import {
  CATEGORIZED_SOUND_OPTIONS,
  FOCUS_SCENES,
  ORB_DESIGNS,
  formatDurationCompact,
} from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import {
  clearProductAnalyticsEvents,
  computeProductMetricsSummary,
  loadProductAnalyticsEvents,
} from '../utils/productAnalytics';
import { AuraButton } from './AuraButton';
import { PWAInstallButton } from './PWAInstallButton';

interface ProfileSettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  sessions: SessionRecord[];
  restoreSessions: RestoreSessionRecord[];
  routines: FocusRoutine[];
  onSyncSessionsAndRoutines: (
    nextSessions: SessionRecord[],
    nextRestore: RestoreSessionRecord[],
    nextRoutines: FocusRoutine[]
  ) => void;
  soundscapePlaying: boolean;
  onToggleSoundscape: (playing: boolean) => void;
  onClearSeedSessions: () => void;
  onRestoreSeedSessions: () => void;
  onResetAllData: () => void;
  onOpenLandingPage: () => void;
  onOpenOnboarding: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  settings,
  onUpdateSettings,
  sessions,
  restoreSessions,
  routines,
  onSyncSessionsAndRoutines,
  onToggleSoundscape,
  onClearSeedSessions,
  onRestoreSeedSessions,
  onResetAllData,
  onOpenLandingPage,
  onOpenOnboarding,
}) => {
  const [notifStatus, setNotifStatus] = useState<string>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unavailable';
    }
    return Notification.permission;
  });
  const [confirmReset, setConfirmReset] = useState(false);

  // Optional Account & Cloud Sync State
  const [syncMode, setSyncMode] = useState<'login' | 'register'>('login');
  const [syncEmail, setSyncEmail] = useState(settings.syncAccountEmail || '');
  const [syncPassword, setSyncPassword] = useState('');
  const [syncDisplayName, setSyncDisplayName] = useState('');
  const [syncToken, setSyncToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('aura_sync_token_v1');
    } catch {
      return null;
    }
  });
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  // Analytics inspector refresh counter
  const [analyticsTick, setAnalyticsTick] = useState(0);

  const focusSounds = CATEGORIZED_SOUND_OPTIONS.filter(
    (s) => s.category === 'focus'
  );
  const restoreSounds = CATEGORIZED_SOUND_OPTIONS.filter(
    (s) => s.category === 'restore'
  );

  const analyticsEvents = loadProductAnalyticsEvents();
  const todayIso = new Date().toISOString().slice(0, 10);
  const productMetrics = computeProductMetricsSummary(
    sessions,
    analyticsEvents,
    todayIso
  );
  void analyticsTick;

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
      version: 'AURA_TIME_V2_STAGE_3',
      settings,
      routines,
      sessions,
      restoreSessions,
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

  const handleSyncAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncEmail.trim() || syncPassword.length < 6) {
      setSyncStatusMsg(
        'Please enter a valid email and a password of at least 6 characters.'
      );
      return;
    }
    setSyncBusy(true);
    setSyncStatusMsg(null);
    try {
      const endpoint =
        syncMode === 'register' ? '/api/sync/register' : '/api/sync/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: syncEmail.trim(),
          password: syncPassword,
          displayName: syncDisplayName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatusMsg(data.error || 'Authentication failed.');
        setSyncBusy(false);
        return;
      }

      setSyncToken(data.token);
      try {
        localStorage.setItem('aura_sync_token_v1', data.token);
      } catch {
        // ignore
      }
      onUpdateSettings({
        syncAccountEmail: data.email,
        lastCloudSyncAt: data.snapshot?.updatedAt || new Date().toISOString(),
      });
      setSyncPassword('');
      setSyncStatusMsg(
        syncMode === 'register'
          ? 'Optional sync account created. Click "Sync Now" to merge sessions.'
          : 'Signed in to sync boundary. Click "Sync Now" to merge sessions.'
      );
    } catch {
      setSyncStatusMsg('Sync server unreachable — continuing in local-first mode.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePushSync = async () => {
    if (!syncToken) return;
    setSyncBusy(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${syncToken}`,
        },
        body: JSON.stringify({
          settings,
          sessions,
          restoreSessions,
          routines,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncStatusMsg(data.error || 'Sync failed.');
        setSyncBusy(false);
        return;
      }

      if (data.snapshot) {
        onSyncSessionsAndRoutines(
          Array.isArray(data.snapshot.sessions)
            ? data.snapshot.sessions
            : sessions,
          Array.isArray(data.snapshot.restoreSessions)
            ? data.snapshot.restoreSessions
            : restoreSessions,
          Array.isArray(data.snapshot.routines) &&
            data.snapshot.routines.length > 0
            ? data.snapshot.routines
            : routines
        );
        onUpdateSettings({
          lastCloudSyncAt: data.snapshot.updatedAt,
        });
      }
      setSyncStatusMsg(
        `Synchronized (${data.mergedSessionsCount ?? sessions.length} sessions deduplicated).`
      );
    } catch {
      setSyncStatusMsg('Could not reach sync service.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSignOutSync = () => {
    setSyncToken(null);
    try {
      localStorage.removeItem('aura_sync_token_v1');
    } catch {
      // ignore
    }
    onUpdateSettings({ syncAccountEmail: null });
    setSyncStatusMsg('Signed out of sync account. Local data remains intact.');
  };

  const handleDeleteSyncedAccount = async () => {
    if (!syncToken) return;
    setSyncBusy(true);
    try {
      await fetch('/api/sync/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${syncToken}` },
      });
      setSyncToken(null);
      try {
        localStorage.removeItem('aura_sync_token_v1');
      } catch {
        // ignore
      }
      onUpdateSettings({ syncAccountEmail: null, lastCloudSyncAt: null });
      setSyncStatusMsg('Server sync account and cloud snapshot deleted.');
    } catch {
      setSyncStatusMsg('Failed to delete server sync account.');
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <section
      data-testid="profile-settings-view"
      aria-label="Sanctuary Profile and Settings"
      className="relative z-20 w-full max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
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
            Personal Focus Profile, organisms, soundscapes, optional sync, and
            DPDP-aligned privacy controls.
          </p>
        </div>

        {/* Quick Tour / Launch & Install Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            data-testid="open-onboarding-btn"
            onClick={onOpenOnboarding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-white/[0.09] text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10 cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>First-Session Guide</span>
          </button>
          <button
            type="button"
            data-testid="open-landing-page-btn"
            onClick={onOpenLandingPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#8A5CFF]/15 hover:bg-[#8A5CFF]/25 text-[#F5F6FF] border border-[#8A5CFF]/40 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>About & Aura Plus</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 0. Personal Focus Profile (AURA INTELLIGENCE) */}
          <div
            data-testid="personal-focus-profile-card"
            className="aura-glass rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2FE8FF]" />
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  PERSONAL FOCUS PROFILE · AURA INTELLIGENCE
                </h2>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] text-[#A3A1BA]">
                Local Profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A1BA] block mb-1.5">
                  Preferred Session Duration
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ preferredDurationMinutes: mins })
                      }
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                        (settings.preferredDurationMinutes ?? 45) === mins
                          ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                          : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A1BA] block mb-1.5">
                  Preferred Work Period
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'morning', label: 'Morning' },
                      { id: 'afternoon', label: 'Afternoon' },
                      { id: 'evening', label: 'Evening' },
                      { id: 'night', label: 'Late Night' },
                      { id: 'flexible', label: 'Flexible' },
                    ] as Array<{ id: PreferredWorkPeriod; label: string }>
                  ).map((period) => (
                    <button
                      key={period.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({ preferredWorkPeriod: period.id })
                      }
                      className={`px-2.5 py-1.5 rounded-xl text-xs cursor-pointer ${
                        (settings.preferredWorkPeriod ?? 'morning') ===
                        period.id
                          ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                          : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A1BA] block mb-1.5">
                  Preferred Focus Environment
                </span>
                <select
                  aria-label="Preferred Focus Environment"
                  value={settings.preferredSceneId ?? 'electric-quiet'}
                  onChange={(e) =>
                    onUpdateSettings({
                      preferredSceneId: e.target.value as FocusSceneId,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#070812]/90 border border-white/12 text-xs text-[#F5F6FF] focus:outline-none focus:border-[#2FE8FF]"
                >
                  {(Object.keys(FOCUS_SCENES) as FocusSceneId[]).map((id) => (
                    <option key={id} value={id}>
                      {FOCUS_SCENES[id].name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A3A1BA] block mb-1.5">
                  Animation Intensity
                </span>
                <div className="flex items-center gap-1.5">
                  {(
                    ['calm', 'standard', 'vivid'] as AnimationIntensity[]
                  ).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          animationIntensity: level,
                          reducedMotion: level === 'calm',
                        })
                      }
                      className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-mono uppercase cursor-pointer ${
                        (settings.animationIntensity ?? 'standard') === level
                          ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/50'
                          : 'bg-white/[0.03] text-[#A3A1BA] border border-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-[#F5F6FF] font-medium block">
                  My Aura Garden Progression
                </span>
                <span className="text-[11px] text-[#A3A1BA]">
                  Grow luminous organisms and calm milestones from completed
                  sessions
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.gardenProgressionEnabled !== false}
                data-testid="profile-garden-progression-toggle"
                onClick={() =>
                  onUpdateSettings({
                    gardenProgressionEnabled:
                      settings.gardenProgressionEnabled === false,
                  })
                }
                className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer ${
                  settings.gardenProgressionEnabled !== false
                    ? 'bg-[#2FE8FF]'
                    : 'bg-white/15'
                }`}
              >
                <span
                  className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                    settings.gardenProgressionEnabled !== false
                      ? 'translate-x-4.5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

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
                      settings.reducedMotion
                        ? 'translate-x-4.5'
                        : 'translate-x-0'
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
                      settings.audioReactive
                        ? 'translate-x-4.5'
                        : 'translate-x-0'
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

        {/* Right Column (5 cols) */}
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

          {/* 4. Optional Account & Cloud Synchronization Boundary */}
          <div
            data-testid="cloud-sync-boundary-card"
            className="aura-glass rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#2FE8FF]" />
                <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#2FE8FF]">
                  OPTIONAL ACCOUNT & SYNC BOUNDARY
                </h2>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#38F8A8]/15 text-[#38F8A8]">
                No Account Required
              </span>
            </div>
            <p className="text-xs text-[#A3A1BA] leading-relaxed mb-4">
              Aura Time works 100% locally without sign-in. Optional sync
              deduplicates sessions by ID across devices via the local server
              boundary (external Firebase/Supabase cloud database is pending
              deployment credentials).
            </p>

            {syncToken && settings.syncAccountEmail ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#38F8A8]" />
                    <div>
                      <span className="text-[#F5F6FF] font-medium block">
                        {settings.syncAccountEmail}
                      </span>
                      {settings.lastCloudSyncAt && (
                        <span className="text-[10px] font-mono text-[#A3A1BA]">
                          Last synced:{' '}
                          {new Date(settings.lastCloudSyncAt).toLocaleTimeString(
                            [],
                            { hour: '2-digit', minute: '2-digit' }
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOutSync}
                    className="flex items-center gap-1 text-[11px] text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <AuraButton
                    variant="primary"
                    size="sm"
                    onClick={handlePushSync}
                    disabled={syncBusy}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{syncBusy ? 'Syncing…' : 'Sync Now'}</span>
                  </AuraButton>
                  <button
                    type="button"
                    onClick={handleDeleteSyncedAccount}
                    className="px-3 py-1.5 rounded-full text-xs text-[#FF4FA3] hover:underline cursor-pointer"
                  >
                    Delete Sync Account
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSyncAuth} className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => setSyncMode('login')}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer ${
                      syncMode === 'login'
                        ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                        : 'text-[#A3A1BA]'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setSyncMode('register')}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] cursor-pointer ${
                      syncMode === 'register'
                        ? 'bg-[#2FE8FF]/20 text-[#F5F6FF] border border-[#2FE8FF]/40'
                        : 'text-[#A3A1BA]'
                    }`}
                  >
                    Create Sync Account
                  </button>
                </div>

                {syncMode === 'register' && (
                  <input
                    type="text"
                    value={syncDisplayName}
                    onChange={(e) => setSyncDisplayName(e.target.value)}
                    placeholder="Display name (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-xs text-[#F5F6FF] placeholder:text-[#A3A1BA]/50 focus:outline-none focus:border-[#2FE8FF]"
                  />
                )}
                <input
                  type="email"
                  data-testid="sync-email-input"
                  value={syncEmail}
                  onChange={(e) => setSyncEmail(e.target.value)}
                  placeholder="Email for optional sync"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-xs text-[#F5F6FF] placeholder:text-[#A3A1BA]/50 focus:outline-none focus:border-[#2FE8FF]"
                />
                <input
                  type="password"
                  data-testid="sync-password-input"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
                  placeholder="Password (min 6 chars)"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/12 text-xs text-[#F5F6FF] placeholder:text-[#A3A1BA]/50 focus:outline-none focus:border-[#2FE8FF]"
                />
                <AuraButton
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={syncBusy}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {syncMode === 'register'
                      ? 'Create Optional Account'
                      : 'Sign In to Sync'}
                  </span>
                </AuraButton>
              </form>
            )}

            {syncStatusMsg && (
              <p className="text-[11px] text-[#2FE8FF] mt-2.5 leading-relaxed">
                {syncStatusMsg}
              </p>
            )}
          </div>

          {/* 5. Gentle Browser Notifications */}
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

          {/* 6. Local Data Sanctuary, Consent & Product Health Metrics */}
          <div
            data-testid="privacy-data-sanctuary-card"
            className="aura-glass rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-[#38F8A8]" />
              <h2 className="text-xs font-mono uppercase tracking-[0.16em] text-[#38F8A8]">
                PRIVACY, CONSENT & DATA OWNERSHIP
              </h2>
            </div>
            <p className="text-xs text-[#A3A1BA] leading-relaxed mb-4">
              Aligned with Indian DPDP data minimization principles: your focus
              journal lives on your device, AI reflections require explicit
              consent, and you can export or erase all data anytime.
            </p>

            {/* Consent Switches */}
            <div className="space-y-3 mb-4 pb-4 border-b border-white/10 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F5F6FF] font-medium block">
                    Server-Side AI Reflection Consent
                  </span>
                  <span className="text-[11px] text-[#A3A1BA]">
                    Allow sending anonymized session summaries or task titles to
                    server-side Gemini endpoints
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(settings.aiProcessingConsent)}
                  data-testid="profile-ai-consent-toggle"
                  onClick={() =>
                    onUpdateSettings({
                      aiProcessingConsent: !settings.aiProcessingConsent,
                    })
                  }
                  className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    settings.aiProcessingConsent
                      ? 'bg-[#2FE8FF]'
                      : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                      settings.aiProcessingConsent
                        ? 'translate-x-4.5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#F5F6FF] font-medium block">
                    Local Product Health Metrics
                  </span>
                  <span className="text-[11px] text-[#A3A1BA]">
                    Record non-PII session & feature events locally on this
                    device
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.productAnalyticsConsent !== false}
                  data-testid="profile-analytics-consent-toggle"
                  onClick={() =>
                    onUpdateSettings({
                      productAnalyticsConsent:
                        settings.productAnalyticsConsent === false,
                    })
                  }
                  className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer shrink-0 ${
                    settings.productAnalyticsConsent !== false
                      ? 'bg-[#2FE8FF]'
                      : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`block w-4.5 h-4.5 rounded-full bg-[#070812] transition-transform ${
                      settings.productAnalyticsConsent !== false
                        ? 'translate-x-4.5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Product Health Metrics Summary */}
            <div className="p-3.5 rounded-2xl bg-white/[0.025] border border-white/8 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#2FE8FF]" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#2FE8FF]">
                    LOCAL PRODUCT METRICS (GENUINE SESSIONS)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearProductAnalyticsEvents();
                    setAnalyticsTick((t) => t + 1);
                  }}
                  className="text-[10px] font-mono text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
                >
                  Clear Events ({productMetrics.totalTrackedEvents})
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-white/[0.02]">
                  <span className="text-[10px] text-[#A3A1BA] block">
                    Completion
                  </span>
                  <span className="font-mono text-xs text-[#F5F6FF] font-semibold">
                    {productMetrics.sessionCompletionRatePercent ?? 0}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02]">
                  <span className="text-[10px] text-[#A3A1BA] block">
                    Habit / Wk
                  </span>
                  <span className="font-mono text-xs text-[#F5F6FF] font-semibold">
                    {productMetrics.weeklyHabitSessionsCount} sess
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02]">
                  <span className="text-[10px] text-[#A3A1BA] block">
                    Retention
                  </span>
                  <span className="font-mono text-[11px] text-[#38F8A8] font-semibold">
                    {productMetrics.d30Retained
                      ? 'D30'
                      : productMetrics.d7Retained
                      ? 'D7'
                      : productMetrics.d1Retained
                      ? 'D1'
                      : 'New'}
                  </span>
                </div>
              </div>
            </div>

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
