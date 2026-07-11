// lib/useFeed.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  cacheArticles,
  getCachedArticles,
  getFeedMeta,
  setFeedMeta,
  NormalizedArticle,
} from './db';

const FEED_ENDPOINT = 'https://labari-feed.joseph-kuuire.workers.dev/feed';
const SOURCE_KEY = 'merged';

export function useFeed(category?: string) {
  const [articles, setArticles] = useState<NormalizedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const sync = useCallback(async () => {
    // 1. Always show cached content immediately (instant, works offline)
    const cached = await getCachedArticles(category);
    if (cached.length) setArticles(cached);
    setLoading(cached.length === 0);

    // 2. Attempt a network delta-fetch in the background
    try {
      const meta = await getFeedMeta(SOURCE_KEY);
      const since = meta?.lastFetchedAt
        ? new Date(meta.lastFetchedAt).toISOString()
        : undefined;
      const url = new URL(FEED_ENDPOINT);
      if (category) url.searchParams.set('category', category);
      if (since) url.searchParams.set('since', since);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
      const data: { articles: NormalizedArticle[] } = await res.json();

      if (data.articles.length) {
        await cacheArticles(data.articles);
      }
      await setFeedMeta(SOURCE_KEY, { lastFetchedAt: Date.now() });

      const fresh = await getCachedArticles(category);
      setArticles(fresh);
      setIsOffline(false);
    } catch (err) {
      // Offline or worker unreachable — cached content already shown above
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    sync();
    const onOnline = () => sync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  return { articles, loading, isOffline, refresh: sync };
}
