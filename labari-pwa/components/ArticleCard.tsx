// components/ArticleCard.tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { NormalizedArticle, toggleBookmark } from '@/lib/db';

interface ArticleCardProps {
  article: NormalizedArticle;
  variant?: 'default' | 'featured';
  isBookmarked?: boolean;
  onOpen: (article: NormalizedArticle) => void;
}

const SOURCE_STYLES: Record<string, { label: string; dot: string }> = {
  techlabari: { label: 'TechLabari', dot: 'bg-amber-500' },
  'labari-journal': { label: 'Labari Journal', dot: 'bg-rose-600' },
};

export function ArticleCard({ article, variant = 'default', isBookmarked = false, onOpen }: ArticleCardProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const source = SOURCE_STYLES[article.source] ?? { label: article.sourceLabel, dot: 'bg-neutral-500' };
  const isFeatured = variant === 'featured';

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nowBookmarked = await toggleBookmark(article);
    setBookmarked(nowBookmarked);
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(article)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(article)}
      className={[
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl',
        'bg-white dark:bg-neutral-900 transition-transform duration-200 ease-out',
        'hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500',
        isFeatured ? 'sm:col-span-2 sm:row-span-2' : '',
      ].join(' ')}
    >
      {article.featuredImage && (
        <div
          className={[
            'relative w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800',
            isFeatured ? 'aspect-[16/10]' : 'aspect-[16/9]',
          ].join(' ')}
        >
          <Image
            src={article.featuredImage.src}
            alt={article.featuredImage.alt}
            fill
            sizes={isFeatured ? '(min-width: 640px) 66vw, 100vw' : '(min-width: 640px) 33vw, 100vw'}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            priority={isFeatured}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <span className={`h-1.5 w-1.5 rounded-full ${source.dot}`} />
          <span>{source.label}</span>
          <span aria-hidden="true">·</span>
          <span>{article.category}</span>
        </div>

        <h2
          className={[
            'font-serif font-medium leading-snug text-neutral-900 dark:text-neutral-50',
            isFeatured ? 'text-2xl sm:text-3xl' : 'text-lg',
          ].join(' ')}
        >
          {article.title}
        </h2>

        {isFeatured && (
          <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300 font-sans">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>
            {formatRelativeTime(article.publishedAt)} · {article.readingTimeMin} min read
          </span>
          <button
            onClick={handleBookmark}
            aria-label={bookmarked ? 'Remove bookmark' : 'Save article'}
            aria-pressed={bookmarked}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-amber-600 dark:hover:bg-neutral-800"
          >
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ArticleCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'featured' }) {
  const isFeatured = variant === 'featured';
  return (
    <div className={`overflow-hidden rounded-xl bg-white dark:bg-neutral-900 ${isFeatured ? 'sm:col-span-2 sm:row-span-2' : ''}`}>
      <div className={`shimmer bg-neutral-200 dark:bg-neutral-800 ${isFeatured ? 'aspect-[16/10]' : 'aspect-[16/9]'}`} />
      <div className="flex flex-col gap-2 p-4">
        <div className="shimmer h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="shimmer h-5 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="shimmer h-5 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17l-6-4-6 4V4z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
