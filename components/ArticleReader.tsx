// components/ArticleReader.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { NormalizedArticle, toggleBookmark, isBookmarked, getCachedArticles } from '@/lib/db';

interface ArticleReaderProps {
  articleId: string;
  onClose: () => void;
}

const FONT_SCALES = [0.9, 1, 1.15, 1.3] as const; // A- ... A+
const FONT_LABELS = ['S', 'M', 'L', 'XL'];

export function ArticleReader({ articleId, onClose }: ArticleReaderProps) {
  const [article, setArticle] = useState<NormalizedArticle | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [fontIndex, setFontIndex] = useState(1);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await getCachedArticles();
      const found = all.find((a) => a.id === articleId) ?? null;
      if (cancelled) return;
      if (found) {
        setArticle(found);
        setBookmarked(await isBookmarked(found.id));
      } else {
        setNotFound(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(FONT_SCALES[fontIndex]));
  }, [fontIndex]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else if (theme === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  const handleBookmark = async () => {
    if (!article) return;
    setBookmarked(await toggleBookmark(article));
  };

  const handleShare = async () => {
    if (!article) return;
    if (navigator.share) {
      await navigator.share({ title: article.title, url: article.canonicalUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(article.canonicalUrl);
    }
  };

  if (notFound) {
    return (
      <ReaderShell onClose={onClose}>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p className="font-serif text-lg text-neutral-700 dark:text-neutral-200">
            This story isn&rsquo;t saved offline
          </p>
          <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
            Connect to the internet once to cache it, then it&rsquo;ll be here whenever you need it.
          </p>
        </div>
      </ReaderShell>
    );
  }

  if (!article) {
    return (
      <ReaderShell onClose={onClose}>
        <div className="mx-auto max-w-2xl px-6 pt-8">
          <div className="shimmer mb-4 h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="shimmer mb-2 h-8 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="shimmer mb-8 h-8 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="shimmer aspect-[16/9] w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </ReaderShell>
    );
  }

  return (
    <ReaderShell
      onClose={onClose}
      toolbar={
        <ReaderToolbar
          bookmarked={bookmarked}
          onBookmark={handleBookmark}
          onShare={handleShare}
          fontIndex={fontIndex}
          onFontChange={setFontIndex}
          theme={theme}
          onThemeChange={setTheme}
        />
      }
    >
      <article className="mx-auto max-w-2xl px-6 pb-24 pt-6">
        <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <span>{article.sourceLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{article.category}</span>
        </div>

        <h1 className="font-serif text-3xl font-semibold leading-tight text-neutral-900 dark:text-neutral-50 sm:text-4xl">
          {article.title}
        </h1>

        <div className="mt-4 flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{article.author}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>
            {new Date(article.publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          <span aria-hidden="true">·</span>
          <span>{article.readingTimeMin} min read</span>
        </div>

        {article.featuredImage && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
            <Image
              src={article.featuredImage.src}
              alt={article.featuredImage.alt}
              fill
              sizes="(min-width: 640px) 672px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        {/*
          Rendering the full WP content HTML as-is. This is trusted first-party
          content from your own two sites (not user-generated), so dangerouslySetInnerHTML
          is an acceptable trade-off here in exchange for correctly handling embeds,
          shortcodes, and inline WP markup without a custom parser.
        */}
        <div
          className="reader-content mt-8 font-serif text-neutral-800 dark:text-neutral-200"
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        <div className="mt-12 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <a
            href={article.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-500"
          >
            Read the original on {article.sourceLabel} →
          </a>
        </div>
      </article>
    </ReaderShell>
  );
}

function ReaderShell({
  children,
  onClose,
  toolbar,
}: {
  children: React.ReactNode;
  onClose: () => void;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-cream dark:bg-neutral-950">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200/70 bg-cream/90 px-4 py-3 backdrop-blur-sm dark:border-neutral-800/70 dark:bg-neutral-950/90">
        <button
          onClick={onClose}
          aria-label="Close article"
          className="rounded-full p-2 text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <CloseIcon />
        </button>
        {toolbar}
      </header>
      {children}
    </div>
  );
}

function ReaderToolbar({
  bookmarked,
  onBookmark,
  onShare,
  fontIndex,
  onFontChange,
  theme,
  onThemeChange,
}: {
  bookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
  fontIndex: number;
  onFontChange: (i: number) => void;
  theme: 'system' | 'light' | 'dark';
  onThemeChange: (t: 'system' | 'light' | 'dark') => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="mr-1 flex items-center rounded-full bg-neutral-100 p-0.5 dark:bg-neutral-900">
        {FONT_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => onFontChange(i)}
            aria-pressed={fontIndex === i}
            aria-label={`Text size ${label}`}
            className={[
              'h-7 w-7 rounded-full text-xs font-semibold transition-colors',
              fontIndex === i
                ? 'bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900'
                : 'text-neutral-500',
            ].join(' ')}
          >
            A
          </button>
        ))}
      </div>

      <button
        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle dark mode"
        className="rounded-full p-2 text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ThemeIcon dark={theme === 'dark'} />
      </button>

      <button
        onClick={onBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'Remove bookmark' : 'Save article'}
        className="rounded-full p-2 text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <BookmarkIcon filled={bookmarked} />
      </button>

      <button
        onClick={onShare}
        aria-label="Share article"
        className="rounded-full p-2 text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <ShareIcon />
      </button>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17l-6-4-6 4V4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 3.9M15.4 6.6l-6.8 3.9" strokeLinecap="round" />
    </svg>
  );
}
function ThemeIcon({ dark }: { dark: boolean }) {
  return dark ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
