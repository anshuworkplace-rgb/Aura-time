import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ActiveOverlay,
  ChamberId,
  FocusImmersionMode,
  FocusSceneId,
  TimerStatus,
  UserSettings,
} from '../types/aura';
import { CHAMBERS, FOCUS_SCENES } from '../utils/focusEngine';
import { SoundControlPanel } from './SoundControlPanel';
import { TimeControlPanel } from './TimeControlPanel';
import { FocusControlPanel } from './FocusControlPanel';
import { MoreControlPanel } from './MoreControlPanel';
import {
  Volume2,
  VolumeX,
  Clock,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export type DockGroupId = 'sound' | 'time' | 'focus' | 'more' | null;

interface ControlDockProps {
  status: TimerStatus;
  primaryActionText?: string;
  onPrimaryAction?: () => void;
  durationMinutes: number;
  onChangeDuration: (mins: number) => void;
  onAddMinutes: (deltaMins: number) => void;
  scrubberOpen: boolean;
  onToggleScrubber: () => void;
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  isSoundPlaying: boolean;
  onToggleSound: () => void;
  activeSceneId: FocusSceneId;
  onSelectScene: (id: FocusSceneId) => void;
  immersionMode: FocusImmersionMode;
  onChangeImmersionMode: (mode: FocusImmersionMode) => void;
  settings: UserSettings;
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  isFloatingOpen: boolean;
  onToggleFloating: () => void;
  onToggleFullScreen: () => void;
  onCompleteSession: () => void;
  onResetSession: () => void;
  onOpenOverlay: (overlay: ActiveOverlay) => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  status,
  primaryActionText = 'Begin',
  onPrimaryAction,
  durationMinutes,
  onChangeDuration,
  onAddMinutes,
  scrubberOpen,
  onToggleScrubber,
  primaryChamberId,
  onSelectPrimaryChamber,
  isSoundPlaying,
  onToggleSound,
  activeSceneId,
  onSelectScene,
  immersionMode,
  onChangeImmersionMode,
  settings,
  onUpdateSettings,
  isFloatingOpen,
  onToggleFloating,
  onToggleFullScreen,
  onCompleteSession,
  onResetSession,
  onOpenOverlay,
}) => {
  const [openGroup, setOpenGroup] = useState<DockGroupId>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Close open popover on outside pointer down or Escape
  useEffect(() => {
    if (!openGroup) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpenGroup(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openGroup]);

  const activeChamber =
    CHAMBERS.find((c) => c.id === primaryChamberId) || CHAMBERS[0];
  const activeScene =
    FOCUS_SCENES[activeSceneId] || FOCUS_SCENES['electric-quiet'];

  const toggleGroup = (group: Exclude<DockGroupId, null>) => {
    setOpenGroup((prev) => (prev === group ? null : group));
  };

  const isRunning = status === 'running';

  const isLeftDrawer = openGroup === 'sound' || openGroup === 'time';

  return (
    <div
      ref={dockRef}
      role="toolbar"
      aria-label="Session and Environment Controls"
      data-testid="aura-control-dock"
      className="relative flex flex-col items-center max-w-full"
    >
      {/* Compact Floating Panel / Drawer */}
      <AnimatePresence mode="wait">
        {openGroup && (
          <motion.div
            key={openGroup}
            initial={
              settings.reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: isLeftDrawer ? -14 : 14, scale: 0.98 }
            }
            animate={
              settings.reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, x: 0, scale: 1 }
            }
            exit={
              settings.reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: isLeftDrawer ? -10 : 10, scale: 0.98 }
            }
            transition={{
              duration: 0.18,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={`fixed z-50 bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 max-w-[calc(100vw-1.25rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto rounded-3xl ${
              isLeftDrawer
                ? 'lg:left-6 lg:right-auto'
                : 'lg:right-6 lg:left-auto'
            }`}
          >
            {openGroup === 'sound' && (
              <SoundControlPanel
                primaryChamberId={primaryChamberId}
                onSelectPrimaryChamber={(id) => {
                  onSelectPrimaryChamber(id);
                }}
                isSoundPlaying={isSoundPlaying}
                onToggleSound={onToggleSound}
                ambienceVolume={settings.ambienceVolume}
                onChangeAmbienceVolume={(vol) =>
                  onUpdateSettings({ ambienceVolume: vol, soundMuted: false })
                }
                alertVolume={settings.alertVolume}
                onChangeAlertVolume={(vol) =>
                  onUpdateSettings({ alertVolume: vol })
                }
                onClose={() => setOpenGroup(null)}
                reducedMotion={settings.reducedMotion}
              />
            )}

            {openGroup === 'time' && (
              <TimeControlPanel
                status={status}
                durationMinutes={durationMinutes}
                onChangeDuration={onChangeDuration}
                onAddMinutes={onAddMinutes}
                scrubberOpen={scrubberOpen}
                onToggleScrubber={onToggleScrubber}
                reducedMotion={settings.reducedMotion}
              />
            )}

            {openGroup === 'focus' && (
              <FocusControlPanel
                immersionMode={immersionMode}
                onChangeImmersionMode={onChangeImmersionMode}
                orbDesign={settings.orbDesign ?? 'celestial-jelly'}
                onChangeOrbDesign={(design) =>
                  onUpdateSettings({ orbDesign: design })
                }
                activeSceneId={activeSceneId}
                onSelectScene={onSelectScene}
                backgroundMix={settings.backgroundMix ?? 0.52}
                onChangeBackgroundMix={(mix) =>
                  onUpdateSettings({ backgroundMix: mix })
                }
                onOpenScenesGallery={() => {
                  setOpenGroup(null);
                  onOpenOverlay('scenes');
                }}
                reducedMotion={settings.reducedMotion}
              />
            )}

            {openGroup === 'more' && (
              <MoreControlPanel
                status={status}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                isFloatingOpen={isFloatingOpen}
                onToggleFloating={onToggleFloating}
                onToggleFullScreen={onToggleFullScreen}
                onCompleteSession={() => {
                  setOpenGroup(null);
                  onCompleteSession();
                }}
                onResetSession={() => {
                  setOpenGroup(null);
                  onResetSession();
                }}
                onOpenCommandPalette={() => {
                  setOpenGroup(null);
                  onOpenOverlay('calibration');
                }}
                onOpenInsights={() => {
                  setOpenGroup(null);
                  onOpenOverlay('insights');
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Compact Control Bar: [Play/Pause] [Reset] [Active Controls] | [Time] | [Soundscape] | [Atmosphere] | [Settings] */}
      <div className="flex items-center gap-0.5 sm:gap-1 p-1 sm:p-1.5 rounded-full aura-glass shadow-2xl max-w-[calc(100vw-1rem)]">
        {/* Primary Session Action: Play / Pause / Resume */}
        {onPrimaryAction && (
          <button
            type="button"
            data-testid="primary-action-btn"
            onClick={() => {
              setOpenGroup(null);
              onPrimaryAction();
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
              isRunning
                ? 'bg-white/14 text-[#F5F6FF] hover:bg-white/20'
                : 'text-[#070812] hover:brightness-110 shadow-sm'
            }`}
            style={
              isRunning
                ? {
                    boxShadow: `inset 0 0 0 1px ${activeScene.colors.secondary}55`,
                  }
                : {
                    background: `linear-gradient(135deg, #F5F6FF 0%, ${activeScene.colors.secondary} 100%)`,
                  }
            }
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            )}
            <span>{primaryActionText}</span>
          </button>
        )}

        {/* Quick Reset Button */}
        <button
          type="button"
          data-testid="dock-quick-reset-btn"
          aria-label="Reset session"
          title="Reset session (R)"
          onClick={() => {
            setOpenGroup(null);
            onResetSession();
          }}
          className="p-1.5 sm:p-2 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/8 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Active Session Direct Actions: Extend +5m, End Session, Minimal Mode */}
        {(status === 'running' || status === 'paused') && (
          <>
            <button
              type="button"
              data-testid="dock-extend-5m-btn"
              onClick={() => onAddMinutes(5)}
              title="Extend session by 5 minutes"
              className="px-2 sm:px-2.5 py-1.5 rounded-full text-[11px] font-mono text-[#2FE8FF] hover:bg-[#2FE8FF]/14 transition-colors cursor-pointer shrink-0"
            >
              +5m
            </button>
            <button
              type="button"
              data-testid="dock-end-session-btn"
              onClick={() => {
                setOpenGroup(null);
                onCompleteSession();
              }}
              title="End session and log actual focused time"
              className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-medium text-[#FFB08A] hover:bg-[#FFB08A]/14 transition-colors cursor-pointer shrink-0"
            >
              End Session
            </button>
            <button
              type="button"
              data-testid="dock-minimal-mode-btn"
              onClick={() =>
                onChangeImmersionMode(
                  immersionMode === 'minimal' ? 'balanced' : 'minimal'
                )
              }
              title="Toggle minimal distraction-free mode (M)"
              className={`hidden md:inline-flex px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                immersionMode === 'minimal'
                  ? 'bg-[#2FE8FF]/20 text-[#2FE8FF]'
                  : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
              }`}
            >
              {immersionMode === 'minimal' ? 'Exit Minimal' : 'Minimal Mode'}
            </button>
          </>
        )}

        <span
          className="hidden sm:block w-[1px] h-4 bg-white/10 mx-0.5 shrink-0"
          aria-hidden="true"
        />

        {/* Duration / Time */}
        <button
          type="button"
          data-testid="dock-group-time"
          aria-label={`Duration ${durationMinutes} minutes`}
          aria-expanded={openGroup === 'time'}
          onClick={() => toggleGroup('time')}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openGroup === 'time'
              ? 'bg-white/14 text-[#F5F6FF]'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#8A5CFF] shrink-0" />
          <span className="font-mono tabular-nums">{durationMinutes}m</span>
        </button>

        <span
          className="hidden sm:block w-[1px] h-4 bg-white/10 shrink-0"
          aria-hidden="true"
        />

        {/* Single Smart Soundscape Button */}
        <button
          type="button"
          data-testid="dock-group-sound"
          aria-label={`Soundscape: ${activeChamber.name}`}
          aria-expanded={openGroup === 'sound'}
          onClick={() => toggleGroup('sound')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openGroup === 'sound'
              ? 'bg-white/14 text-[#F5F6FF]'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          {isSoundPlaying ? (
            <Volume2
              className="w-3.5 h-3.5 shrink-0 transition-colors duration-300"
              style={{ color: activeChamber.primaryHex }}
            />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#A3A1BA] shrink-0" />
          )}
          <span className="hidden sm:inline tracking-wide max-w-[124px] truncate">
            {activeChamber.name}
          </span>
          <span className="sm:hidden">{activeChamber.name.split(' ')[0]}</span>
        </button>

        <span
          className="hidden sm:block w-[1px] h-4 bg-white/10 shrink-0"
          aria-hidden="true"
        />

        {/* Atmosphere Selector Trigger */}
        <button
          type="button"
          data-testid="dock-group-focus"
          aria-label={`Atmosphere: ${activeScene.name}`}
          aria-expanded={openGroup === 'focus'}
          onClick={() => toggleGroup('focus')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openGroup === 'focus'
              ? 'bg-white/14 text-[#F5F6FF]'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              background: `linear-gradient(135deg, ${activeScene.colors.primary}, ${activeScene.colors.secondary})`,
            }}
            aria-hidden="true"
          />
          <span className="hidden sm:inline tracking-wide max-w-[116px] truncate">
            {activeScene.name}
          </span>
          <span className="sm:hidden">{activeScene.name.split(' ')[0]}</span>
        </button>

        <span
          className="hidden sm:block w-[1px] h-4 bg-white/10 shrink-0"
          aria-hidden="true"
        />

        {/* Settings & Studio Preferences Trigger */}
        <button
          type="button"
          data-testid="dock-group-more"
          aria-label="Settings and Studio Preferences"
          aria-expanded={openGroup === 'more'}
          title="Settings & Preferences"
          onClick={() => toggleGroup('more')}
          className={`flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            openGroup === 'more'
              ? 'bg-white/14 text-[#F5F6FF]'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden md:inline tracking-wide">Settings</span>
        </button>
      </div>
    </div>
  );
};
