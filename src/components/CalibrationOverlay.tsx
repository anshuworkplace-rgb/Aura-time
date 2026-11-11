import React, { useRef, useState } from 'react';
import {
  ActiveOverlay,
  FocusSceneId,
  UserSettings,
} from '../types/aura';
import { FOCUS_SCENES, SNAP_PRESET_MINUTES } from '../utils/focusEngine';
import { X, Search } from 'lucide-react';

interface CalibrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onSelectDuration: (mins: number) => void;
  onSelectScene: (id: FocusSceneId) => void;
  onOpenOverlay: (overlay: ActiveOverlay) => void;
  isFloatingOpen: boolean;
  onToggleFloating: () => void;
  onToggleFullScreen: () => void;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSelectDuration,
  onSelectScene,
  onOpenOverlay,
  isFloatingOpen,
  onToggleFloating,
  onToggleFullScreen,
}) => {
  const [query, setQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);
  const actionListRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const quickActions = [
    ...SNAP_PRESET_MINUTES.map((mins) => ({
      id: `dur-${mins}`,
      label: `Set duration to ${mins} minutes`,
      tag: 'Duration',
      run: () => {
        onSelectDuration(mins);
        onClose();
      },
    })),
    ...(Object.keys(FOCUS_SCENES) as FocusSceneId[]).map((sId) => ({
      id: `scene-${sId}`,
      label: `Enter Focus Scene: ${FOCUS_SCENES[sId].name}`,
      tag: 'Scene',
      run: () => {
        onSelectScene(sId);
        onClose();
      },
    })),
    {
      id: 'open-chambers',
      label: 'Open Chambers Sound Studio',
      tag: 'Audio',
      run: () => onOpenOverlay('chambers'),
    },
    {
      id: 'open-insights',
      label: 'Open Visual Focus Journal (Insights)',
      tag: 'Journal',
      run: () => onOpenOverlay('insights'),
    },
    {
      id: 'toggle-droplet',
      label: isFloatingOpen
        ? 'Hide Floating Liquid Droplet Timer'
        : 'Launch Floating Liquid Droplet Timer',
      tag: 'Widget',
      run: () => {
        onToggleFloating();
        onClose();
      },
    },
    {
      id: 'toggle-fullscreen',
      label: 'Toggle Full-Screen Immersion (Shortcut: F)',
      tag: 'View',
      run: () => {
        onToggleFullScreen();
        onClose();
      },
    },
  ];

  const queryTerms = query.toLowerCase().trim().split(/\\s+/).filter(Boolean);
  const filteredActions = quickActions.filter((action) => {
    const searchable = (action.label + ' ' + action.tag).toLowerCase();
    return queryTerms.every((term) => searchable.includes(term));
  });

  const moveCommandFocus = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return;
    const buttons = Array.from(actionListRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    if (!buttons.length) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(event.currentTarget);
    if (event.key === 'Home') buttons[0].focus();
    else if (event.key === 'End') buttons[buttons.length - 1].focus();
    else if (event.key === 'ArrowDown') buttons[(currentIndex + 1) % buttons.length].focus();
    else if (currentIndex <= 0) commandInputRef.current?.focus();
    else buttons[currentIndex - 1].focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette and Studio Calibration"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-[#0E1124]/95 border border-white/12 p-6 sm:p-7 shadow-2xl flex flex-col gap-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Command Search Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3 flex-1">
            <Search className="w-4 h-4 text-[#2FE8FF] shrink-0" />
            <label htmlFor="calibration-command-input" className="sr-only">
              Search commands or settings
            </label>
            <input
              ref={commandInputRef}
              id="calibration-command-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  actionListRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder="Search commands, scenes, durations..."
              className="w-full bg-transparent text-sm text-[#F5F6FF] placeholder:text-[#A3A1BA]/70 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Calibration"
            className="p-1.5 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Command Actions */}
        <div ref={actionListRef} aria-label="Matching commands" className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
          {filteredActions.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={act.run}
              onKeyDown={moveCommandFocus}
              className="aura-control flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/10 text-left text-xs text-[#F5F6FF]"
            >
              <span>{act.label}</span>
              <span className="text-[11px] font-mono text-[#2FE8FF]">
                {act.tag}
              </span>
            </button>
          ))}
          {filteredActions.length === 0 && (
            <p className="px-3.5 py-4 text-xs text-[#A3A1BA]" role="status">
              No matching commands. Try “audio”, “scene” or “duration”.
            </p>
          )}
        </div>
        <p className="-mt-4 text-[10px] font-mono text-[#77758E]">↑ ↓ navigate · Home / End jump · Enter run · Esc close</p>

        {/* Studio Calibration & Accessibility Section */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
              Calibration & Accessibility
            </h3>
            <span className="text-[11px] font-mono text-[#A3A1BA]">
              Shortcuts: Space · F · M · R · ⌘K
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Timer Text Size */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/8 flex flex-col gap-2">
              <span className="text-xs text-[#A3A1BA]">Timer Text Scale</span>
              <div className="flex items-center gap-1">
                {(['default', 'large', 'monumental'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdateSettings({ timerTextScale: sz })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      settings.timerTextScale === sz
                        ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border border-[#2FE8FF]/40'
                        : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Focus Goal & Break Duration */}
            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/8 flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="daily-goal-mins"
                  className="text-xs text-[#A3A1BA]"
                >
                  Daily Goal (min)
                </label>
                <input
                  id="daily-goal-mins"
                  type="number"
                  min={30}
                  max={600}
                  step={15}
                  value={settings.dailyGoalMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      dailyGoalMinutes: Math.max(
                        30,
                        parseInt(e.target.value, 10) || 180
                      ),
                    })
                  }
                  className="w-20 px-2.5 py-1 rounded-lg bg-white/6 border border-white/12 text-xs font-mono tabular-nums text-[#F5F6FF]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="break-duration-mins"
                  className="text-xs text-[#A3A1BA]"
                >
                  Break (min)
                </label>
                <input
                  id="break-duration-mins"
                  type="number"
                  min={1}
                  max={60}
                  value={settings.breakMinutes}
                  onChange={(e) =>
                    onUpdateSettings({
                      breakMinutes: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 10
                      ),
                    })
                  }
                  className="w-20 px-2.5 py-1 rounded-lg bg-white/6 border border-white/12 text-xs font-mono tabular-nums text-[#F5F6FF]"
                />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                {
                  key: 'audioReactive',
                  label: 'Audio-reactive Living Lens refraction',
                },
                {
                  key: 'reducedMotion',
                  label: 'Reduced motion mode',
                },
                {
                  key: 'highContrast',
                  label: 'High-contrast optical rim',
                },
                {
                  key: 'desktopNotifications',
                  label: 'Completion notifications',
                },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                role="switch"
                aria-checked={settings[item.key]}
                onClick={() =>
                  onUpdateSettings({ [item.key]: !settings[item.key] })
                }
                className="aura-control flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/30 border border-white/8 text-xs text-[#F5F6FF]"
              >
                <span>{item.label}</span>
                <span
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${
                    settings[item.key] ? 'bg-[#2FE8FF]' : 'bg-white/15'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full bg-[#070812] transition-transform ${
                      settings[item.key] ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
