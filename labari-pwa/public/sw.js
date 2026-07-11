// public/sw.js
// Labari PWA Service Worker — Workbox via CDN import (no build step needed)

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js');

const { registerRoute, setDefaultHandler } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst, NetworkFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { BackgroundSyncPlugin } = workbox.backgroundSync;
const { precacheAndRoute } = workbox.precaching;

const VERSION = 'v1';
const APP_SHELL_CACHE = `labari-app-shell-${VERSION}`;
const FEED_CACHE = `labari-feed-${VERSION}`;
const IMAGE_CACHE = `labari-images-${VERSION}`;
const ARTICLE_CACHE = `labari-articles-${VERSION}`;

// Injected at build time by workbox-webpack-plugin / next-pwa-equivalent build step.
// If not using a bundler plugin, replace with an explicit array of shell assets.
precacheAndRoute(self.__WB_MANIFEST || []);

// ---- 1. Feed API: StaleWhileRevalidate ----
// Show cached feed instantly, refresh in the background. Perfect for a
// "unified home feed" that should never block on network.
registerRoute(
  ({ url }) => url.hostname === 'labari-feed.joseph-kuuire.workers.dev',
  new StaleWhileRevalidate({
    cacheName: FEED_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }), // 1 day
    ],
  })
);

// ---- 2. Article images & static assets: CacheFirst ----
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font',
  new CacheFirst({
    cacheName: APP_SHELL_CACHE,
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// ---- 3. Individual article HTML: NetworkFirst (fresh when online, cached fallback offline) ----
registerRoute(
  ({ url }) => url.pathname.startsWith('/article/'),
  new NetworkFirst({
    cacheName: ARTICLE_CACHE,
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 14 }),
    ],
  })
);

// ---- Background Sync: queue bookmark/read-state writes made while offline ----
const bgSyncPlugin = new BackgroundSyncPlugin('labari-write-queue', {
  maxRetentionTime: 24 * 60, // retry for up to 24 hours
});

registerRoute(
  ({ url }) => url.pathname === '/api/sync-reads',
  new workbox.strategies.NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
);

// ---- Push Notifications: breaking news ----
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const { title, body, url, image, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      image,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: tag || 'breaking-news',
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ---- Periodic Background Sync: silently refresh feed cache (where supported) ----
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-feed') {
    event.waitUntil(
      fetch('https://labari-feed.joseph-kuuire.workers.dev/feed')
        .then((res) => caches.open(FEED_CACHE).then((cache) => cache.put(res.url, res.clone())))
        .catch(() => {})
    );
  }
});

// ---- Lifecycle ----
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  const validCaches = [APP_SHELL_CACHE, FEED_CACHE, IMAGE_CACHE, ARTICLE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !validCaches.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});
