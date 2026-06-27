'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type MatrixProduct } from '@/lib/catalog/types';
import { resolveMatrixPrice } from '@/lib/catalog/resolvePrice';
import { useCartStore, euro } from '@/lib/store/cart';
import { toast } from '@/components/ui/Toast';

export function TablierConfigurator({ product }: { product: MatrixProduct }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Lire H/L depuis l'URL si présents (partage de devis)
  const initH = (() => {
    const v = Number(searchParams.get('h'));
    return product.heights.includes(v) ? v : product.heights[0];
  })();
  const initW = (() => {
    const v = Number(searchParams.get('w'));
    return product.widths.includes(v) ? v : product.widths[0];
  })();

  const [height, setHeight] = useState(initH);
  const [width, setWidth]   = useState(initW);
  const [opts, setOpts]     = useState<string[]>([]);
  const [color, setColor]   = useState(product.colors?.[0]?.code ?? '');
  const { addLine, openCart, showTTC } = useCartStore();
  const TVA = 0.20;

  // Encoder les dimensions dans l'URL pour partage/devis
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('h', String(height));
    params.set('w', String(width));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [height, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (code: string) =>
    setOpts((cur) => (cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code]));

  const price = useMemo(
    () => resolveMatrixPrice(product, height, width, opts),
    [product, height, width, opts]
  );

  const handleAdd = () => {
    if (price === null) return;
    const optLabels = opts
      .map((c) => product.options?.find((o) => o.code === c)?.label)
      .filter(Boolean)
      .join(', ');
    const colorLabel = product.colors?.find((c) => c.code === color)?.label;
    const detail = [`${width} × ${height} mm`, colorLabel, optLabels || undefined]
      .filter(Boolean)
      .join(' · ');

    addLine({
      key: `${product.slug}-${height}-${width}-${color}-${opts.sort().join('+')}`,
      name: product.name,
      detail,
      unitPriceHT: price,
      quantity: 1,
      uom: 'unite',
    });
    toast.success('Tablier ajouté au panier');
    openCart();
  };

  return (
    <div className="config">
      <div className="head">
        <h3>Configurateur tablier sur mesure</h3>
        <span>{product.name} · prix calculé à la dimension</span>
      </div>
      <div className="body">
        <div className="field">
          <label htmlFor="cfgH">Hauteur finie (mm)</label>
          <select id="cfgH" value={height} onChange={(e) => setHeight(Number(e.target.value))}>
            {product.heights.map((h) => (
              <option key={h} value={h}>{h} mm</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cfgW">Largeur finie (mm)</label>
          <select id="cfgW" value={width} onChange={(e) => setWidth(Number(e.target.value))}>
            {product.widths.map((w) => (
              <option key={w} value={w}>{w} mm</option>
            ))}
          </select>
        </div>

        {product.colors && product.colors.length > 0 && (
          <div className="field">
            <label>Couleur</label>
            <div className="color-picker">
              {product.colors.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={`color-swatch ${c.code === color ? 'active' : ''}`}
                  style={{ background: c.hex }}
                  title={c.label}
                  onClick={() => setColor(c.code)}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {(product.options ?? []).length > 0 && (
          <div className="field">
            <label>Options</label>
            <div className="opts">
              {(product.options ?? []).map((o) => (
                <label key={o.code}>
                  <input type="checkbox" checked={opts.includes(o.code)} onChange={() => toggle(o.code)} />
                  {o.label}
                  {opts.includes(o.code) && (
                    <span className="opt-plus">+{o.valuesByWidth[width] ?? 0} €</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Sticky : toujours visible sans scroller */}
        <div className="price-out">
          <div>
            <div className="eyebrow">Prix indicatif</div>
            <div className="big">
              {price === null
                ? '—'
                : showTTC ? <>{euro(price * (1 + TVA))} <small>TTC</small></> : <>{euro(price)} <small>HT</small></>
              }
            </div>
            <div className="cfg-dims">{width} × {height} mm</div>
          </div>
          <button
            className="btn solid"
            type="button"
            onClick={handleAdd}
            disabled={price === null}
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}
