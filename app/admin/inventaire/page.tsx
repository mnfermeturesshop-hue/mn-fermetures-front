'use client';

import { useEffect, useState, useMemo } from 'react';
import { getAllProducts, updateVariantStock } from '@/lib/catalog/db';
import type { Product, UnitProduct } from '@/lib/catalog/types';
import { toast } from '@/components/ui/Toast';

interface StockRow {
  productId: string;
  productSlug: string;
  productName: string;
  reference: string;
  label: string;
  inStock: boolean;
  stockQty: number;
  dirty: boolean;
  saving: boolean;
}

export default function AdminInventaire() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'out'>('all');

  useEffect(() => {
    getAllProducts().then((products) => {
      const stockRows: StockRow[] = [];
      for (const p of products) {
        if (p.pricingType !== 'unit') continue;
        const up = p as UnitProduct;
        for (const v of up.variants) {
          stockRows.push({
            productId: (p as Product & { id?: string }).id ?? p.slug,
            productSlug: p.slug,
            productName: p.name,
            reference: v.reference,
            label: v.label ?? '',
            inStock: v.inStock,
            stockQty: v.stockQty ?? 0,
            dirty: false,
            saving: false,
          });
        }
      }
      setRows(stockRows);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (filterStock === 'out') list = list.filter((r) => !r.inStock);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.reference.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, filterStock]);

  const update = (reference: string, field: 'inStock' | 'stockQty', value: boolean | number) => {
    setRows((prev) =>
      prev.map((r) => r.reference === reference ? { ...r, [field]: value, dirty: true } : r)
    );
  };

  const save = async (row: StockRow) => {
    setRows((prev) => prev.map((r) => r.reference === row.reference ? { ...r, saving: true } : r));
    try {
      await updateVariantStock(row.productId, row.reference, row.inStock, row.stockQty);
      setRows((prev) => prev.map((r) => r.reference === row.reference ? { ...r, dirty: false, saving: false } : r));
      toast.success(`Stock mis à jour — ${row.reference}`);
    } catch {
      toast.error('Erreur lors de la mise à jour');
      setRows((prev) => prev.map((r) => r.reference === row.reference ? { ...r, saving: false } : r));
    }
  };

  const dirtyCount = rows.filter((r) => r.dirty).length;

  const saveAll = async () => {
    const dirty = rows.filter((r) => r.dirty);
    for (const row of dirty) await save(row);
    toast.success(`${dirty.length} ligne${dirty.length > 1 ? 's' : ''} enregistrée${dirty.length > 1 ? 's' : ''}`);
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Inventaire</h1>
        {dirtyCount > 0 && (
          <button type="button" className="btn solid adm-btn-save" onClick={saveAll}>
            💾 Enregistrer {dirtyCount} modification{dirtyCount > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="adm-toolbar">
        <input
          className="adm-search"
          type="search"
          placeholder="Référence, produit, libellé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="adm-filter-tabs">
          <button
            type="button"
            className={`adm-filter-tab ${filterStock === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStock('all')}
          >
            Tout ({rows.length})
          </button>
          <button
            type="button"
            className={`adm-filter-tab ${filterStock === 'out' ? 'active' : ''}`}
            onClick={() => setFilterStock('out')}
          >
            Ruptures ({rows.filter((r) => !r.inStock).length})
          </button>
        </div>
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
                <th>Libellé</th>
                <th>En stock</th>
                <th>Quantité</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.reference} className={`adm-tr ${row.dirty ? 'adm-tr-dirty' : ''}`}>
                  <td><span className="ref">{row.reference}</span></td>
                  <td>
                    <a href={`/admin/produits/${row.productSlug}`} className="adm-prod-link">{row.productName}</a>
                  </td>
                  <td>{row.label || <span className="adm-muted">—</span>}</td>
                  <td>
                    <label className="adm-toggle">
                      <input
                        type="checkbox"
                        checked={row.inStock}
                        onChange={(e) => update(row.reference, 'inStock', e.target.checked)}
                      />
                      <span className="adm-toggle-track" />
                    </label>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      className="adm-qty-input"
                      value={row.stockQty}
                      onChange={(e) => update(row.reference, 'stockQty', parseInt(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    {row.dirty && (
                      <button
                        type="button"
                        className="adm-action-btn edit"
                        onClick={() => save(row)}
                        disabled={row.saving}
                      >
                        {row.saving ? '…' : '💾'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="adm-empty">Aucune référence trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
