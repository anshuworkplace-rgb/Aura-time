import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveOverlay,
  ChamberId,
  FocusSceneId,
  UserSettings,
} from '../types/aura';
import {
  CHAMBERS,
  FOCUS_SCENES,
  SNAP_PRESET_MINUTES,
} from '../utils/focusEngine';
import { X, Search, CornerDownLeft } from 'lucide-react';

interface CalibrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  onSelectDuration: (mins: number) => void;
  onSelectScene: (id: FocusSceneId) => void;
  onSelectChamber?: (id: ChamberId) => void;
  onPrimaryAction?: () => void;
  onResetSession?: () => void;
  onOpenOverlay: (overlay: ActiveOverlay) => void;
  isFloatingOpen: boolean;
  onToggleFloating: () => void;
  onToggleFullScreen: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  tag: string;
  shortcut?: string;
  run: () => void;
}

export const CalibrationOverlay: React.FC<CalibrationOverlayProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSelectDuration,
  onSelectScene,
  onSelectChamber,
  onPrimaryAction,
  onResetSession,
  onOpenOverlay,
  isFloatingOpen,
  onToggleFloating,
  onToggleFullScreen,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus search input on open and restore focus on close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery('');
      setSelectedIndex(0);
      const id = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => window.clearTimeout(id);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const quickActions: CommandItem[] = [
    ...(onPrimaryAction
      ? [
          {
            id: 'cmd-primary-session',
            label: 'Begin / Pause / Resume Focus Session',
            tag: 'Session',
            shortcut: 'Space',
            run: () => {
              onPrimaryAction();
              onClose();
            },
          },
        ]
      : []),
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
    ...(onSelectChamber
      ? CHAMBERS.slice(0, 5).map((ch) => ({
          id: `chamber-${ch.id}`,
          label: `Switch Sound Chamber: ${ch.name}`,
          tag: 'Sound',
          run: () => {
            onSelectChamber(ch.id);
            onClose();
          },
        }))
      : []),
    {
      id: 'open-chambers',
      label: 'Open Chambers Sound Studio',
      tag: 'Audio',
      run: () => onOpenOverlay('chambers'),
    },
    {
      id: 'open-scenes',
      label: 'Open Focus Scenes Gallery',
      tag: 'Visual',
      run: () => onOpenOverlay('scenes'),
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
      label: 'Toggle Full-Screen Immersion',
      tag: 'View',
      shortcut: 'F',
      run: () => {
        onToggleFullScreen();
        onClose();
      },
    },
    ...(onResetSession
      ? [
          {
            id: 'cmd-reset-session',
            label: 'Reset Current Session',
            tag: 'Session',
            shortcut: 'R',
            run: () => {
              onResetSession();
              onClose();
            },
          },
        ]
      : []),
  ];

  const filteredActions = quickActions.filter(
    (a) =>
      !query.trim() ||
      a.label.toLowerCase().includes(query.trim().toLowerCase()) ||
      a.tag.toLowerCase().includes(query.trim().toLowerCase())
  );

  const safeIndex =
    filteredActions.length > 0
      ? Math.min(selectedIndex, filteredActions.length - 1)
      : 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredActions.length > 0) {
        setSelectedIndex(
          (prev) => (prev - 1 + filteredActions.length) % filteredActions.length
        );
      }
    } else if (e.key === 'Enter') {
      if (
        document.activeElement === searchInputRef.current &&
        filteredActions[safeIndex]
      ) {
        e.preventDefault();
        filteredActions[safeIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette and Studio Calibration"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-2xl rounded-3xl aura-glass-elevated p-6 sm:p-7 flex flex-col gap-6 my-auto"
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
              ref={searchInputRef}
              id="calibration-command-input"
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search commands, Focus Scenes, Chambers, or durations..."
              className="w-full bg-transparent text-sm text-[#F5F6FF] placeholder:text-[#A3A1BA]/70 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/6 border border-white/10 text-[10px] font-mono text-[#A3A1BA]">
              ↑↓ Navigate · ↵ Run
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Calibration"
              className="p-1.5 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Single Unified Command List with Keyboard Highlight */}
        <div
          role="listbox"
          aria-label="Quick Commands"
          className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1"
        >
          {filteredActions.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#A3A1BA]">
              No matching commands found for “{query}”
            </div>
          ) : (
            filteredActions.map((act, idx) => {
              const isHighlighted = idx === safeIndex;
              return (
                <button
                  key={act.id}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={act.run}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-[#2FE8FF]/16 text-[#F5F6FF] border border-[#2FE8FF]/35'
                      : 'bg-white/[0.025] hover:bg-white/8 text-[#F5F6FF]/90 border border-transparent'
                  }`}
                >
                  <span className="truncate pr-3">{act.label}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {act.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-[#F5F6FF]">
                        {act.shortcut}
                      </kbd>
                    )}
                    <span className="text-[11px] font-mono text-[#2FE8FF]">
                      {act.tag}
                    </span>
                    {isHighlighted && (
                      <CornerDownLeft className="w-3 h-3 text-[#2FE8FF]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Studio Calibration & Accessibility Section */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-[#F5F6FF]">
              Calibration & Accessibility
            </h3>
            <span className="text-[11px] font-mono text-[#A3A1BA]">
              Shortcuts: Space · F · M · R · S · ⌘K
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
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
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
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-black/30 border border-white/8 text-xs text-[#F5F6FF] cursor-pointer"
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
