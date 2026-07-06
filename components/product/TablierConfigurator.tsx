'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type MatrixProduct } from '@/lib/catalog/types';
import { resolveMatrixPrice } from '@/lib/catalog/resolvePrice';
import { useCartStore, euro } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { getDiscount, applyDiscount } from '@/lib/familles';
import { toast } from '@/components/ui/Toast';
import { trackAddToCart } from '@/lib/analytics';

export function TablierConfigurator({ product }: { product: MatrixProduct }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Prix masqués (visiteur non connecté) : le produit arrive sans grille tarifaire
  const priceGated = product.proOnly || product.heights.length === 0;

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
  const { user } = useAuthStore();
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
  const discountPct = getDiscount(user?.proDiscounts, product.famille);
  const finalPrice = price === null ? null : applyDiscount(price, discountPct);

  const handleAdd = () => {
    if (finalPrice === null) return;
    const optLabels = opts
      .map((c) => product.options?.find((o) => o.code === c)?.label)
      .filter(Boolean)
      .join(', ');
    const colorLabel = product.colors?.find((c) => c.code === color)?.label;
    const detail = [`${width} × ${height} mm`, colorLabel, optLabels || undefined]
      .filter(Boolean)
      .join(' · ');

    const sortedOpts = [...opts].sort();
    addLine({
      key: `${product.slug}-${height}-${width}-${color}-${sortedOpts.join('+')}`,
      name: product.name,
      detail,
      unitPriceHT: finalPrice,
      quantity: 1,
      uom: 'unite',
      // Descripteur pour le recalcul serveur (audit S2) — le prix ci-dessus
      // n'est qu'indicatif ; le serveur re-tarife via ces dimensions/options.
      pricing: { kind: 'matrix', slug: product.slug, height, width, options: sortedOpts },
    });
    trackAddToCart({ key: `${product.slug}-${height}-${width}`, name: product.name, categorySlug: product.categorySlug, priceHT: finalPrice, quantity: 1 });
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
        {priceGated ? (
          <div className="price-out price-out--gated">
            <div>
              <div className="eyebrow">Prix sur connexion</div>
              <div className="cfg-gate-text">
                Tarifs réservés aux professionnels.
              </div>
              <div className="cfg-dims">{width} × {height} mm</div>
            </div>
            <a className="btn solid" href="/pro">Se connecter</a>
          </div>
        ) : (
        <div className="price-out">
          <div>
            <div className="eyebrow">Prix indicatif</div>
            {discountPct > 0 && finalPrice !== null && (
              <div className="unit-discount-badge">−{discountPct}% pro</div>
            )}
            <div className="big">
              {finalPrice === null
                ? '—'
                : showTTC ? <>{euro(finalPrice * (1 + TVA))} <small>TTC</small></> : <>{euro(finalPrice)} <small>HT</small></>
              }
            </div>
            {discountPct > 0 && price !== null && (
              <div className="unit-uprice unit-uprice--crossed">
                {showTTC ? <>{euro(price * (1 + TVA))} TTC</> : <>{euro(price)} HT</>}
              </div>
            )}
            <div className="cfg-dims">{width} × {height} mm</div>
          </div>
          <button
            className="btn solid"
            type="button"
            onClick={handleAdd}
            disabled={finalPrice === null}
          >
            Ajouter au panier
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
