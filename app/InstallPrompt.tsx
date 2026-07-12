// app/InstallPrompt.tsx
'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'labari-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    // Already installed (running standalone) — never show the prompt.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Respect a prior dismissal for a while rather than nagging every visit.
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
        return; // dismissed within the last 7 days
      }
    } catch {
      // localStorage unavailable — fall through and show the banner anyway
    }

    // Android/Chrome/Edge: capture the native prompt event instead of letting
    // the browser show its own mini-infobar, so we control the timing and styling.
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari never fires beforeinstallprompt — detect it directly and
    // show manual "Share > Add to Home Screen" instructions instead.
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIOS && isSafari) {
      setPlatform('ios');
      setShowBanner(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const dismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  };

  if (!showBanner || !platform) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-neutral-900/10 bg-white p-4 shadow-lg dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-700 dark:text-amber-400">
            <path d="M12 3v13m0 0l-4-4m4 4l4-4M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-sans text-sm font-semibold text-neutral-900 dark:text-neutral-50">
            Install Labari
          </p>
          {platform === 'ios' ? (
            <p className="mt-0.5 font-sans text-sm text-neutral-600 dark:text-neutral-400">
              Tap the Share icon, then &ldquo;Add to Home Screen&rdquo; for offline reading and faster access.
            </p>
          ) : (
            <p className="mt-0.5 font-sans text-sm text-neutral-600 dark:text-neutral-400">
              Add Labari to your home screen for offline reading and faster access.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {platform === 'android' && (
              <button
                onClick={handleInstall}
                className="rounded-full bg-neutral-900 px-4 py-1.5 font-sans text-sm font-medium text-white dark:bg-neutral-50 dark:text-neutral-900"
              >
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded-full px-4 py-1.5 font-sans text-sm font-medium text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
