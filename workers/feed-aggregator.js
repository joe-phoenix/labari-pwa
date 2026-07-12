/**
 * Labari Feed Aggregator — Cloudflare Worker
 * Fetches TechLabari + Labari Journal WP REST APIs, normalizes into one schema,
 * caches the merged result, and serves it to the PWA.
 *
 * Deploy: joseph-kuuire.workers.dev namespace (e.g. labari-feed.joseph-kuuire.workers.dev)
 * Bind a KV namespace called FEED_CACHE and a cron trigger (e.g. every 10 min) in wrangler.toml.
 */

const SOURCES = [
  {
    id: 'techlabari',
    apiBase: 'https://techlabari.com/wp-json/wp/v2',
    label: 'TechLabari',
  },
  {
    id: 'labari-journal',
    apiBase: 'https://labarijournal.com/wp-json/wp/v2',
    label: 'Labari Journal',
  },
];

const CACHE_KEY = 'merged-feed-v1';
const CACHE_TTL_SECONDS = 600; // 10 min

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/feed') {
      const category = url.searchParams.get('category');
      const since = url.searchParams.get('since'); // ISO timestamp for delta sync
      const cached = await getMergedFeed(env, ctx);
      const filtered = filterFeed(cached, { category, since });
      return json(filtered);
    }

    return json({ error: 'not_found' }, 404);
  },

  // Two cron schedules run through this one handler, distinguished by
  // event.cron — see wrangler.toml for the actual schedule strings:
  //   */10 * * * *  -> refresh the merged feed cache (existing, frequent)
  //   */20 * * * *  -> trigger a Cloudflare Pages rebuild (new, less frequent,
  //                     since a full site rebuild is heavier than a cache refresh)
  async scheduled(event, env, ctx) {
    if (event.cron === '*/20 * * * *') {
      ctx.waitUntil(triggerPagesRebuild(env));
    } else {
      ctx.waitUntil(refreshMergedFeed(env));
    }
  },
};

async function triggerPagesRebuild(env) {
  // DEPLOY_HOOK_URL is a Cloudflare Pages "Deploy Hook" — created in the
  // dashboard under Pages project > Settings > Builds & deployments > Deploy
  // hooks, then stored as a Worker secret: `wrangler secret put DEPLOY_HOOK_URL`.
  // Hitting it with a POST triggers a fresh build from the latest commit,
  // which re-runs the build-time feed fetch in app/page.tsx and bakes in
  // whatever's new since the last build.
  if (!env.DEPLOY_HOOK_URL) return;
  try {
    await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  } catch {
    // A missed rebuild trigger isn't critical — the next scheduled attempt
    // will pick it up, and the /feed endpoint itself stays fresh regardless.
  }
}

async function getMergedFeed(env, ctx) {
  const cached = await env.FEED_CACHE.get(CACHE_KEY, 'json');
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_SECONDS * 1000) {
    return cached;
  }
  // Stale-while-revalidate: serve stale cache immediately, refresh in background
  if (cached) {
    ctx.waitUntil(refreshMergedFeed(env));
    return cached;
  }
  return refreshMergedFeed(env);
}

