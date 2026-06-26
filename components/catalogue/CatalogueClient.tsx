'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import type { Category, Brand } from '@/lib/catalog/types';
import { isUnit } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';

const PER_PAGE = 12;

type SortKey = 'pertinence' | 'prix-asc' | 'prix-desc' | 'stock';

interface Props {
  products: Product[];
  category: Category;
  allCategories: Category[];
  brandsInCat: Brand[];
}

export function CatalogueClient({ products, category, allCategories, brandsInCat }: Props) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('pertinence');
  const [page, setPage] = useState(1);

  const toggleBrand = (slug: string) =>
    setSelectedBrands((prev) =>
      prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug]
    );

  const filtered = useMemo(() => {
    let list = [...products];

    if (selectedBrands.length > 0) {
      list = list.filter((p) => p.brandSlug && selectedBrands.includes(p.brandSlug));
    }

    if (inStockOnly) {
      list = list.filter((p) => {
        if (isUnit(p)) return p.variants.some((v) => v.inStock);
        return true;
      });
    }

    switch (sort) {
      case 'prix-asc':
        list.sort((a, b) => priceFrom(a) - priceFrom(b));
        break;
      case 'prix-desc':
        list.sort((a, b) => priceFrom(b) - priceFrom(a));
        break;
      case 'stock':
        list.sort((a, b) => {
          const aStock = isUnit(a) ? (a.variants[0]?.inStock ? 1 : 0) : 1;
          const bStock = isUnit(b) ? (b.variants[0]?.inStock ? 1 : 0) : 1;
          return bStock - aStock;
        });
        break;
    }

    return list;
  }, [products, selectedBrands, inStockOnly, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const activeFilters = [
    ...selectedBrands.map((b) => ({ key: `brand-${b}`, label: brandsInCat.find((br) => br.slug === b)?.name ?? b, remove: () => toggleBrand(b) })),
    ...(inStockOnly ? [{ key: 'stock', label: 'En stock', remove: () => setInStockOnly(false) }] : []),
  ];

  const resetPage = () => setPage(1);

  return (
    <div className="cat-layout">
      {/* Filtres latéraux */}
      <aside className="cat-filters">
        <div className="filters-title">Familles</div>
        <nav className="filters-cats">
          {allCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/catalogue/${c.slug}`}
              className={`filter-cat ${c.slug === category.slug ? 'active' : ''}`}
            >
              <span className="filter-cat-ic">{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="filters-divider" />

        <div className="filters-title">Disponibilité</div>
        <div className="filter-checks">
          <label>
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => { setInStockOnly(e.target.checked); resetPage(); }}
            />
            En stock uniquement
          </label>
        </div>

        {brandsInCat.length > 0 && (
          <>
            <div className="filters-divider" />
            <div className="filters-title">Marques</div>
            <div className="filter-checks">
              {brandsInCat.map((b) => (
                <label key={b.slug}>
                  <input
                    type="checkbox"
                    checked={selectedBrands.includes(b.slug)}
                    onChange={() => { toggleBrand(b.slug); resetPage(); }}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Contenu principal */}
      <div className="cat-content">
        <div className="cat-header">
          <div>
            <span className="eyebrow">{category.icon} {category.name}</span>
            <h1>{category.name}</h1>
          </div>
          <div className="cat-sort">
            <span className="cat-count">
              {filtered.length} référence{filtered.length > 1 ? 's' : ''}
            </span>
            <select
              aria-label="Trier par"
              value={sort}
              onChange={(e) => { setSort(e.target.value as SortKey); resetPage(); }}
            >
              <option value="pertinence">Pertinence</option>
              <option value="prix-asc">Prix croissant</option>
              <option value="prix-desc">Prix décroissant</option>
              <option value="stock">En stock d&apos;abord</option>
            </select>
          </div>
        </div>

        {/* Chips de filtres actifs */}
        {activeFilters.length > 0 && (
          <div className="active-filters">
            <span className="active-filters-label">Filtres :</span>
            {activeFilters.map((f) => (
              <button key={f.key} className="filter-chip" type="button" onClick={f.remove}>
                {f.label} <span>✕</span>
              </button>
            ))}
            <button
              className="filter-chip reset"
              type="button"
              onClick={() => { setSelectedBrands([]); setInStockOnly(false); resetPage(); }}
            >
              Tout effacer
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="cat-empty">
            <p>Aucun produit ne correspond aux filtres sélectionnés.</p>
            <button
              className="btn ghost"
              type="button"
              onClick={() => { setSelectedBrands([]); setInStockOnly(false); resetPage(); }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="prods">
              {paginated.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination current={page} total={totalPages} onChange={setPage} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
