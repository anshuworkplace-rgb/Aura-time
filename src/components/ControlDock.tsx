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
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';

export type DockGroupId = 'sound' | 'time' | 'focus' | 'more' | null;

interface ControlDockProps {
  status: TimerStatus;
  durationMinutes: number;
  onChangeDuration: (mins: number) => void;
  onAddMinutes: (deltaMins: number) => void;
  scrubberOpen: boolean;
  onToggleScrubber: () => void;
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  secondaryChamberId: ChamberId | null;
  onSelectSecondaryChamber: (id: ChamberId | null) => void;
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
  durationMinutes,
  onChangeDuration,
  onAddMinutes,
  scrubberOpen,
  onToggleScrubber,
  primaryChamberId,
  onSelectPrimaryChamber,
  secondaryChamberId,
  onSelectSecondaryChamber,
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
    FOCUS_SCENES[activeSceneId] || FOCUS_SCENES['deep-current'];

  const toggleGroup = (group: Exclude<DockGroupId, null>) => {
    setOpenGroup((prev) => (prev === group ? null : group));
  };

  return (
    <div
      ref={dockRef}
      role="toolbar"
      aria-label="AURA TIME Intelligent Control Dock"
      data-testid="aura-control-dock"
      className="relative flex flex-col items-center"
    >
      {/* Floating Popover Panel Above the Dock */}
      <AnimatePresence mode="wait">
        {openGroup && (
          <motion.div
            key={openGroup}
            initial={
              settings.reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12, scale: 0.97 }
            }
            animate={
              settings.reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              settings.reducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 8, scale: 0.98 }
            }
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 30,
            }}
            className="absolute bottom-full mb-3 z-40"
          >
            {openGroup === 'sound' && (
              <SoundControlPanel
                primaryChamberId={primaryChamberId}
                onSelectPrimaryChamber={onSelectPrimaryChamber}
                secondaryChamberId={secondaryChamberId}
                onSelectSecondaryChamber={onSelectSecondaryChamber}
                isSoundPlaying={isSoundPlaying}
                onToggleSound={onToggleSound}
                ambienceVolume={settings.ambienceVolume}
                onChangeAmbienceVolume={(val) =>
                  onUpdateSettings({ ambienceVolume: val })
                }
                secondaryVolume={settings.secondaryVolume}
                onChangeSecondaryVolume={(val) =>
                  onUpdateSettings({ secondaryVolume: val })
                }
                alertVolume={settings.alertVolume}
                onChangeAlertVolume={(val) =>
                  onUpdateSettings({ alertVolume: val })
                }
                audioReactive={settings.audioReactive}
                onToggleAudioReactive={() =>
                  onUpdateSettings({ audioReactive: !settings.audioReactive })
                }
                onOpenChambersStudio={() => {
                  setOpenGroup(null);
                  onOpenOverlay('chambers');
                }}
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
                orbDesign={settings.orbDesign ?? 'original'}
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

      {/* Four-Group Compact Control Bar: SOUND | TIME | FOCUS | MORE */}
      <div className="flex items-center gap-1 p-1.5 rounded-full aura-glass shadow-2xl">
        {/* Group A: SOUND */}
        <button
          type="button"
          data-testid="dock-group-sound"
          aria-expanded={openGroup === 'sound'}
          onClick={() => toggleGroup('sound')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
            openGroup === 'sound'
              ? 'bg-white/14 text-[#F5F6FF] shadow-inner'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          {isSoundPlaying ? (
            <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF]" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-[#A3A1BA]" />
          )}
          <span className="hidden sm:inline font-display tracking-wide">
            {activeChamber.name}
          </span>
          <span className="sm:hidden font-display">Sound</span>
        </button>

        <span className="w-[1px] h-4 bg-white/10" aria-hidden="true" />

        {/* Group B: TIME */}
        <button
          type="button"
          data-testid="dock-group-time"
          aria-expanded={openGroup === 'time'}
          onClick={() => toggleGroup('time')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
            openGroup === 'time'
              ? 'bg-white/14 text-[#F5F6FF] shadow-inner'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-[#8A5CFF]" />
          <span className="font-mono tabular-nums">{durationMinutes}m</span>
        </button>

        <span className="w-[1px] h-4 bg-white/10" aria-hidden="true" />

        {/* Group C: FOCUS */}
        <button
          type="button"
          data-testid="dock-group-focus"
          aria-expanded={openGroup === 'focus'}
          onClick={() => toggleGroup('focus')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
            openGroup === 'focus'
              ? 'bg-white/14 text-[#F5F6FF] shadow-inner'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: activeScene.colors.primary,
              boxShadow: `0 0 8px ${activeScene.colors.primary}`,
            }}
            aria-hidden="true"
          />
          <span className="hidden sm:inline font-display tracking-wide">
            {activeScene.name}
          </span>
          <span className="sm:hidden font-display">Focus</span>
        </button>

        <span className="w-[1px] h-4 bg-white/10" aria-hidden="true" />

        {/* Group D: MORE */}
        <button
          type="button"
          data-testid="dock-group-more"
          aria-label="More Controls and Studio Preferences"
          aria-expanded={openGroup === 'more'}
          onClick={() => toggleGroup('more')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
            openGroup === 'more'
              ? 'bg-white/14 text-[#F5F6FF] shadow-inner'
              : 'text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/6'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="hidden md:inline font-display tracking-wide">
            More
          </span>
        </button>
      </div>
    </div>
  );
};
