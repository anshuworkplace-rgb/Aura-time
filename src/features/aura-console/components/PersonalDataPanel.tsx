import React, { useState } from 'react';
import {
  AlertTriangle,
  CloudOff,
  CheckCircle2,
  Download,
  Lock,
  ShieldCheck,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type {
  RestoreSessionRecord,
  SessionRecord,
  UserSettings,
} from '../../../types/aura';
import { buildAuraDataExportBundle } from '../hooks/useAuraRhythmMetrics';
import { AURA_CONSOLE_STYLES } from '../styles/auraConsole.styles';
import type {
  AuraAccountSummary,
  AuraDataExportBundle,
} from '../types/auraConsole.types';

export interface PersonalDataPanelProps {
  settings: UserSettings;
  sessions: SessionRecord[];
  restoreSessions: RestoreSessionRecord[];
  account?: AuraAccountSummary;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onExportData?: (bundle: AuraDataExportBundle) => void;
  onDeleteAllData?: () => void;
}

export const PersonalDataPanel: React.FC<PersonalDataPanelProps> = ({
  settings,
  sessions,
  restoreSessions,
  account,
  onUpdateSettings,
  onExportData,
  onDeleteAllData,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportConfirmation, setExportConfirmation] = useState<string | null>(
    null
  );

  const effectiveEmail = account?.email ?? settings.syncAccountEmail ?? null;
  const effectiveSyncStatus =
    account?.syncStatus ?? (effectiveEmail ? 'synced' : 'local-only');
  const lastSynced = account?.lastSyncedAt ?? settings.lastCloudSyncAt ?? null;

  const handleExportClick = () => {
    const bundle = buildAuraDataExportBundle(
      settings,
      sessions,
      restoreSessions
    );
    if (onExportData) {
      onExportData(bundle);
    } else if (typeof window !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-time-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportConfirmation(
      `Exported ${bundle.summary.totalFocusSessions} focus and ${bundle.summary.totalRestoreSessions} restorative sessions.`
    );
  };

  const handleConfirmDeleteAll = () => {
    onDeleteAllData?.();
    setConfirmingDelete(false);
  };

  return (
    <div
      className="flex flex-col gap-4"
      aria-label="Personal Data, Sync, and Privacy"
    >
      {/* 1. Honest Account & Sync Status */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2FE8FF]">
            {effectiveSyncStatus === 'synced' ? (
              <UserCheck className="w-3.5 h-3.5 text-[#5EF2C4]" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-[#A3A1BA]" />
            )}
            <span>Account & Sync Posture</span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
              effectiveSyncStatus === 'synced'
                ? 'bg-[#5EF2C4]/15 border-[#5EF2C4]/40 text-[#5EF2C4]'
                : 'bg-white/[0.05] border-white/[0.1] text-[#A3A1BA]'
            }`}
          >
            {effectiveSyncStatus === 'synced'
              ? 'Cloud Synced'
              : 'Local-Only Sanctuary'}
          </span>
        </div>

        {effectiveEmail ? (
          <div className="text-xs text-[#F5F6FF] flex flex-col gap-1">
            <span>
              Signed in as <strong>{effectiveEmail}</strong>
            </span>
            {lastSynced && (
              <span className="text-[11px] text-[#A3A1BA]">
                Last verified sync: {lastSynced}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-[#A3A1BA] leading-relaxed">
            Your focus sessions, Liquid Lens restorative history, and personal
            preferences are stored locally on this device. No account is
            required to use Aura Time.
          </p>
        )}
      </div>

      {/* 2. AI-Processing & Privacy Consent Controls */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5EF2C4]" />
          <span>Consent & Data Privacy</span>
        </div>

        <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#F5F6FF]">
              AI-Assisted Session Coaching Consent
            </span>
            <span className="text-[11px] text-[#A3A1BA] mt-0.5">
              Allow optional on-demand AI task breakdown or coaching. When off,
              all rhythm observations run 100% deterministically on device.
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(settings.aiProcessingConsent)}
            onChange={(e) =>
              onUpdateSettings({ aiProcessingConsent: e.target.checked })
            }
            className="mt-1 rounded border-white/20 bg-white/5 text-[#2FE8FF]"
          />
        </label>

        <label className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[#F5F6FF]">
              Include Sample Data in Rhythm Observations
            </span>
            <span className="text-[11px] text-[#A3A1BA] mt-0.5">
              Toggle off to restrict My Rhythm analytics strictly to your own
              recorded sessions.
            </span>
          </div>
          <input
            type="checkbox"
            checked={!settings.excludeSampleDataInInsights}
            onChange={(e) =>
              onUpdateSettings({
                excludeSampleDataInInsights: !e.target.checked,
              })
            }
            className="mt-1 rounded border-white/20 bg-white/5 text-[#2FE8FF]"
          />
        </label>

        <div className="flex items-start gap-2 text-[11px] text-[#A3A1BA] pt-1">
          <Lock className="w-3.5 h-3.5 text-[#2FE8FF] shrink-0 mt-0.5" />
          <span>
            Zero third-party ad trackers. Your session records remain under your
            direct ownership and can be exported or erased at any time.
          </span>
        </div>
      </div>

      {/* 3. Session Export & Explicit Data Deletion */}
      <div className={AURA_CONSOLE_STYLES.sectionCard}>
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F6FF]">
          Data Portability & Erasure
        </h3>
        <p className="text-xs text-[#A3A1BA]">
          Archive currently holds <strong>{sessions.length}</strong> focus{' '}
          {sessions.length === 1 ? 'record' : 'records'} and{' '}
          <strong>{restoreSessions.length}</strong> restorative{' '}
          {restoreSessions.length === 1 ? 'record' : 'records'}.
        </p>

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleExportClick}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2FE8FF]/15 hover:bg-[#2FE8FF]/25 border border-[#2FE8FF]/45 text-xs font-medium text-[#F5F6FF] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Export Session Archive (JSON)</span>
          </button>

          {!confirmingDelete && (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/30 text-xs font-medium text-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Local Data</span>
            </button>
          )}
        </div>

        {exportConfirmation && (
          <div
            role="status"
            className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#5EF2C4]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{exportConfirmation}</span>
          </div>
        )}

        {/* Explicit Two-Step Deletion Confirmation */}
        {confirmingDelete && (
          <div
            role="alertdialog"
            aria-label="Confirm permanent data deletion"
            className="mt-2 p-3.5 rounded-xl bg-rose-950/50 border border-rose-400/40 flex flex-col gap-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-100">
                <strong className="block font-semibold">
                  Confirm Permanent Erasure
                </strong>
                <span className="text-rose-200/90 mt-0.5 block">
                  This will permanently remove all recorded focus sessions,
                  Liquid Lens restorative sessions, and custom preferences from
                  this browser. This action cannot be undone.
                </span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-[#F5F6FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-xs font-semibold text-[#050711]"
              >
                Confirm Delete Everything
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
