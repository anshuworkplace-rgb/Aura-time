/**
 * Scoped design tokens and classes for Aura Console.
 * Maintains Aura Time's dark oceanic glass aesthetic with clear typographic hierarchy.
 */
export const AURA_CONSOLE_STYLES = {
  backdrop:
    'fixed inset-0 z-50 bg-[#04060F]/70 backdrop-blur-md transition-opacity',
  sheetContainer:
    'fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] md:w-[540px] bg-[#080B19]/95 border-l border-white/[0.09] shadow-[-24px_0_80px_rgba(2,4,12,0.85)] flex flex-col text-[#F5F6FF] overflow-hidden',
  sectionCard:
    'bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex flex-col gap-3',
  metricTile:
    'bg-[#0C1126]/80 border border-white/[0.07] rounded-2xl p-3.5 flex flex-col justify-between',
  pillButton:
    'px-3 py-1.5 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors',
  pillButtonActive:
    'px-3 py-1.5 rounded-xl text-xs font-medium bg-[#2FE8FF]/15 border border-[#2FE8FF]/45 text-[#F5F6FF] shadow-[0_0_20px_rgba(47,232,255,0.14)]',
} as const;
