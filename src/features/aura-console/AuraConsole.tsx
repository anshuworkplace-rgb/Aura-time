import React, { useEffect, useState } from 'react';
import { Activity, Shield, Sliders, X } from 'lucide-react';
import { MyRhythmPanel } from './components/MyRhythmPanel';
import { PersonalDataPanel } from './components/PersonalDataPanel';
import { PreferencesPanel } from './components/PreferencesPanel';
import { useAuraRhythmMetrics } from './hooks/useAuraRhythmMetrics';
import { AURA_CONSOLE_STYLES } from './styles/auraConsole.styles';
import type {
  AuraConsoleDestination,
  AuraConsoleProps,
} from './types/auraConsole.types';

const DESTINATION_TABS: {
  id: AuraConsoleDestination;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'my-rhythm',
    label: 'My Rhythm',
    subtitle: 'Actual focus & observations',
    icon: Activity,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    subtitle: 'Organism, atmosphere & audio',
    icon: Sliders,
  },
  {
    id: 'personal-data',
    label: 'Personal Data',
    subtitle: 'Sync, privacy & export',
    icon: Shield,
  },
];

/**
 * AuraConsole — Floating personal control center replacing separate Reflect and Profile pages.
 * Renders as a floating side sheet on desktop/laptop and a full-height sheet on mobile.
 */
export const AuraConsole: React.FC<AuraConsoleProps> = ({
  isOpen,
  onClose,
  activeDestination,
  initialDestination = 'my-rhythm',
  onDestinationChange,
  sessions = [],
  restoreSessions = [],
  settings,
  onUpdateSettings,
  onSelectOrganism,
  onSelectScene,
  onSelectChamber,
  account,
  onExportData,
  onDeleteAllData,
  onClearSampleData,
  referenceIsoDate,
}) => {
  const [internalDestination, setInternalDestination] =
    useState<AuraConsoleDestination>(initialDestination);

  const currentDestination = activeDestination ?? internalDestination;

  useEffect(() => {
    if (initialDestination && !activeDestination) {
      setInternalDestination(initialDestination);
    }
  }, [initialDestination, activeDestination]);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const rhythmSummary = useAuraRhythmMetrics(
    sessions,
    restoreSessions,
    settings,
    referenceIsoDate
  );

  if (!isOpen) return null;

  const handleSelectDestination = (dest: AuraConsoleDestination) => {
    setInternalDestination(dest);
    onDestinationChange?.(dest);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aura Console personal control center"
      className="fixed inset-0 z-50"
    >
      {/* Translucent Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={AURA_CONSOLE_STYLES.backdrop}
      />

      {/* Floating Side Sheet (Desktop) / Full-Height Sheet (Mobile) */}
      <aside className={AURA_CONSOLE_STYLES.sheetContainer}>
        {/* Sheet Header */}
        <header className="px-5 pt-5 pb-4 border-b border-white/[0.08] flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.24em] text-[#2FE8FF] font-semibold">
                Aura Console
              </span>
              <h2 className="text-base font-medium text-[#F5F6FF]">
                Personal Rhythm & Sanctuary Controls
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Aura Console"
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Consolidated Destinations Navigation */}
          <nav
            aria-label="Aura Console destinations"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[#050711]/80 border border-white/[0.07]"
          >
            {DESTINATION_TABS.map((tab) => {
              const Icon = tab.icon;
              const selected = currentDestination === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => handleSelectDestination(tab.id)}
                  className={`flex flex-col items-start p-2.5 rounded-xl text-left transition-all ${
                    selected
                      ? 'bg-[#2FE8FF]/15 border border-[#2FE8FF]/45 text-[#F5F6FF] shadow-[0_0_20px_rgba(47,232,255,0.12)]'
                      : 'text-[#A3A1BA] hover:text-[#F5F6FF] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Icon className="w-3.5 h-3.5 text-[#2FE8FF]" />
                    <span>{tab.label}</span>
                  </div>
                  <span className="hidden sm:block text-[10px] text-[#A3A1BA] mt-0.5 line-clamp-1">
                    {tab.subtitle}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Scrollable Destination Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {currentDestination === 'my-rhythm' && (
            <MyRhythmPanel
              summary={rhythmSummary}
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onClearSampleData={onClearSampleData}
            />
          )}

          {currentDestination === 'preferences' && (
            <PreferencesPanel
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onSelectOrganism={onSelectOrganism}
              onSelectScene={onSelectScene}
              onSelectChamber={onSelectChamber}
            />
          )}

          {currentDestination === 'personal-data' && (
            <PersonalDataPanel
              settings={settings}
              sessions={sessions}
              restoreSessions={restoreSessions}
              account={account}
              onUpdateSettings={onUpdateSettings}
              onExportData={onExportData}
              onDeleteAllData={onDeleteAllData}
            />
          )}
        </div>
      </aside>
    </div>
  );
};

export default AuraConsole;
