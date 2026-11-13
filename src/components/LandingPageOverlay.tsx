import React, { useState } from 'react';
import {
  FocusSceneId,
  NavigationTab,
  OrbDesignId,
} from '../types/aura';
import {
  CHAMBERS,
  FOCUS_SCENES,
  ORB_DESIGNS,
} from '../utils/focusEngine';
import { AuraButton } from './AuraButton';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Compass,
  Wind,
  BarChart3,
  ShieldCheck,
  Check,
  ChevronDown,
  X,
  ArrowRight,
} from 'lucide-react';

interface LandingPageOverlayProps {
  isOpen: boolean;
  activeSceneId: FocusSceneId;
  activeOrbDesign: OrbDesignId;
  onSelectScene: (id: FocusSceneId) => void;
  onSelectOrbDesign: (id: OrbDesignId) => void;
  onEnterSanctuary: (targetTab?: NavigationTab) => void;
  onStartQuickSession: (durationMinutes: number, sceneId: FocusSceneId) => void;
  onRecordPremiumInterest: (plan: 'monthly' | 'annual') => void;
}

const SCENE_LIST = Object.values(FOCUS_SCENES);

const FAQ_ITEMS = [
  {
    q: 'Does Aura Time require an account to use?',
    a: 'No. Aura Time works immediately in your browser or as an installed PWA with local-first storage. Optional account synchronization is available if you want to back up your history.',
  },
  {
    q: 'What happens if I end a focus session early?',
    a: 'Aura Time credits only your actual elapsed focus time and marks the session as Interrupted rather than awarding unworked planned minutes. Sessions stopped within the first 15 seconds are discarded.',
  },
  {
    q: 'Do Restorative Breaks count toward my daily focus total?',
    a: 'No. Breathing Space and Quiet Moments are logged separately so your focus statistics strictly represent genuine work.',
  },
  {
    q: 'How does Aura Intelligence generate recommendations?',
    a: 'Core session recommendations use a transparent, deterministic rule engine analyzing your completed session lengths, interrupted sessions, and preferred atmospheres. Optional AI reflections and task breakdowns require explicit opt-in consent.',
  },
  {
    q: 'Can I install Aura Time offline on desktop, Android, or iOS?',
    a: 'Yes. Aura Time includes a compliant Web App Manifest and Workbox Service Worker so the timer, 3D organisms, procedural Web Audio soundscapes, and local journal work offline.',
  },
];

