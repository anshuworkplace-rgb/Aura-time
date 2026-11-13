import type {
  ChamberId,
  FocusSceneId,
  OrbDesignId,
  RestoreSessionRecord,
  SessionRecord,
  UserSettings,
} from '../../../types/aura';

/**
 * The three consolidated destinations inside Aura Console.
 * Replaces separate Reflect and Profile primary navigation tabs.
 */
export type AuraConsoleDestination =
  | 'my-rhythm'
  | 'preferences'
  | 'personal-data';

/**
 * Canonical three primary organisms in Aura Time:
 * 1. Liquid Lens ('original' OrbDesignId or restorative organism)
 * 2. Celestial Jelly ('celestial-jelly')
 * 3. Living Bloom ('living-bloom')
 */
export type PrimaryOrganismId =
  | 'liquid-lens'
  | 'celestial-jelly'
  | 'living-bloom';

export type AuraSyncStatus = 'local-only' | 'synced' | 'syncing' | 'offline';

export interface EvidenceBasedObservation {
  hasSufficientData: boolean;
  headline: string;
  detail: string;
  sampleSize: number;
  metricBadge?: string;
}

export interface CompactGardenNode {
  id: string;
  kind: 'focus-bloom' | 'restorative-drop';
  label: string;
  minutes: number;
  isoDate: string;
  accentHex: string;
}

export interface MyRhythmSummary {
  todayActualMinutes: number;
  todayCompletedCount: number;
  todayInterruptedCount: number;
  dailyTargetMinutes: number;
  dailyProgressRatio: number;
  weeklyActualMinutes: number;
  weeklyCompletedCount: number;
  weeklyTargetMinutes: number;
  weeklyProgressRatio: number;
  totalCompletedCount: number;
  totalInterruptedCount: number;
  restorativeSessionsCount: number;
  restorativeMinutesTotal: number;
  recentSessions: SessionRecord[];
  seedSessionsCount: number;
  observation: EvidenceBasedObservation;
  gardenNodes: CompactGardenNode[];
}

export interface AuraDataExportBundle {
  exportedAt: string;
  version: string;
  product: 'AURA TIME';
  settings: Partial<UserSettings>;
  focusSessions: SessionRecord[];
  restoreSessions: RestoreSessionRecord[];
  summary: {
    totalFocusSessions: number;
    totalActualFocusMinutes: number;
    totalRestoreSessions: number;
  };
}

export interface AuraAccountSummary {
  email?: string | null;
  displayName?: string | null;
  syncStatus?: AuraSyncStatus;
  lastSyncedAt?: string | null;
}

export interface AuraConsoleProps {
  /** Controls whether the Aura Console floating sheet is open */
  isOpen: boolean;
  /** Callback to close the Aura Console */
  onClose: () => void;
  /** Active destination tab (controlled or uncontrolled via initialDestination) */
  activeDestination?: AuraConsoleDestination;
  /** Initial destination when opened */
  initialDestination?: AuraConsoleDestination;
  /** Callback when the user switches between My Rhythm, Preferences, and Personal Data */
  onDestinationChange?: (destination: AuraConsoleDestination) => void;
  /** Focus session records from persistence */
  sessions?: SessionRecord[];
  /** Optional restorative session records from persistence */
  restoreSessions?: RestoreSessionRecord[];
  /** Current user settings */
  settings: UserSettings;
  /** Callback fired when any user preference or privacy consent changes */
  onUpdateSettings: (partial: Partial<UserSettings>) => void;
  /** Optional callback to switch the active primary organism */
  onSelectOrganism?: (
    organismId: PrimaryOrganismId,
    mappedOrbDesign: OrbDesignId
  ) => void;
  /** Optional callback to switch the active atmosphere scene */
  onSelectScene?: (sceneId: FocusSceneId) => void;
  /** Optional callback to switch the active acoustic chamber */
  onSelectChamber?: (chamberId: ChamberId) => void;
  /** Optional account & sync status descriptor */
  account?: AuraAccountSummary;
  /** Optional callback when user exports their session history & preferences */
  onExportData?: (bundle: AuraDataExportBundle) => void;
  /** Callback when user confirms full local data deletion */
  onDeleteAllData?: () => void;
  /** Optional callback to clear only sample/seed sessions */
  onClearSampleData?: () => void;
  /** Reference ISO date (YYYY-MM-DD) for deterministic testing; defaults to today */
  referenceIsoDate?: string;
}

export interface AuraConsoleTriggerProps {
  onOpenConsole: (destination?: AuraConsoleDestination) => void;
  isOpen?: boolean;
  todayActualMinutes?: number;
  dailyTargetMinutes?: number;
  activeOrganism?: PrimaryOrganismId;
  className?: string;
}

export interface AuraQuickControlsProps {
  onOpenConsole: (destination?: AuraConsoleDestination) => void;
  onOpenMyRhythm?: () => void;
  onOpenPreferences?: () => void;
  onOpenPersonalData?: () => void;
  activeOrganism?: PrimaryOrganismId;
  onSelectOrganism?: (
    organismId: PrimaryOrganismId,
    mappedOrbDesign: OrbDesignId
  ) => void;
  todayActualMinutes?: number;
  dailyTargetMinutes?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  className?: string;
}

export interface AuraContextPanelProps {
  activeOrganism: PrimaryOrganismId;
  activeSceneName?: string;
  activeChamberName?: string;
  todayActualMinutes: number;
  dailyTargetMinutes: number;
  weeklyActualMinutes?: number;
  weeklyTargetMinutes?: number;
  onOpenConsole: (destination?: AuraConsoleDestination) => void;
  onSelectOrganism?: (
    organismId: PrimaryOrganismId,
    mappedOrbDesign: OrbDesignId
  ) => void;
  className?: string;
}