async function refreshMergedFeed(env) {
  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const articles = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const payload = { fetchedAt: Date.now(), articles };
  await env.FEED_CACHE.put(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

async function fetchSource(source) {
  const res = await fetch(
    // per_page=100 is the WordPress REST API's maximum. At 30, infrequent
    // categories (e.g. Sports, Opinion) could have zero matches in the merged
    // feed even though older matching articles exist on the site, simply
    // because the most recent 30 posts didn't happen to include any.
    `${source.apiBase}/posts?per_page=100&_embed=wp:featuredmedia,wp:term&orderby=date`,
    { headers: { 'User-Agent': 'LabariFeedAggregator/1.0' } }
  );
  if (!res.ok) throw new Error(`${source.id} fetch failed: ${res.status}`);
  const posts = await res.json();
  return posts.map((post) => normalizePost(post, source));
}

function normalizePost(post, source) {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const terms = post._embedded?.['wp:term']?.flat() ?? [];
  const rawCategory = terms.find((t) => t.taxonomy === 'category')?.name ?? 'General';
  const tags = terms.filter((t) => t.taxonomy === 'post_tag').map((t) => t.name);

  // Editorial decision: TechLabari is Labari Media's technology vertical, not a
  // separate section taxonomy. Every TechLabari article rolls up into one
  // "Technology" section in the unified app, regardless of its own site's
  // internal category (News, Finance, AI, Crypto And Web3, etc.). Labari
  // Journal's own section structure (Government and Politics, Business,
  // Society, Culture and Lifestyle, Opinion, etc.) remains the primary
  // taxonomy for everything else, and any Labari Journal piece already
  // tagged "Technology" naturally joins the same bucket as TechLabari content.
  const category = source.id === 'techlabari' ? 'Technology' : rawCategory;

  const plainExcerpt = stripHtml(post.excerpt?.rendered ?? '');
  const wordCount = stripHtml(post.content?.rendered ?? '').split(/\s+/).length;

  return {
    id: `${source.id}-${post.id}`,
    source: source.id,
    sourceLabel: source.label,
    title: stripHtml(post.title?.rendered ?? ''),
    excerpt: plainExcerpt.slice(0, 220),
    contentHtml: fixLazyloadImages(post.content?.rendered ?? ''),
    slug: post.slug,
    canonicalUrl: post.link,
    featuredImage: media
      ? {
          src: media.source_url,
          alt: media.alt_text || '',
          width: media.media_details?.width ?? 1200,
          height: media.media_details?.height ?? 675,
        }
      : null,
    category,
    tags,
    author: extractAuthor(post, terms, source),
    publishedAt: post.date_gmt + 'Z',
    readingTimeMin: Math.max(1, Math.round(wordCount / 200)),
  };
}

/**
 * Byline extraction, in order of preference:
 * 1. `post.authors[]` — populated by the PublishPress Authors plugin (confirmed live on
 *    TechLabari as of testing). Supports multiple authors and guest/AI attribution
 *    (e.g. a "Labari AI" author for AI-assisted pieces) — join all names if more than one.
 * 2. The `author` taxonomy inside `_embedded['wp:term']` — same plugin, different surface,
 *    used as a fallback in case `authors` isn't present on a given site's REST response.
 * 3. Core WP `_embedded.author[0].name` — the standard WP REST shape, in case a source
 *    site isn't running the same author plugin.
 * 4. The source label itself, so the UI never shows a blank byline.
 */
function extractAuthor(post, terms, source) {
  if (Array.isArray(post.authors) && post.authors.length) {
    return post.authors.map((a) => a.display_name).filter(Boolean).join(', ') || source.label;
  }
  const authorTerms = terms.filter((t) => t.taxonomy === 'author').map((t) => t.name);
  if (authorTerms.length) return authorTerms.join(', ');
  const coreAuthor = post._embedded?.author?.[0]?.name;
  if (coreAuthor) return coreAuthor;
  return source.label;
}

function filterFeed(feed, { category, since }) {
  let articles = feed.articles;
  if (category) {
    articles = articles.filter(
      (a) => a.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (since) {
    const sinceDate = new Date(since);
    articles = articles.filter((a) => new Date(a.publishedAt) > sinceDate);
  }
  return { fetchedAt: feed.fetchedAt, count: articles.length, articles };
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&#8217;/g, "'").replace(/&#8220;|&#8221;/g, '"').trim();
}

/**
 * Some source sites (confirmed on Labari Journal) run a lazyload plugin that ships
 * <img> tags with a tiny base64 placeholder in `src` and the real photo URL in
 * `data-pk-src`/`data-pk-srcset`. That's fine on the source site, which runs its own
 * lazyload JS to swap the real image in on scroll — but this app renders the raw
 * content HTML directly, with no such script running, so left alone every inline
 * image would display as a blurry placeholder blob forever. This swaps the real
 * URLs into `src`/`srcset` before the content is ever sent to the client.
 */
function fixLazyloadImages(html) {
  return html.replace(/<img\s+([^>]*?)>/g, (match, attrs) => {
    const pkSrcMatch = attrs.match(/data-pk-src="([^"]+)"/);
    if (!pkSrcMatch) return match; // no lazyload placeholder on this image, leave untouched

    const pkSrcsetMatch = attrs.match(/data-pk-srcset="([^"]+)"/);

    let newAttrs = attrs
      .replace(/src="[^"]*"/, `src="${pkSrcMatch[1]}"`)
      .replace(/\bclass="([^"]*)"/, (m, classVal) => `class="${classVal.replace(/\bpk-lazyload\b/, '').trim()}"`);

    if (pkSrcsetMatch) {
      newAttrs = newAttrs.includes('srcset=')
        ? newAttrs.replace(/srcset="[^"]*"/, `srcset="${pkSrcsetMatch[1]}"`)
        : `${newAttrs} srcset="${pkSrcsetMatch[1]}"`;
    }

    return `<img ${newAttrs}>`;
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
}
