/**
 * Scoped design tokens & surface class helpers for Liquid Lens.
 * Uses controlled cyan (#2FE8FF) and violet (#8A5CFF) lighting, refined translucency,
 * and avoids generic glowing card clutter.
 */
export const LIQUID_LENS_TOKENS = {
  colors: {
    deepVoid: '#050711',
    oceanAbyss: '#090D1E',
    cyanIllumination: '#2FE8FF',
    violetRefraction: '#8A5CFF',
    aquamarineCalm: '#5EF2C4',
    warmAmber: '#FFB08A',
    textPrimary: '#F5F6FF',
    textSecondary: '#A3A1BA',
    textMuted: '#6E6D86',
  },
  surfaces: {
    stageContainer:
      'relative w-full min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-between px-4 sm:px-8 pt-20 pb-8 text-[#F5F6FF] select-none overflow-hidden',
    translucentDock:
      'bg-[#0A0E1F]/80 border border-white/[0.08] shadow-[0_20px_60px_rgba(3,5,14,0.72)] rounded-3xl',
    subtlePill:
      'bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors',
    activePill:
      'bg-[#2FE8FF]/14 border border-[#2FE8FF]/45 text-[#F5F6FF] shadow-[0_0_24px_rgba(47,232,255,0.14)]',
    drawerPanel:
      'bg-[#080B19]/92 border border-white/[0.09] rounded-2xl p-4 shadow-2xl',
  },
} as const;
