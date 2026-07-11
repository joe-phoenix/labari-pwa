# Labari PWA — Architecture Reference

## Stack
- **Next.js 14 (App Router, TypeScript)**, `output: 'export'` → static build → GitHub Pages
  (matches your existing labarimedia.com / labaridata.com deploy pattern)
- **Tailwind CSS** — tokens in `tailwind.config.ts` (ink `#0A0A0A`, cream `#F5F2EC`, amber `#D4962A`)
- **Cloudflare Worker** (`workers/feed-aggregator.js`) — fetches both WP REST APIs on a cron
  trigger, normalizes to one schema, caches in KV, serves `/feed?category=&since=`
- **idb** (`lib/db.ts`) — IndexedDB stores: `articles`, `bookmarks`, `feedMeta`
- **Workbox** (`public/sw.js`) — StaleWhileRevalidate (feed), CacheFirst (images/fonts),
  NetworkFirst (article HTML), BackgroundSync (write queue), Push + Periodic Sync

## Data flow
```
TechLabari WP REST  ─┐
                      ├─> Cloudflare Worker (normalize + KV cache) ─> /feed JSON
Labari Journal WP REST ┘                                                │
                                                                          ▼
                                                        Service Worker (SWR cache)
                                                                          │
                                                                          ▼
                                                        useFeed() hook ─> IndexedDB
                                                                          │
                                                                          ▼
                                                              Feed / ArticleCard (React)
```

## Deploying (Cloudflare Pages)

No GitHub Actions, no local `npm install`, no lockfile needed — Cloudflare Pages
runs the install and build on their servers.

1. Push this repo to GitHub (via GitHub Desktop is fine — commit and push the
   files as-is; you do NOT need `package-lock.json` for Cloudflare Pages).
2. In the Cloudflare dashboard: **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → select the `labari-pwa` repo.
3. Build settings:
   - Framework preset: **Next.js (Static HTML Export)**
   - Build command: `npx next build`
   - Build output directory: `out`
4. Deploy. Cloudflare gives you a `*.pages.dev` URL immediately.
5. Custom domain: Pages project → **Custom domains** → add your domain, and
   point its DNS at Cloudflare the same way you already do for your other
   Cloudflare-hosted projects.

No `.nojekyll` or `CNAME` file needed — those were GitHub Pages-specific
workarounds and don't apply here.


Register the service worker in `app/layout.tsx`:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

Deploy the worker:
```bash
cd workers
wrangler kv:namespace create FEED_CACHE
wrangler deploy feed-aggregator.js --name labari-feed
```
Add a cron trigger in `wrangler.toml`: `[triggers] crons = ["*/10 * * * *"]`

## Next steps I'd tackle in order
1. Wire up `next.config.js` with `output: 'export'` + `images.unoptimized: true` (GitHub Pages
   can't run Next's image optimizer server-side — Cloudflare's image resizing or a `next/image`
   loader pointed at your Worker can fill that gap).
2. Push subscription flow: a small endpoint (Worker or Render) to store subscriptions and fire
   `web-push` when a post gets tagged "breaking" in WP.
3. Dark mode toggle + font-scale control wired to `document.documentElement.style.setProperty('--text-scale', ...)`.
4. Lighthouse pass — the biggest lever will be `next/image` sizes/priority tuning on the featured
   card and preloading the serif font with `font-display: swap`.
