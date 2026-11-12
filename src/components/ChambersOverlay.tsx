import React, { useEffect } from 'react';
import { ChamberId } from '../types/aura';
import { CHAMBERS } from '../utils/focusEngine';
import { soundEngine } from '../utils/soundSynthesizer';
import { X, Volume2, VolumeX } from 'lucide-react';

interface ChambersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  primaryChamberId: ChamberId;
  onSelectPrimaryChamber: (id: ChamberId) => void;
  isSoundPlaying: boolean;
  onToggleSoundPreview: () => void;
}

export const ChambersOverlay: React.FC<ChambersOverlayProps> = ({
  isOpen,
  onClose,
  primaryChamberId,
  onSelectPrimaryChamber,
  isSoundPlaying,
  onToggleSoundPreview,
}) => {
  useEffect(() => {
    if (isOpen) {
      soundEngine.preload();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Smart Soundscape Presets"
      className="fixed inset-0 z-50 bg-[#070812]/94 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl aura-glass-elevated p-6 sm:p-8 flex flex-col gap-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wider uppercase text-[#2FE8FF]">
              Smart Soundscape Switcher
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#F5F6FF] tracking-tight mt-0.5">
              Curated Soundscapes
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleSoundPreview}
              aria-pressed={isSoundPlaying}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isSoundPlaying
                  ? 'bg-[#2FE8FF]/20 text-[#2FE8FF] border border-[#2FE8FF]/45'
                  : 'bg-white/6 text-[#A3A1BA] hover:text-[#F5F6FF] border border-white/10'
              }`}
            >
              {isSoundPlaying ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span>{isSoundPlaying ? 'Playing' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Soundscapes"
              className="p-2 rounded-full bg-white/6 hover:bg-white/14 text-[#A3A1BA] hover:text-[#F5F6FF] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Curated Sound Presets Grid */}
        <div
          role="radiogroup"
          aria-label="Soundscape Presets"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {CHAMBERS.map((chamber) => {
            const isSelected = chamber.id === primaryChamberId;

            return (
              <button
                key={chamber.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  onSelectPrimaryChamber(chamber.id);
                  onClose();
                }}
                className={`group text-left p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-white/12 border border-[#2FE8FF]/60 shadow-lg'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/8'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-sm font-semibold text-[#F5F6FF]">
                      {chamber.name}
                    </div>
                    <div className="text-[11px] text-[#A3A1BA]">
                      {chamber.shortDescription}
                    </div>
                  </div>
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${chamber.primaryHex}, ${chamber.secondaryHex})`,
                      boxShadow: isSelected
                        ? `0 0 10px ${chamber.primaryHex}`
                        : 'none',
                    }}
                  />
                </div>

                <p className="text-xs text-[#A3A1BA] leading-relaxed">
                  {chamber.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
