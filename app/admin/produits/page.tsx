'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/catalog/types';
import { getAllProducts } from '@/lib/catalog/db';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { toast } from '@/components/ui/Toast';

const PILL_LABEL: Record<string, string> = {
  unit: 'Unitaire', matrix: 'Sur mesure', kit: 'Kit',
};

export default function AdminProduits() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    getAllProducts().then((p) => { setProducts(p); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (filterType) list = list.filter((p) => p.pricingType === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        p.categorySlug.includes(q)
      );
    }
    return list;
  }, [products, search, filterType]);

  const handleDelete = async (product: Product) => {
    if (!confirm(`Archiver "${product.name}" ? Il ne sera plus visible sur le site.`)) return;
    setDeleting(product.slug);
    try {
      const id = (product as Product & { id?: string }).id;
      const res = await fetch('/api/admin/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { slug: product.slug }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Erreur archivage');
      }
      setProducts((prev) => prev.filter((p) => p.slug !== product.slug));
      toast.success('Produit archivé');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Erreur : ${msg}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Produits</h1>
        <Link href="/admin/produits/nouveau" className="btn solid adm-btn-new">＋ Nouveau produit</Link>
      </div>

      {/* Barre filtres */}
      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Rechercher un produit, une référence…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="adm-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tous les types</option>
          <option value="unit">Unitaire</option>
          <option value="matrix">Sur mesure</option>
          <option value="kit">Kit</option>
        </select>
        <span className="adm-count">{filtered.length} produit{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Slug</th>
                <th>Catégorie</th>
                <th>Type</th>
                <th>Prix HT</th>
                <th>Pro only</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.slug} className="adm-tr">
                  <td className="adm-td-name">
                    <span className="adm-prod-name">{p.name}</span>
                    {p.brandSlug && <span className="adm-prod-brand">{p.brandSlug}</span>}
                  </td>
                  <td><span className="ref adm-slug">{p.slug}</span></td>
                  <td>{p.categorySlug}</td>
                  <td>
                    <span className={`adm-pill adm-pill-${p.pricingType}`}>
                      {PILL_LABEL[p.pricingType]}
                    </span>
                  </td>
                  <td className="adm-td-price">
                    {priceFrom(p).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                  </td>
                  <td>{p.proOnly ? <span className="adm-yes">✓</span> : <span className="adm-no">—</span>}</td>
                  <td className="adm-td-actions">
                    <Link href={`/admin/produits/${p.slug}`} className="adm-action-btn edit">
                      Éditer
                    </Link>
                    <button
                      type="button"
                      className="adm-action-btn del"
                      onClick={() => handleDelete(p)}
                      disabled={deleting === p.slug}
                    >
                      {deleting === p.slug ? '…' : 'Archiver'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="adm-empty">Aucun produit trouvé</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
