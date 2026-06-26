'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Product, Brand } from '@/lib/catalog/types';
import { isUnit } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from '@/components/ui/Pagination';
import type { NavItem } from '@/lib/catalog/menuResolve';

const PER_PAGE = 12;
type SortKey = 'pertinence' | 'prix-asc' | 'prix-desc' | 'stock';

interface Props {
  products: Product[];
  categoryName: string;
  navChildren: NavItem[];
  currentHref: string;
  brandsInCat: Brand[];
}

function SidebarNav({ items, currentHref }: { items: NavItem[]; currentHref: string }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <nav className="cat-subnav">
      {items.map((item) => {
        const isActive = currentHref === item.href;
        if (item.children && item.children.length > 0) {
          const isOpen = openGroup === item.href || item.children.some(c => c.href === currentHref);
          return (
            <div key={item.href} className="cat-subnav-group">
              <button
                type="button"
                className={`cat-subnav-hd ${isOpen ? 'open' : ''}`}
                onClick={() => setOpenGroup(isOpen ? null : item.href)}
              >
                <Link href={item.href} onClick={(e) => e.stopPropagation()}>{item.name}</Link>
                <span className="cat-subnav-chevron">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="cat-subnav-children">
                  {item.children.map((leaf) => (
                    <Link
                      key={leaf.href}
                      href={leaf.href}
                      className={`cat-subnav-leaf ${leaf.href === currentHref ? 'active' : ''}`}
                    >
                      {leaf.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`cat-subnav-item ${isActive ? 'active' : ''}`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function CatalogueClient({ products, categoryName, navChildren, currentHref, brandsInCat }: Props) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly]       = useState(false);
  const [sort, setSort]                     = useState<SortKey>('pertinence');
  const [page, setPage]                     = useState(1);

  const toggleBrand = (slug: string) =>
    setSelectedBrands((prev) =>
      prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug]
    );

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedBrands.length > 0)
      list = list.filter((p) => p.brandSlug && selectedBrands.includes(p.brandSlug));
    if (inStockOnly)
      list = list.filter((p) => isUnit(p) ? p.variants.some((v) => v.inStock) : true);
    switch (sort) {
      case 'prix-asc':  list.sort((a, b) => priceFrom(a) - priceFrom(b)); break;
      case 'prix-desc': list.sort((a, b) => priceFrom(b) - priceFrom(a)); break;
      case 'stock':
        list.sort((a, b) => {
          const s = (p: Product) => isUnit(p) ? (p.variants[0]?.inStock ? 1 : 0) : 1;
          return s(b) - s(a);
        });
        break;
    }
    return list;
  }, [products, selectedBrands, inStockOnly, sort]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const resetPage  = () => setPage(1);

  const activeFilters = [
    ...selectedBrands.map((b) => ({
      key: `brand-${b}`,
      label: brandsInCat.find((br) => br.slug === b)?.name ?? b,
      remove: () => toggleBrand(b),
    })),
    ...(inStockOnly ? [{ key: 'stock', label: 'En stock', remove: () => setInStockOnly(false) }] : []),
  ];

  return (
    <div className="cat-layout">
      {/* Sidebar */}
      <aside className="cat-filters">
        {navChildren.length > 0 && (
          <>
            <div className="filters-title">Dans cette catégorie</div>
            <SidebarNav items={navChildren} currentHref={currentHref} />
            <div className="filters-divider" />
          </>
        )}

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

      {/* Contenu */}
      <div className="cat-content">
        <div className="cat-header">
          <div>
            <h1>{categoryName}</h1>
          </div>
          <div className="cat-sort">
            <span className="cat-count">
              {filtered.length} référence{filtered.length !== 1 ? 's' : ''}
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

        {/* Sous-catégories si aucun produit */}
        {products.length === 0 && navChildren.length > 0 ? (
          <div className="cat-subcategories">
            {navChildren.map((item) => (
              <Link key={item.href} href={item.href} className="cat-subcat-card">
                <span className="cat-subcat-name">{item.name}</span>
                {item.children && item.children.length > 0 && (
                  <span className="cat-subcat-count">{item.children.length} sous-catégorie{item.children.length > 1 ? 's' : ''}</span>
                )}
              </Link>
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
