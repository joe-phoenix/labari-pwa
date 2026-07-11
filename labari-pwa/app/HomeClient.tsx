// app/HomeClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Feed } from '@/components/Feed';
import { ArticleReader } from '@/components/ArticleReader';
import { NormalizedArticle } from '@/lib/db';

export function HomeClient({ initialArticles }: { initialArticles: NormalizedArticle[] }) {
  const [openArticleId, setOpenArticleId] = useState<string | null>(null);

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
      <header className="mx-auto max-w-5xl px-4 pt-6">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Labari</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          TechLabari &amp; Labari Journal, one feed
        </p>
      </header>

      <Feed onOpenArticle={handleOpen} initialArticles={initialArticles} />

      {openArticleId && <ArticleReader articleId={openArticleId} onClose={handleClose} />}
    </main>
  );
}
