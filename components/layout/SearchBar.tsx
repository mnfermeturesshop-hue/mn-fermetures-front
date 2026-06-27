'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { trackSearch } from '@/lib/analytics';

interface SuggestItem {
  slug: string;
  name: string;
  categorySlug: string;
  brandSlug?: string;
  pricingType: string;
  matchedField: string;
  reference?: string;
  imageUrl?: string | null;
  priceHT?: number | null;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const PRICE_PREFIX: Record<string, string> = {
  matrix: 'à partir de ',
  kit:    'à partir de ',
  unit:   '',
};

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

const FIELD_LABELS: Record<string, string> = {
  reference: 'Réf.',
  name: '',
  brand: 'Marque',
  category: 'Famille',
  description: '',
};

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length >= 2) {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data: SuggestItem[] = await res.json();
      setResults(data);
      setOpen(true);
      setFocused(-1);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, []);

  const submit = (q = query) => {
    if (!q.trim()) return;
    setOpen(false);
    trackSearch({ query: q.trim(), numResults: results.length });
    router.push(`/recherche?q=${encodeURIComponent(q.trim())}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter') submit();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focused >= 0) {
        router.push(`/produit/${results[focused].slug}`);
        setOpen(false);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="searchbar" ref={containerRef}>
      <div className="search">
        <input
          ref={inputRef}
          placeholder="Référence (MOTLT50010), produit, marque…"
          aria-label="Rechercher"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => search(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => query.length >= 2 && setOpen(true)}
        />
        <button type="button" onClick={() => submit()}>Rechercher</button>
      </div>

      {open && results.length > 0 && (
        <div className="suggest-panel" role="listbox">
          {results.map((r, i) => {
            const fieldLabel = FIELD_LABELS[r.matchedField];
            const prefix = PRICE_PREFIX[r.pricingType] ?? '';
            return (
              <Link
                key={r.slug}
                href={`/produit/${r.slug}`}
                className={`suggest-item ${i === focused ? 'focused' : ''}`}
                role="option"
                onClick={() => setOpen(false)}
              >
                <div className="suggest-thumb">
                  {r.imageUrl ? (
                    <Image
                      src={r.imageUrl}
                      alt={r.name}
                      width={40}
                      height={40}
                      style={{ objectFit: 'contain' }}
                      unoptimized
                    />
                  ) : (
                    <span className="suggest-glyph">
                      {GLYPHS[r.categorySlug] ?? '▣'}
                    </span>
                  )}
                </div>
                <div className="suggest-left">
                  {r.reference && <span className="ref suggest-ref">{r.reference}</span>}
                  <span className="suggest-name">{r.name}</span>
                  {fieldLabel && <span className="suggest-field">{fieldLabel}</span>}
                </div>
                <div className="suggest-right">
                  {r.priceHT != null ? (
                    <span className="suggest-price">
                      {prefix}{euro(r.priceHT)} <small>HT</small>
                    </span>
                  ) : null}
                  <span className="suggest-cat">
                    {r.categorySlug.replace(/-/g, ' ')}
                  </span>
                </div>
              </Link>
            );
          })}
          <Link
            className="suggest-footer"
            href={`/recherche?q=${encodeURIComponent(query)}`}
            onClick={() => setOpen(false)}
          >
            Voir tous les résultats pour « {query} » →
          </Link>
        </div>
      )}
    </div>
  );
}