export const LandingPageOverlay: React.FC<LandingPageOverlayProps> = ({
  isOpen,
  activeSceneId,
  activeOrbDesign,
  onSelectScene,
  onSelectOrbDesign,
  onEnterSanctuary,
  onStartQuickSession,
  onRecordPremiumInterest,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'annual'
  );
  const [selectedInterestPlan, setSelectedInterestPlan] = useState<
    string | null
  >(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aura Time Product Overview and Launch Guide"
      data-testid="landing-page-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#05060F]/95 backdrop-blur-2xl text-[#F5F6FF]"
    >
      {/* Top Bar Contract: [Brand] — [4 single-line links] — [Primary CTA] */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#05060F]/85 backdrop-blur-xl px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onEnterSanctuary('focus')}
            className="font-display text-sm font-semibold tracking-[0.22em] text-[#F5F6FF] whitespace-nowrap shrink-0 cursor-pointer"
          >
            AURA TIME
          </button>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#A3A1BA]">
            <a
              href="#pillars"
              className="hover:text-[#F5F6FF] transition-colors whitespace-nowrap shrink-0"
            >
              Three Pillars
            </a>
            <a
              href="#environments"
              className="hover:text-[#F5F6FF] transition-colors whitespace-nowrap shrink-0"
            >
              Environments
            </a>
            <a
              href="#pricing"
              className="hover:text-[#F5F6FF] transition-colors whitespace-nowrap shrink-0"
            >
              Aura Plus
            </a>
            <a
              href="#privacy-faq"
              className="hover:text-[#F5F6FF] transition-colors whitespace-nowrap shrink-0"
            >
              Privacy & FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <AuraButton
              variant="primary"
              size="sm"
              data-testid="landing-enter-sanctuary-top"
              onClick={() => onEnterSanctuary('focus')}
            >
              Enter Sanctuary
            </AuraButton>
            <button
              type="button"
              aria-label="Close product overview"
              data-testid="landing-close-btn"
              onClick={() => onEnterSanctuary('focus')}
              className="p-1.5 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16 space-y-20">
        {/* 1. HERO SECTION */}
        <section className="text-center max-w-3xl mx-auto space-y-6">
          <div className="text-xs text-[#2FE8FF] font-medium tracking-wide">
            Digital Focus & Recovery Sanctuary · Offline-Ready Web Application
          </div>
          <h1
            className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-[#F5F6FF] leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            Find Your Rhythm. Enter Your World.
          </h1>
          <p className="text-base sm:text-lg text-[#A3A1BA] leading-relaxed max-w-2xl mx-auto">
            An immersive space for focused work, intentional breaks and personal
            progress. Built with procedural 3D organisms, real-time Web Audio
            soundscapes, and honest local-first analytics.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <AuraButton
              variant="primary"
              size="lg"
              data-testid="landing-hero-start-btn"
              onClick={() => onEnterSanctuary('focus')}
            >
              Enter Focus Sanctuary
            </AuraButton>
            <PWAInstallButton />
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-[#A3A1BA]">
            <span>No account required</span>
            <span>·</span>
            <span>Honest elapsed-time tracking</span>
            <span>·</span>
            <span>Procedural WebGL2 & Web Audio</span>
          </div>
        </section>

        {/* 2. THE THREE PILLARS: FOCUS, RESTORE, REFLECT */}
        <section id="pillars" className="space-y-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF]">
              01. Three Pillars for Sustainable Deep Work
            </h2>
            <p className="mt-2 text-sm text-[#A3A1BA] leading-relaxed">
              Aura Time replaces cluttered productivity dashboards with a calm
              cycle of intentional work, unhurried nervous-system recovery, and
              factual reflection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="aura-glass rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <Compass className="w-5 h-5 text-[#2FE8FF] mb-3" />
                <h3 className="font-display text-lg font-semibold text-[#F5F6FF]">
                  01. Focus
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
                  Specify your session intention, choose from 15 to 90-minute
                  presets or custom durations, and immerse yourself alongside a
                  responsive 3D organism.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterSanctuary('focus')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#2FE8FF] hover:underline cursor-pointer"
              >
                <span>Open Focus Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="aura-glass rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <Wind className="w-5 h-5 text-[#38F8A8] mb-3" />
                <h3 className="font-display text-lg font-semibold text-[#F5F6FF]">
                  02. Restore
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
                  Take guided breathing breaks (Coherent Calm, 4-7-8, Box
                  Breathing) or 2–10 minute Quiet Moments in Rain Garden or
                  Forest Stillness without inflating focus totals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterSanctuary('restore')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#38F8A8] hover:underline cursor-pointer"
              >
                <span>Explore Restore Sanctuary</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="aura-glass rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <BarChart3 className="w-5 h-5 text-[#8A5CFF] mb-3" />
                <h3 className="font-display text-lg font-semibold text-[#F5F6FF]">
                  03. Reflect & Aura Intelligence
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
                  Review daily, weekly, and 30-day focus patterns, receive
                  transparent rule-based duration recommendations, and grow
                  your personal Aura Garden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEnterSanctuary('reflect')}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-[#8A5CFF] hover:underline cursor-pointer"
              >
                <span>Open Reflect Journal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE ENVIRONMENT & ORGANISM GALLERY */}
        <section id="environments" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF]">
                02. Signature 3D Organisms & Atmospheric Worlds
              </h2>
              <p className="mt-2 text-sm text-[#A3A1BA]">
                Preview and select your organism and atmosphere below—your
                selection applies immediately to the live sanctuary.
              </p>
            </div>
          </div>

          {/* 3 Organisms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ORB_DESIGNS.map((orb) => {
              const isSelected = activeOrbDesign === orb.id;
              return (
                <div
                  key={orb.id}
                  className={`rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#2FE8FF]/12 border-[#2FE8FF]/55'
                      : 'aura-glass border-white/10'
                  }`}
                >
                  <div>
                    <div className="text-xs text-[#2FE8FF] font-medium">
                      {orb.badge} · {orb.subtitle}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-[#F5F6FF] mt-1">
                      {orb.name}
                    </h3>
                    <p className="text-xs text-[#A3A1BA] mt-1.5 leading-relaxed">
                      {orb.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-[#A3A1BA]">
                      {isSelected ? 'Active Organism' : 'Available Free'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectOrbDesign(orb.id);
                      }}
                      className="text-xs font-medium text-[#2FE8FF] hover:underline cursor-pointer"
                    >
                      {isSelected ? 'Selected' : 'Select Organism'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5 Atmospheres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {SCENE_LIST.map((sc) => {
              const isSelected = activeSceneId === sc.id;
              const pairedSound = CHAMBERS.find(
                (c) => c.id === sc.suggestedChamberId
              );
              return (
                <div
                  key={sc.id}
                  className={`rounded-2xl p-4 border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white/[0.09] border-[#2FE8FF]/55'
                      : 'aura-glass border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#F5F6FF]">
                        {sc.name}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${sc.colors.primary}, ${sc.colors.secondary})`,
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-[#2FE8FF] mt-0.5">
                      {sc.tagline}
                    </div>
                    <p className="text-[11px] text-[#A3A1BA] mt-2 leading-relaxed">
                      {sc.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#A3A1BA] truncate">
                      Audio: {pairedSound?.name || 'Ocean Drift'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onStartQuickSession(25, sc.id)}
                      className="text-[11px] font-medium text-[#2FE8FF] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Start 25m
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. FREEMIUM & AURA PLUS PRICING ARCHITECTURE */}
        <section id="pricing" className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF]">
                03. Transparent Free & Aura Plus Plans
              </h2>
              <p className="mt-2 text-sm text-[#A3A1BA]">
                The core focus timer, 3D organisms, Restore sanctuary, and
                local journal remain permanently free. Aura Plus supports
                long-term personalization and cloud capabilities.
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 rounded-xl aura-glass self-start">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  billingCycle === 'monthly'
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF]'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                Monthly (₹149)
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  billingCycle === 'annual'
                    ? 'bg-[#2FE8FF]/20 text-[#F5F6FF]'
                    : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
                }`}
              >
                Annual (₹1,199 · Save 32%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="aura-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/10">
              <div>
                <div className="text-xs text-[#A3A1BA] font-medium">
                  Aura Free · Always Available
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F6FF] tabular-nums">
                    ₹0
                  </span>
                  <span className="text-xs text-[#A3A1BA]">
                    / forever · no account required
                  </span>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-[#A3A1BA]">
                  Everything needed for daily focused work, restorative
                  breathing breaks, and honest session tracking.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#D6D8EC]">
                  {[
                    'Full Focus Timer with 15m–90m presets & radial custom duration',
                    'All 3 signature 3D organisms (Celestial Jelly, Living Bloom, Liquid Lens)',
                    'Core Focus & Restore Web Audio soundscapes with 700ms crossfade',
                    'Breathing Space & Quiet Moments recovery sanctuary',
                    'Daily & 7-Day Reflect journal with My Aura Garden progression',
                    'Full JSON data export & local-first privacy controls',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#38F8A8] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <AuraButton
                  variant="secondary"
                  size="md"
                  onClick={() => onEnterSanctuary('focus')}
                >
                  Continue with Free Sanctuary
                </AuraButton>
              </div>
            </div>

            {/* Aura Plus Plan */}
            <div className="aura-glass rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-[#2FE8FF]/45 relative">
              <div>
                <div className="text-xs text-[#2FE8FF] font-medium">
                  Aura Plus · Unlocked in Pre-Launch Beta Preview
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-display text-3xl sm:text-4xl font-semibold text-[#F5F6FF] tabular-nums">
                    {billingCycle === 'monthly' ? '₹149' : '₹1,199'}
                  </span>
                  <span className="text-xs text-[#A3A1BA]">
                    {billingCycle === 'monthly'
                      ? '/ month (experimental India pricing hypothesis: ₹149–199)'
                      : '/ year (experimental India pricing hypothesis: ₹999–1,499)'}
                  </span>
                </div>
                <p className="mt-3 text-xs sm:text-sm text-[#A3A1BA]">
                  Expanded personalization, custom routine templates, 30-day
                  comparative analytics, optional AI task decomposition, and
                  account backup.
                </p>

                <ul className="mt-6 space-y-2.5 text-xs text-[#D6D8EC]">
                  {[
                    'Everything in Aura Free with zero interruptions during focus',
                    'Unlimited Custom Focus Routines (Morning Clarity, Deep Work, custom templates)',
                    'Aura Intelligence Smart Recommendations & Task Breakdown planner',
                    '30-Day Monthly Comparative Analytics & Weekly Trend breakdown',
                    'Optional Consent-Gated AI Weekly Reflections (Server-Side Gemini)',
                    'Optional Account Backup & Conflict-Free Session Synchronization',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[#2FE8FF] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 space-y-3">
                <AuraButton
                  variant="primary"
                  size="md"
                  data-testid="landing-plus-preview-btn"
                  onClick={() => {
                    onRecordPremiumInterest(billingCycle);
                    setSelectedInterestPlan(billingCycle);
                  }}
                >
                  {selectedInterestPlan
                    ? 'Beta Preview Active — All Plus Features Unlocked'
                    : `Preview Aura Plus (${
                        billingCycle === 'monthly' ? '₹149/mo' : '₹1,199/yr'
                      } Launch Tier)`}
                </AuraButton>
                <p className="text-[11px] text-[#A3A1BA] leading-relaxed">
                  Transparent Billing Status: Live merchant checkout (Razorpay
                  India webhook verification) is pending production merchant
                  credentials. All Aura Plus personalization and analytics
                  features are unlocked for evaluation during this beta preview—no
                  payment card is requested or stored.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PRIVACY & FAQ */}
        <section id="privacy-faq" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 aura-glass rounded-3xl p-6 space-y-4">
            <ShieldCheck className="w-5 h-5 text-[#38F8A8]" />
            <h2 className="font-display text-xl font-semibold text-[#F5F6FF]">
              04. Privacy & User Data Control
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A1BA] leading-relaxed">
              Aura Time is architected around data minimization and local-first
              ownership, aligned with core principles of the Indian Digital
              Personal Data Protection (DPDP) framework.
            </p>
            <ul className="space-y-2 text-xs text-[#D6D8EC]">
              <li>
                · <strong>Local-First Storage:</strong> Sessions, intentions,
                and preferences live in your browser&apos;s local storage by
                default.
              </li>
              <li>
                · <strong>Explicit AI Consent:</strong> Optional AI reflections
                are disabled unless you explicitly opt in, and never transmit
                raw private journal entries without consent.
              </li>
              <li>
                · <strong>No Data Brokerage:</strong> Your focus history is
                never sold or shared with advertising networks.
              </li>
              <li>
                · <strong>Full Portability & Erasure:</strong> Export your
                complete JSON journal or permanently delete all local and synced
                records in one click from Profile.
              </li>
            </ul>
          </div>

          <div className="lg:col-span-7 aura-glass rounded-3xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#F5F6FF]">
              Frequently Asked Questions
            </h2>
            <div className="divide-y divide-white/10">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpenItem = openFaqIdx === idx;
                return (
                  <div key={item.q} className="py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaqIdx(isOpenItem ? null : idx)
                      }
                      className="w-full flex items-center justify-between gap-4 text-left text-xs sm:text-sm font-medium text-[#F5F6FF] cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#A3A1BA] shrink-0 transition-transform ${
                          isOpenItem ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpenItem && (
                      <p className="mt-2 text-xs text-[#A3A1BA] leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quiet Footer */}
        <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A3A1BA]">
          <div>
            AURA TIME V2 · Enter Aura · Focus on What Matters · Restore Your
            Energy · Reflect on Your Progress
          </div>
          <button
            type="button"
            onClick={() => onEnterSanctuary('focus')}
            className="text-[#2FE8FF] hover:underline font-medium cursor-pointer"
          >
            Return to Focus Sanctuary →
          </button>
        </footer>
      </div>
    </div>
  );
};
