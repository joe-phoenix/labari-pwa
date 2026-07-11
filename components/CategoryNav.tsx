// components/CategoryNav.tsx
'use client';

// Built from the real category taxonomy observed across both sites' live feeds
// (19 distinct categories seen in a 60-article sample). These are the highest-frequency,
// most reader-meaningful ones; less common tags (Opinion, Spotlight, Guides, Energy + Power,
// Health & Science, Consumer Tech, Lifestyle) fall under "All" rather than getting their own chip.
// Technology is now a merged bucket: every TechLabari article (Labari Media's
// tech vertical) plus any Labari Journal piece tagged Technology. Everything
// else uses Labari Journal's own section taxonomy, since TechLabari no longer
// contributes its own separate categories after the Worker-side consolidation.
export const CATEGORIES = [
  'All',
  'Technology',
  'Government and Politics',
  'Business',
  'Society, Culture and Lifestyle',
  'Crime and Law',
  'Sports',
  'Opinion',
  'Media and Entertainment',
  'Spotlight',
];

export function CategoryNav({
  activeCategory,
  onChange,
}: {
  activeCategory: string;
  onChange: (category: string) => void;
}) {
  return (
    <nav
      className="relative [mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"
      aria-label="Filter by category"
    >
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            aria-pressed={activeCategory === cat}
            className={[
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150',
              activeCategory === cat
                ? 'bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>
    </nav>
  );
}
