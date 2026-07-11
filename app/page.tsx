// app/page.tsx
// Server Component — fetches the feed at build time so the first paint already
// has real articles, fixing the empty-shell-then-fetch pattern that was
// tanking LCP/Speed Index (4.7s / 21.4s in the Lighthouse pass).
//
// Caveat: this is a static export (no server at runtime), so this data is
// frozen as of the last build — freshness depends on how often the site
// gets rebuilt, not on request-time revalidation. See README for the
// Cloudflare deploy-hook + cron approach to keep rebuilds frequent.

import { HomeClient } from './HomeClient';
import { NormalizedArticle } from '@/lib/db';

const FEED_ENDPOINT = 'https://labari-feed.joseph-kuuire.workers.dev/feed';

async function getInitialFeed(): Promise<NormalizedArticle[]> {
  try {
    const res = await fetch(FEED_ENDPOINT);
    if (!res.ok) return [];
    const data: { articles: NormalizedArticle[] } = await res.json();
    return data.articles ?? [];
  } catch {
    // Build-time fetch failed (Worker down, network issue at build) — fall
    // back to an empty initial list; the client-side useFeed() call still
    // runs after hydration and will populate the feed once the app is live.
    return [];
  }
}

export default async function HomePage() {
  const initialArticles = await getInitialFeed();
  return <HomeClient initialArticles={initialArticles} />;
}
