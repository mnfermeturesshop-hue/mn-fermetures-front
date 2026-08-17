'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllProducts, getAllCategories, getAllBrands } from '@/lib/catalog/db';
import type { Brand, Category } from '@/lib/catalog/types';
import { toast } from '@/components/ui/Toast';

interface PriceRow {
  slug: string;
  name: string;
  reference: string;
  label: string;
  kind: 'variant' | 'kit';
  categorySlug: string;
  brandSlug?: string;
  priceHT: number;
  dirty: boolean;
  saving: boolean;
}

interface PriceUpdate { slug: string; kind: 'variant' | 'kit'; reference: string; priceHT: number; }

async function pushPrices(updates: PriceUpdate[]): Promise<void> {
  const res = await fetch('/api/admin/prices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error ?? 'Erreur');
  }
}

export default function AdminTarifs() {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('all');
  const [brand, setBrand] = useState('all');
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    Promise.all([getAllProducts(), getAllCategories(), getAllBrands()]).then(([products, cats, brs]) => {
      const list: PriceRow[] = [];
      for (const p of products) {
        if (p.pricingType === 'unit') {
          for (const v of p.variants) {
            list.push({
              slug: p.slug, name: p.name, reference: v.reference, label: v.label ?? '',
              kind: 'variant', categorySlug: p.categorySlug, brandSlug: p.brandSlug,
              priceHT: v.priceHT, dirty: false, saving: false,
            });
          }
        } else if (p.pricingType === 'kit') {
          for (const c of p.configs) {
            list.push({
              slug: p.slug, name: p.name, reference: c.reference, label: c.label ?? '',
              kind: 'kit', categorySlug: p.categorySlug, brandSlug: p.brandSlug,
              priceHT: c.priceHT, dirty: false, saving: false,
            });
          }
        }
      }
      list.sort((a, b) => a.name.localeCompare(b.name) || a.reference.localeCompare(b.reference));
      setRows(list);
      setCategories(cats);
      setBrands(brs);
      setLoading(false);
    });
  }, []);

  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;
  const brandName = (slug?: string) => brands.find((b) => b.slug === slug)?.name ?? '';

  const filtered = useMemo(() => {
    let list = rows;
    if (cat !== 'all') list = list.filter((r) => r.categorySlug === cat);
    if (brand !== 'all') list = list.filter((r) => (r.brandSlug ?? '') === brand);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.reference.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q));
    }
    return list;
  }, [rows, search, cat, brand]);

  // Catégories présentes dans les lignes (pour ne proposer que le pertinent).
  const usedCats = useMemo(() => {
    const set = new Set(rows.map((r) => r.categorySlug));
    return categories.filter((c) => set.has(c.slug));
  }, [rows, categories]);
  const usedBrands = useMemo(() => {
    const set = new Set(rows.map((r) => r.brandSlug ?? ''));
    return brands.filter((b) => set.has(b.slug));
  }, [rows, brands]);

  const setPrice = (kind: string, reference: string, value: number) => {
    setRows((prev) => prev.map((r) => (r.reference === reference && r.kind === kind ? { ...r, priceHT: value, dirty: true } : r)));
  };

  const saveRow = async (row: PriceRow) => {
    setRows((prev) => prev.map((r) => (r.reference === row.reference && r.kind === row.kind ? { ...r, saving: true } : r)));
    try {
      await pushPrices([{ slug: row.slug, kind: row.kind, reference: row.reference, priceHT: row.priceHT }]);
      setRows((prev) => prev.map((r) => (r.reference === row.reference && r.kind === row.kind ? { ...r, dirty: false, saving: false } : r)));
      toast.success(`Prix mis à jour — ${row.reference}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la mise à jour');
      setRows((prev) => prev.map((r) => (r.reference === row.reference && r.kind === row.kind ? { ...r, saving: false } : r)));
    }
  };

  const dirtyRows = rows.filter((r) => r.dirty);

  const saveAll = async () => {
    if (dirtyRows.length === 0) return;
    setSavingAll(true);
    try {
      await pushPrices(dirtyRows.map((r) => ({ slug: r.slug, kind: r.kind, reference: r.reference, priceHT: r.priceHT })));
      setRows((prev) => prev.map((r) => (r.dirty ? { ...r, dirty: false } : r)));
      toast.success(`${dirtyRows.length} prix enregistré${dirtyRows.length > 1 ? 's' : ''}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Tarifs</h1>
        {dirtyRows.length > 0 && (
          <button type="button" className="btn solid adm-btn-save" onClick={saveAll} disabled={savingAll}>
            {savingAll ? 'Enregistrement…' : `💾 Enregistrer ${dirtyRows.length} modification${dirtyRows.length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      <p className="adm-hint">Prix HT des produits catalogue (variantes unitaires &amp; configurations de kit), modifiables ligne par ligne. Les prix des configurateurs (grilles à la dimension) s&apos;éditent via l&apos;export/import Excel.</p>

      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Référence, produit, libellé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {usedCats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="adm-select" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="all">Toutes marques</option>
          {usedBrands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="adm-loading">Chargement…</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Référence</th>
                <th>Produit</th>
                <th>Variante / config</th>
                <th>Catégorie</th>
                <th>Marque</th>
                <th>Prix HT (€)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.kind}:${row.reference}`} className={`adm-tr ${row.dirty ? 'adm-tr-dirty' : ''}`}>
                  <td>
                    <span className="ref">{row.reference}</span>
                    {row.kind === 'kit' && <span className="adm-kind-badge">kit</span>}
                  </td>
                  <td><a href={`/admin/produits/${row.slug}`} className="adm-prod-link">{row.name}</a></td>
                  <td>{row.label || <span className="adm-muted">—</span>}</td>
                  <td>{catName(row.categorySlug)}</td>
                  <td>{brandName(row.brandSlug) || <span className="adm-muted">—</span>}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="adm-price-input"
                      value={row.priceHT}
                      onChange={(e) => setPrice(row.kind, row.reference, parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    {row.dirty && (
                      <button type="button" className="adm-action-btn edit" onClick={() => saveRow(row)} disabled={row.saving}>
                        {row.saving ? '…' : '💾'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="adm-empty">Aucune ligne trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
