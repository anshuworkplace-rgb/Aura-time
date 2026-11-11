import React, { useState } from 'react';
import { ChamberId } from '../types/aura';
import { CHAMBERS } from '../utils/focusEngine';
import { X, Play, Pause, Volume2, Layers } from 'lucide-react';

interface ChambersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  secondaryChamberId: ChamberId | null;
  onSelectSecondaryChamber: (id: ChamberId | null) => void;
  isSoundPlaying: boolean;
  onToggleSoundPreview: () => void;
  ambienceVolume: number;
  onChangeAmbienceVolume: (val: number) => void;
  secondaryVolume: number;
  onChangeSecondaryVolume: (val: number) => void;
  alertVolume: number;
  onChangeAlertVolume: (val: number) => void;
}

export const ChambersOverlay: React.FC<ChambersOverlayProps> = ({
  isOpen,
  onClose,
  primaryChamberId,
  onSelectPrimaryChamber,
  secondaryChamberId,
  onSelectSecondaryChamber,
  isSoundPlaying,
  onToggleSoundPreview,
  ambienceVolume,
  onChangeAmbienceVolume,
  secondaryVolume,
  onChangeSecondaryVolume,
  alertVolume,
  onChangeAlertVolume,
}) => {
  const [layerTarget, setLayerTarget] = useState<'primary' | 'secondary'>(
    'primary'
  );

  if (!isOpen) return null;

  const activePrimary =
    CHAMBERS.find((c) => c.id === primaryChamberId) || CHAMBERS[0];
  const activeSecondary = CHAMBERS.find((c) => c.id === secondaryChamberId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chambers Sound Studio"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-3xl bg-[#0D1021]/95 border border-white/12 p-6 sm:p-7 shadow-2xl flex flex-col gap-5 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header & Live Chamber Acoustic Deck */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-medium tracking-wider text-[#2FE8FF]">
              Spatial Acoustic Architecture
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] mt-0.5">
              Chambers
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A1BA] mt-0.5">
              Each Chamber alters the acoustic field and modulates the Living
              Lens material physics.
            </p>
          </div>

          {/* Play/Stop Preview + Volume Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Ambience Volume */}
            <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/8 rounded-2xl px-3.5 py-2">
              <Volume2 className="w-3.5 h-3.5 text-[#2FE8FF] shrink-0" />
              <label
                htmlFor="chamber-ambience-volume"
                className="text-xs text-[#A3A1BA] whitespace-nowrap"
              >
                Ambience
              </label>
              <input
                id="chamber-ambience-volume"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={ambienceVolume}
                onChange={(e) =>
                  onChangeAmbienceVolume(parseFloat(e.target.value))
                }
                className="w-20 accent-[#2FE8FF] cursor-pointer"
              />
              <span className="font-mono tabular-nums text-xs text-[#F5F6FF] w-8 text-right">
                {Math.round(ambienceVolume * 100)}%
              </span>
            </div>

            {/* Alert Volume */}
            <div className="flex items-center gap-2.5 bg-white/[0.04] border border-white/8 rounded-2xl px-3.5 py-2">
              <label
                htmlFor="chamber-alert-volume"
                className="text-xs text-[#A3A1BA] whitespace-nowrap"
              >
                Alert Chime
              </label>
              <input
                id="chamber-alert-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={alertVolume}
                onChange={(e) =>
                  onChangeAlertVolume(parseFloat(e.target.value))
                }
                className="w-16 accent-[#8A5CFF] cursor-pointer"
              />
              <span className="font-mono tabular-nums text-xs text-[#F5F6FF] w-8 text-right">
                {Math.round(alertVolume * 100)}%
              </span>
            </div>

            {/* Preview Play/Stop Button */}
            <button
              type="button"
              onClick={onToggleSoundPreview}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                isSoundPlaying
                  ? 'bg-[#2FE8FF] text-[#070812] shadow-lg'
                  : 'bg-white/10 hover:bg-white/18 text-[#F5F6FF]'
              }`}
            >
              {isSoundPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Preview</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Preview Chamber</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Chambers"
              className="p-2 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Layer Assignment Bar (Primary Chamber + Optional Secondary Sound Layer) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-black/30 border border-white/8">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setLayerTarget('primary')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                layerTarget === 'primary'
                  ? 'bg-[#8A5CFF]/25 text-[#F5F6FF] border border-[#8A5CFF]/50'
                  : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
              }`}
            >
              Primary Space: {activePrimary.name}
            </button>

            <button
              type="button"
              onClick={() => setLayerTarget('secondary')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                layerTarget === 'secondary'
                  ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border border-[#2FE8FF]/50'
                  : 'text-[#A3A1BA] hover:text-[#F5F6FF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Secondary Layer: {activeSecondary ? activeSecondary.name : 'None'}
              </span>
            </button>

            {activeSecondary && (
              <button
                type="button"
                onClick={() => onSelectSecondaryChamber(null)}
                className="text-xs text-[#FF5D88] hover:underline ml-1"
              >
                Clear Secondary
              </button>
            )}
          </div>

          {activeSecondary && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="secondary-layer-volume"
                className="text-xs text-[#A3A1BA] whitespace-nowrap"
              >
                Layer 2 Mix
              </label>
              <input
                id="secondary-layer-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={secondaryVolume}
                onChange={(e) =>
                  onChangeSecondaryVolume(parseFloat(e.target.value))
                }
                className="w-20 accent-[#2FE8FF] cursor-pointer"
              />
              <span className="font-mono tabular-nums text-xs text-[#F5F6FF]">
                {Math.round(secondaryVolume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 9 Architectural Chambers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CHAMBERS.map((ch) => {
            const isPrimary = primaryChamberId === ch.id;
            const isSecondary = secondaryChamberId === ch.id;
            const isSelected = isPrimary || isSecondary;

            return (
              <div
                key={ch.id}
                onClick={() => {
                  if (layerTarget === 'secondary') {
                    onSelectSecondaryChamber(isSecondary ? null : ch.id);
                  } else {
                    onSelectPrimaryChamber(ch.id);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (layerTarget === 'secondary') {
                      onSelectSecondaryChamber(isSecondary ? null : ch.id);
                    } else {
                      onSelectPrimaryChamber(ch.id);
                    }
                  }
                }}
                className={`group relative rounded-2xl p-4 flex flex-col justify-between gap-2.5 cursor-pointer transition-all duration-300 border ${
                  isPrimary
                    ? 'bg-white/10 border-[#2FE8FF]/55 shadow-lg'
                    : isSecondary
                    ? 'bg-[#8A5CFF]/12 border-[#8A5CFF]/45'
                    : 'bg-white/[0.025] border-white/8 hover:bg-white/[0.06] hover:border-white/20'
                }`}
              >
                {/* Top Row: Refractive Material Preview Orb & Waveform Pulse */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full border border-white/25 shrink-0 transition-transform duration-500 group-hover:scale-110"
                      style={{
                        background: `radial-gradient(circle at 35% 30%, #F5F6FF, ${ch.primaryHex} 52%, ${ch.secondaryHex} 88%, #070812)`,
                      }}
                    />
                    <div>
                      <span className="text-[11px] text-[#A3A1BA] block">
                        {ch.spaceType}
                      </span>
                      <h3 className="font-display text-base font-semibold text-[#F5F6FF]">
                        {ch.name}
                      </h3>
                    </div>
                  </div>

                  {/* Subtle Live Waveform Pulse */}
                  <div className="flex items-end gap-1 h-6">
                    {ch.waveformBars.slice(0, 6).map((bar, i) => (
                      <span
                        key={i}
                        style={{
                          height: `${Math.max(
                            22,
                            Math.round(
                              bar *
                                (isSelected && isSoundPlaying
                                  ? 90 + ((i * 19) % 10)
                                  : 70)
                            )
                          )}%`,
                          backgroundColor: isSelected
                            ? ch.primaryHex
                            : 'rgba(163, 161, 186, 0.32)',
                        }}
                        className="w-1 rounded-full transition-all duration-300"
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-[#A3A1BA] leading-relaxed">
                  {ch.description}
                </p>

                {/* Lens Material Effect Note & Layer Badge */}
                <div className="pt-2.5 border-t border-white/8 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-[#A3A1BA] truncate">
                    {ch.materialNote}
                  </span>
                  {isPrimary && (
                    <span className="text-[#2FE8FF] font-semibold shrink-0">
                      Active Space
                    </span>
                  )}
                  {isSecondary && (
                    <span className="text-[#8A5CFF] font-semibold shrink-0">
                      + Layer 2
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
