'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { saveRecentItem, getRecentItems, type RecentItem } from '@/lib/store/recentlyViewed';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

const PRICE_PREFIX: Record<string, string> = { matrix: 'à partir de ', kit: 'à partir de ', unit: '' };

interface Props {
  current: RecentItem;
}

export function RecentlyViewed({ current }: Props) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    saveRecentItem(current);
    setItems(getRecentItems(current.slug));
  }, [current.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (items.length === 0) return null;

  return (
    <section className="recently-viewed">
      <h2 className="recently-viewed-title">Vus récemment</h2>
      <div className="recently-viewed-list">
        {items.map((item) => (
          <Link href={`/produit/${item.slug}`} key={item.slug} className="rv-card">
            <div className="rv-thumb">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={56}
                  height={56}
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              ) : (
                <span className="rv-glyph">{GLYPHS[item.categorySlug] ?? '▣'}</span>
              )}
            </div>
            <div className="rv-info">
              <div className="rv-name">{item.name}</div>
              {item.priceHT != null && (
                <div className="rv-price">
                  {PRICE_PREFIX[item.pricingType] ?? ''}{euro(item.priceHT)}
                  <small> HT</small>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
