'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/catalog/types';
import { ProductCard } from '@/components/product/ProductCard';

interface Props {
  query: string;
  results: Product[];
}

export function RechercheClient({ query, results }: Props) {
  const [value, setValue] = useState(query);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query) inputRef.current?.focus();
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="wrap recherche-wrap">
      <h1 className="recherche-title">Recherche</h1>

      <form className="recherche-form" onSubmit={submit}>
        <div className="search">
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Référence (MOTLT50010), produit, marque…"
            aria-label="Rechercher"
            autoComplete="off"
          />
          <button type="submit">Rechercher</button>
        </div>
      </form>

      {query.length >= 2 ? (
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
      ) : (
        <p className="recherche-hint">Saisissez au moins 2 caractères pour lancer la recherche.</p>
      )}
    </div>
  );
}
