'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/product/ProductCard';

interface SuggestItem {
  slug: string;
  name: string;
  categorySlug: string;
  pricingType: string;
  matchedField: string;
  reference?: string;
  imageUrl?: string | null;
  priceHT?: number | null;
}

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

const PRICE_PREFIX: Record<string, string> = { matrix: 'à partir de ', kit: 'à partir de ', unit: '' };

interface Props {
  query: string;
  results: Product[];
}

export function RechercheClient({ query, results }: Props) {
  const [value, setValue] = useState(query);
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const [focused, setFocused] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query) inputRef.current?.focus();
  }, [query]);

  const fetchSuggest = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
    const data: SuggestItem[] = await res.json();
    setSuggestions(data);
    setFocused(-1);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggest(v), 200);
  };

  const submit = (q = value) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSuggestions([]);
    router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) {
      if (e.key === 'Enter') submit();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focused >= 0) {
        router.push(`/produit/${suggestions[focused].slug}`);
        setSuggestions([]);
      } else {
        submit();
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  const showFullResults = query.length >= 2 && suggestions.length === 0;

  return (
    <div className="wrap recherche-wrap">
      <h1 className="recherche-title">Recherche</h1>

      <div className="recherche-form">
        <div className="search">
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKey}
            onFocus={() => value.length >= 2 && suggestions.length === 0 && fetchSuggest(value)}
            placeholder="Référence (MOTLT50010), produit, marque…"
            aria-label="Rechercher"
            autoComplete="off"
          />
          <button type="button" onClick={() => submit()}>Rechercher</button>
        </div>

        {/* Suggestions temps réel */}
        {suggestions.length > 0 && (
          <div className="recherche-suggest">
            {suggestions.map((r, i) => {
              const prefix = PRICE_PREFIX[r.pricingType] ?? '';
              return (
                <Link
                  key={r.slug}
                  href={`/produit/${r.slug}`}
                  className={`suggest-item${i === focused ? ' focused' : ''}`}
                  onClick={() => setSuggestions([])}
                >
                  <div className="suggest-thumb">
                    {r.imageUrl ? (
                      <Image src={r.imageUrl} alt={r.name} width={40} height={40} style={{ objectFit: 'contain' }} unoptimized />
                    ) : (
                      <span className="suggest-glyph">{GLYPHS[r.categorySlug] ?? '▣'}</span>
                    )}
                  </div>
                  <div className="suggest-left">
                    {r.reference && <span className="ref suggest-ref">{r.reference}</span>}
                    <span className="suggest-name">{r.name}</span>
                  </div>
                  {r.priceHT != null && (
                    <div className="suggest-right">
                      <span className="suggest-price">{prefix}{euro(r.priceHT)} <small>HT</small></span>
                      <span className="suggest-cat">{r.categorySlug.replace(/-/g, ' ')}</span>
                    </div>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              className="suggest-footer"
              onClick={() => submit()}
            >
              Voir tous les résultats pour « {value} » →
            </button>
          </div>
        )}
      </div>

      {/* Résultats complets (rendu serveur après soumission) */}
      {showFullResults && (
        results.length > 0 ? (
          <>
            <p className="recherche-count">
              {results.length} résultat{results.length !== 1 ? 's' : ''} pour «&nbsp;<strong>{query}</strong>&nbsp;»
            </p>
            <div className="prods">
              {results.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </>
        ) : (
          <div className="recherche-empty">
            <p>Aucun résultat pour «&nbsp;<strong>{query}</strong>&nbsp;».</p>
            <p className="recherche-hint">Essayez avec la référence exacte (ex : MOTLT50010) ou un mot-clé plus court.</p>
          </div>
        )
      )}

      {!query && suggestions.length === 0 && (
        <p className="recherche-hint">Saisissez au moins 2 caractères pour lancer la recherche.</p>
      )}
    </div>
  );
}
