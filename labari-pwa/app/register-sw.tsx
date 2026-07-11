// app/register-sw.tsx
'use client';

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Optional: try to opt into periodic background sync where supported
          // (requires the PWA to already be installed and permission granted).
          if ('periodicSync' in reg) {
            (reg as any).periodicSync
              .register('refresh-feed', { minInterval: 60 * 60 * 1000 })
              .catch(() => {
                // Periodic sync isn't available/permitted — StaleWhileRevalidate on
                // the feed route still keeps things fresh on every visit.
              });
          }
        })
        .catch((err) => console.error('Service worker registration failed:', err));
    }
  }, []);

  return null;
}
