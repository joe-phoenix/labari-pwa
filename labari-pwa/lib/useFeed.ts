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

export function useFeed(category?: string, initialArticles: NormalizedArticle[] = []) {
  const filteredInitial = category
    ? initialArticles.filter((a) => a.category === category)
    : initialArticles;

  const [articles, setArticles] = useState<NormalizedArticle[]>(filteredInitial);
  const [loading, setLoading] = useState(filteredInitial.length === 0);
  const [isOffline, setIsOffline] = useState(false);

  const sync = useCallback(async () => {
    // 1. Show cached content immediately (works offline, and covers the case
    //    where the build-time fetch above returned nothing).
    const cached = await getCachedArticles(category);
    if (cached.length) {
      setArticles(cached);
      setLoading(false);
    }

    // 2. Attempt a network delta-fetch in the background to pick up anything
    //    published since this static build was generated.
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
      // Offline or worker unreachable — cached/build-time content already shown
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    // Seed IndexedDB with the build-time articles immediately so they're
    // available offline even before the first network sync completes.
    if (initialArticles.length) {
      cacheArticles(initialArticles).catch(() => {});
    }
    sync();
    const onOnline = () => sync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync]);

  return { articles, loading, isOffline, refresh: sync };
}
