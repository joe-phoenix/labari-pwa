// app/HomeClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Feed } from '@/components/Feed';
import { ArticleReader } from '@/components/ArticleReader';
import { NormalizedArticle } from '@/lib/db';

export function HomeClient({ initialArticles }: { initialArticles: NormalizedArticle[] }) {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);
  const [today, setToday] = useState('');

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
            Labari
          </h1>
          <time className="font-sans text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            {today}
          </time>
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
