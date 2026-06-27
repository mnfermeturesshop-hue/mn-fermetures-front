const KEY = 'mm-recently-viewed';
const MAX = 6;

export interface RecentItem {
  slug: string;
  name: string;
  categorySlug: string;
  imageUrl?: string;
  priceHT?: number;
  pricingType: string;
}

export function saveRecentItem(item: RecentItem): void {
  if (typeof window === 'undefined') return;
  try {
    const existing: RecentItem[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    const filtered = existing.filter((r) => r.slug !== item.slug);
    const next = [item, ...filtered].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* localStorage indisponible */ }
}

export function getRecentItems(excludeSlug?: string): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const items: RecentItem[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return excludeSlug ? items.filter((r) => r.slug !== excludeSlug) : items;
  } catch { return []; }
}
