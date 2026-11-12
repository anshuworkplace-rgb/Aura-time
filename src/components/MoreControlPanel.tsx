import React from 'react';
import { TimerStatus, UserSettings } from '../types/aura';
import { AuraButton } from './AuraButton';
import {
  Maximize2,
  PictureInPicture2,
  SkipForward,
  RotateCcw,
  Terminal,
  BarChart3,
  Eye,
  Sparkles,
  Type,
} from 'lucide-react';

interface MoreControlPanelProps {
  status: TimerStatus;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  isFloatingOpen: boolean;
  onToggleFloating: () => void;
  onToggleFullScreen: () => void;
  onCompleteSession: () => void;
  onResetSession: () => void;
  onOpenCommandPalette: () => void;
  onOpenInsights: () => void;
}

export const MoreControlPanel: React.FC<MoreControlPanelProps> = ({
  status,
  settings,
  onUpdateSettings,
  isFloatingOpen,
  onToggleFloating,
  onToggleFullScreen,
  onCompleteSession,
  onResetSession,
  onOpenCommandPalette,
  onOpenInsights,
}) => {
  const canComplete = status === 'running' || status === 'paused';

  return (
    <div
      role="dialog"
      aria-label="Session Actions and Studio Preferences"
      data-testid="more-control-panel"
      className="w-[calc(100vw-2rem)] sm:w-92 max-h-[72vh] overflow-y-auto rounded-3xl aura-glass-elevated p-4 sm:p-5 flex flex-col gap-3.5 text-xs text-[#F5F6FF]"
    >
      {/* Session Actions: Complete, Reset, Floating Capsule, Fullscreen */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-[#A3A1BA]">
          Session & Window Controls
        </span>
        <div className="grid grid-cols-2 gap-2">
          <AuraButton
            variant="secondary"
            size="sm"
            active={isFloatingOpen}
            reducedMotion={settings.reducedMotion}
            data-testid="dock-floating-btn"
            onClick={onToggleFloating}
            icon={<PictureInPicture2 className="w-3.5 h-3.5 text-[#2FE8FF]" />}
            className="justify-start"
          >
            Floating Timer
          </AuraButton>

          <AuraButton
            variant="secondary"
            size="sm"
            reducedMotion={settings.reducedMotion}
            data-testid="dock-fullscreen-btn"
            onClick={onToggleFullScreen}
            icon={<Maximize2 className="w-3.5 h-3.5" />}
            className="justify-start"
          >
            Fullscreen (F)
          </AuraButton>

          <AuraButton
            variant="secondary"
            size="sm"
            disabled={!canComplete}
            reducedMotion={settings.reducedMotion}
            data-testid="dock-complete-btn"
            onClick={onCompleteSession}
            icon={<SkipForward className="w-3.5 h-3.5 text-[#22E5A8]" />}
            className="justify-start"
          >
            Complete (S)
          </AuraButton>

          <AuraButton
            variant="danger"
            size="sm"
            reducedMotion={settings.reducedMotion}
            data-testid="dock-reset-btn"
            onClick={onResetSession}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="justify-start"
          >
            Reset (R)
          </AuraButton>
        </div>
      </div>

      {/* Accessibility & Performance Calibration */}
      <div className="flex flex-col gap-2 bg-black/25 rounded-2xl p-3.5 border border-white/8">
        <span className="text-[11px] text-[#A3A1BA]">
          Accessibility & Optical Comfort
        </span>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between py-1">
          <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#8A5CFF]" />
            <span>Reduced Motion</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.reducedMotion}
            data-testid="dock-reduced-motion-switch"
            onClick={() =>
              onUpdateSettings({ reducedMotion: !settings.reducedMotion })
            }
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
              settings.reducedMotion
                ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50'
                : 'bg-white/6 text-[#A3A1BA] border-white/10 hover:text-[#F5F6FF]'
            }`}
          >
            {settings.reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between py-1">
          <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
            <Eye className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>High Contrast Edges</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.highContrast}
            data-testid="dock-high-contrast-switch"
            onClick={() =>
              onUpdateSettings({ highContrast: !settings.highContrast })
            }
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
              settings.highContrast
                ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50'
                : 'bg-white/6 text-[#A3A1BA] border-white/10 hover:text-[#F5F6FF]'
            }`}
          >
            {settings.highContrast ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Timer Numeral Scale */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/8">
          <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
            <Type className="w-3.5 h-3.5 text-[#A3A1BA]" />
            <span>Numeral Scale</span>
          </span>
          <div className="flex items-center gap-1">
            {(['default', 'large', 'monumental'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => onUpdateSettings({ timerTextScale: sc })}
                className={`px-2 py-0.5 rounded-lg text-[10px] capitalize border transition-colors cursor-pointer ${
                  settings.timerTextScale === sc
                    ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50'
                    : 'bg-white/5 text-[#A3A1BA] border-white/8 hover:text-[#F5F6FF]'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        {/* Intelligent Mobile Performance Engine Profile */}
        <div
          data-testid="dock-performance-mode-group"
          className="flex items-center justify-between pt-1.5 border-t border-white/8"
        >
          <span className="inline-flex items-center gap-2 text-[#F5F6FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#2FE8FF]" />
            <span>Render Engine</span>
          </span>
          <div className="flex items-center gap-1">
            {(
              [
                { id: 'auto', label: 'Auto' },
                { id: 'balanced', label: 'Balanced' },
                { id: 'ultra', label: 'Ultra' },
              ] as const
            ).map((mode) => {
              const active = (settings.performanceMode ?? 'auto') === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  data-testid={`perf-mode-${mode.id}`}
                  onClick={() =>
                    onUpdateSettings({ performanceMode: mode.id })
                  }
                  className={`px-2 py-0.5 rounded-lg text-[10px] border transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border-[#2FE8FF]/50'
                      : 'bg-white/5 text-[#A3A1BA] border-white/8 hover:text-[#F5F6FF]'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Studio Navigation: Visual Focus Journal & Command Palette */}
      <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
        <AuraButton
          variant="secondary"
          size="sm"
          reducedMotion={settings.reducedMotion}
          onClick={onOpenInsights}
          icon={<BarChart3 className="w-3.5 h-3.5 text-[#2FE8FF]" />}
        >
          Focus Journal
        </AuraButton>

        <AuraButton
          variant="secondary"
          size="sm"
          reducedMotion={settings.reducedMotion}
          onClick={onOpenCommandPalette}
          icon={<Terminal className="w-3.5 h-3.5 text-[#8A5CFF]" />}
        >
          Commands (⌘K)
        </AuraButton>
      </div>
    </div>
  );
};
