// components/Feed.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFeed } from '@/lib/useFeed';
import { ArticleCard, ArticleCardSkeleton } from './ArticleCard';
import { NormalizedArticle } from '@/lib/db';

const PAGE_SIZE = 12; // ~10-15 articles per "page" before showing the load-more button

export function Feed({
  onOpenArticle,
  initialArticles = [],
  activeCategory,
  searchQuery = '',
}: {
  onOpenArticle: (a: NormalizedArticle) => void;
  initialArticles?: NormalizedArticle[];
  activeCategory: string;
  searchQuery?: string;
}) {
  const category = activeCategory === 'All' ? undefined : activeCategory;
  const { articles, loading, isOffline, refresh } = useFeed(category, initialArticles);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  // Reset how many articles are shown whenever the category or search changes,
  // so switching filters doesn't leave the reader stranded mid-scroll on a
  // "Show more" count from a completely different result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchQuery]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = filteredArticles.length > visibleCount;

  const [featured, ...rest] = useMemo(() => visibleArticles, [visibleArticles]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <OfflineIcon />
          You&rsquo;re offline — showing saved stories. Pull to refresh when you&rsquo;re back online.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ArticleCardSkeleton variant="featured" />
          <ArticleCardSkeleton />
          <ArticleCardSkeleton />
        </div>
      ) : filteredArticles.length === 0 ? (
        <EmptyState onRetry={refresh} isSearch={searchQuery.trim().length > 0} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {featured && (
              <div
                className="animate-fade-up"
                style={{ animationDelay: '0ms' }}
              >
                <ArticleCard article={featured} variant="featured" onOpen={onOpenArticle} />
              </div>
            )}
            {rest.map((article, i) => (
              <div
                key={article.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min((i + 1) * 45, 400)}ms` }}
              >
                <ArticleCard article={article} onOpen={onOpenArticle} />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-full border border-neutral-900/10 bg-white px-6 py-2.5 font-sans text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ onRetry, isSearch }: { onRetry: () => void; isSearch?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="font-serif text-lg text-neutral-700 dark:text-neutral-200">
        {isSearch ? 'No matches' : 'Nothing here yet'}
      </p>
      <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
        {isSearch
          ? "No cached articles match that search. Try a different term, or check your connection if you're expecting more recent stories."
          : 'No stories are cached for this category. Connect to the internet to load the latest from TechLabari and Labari Journal.'}
      </p>
      {!isSearch && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function OfflineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
