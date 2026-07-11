// app/HomeClient.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Feed } from '@/components/Feed';
import { CategoryNav } from '@/components/CategoryNav';
import { ArticleReader } from '@/components/ArticleReader';
import { NormalizedArticle } from '@/lib/db';
import { useTheme } from './ThemeProvider';

export function HomeClient({ initialArticles }: { initialArticles: NormalizedArticle[] }) {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [today, setToday] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    );
  }, []);

  // Bootstrap: if the page loads (or is refreshed) with ?article=id in the URL,
  // reopen the reader immediately instead of always landing on the feed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const articleParam = params.get('article');
    if (articleParam) setOpenArticleId(articleParam);
  }, []);

  // Keep the reader in sync with browser back/forward, since we manage the
  // article overlay via history.pushState rather than real Next.js routes
  // (dynamic per-article server routes aren't available under static export).
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setOpenArticleId(params.get('article'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleOpen = (article: NormalizedArticle) => {
    setOpenArticleId(article.id);
    window.history.pushState({}, '', `/?article=${article.id}`);
  };

  const handleClose = () => {
    setOpenArticleId(null);
    window.history.pushState({}, '', '/');
  };

  return (
    <main>
      <div className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md dark:bg-neutral-950/90">
        <header className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex items-baseline justify-between">
            <h1 className="flex items-center">
              <Image
                src={theme === 'dark' ? '/logo/labari-media-white.png' : '/logo/labari-media-black.png'}
                alt="Labari Media"
                width={200}
                height={25}
                priority
                className="h-6 w-auto sm:h-7"
              />
            </h1>
            <div className="flex items-center gap-3">
              <time className="font-sans text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {today}
              </time>
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                {theme === 'dark' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pb-3 pt-4">
          <div className="relative mb-3">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles"
              aria-label="Search articles"
              className="w-full rounded-full border border-neutral-900/[0.08] bg-white py-2 pl-9 pr-4 font-sans text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-white/[0.08] dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <CategoryNav activeCategory={activeCategory} onChange={setActiveCategory} />
        </div>

        <div className="h-px w-full bg-gradient-to-r from-neutral-900/70 via-neutral-900/20 to-transparent dark:from-neutral-100/60 dark:via-neutral-100/15" />
      </div>

      <Feed
        onOpenArticle={handleOpen}
        initialArticles={initialArticles}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
      />

      {openArticleId && <ArticleReader articleId={openArticleId} onClose={handleClose} />}
    </main>
  );
}
