import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (compact) return null;
    return (
      <div
        data-testid="pwa-installed-badge"
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#38F8A8]/12 border border-[#38F8A8]/35 text-xs text-[#38F8A8]"
      >
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Installed as Standalone App</span>
      </div>
    );
  }

  const handleAction = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        data-testid="pwa-install-btn"
        onClick={handleAction}
        title="Install Aura Time as a Standalone App"
        className={
          compact
            ? 'hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full aura-glass text-[11px] font-medium text-[#2FE8FF] hover:bg-[#2FE8FF]/15 transition-colors cursor-pointer whitespace-nowrap shrink-0'
            : 'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2FE8FF]/18 hover:bg-[#2FE8FF]/28 border border-[#2FE8FF]/45 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-3.5 h-3.5 text-[#2FE8FF] shrink-0" />
        <span>{compact ? 'Install App' : 'Install Aura Time App'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install Aura Time Guide"
          data-testid="pwa-install-guide-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#04050C]/80 backdrop-blur-md p-4"
        >
          <div className="w-full max-w-md rounded-3xl aura-glass-elevated p-6 border border-white/15 text-left shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-[#2FE8FF]" />
                <h3 className="font-display text-base font-semibold text-[#F5F6FF]">
                  Install Aura Time on Your Device
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close installation guide"
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-full text-[#A3A1BA] hover:text-[#F5F6FF] hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[#A3A1BA] leading-relaxed">
              Aura Time works as an offline-capable standalone sanctuary across
              desktop and mobile browsers.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="font-semibold text-[#F5F6FF]">
                  {isIOS
                    ? '1. iOS / iPadOS Safari (Recommended for your device)'
                    : '1. Chrome / Edge Desktop & Android'}
                </div>
                <p className="mt-1 text-[#A3A1BA] leading-relaxed">
                  {isIOS
                    ? 'Tap the Share icon in the Safari toolbar, scroll down, and select "Add to Home Screen".'
                    : 'Click the Install icon on the right side of your browser address bar, or open the browser menu (⋮) and choose "Install Aura Time".'}
                </p>
              </div>

              {!isIOS && (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div className="font-semibold text-[#F5F6FF]">
                    2. iPhone & iPad (Safari)
                  </div>
                  <p className="mt-1 text-[#A3A1BA] leading-relaxed">
                    Open Aura Time in Safari, tap the Share button, and choose{' '}
                    <span className="text-[#F5F6FF]">Add to Home Screen</span>{' '}
                    for a full-screen standalone sanctuary.
                  </p>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-[#2FE8FF]/8 border border-[#2FE8FF]/25 text-[11px] text-[#D6D8EC]">
                Note: In embedded preview frames, browsers disable direct
                install prompts. Opening Aura Time in its own top-level browser
                tab enables one-click native installation.
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-medium text-[#F5F6FF] transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-testid="pwa-offline-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-[#070915]/90 border border-[#FFB08A]/50 px-3.5 py-1.5 text-xs font-medium text-[#FFB08A] shadow-xl backdrop-blur-md"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Sanctuary Mode — Local timer & journal active</span>
    </div>
  );
};
