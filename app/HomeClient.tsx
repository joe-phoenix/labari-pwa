// app/HomeClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Feed } from '@/components/Feed';
import { ArticleReader } from '@/components/ArticleReader';
import { NormalizedArticle } from '@/lib/db';
import { useTheme } from './ThemeProvider';

export function HomeClient({ initialArticles }: { initialArticles: NormalizedArticle[] }) {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [today, setToday] = useState('');
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
      <header className="mx-auto max-w-5xl px-4 pt-8">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
            Labari Media
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
        <p className="mt-1 font-sans text-sm text-neutral-600 dark:text-neutral-400">
          TechLabari &amp; Labari Journal, one feed
        </p>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-neutral-900/70 via-neutral-900/20 to-transparent dark:from-neutral-100/60 dark:via-neutral-100/15" />
      </header>

      <Feed onOpenArticle={handleOpen} initialArticles={initialArticles} />

      {openArticleId && <ArticleReader articleId={openArticleId} onClose={handleClose} />}
    </main>
  );
}
