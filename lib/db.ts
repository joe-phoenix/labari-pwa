// lib/db.ts
// IndexedDB layer using `idb` — install with: npm install idb

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface NormalizedArticle {
  id: string;
  source: 'techlabari' | 'labari-journal';
  sourceLabel: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  slug: string;
  canonicalUrl: string;
  featuredImage: { src: string; alt: string; width: number; height: number } | null;
  category: string;
  tags: string[];
  author: string;
  publishedAt: string;
  readingTimeMin: number;
}

interface LabariDB extends DBSchema {
  articles: {
    key: string;
    value: NormalizedArticle;
    indexes: { 'by-date': string; 'by-category': string };
  };
  bookmarks: {
    key: string;
    value: NormalizedArticle & { savedAt: number };
  };
  feedMeta: {
    key: string;
    value: { source: string; lastFetchedAt: number; etag?: string };
  };
}

const DB_NAME = 'labari-pwa';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LabariDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<LabariDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const articles = db.createObjectStore('articles', { keyPath: 'id' });
        articles.createIndex('by-date', 'publishedAt');
        articles.createIndex('by-category', 'category');

        db.createObjectStore('bookmarks', { keyPath: 'id' });
        db.createObjectStore('feedMeta', { keyPath: 'source' });
      },
    });
  }
  return dbPromise;
}

export async function cacheArticles(articles: NormalizedArticle[]) {
  const db = await getDB();
  const tx = db.transaction('articles', 'readwrite');
  await Promise.all(articles.map((a) => tx.store.put(a)));
  await tx.done;
}

export async function getCachedArticles(category?: string): Promise<NormalizedArticle[]> {
  const db = await getDB();
  if (category) {
    return db.getAllFromIndex('articles', 'by-category', category);
  }
  const all = await db.getAll('articles');
  return all.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function toggleBookmark(article: NormalizedArticle): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('bookmarks', article.id);
  if (existing) {
    await db.delete('bookmarks', article.id);
    return false;
  }
  await db.put('bookmarks', { ...article, savedAt: Date.now() });
  return true;
}

export async function getBookmarks() {
  const db = await getDB();
  const all = await db.getAll('bookmarks');
  return all.sort((a, b) => b.savedAt - a.savedAt);
}

export async function isBookmarked(id: string) {
  const db = await getDB();
  return Boolean(await db.get('bookmarks', id));
}

export async function setFeedMeta(source: string, meta: { lastFetchedAt: number; etag?: string }) {
  const db = await getDB();
  await db.put('feedMeta', { source, ...meta });
}

export async function getFeedMeta(source: string) {
  const db = await getDB();
  return db.get('feedMeta', source);
}
