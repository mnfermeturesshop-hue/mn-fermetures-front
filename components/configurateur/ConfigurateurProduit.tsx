'use client';

import { useEffect, useMemo, useState } from 'react';
import { resolveConfiguratorPrice } from '@/lib/configurateur/engine';
import type { ConfiguratorDef, MotorLayer } from '@/lib/configurateur/types';
import { applyDiscount, getDiscount, type FamilleSlug } from '@/lib/familles';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface Props { slug: string }

/** Valeurs possibles d'un axe compte tenu des axes déjà choisis (déduit des grilles existantes). */
function availableFor(def: ConfiguratorDef, selId: string, order: string[], prefix: Record<string, string>): Set<string> {
  const constrained = def.grids.some((g) => selId in g.key);
  if (!constrained) return new Set(def.selectors.find((s) => s.id === selId)?.options.map((o) => o.value) ?? []);
  const prior = order.slice(0, order.indexOf(selId));
  const set = new Set<string>();
  for (const g of def.grids) {
    if (prior.every((pid) => !(pid in g.key) || g.key[pid] === prefix[pid]) && selId in g.key) set.add(g.key[selId]);
  }
  return set;
}

/** Répare une sélection d'axes pour qu'elle reste une combinaison existante (cascade pose→lame→moteur). */
function repairAxes(def: ConfiguratorDef, order: string[], axes: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const sel of def.selectors) {
    const avail = availableFor(def, sel.id, order, out);
    out[sel.id] = avail.has(axes[sel.id]) ? axes[sel.id] : (sel.options.find((o) => avail.has(o.value))?.value ?? sel.options[0]?.value ?? '');
  }
  return out;
}

/** Grille correspondant exactement aux axes choisis. */
function findGrid(def: ConfiguratorDef, order: string[], axes: Record<string, string>) {
  return def.grids.find((g) => order.every((id) => !(id in g.key) || g.key[id] === axes[id])) ?? null;
}

export function ConfigurateurProduit({ slug }: Props) {
  const addLine = useCartStore((s) => s.addLine);
  const openCart = useCartStore((s) => s.openCart);
  const { user } = useAuthStore();

  const [def, setDef] = useState<ConfiguratorDef | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'gated' | 'error'>('loading');

  // Sélection
  const [axes, setAxes] = useState<Record<string, string>>({});
  const [layer, setLayer] = useState<MotorLayer>('filaire');
  const [largeurStr, setLargeurStr] = useState('1200');
  const [hauteurStr, setHauteurStr] = useState('1000');
  const [colorCode, setColorCode] = useState('');
  const [opts, setOpts] = useState<Set<string>>(new Set());
  const [qty, setQty] = useState(1);

  // Chargement de la définition (réservé aux connectés : prix = donnée pro)
  useEffect(() => {
    if (!user) { setStatus('gated'); return; }
    let alive = true;
    setStatus('loading');
    fetch(`/api/configurateurs/${slug}`)
      .then(async (r) => {
        if (r.status === 401) { if (alive) setStatus('gated'); return null; }
        if (!r.ok) { if (alive) setStatus('error'); return null; }
        return r.json() as Promise<ConfiguratorDef>;
      })
      .then((d) => {
        if (!alive || !d) return;
        setDef(d);
        const order = d.selectors.map((s) => s.id);
        const initial = Object.fromEntries(d.selectors.map((s) => [s.id, s.options[0]?.value ?? '']));
        setAxes(repairAxes(d, order, initial));
        setColorCode(d.colors[0]?.code ?? '');
        setStatus('ok');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [slug, user]);

  // La couche filaire/radio choisie doit exister dans la grille courante (robustesse).
  useEffect(() => {
    if (!def) return;
    const g = findGrid(def, def.selectors.map((s) => s.id), axes);
    if (g && !g.layers[layer]) setLayer(g.layers.filaire ? 'filaire' : 'radio');
  }, [def, axes, layer]);

  // Le coloris choisi doit être disponible pour la lame courante (la matrice
  // coloris × lame varie : certaines teintes n'existent pas en lame 55, etc.).
  useEffect(() => {
    if (!def) return;
    const pol = def.colorPolicies.find((p) => p.lame === axes.lame) ?? def.colorPolicies.find((p) => p.lame === '*');
    if (!pol) return;
    const ok = pol.standard.includes(colorCode) || !!pol.pvM2?.codes.includes(colorCode);
    if (!ok) {
      const first = def.colors.find((c) => pol.standard.includes(c.code) || !!pol.pvM2?.codes.includes(c.code));
      if (first) setColorCode(first.code);
    }
  }, [def, axes, colorCode]);

  const largeur = parseInt(largeurStr, 10) || 0;
  const hauteur = parseInt(hauteurStr, 10) || 0;

  const result = useMemo(() => {
    if (!def || !largeur || !hauteur) return null;
    return resolveConfiguratorPrice(def, {
      axes, layer, largeur, hauteur, colorCode, optionCodes: [...opts],
    });
  }, [def, axes, layer, largeur, hauteur, colorCode, opts]);

  // Remise pro par famille (parité affichage / serveur)
  const discountPct = def ? getDiscount(user?.proDiscounts ?? {}, def.famille as FamilleSlug) : 0;
  const unitNet = result ? applyDiscount(result.total, discountPct) : 0;

  const toggleOpt = (code: string) =>
    setOpts((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });

  // ── États de garde ──
  if (status === 'gated') {
    return (
      <div className="cfg-gate" style={{ maxWidth: 520, margin: '24px auto' }}>
        <p className="cfg-gate-text">
          <strong>Configurateur réservé aux professionnels.</strong><br />
          Connectez-vous pour configurer votre produit et obtenir un prix HT instantané.
        </p>
        <a className="btn solid full cfg-cta" href="/pro">Se connecter à l&apos;espace pro</a>
      </div>
    );
  }
  if (status === 'loading') return <p style={{ padding: 24, color: 'var(--muted)' }}>Chargement du configurateur…</p>;
  if (status === 'error' || !def) return <p className="cfg-error" style={{ padding: 24 }}>Configurateur indisponible.</p>;

  const scopeOk = (scope?: Record<string, string>) =>
    !scope || Object.entries(scope).every(([k, v]) => axes[k] === v);
  const optionalAdjustments = def.adjustments
    .filter((a) => a.optional && (!a.layer || a.layer === layer) && scopeOk(a.scope))
    .filter((a, i, arr) => arr.findIndex((x) => x.code === a.code) === i);
  const currentLimit = def.limits.find((l) => l.lame === axes.lame);

  // Coloris disponibles pour la lame courante + niveau de prix (standard / laqué +€/m²).
  const colorPol = def.colorPolicies.find((p) => p.lame === axes.lame) ?? def.colorPolicies.find((p) => p.lame === '*');
  const colorTier = (code: string): 'standard' | 'pv' | null =>
    !colorPol ? 'standard'
      : colorPol.standard.includes(code) ? 'standard'
        : colorPol.pvM2?.codes.includes(code) ? 'pv'
          : null;
  const visibleColors = def.colors.filter((c) => colorTier(c.code) !== null);
  const colorPvM2 = colorPol?.pvM2?.montantParM2 ?? 0;
  const selectedColorIsPv = colorTier(colorCode) === 'pv';

  // Sélecteurs en cascade : chaque choix ne propose que les valeurs qui ont
  // encore une grille compatible ; un changement amont répare les axes aval.
  const order = def.selectors.map((s) => s.id);
  const chooseAxis = (id: string, value: string) => setAxes((a) => repairAxes(def, order, { ...a, [id]: value }));
  const currentGrid = findGrid(def, order, axes);
  const layerAvailable = (l: MotorLayer) => !currentGrid || !!currentGrid.layers[l];
  // Sélecteurs conditionnels (ex. « Type de coffre » visible seulement en pose coffre).
  const visibleSelectors = def.selectors.filter((s) => scopeOk(s.scope));
  const nStep = visibleSelectors.length;

  return (
    <div className="cfg-wrap">
      {/* ── Colonne gauche ── */}
      <div className="cfg-left">

        {/* Axes de choix (pose, lame, motorisation…) — en cascade, conditionnels */}
        {visibleSelectors.map((sel, i) => {
          const avail = availableFor(def, sel.id, order, axes);
          return (
            <section className="cfg-section" key={sel.id}>
              <h3 className="cfg-title">{i + 1}. {sel.label}</h3>
              <div className="cfg-tabs">
                {sel.options.map((o) => {
                  const disabled = !avail.has(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      disabled={disabled}
                      className={`cfg-tab${axes[sel.id] === o.value ? ' active' : ''}`}
                      onClick={() => chooseAxis(sel.id, o.value)}
                      title={disabled ? 'Non disponible pour ce choix' : o.hint}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Type de commande (filaire / radio) */}
        <section className="cfg-section">
          <h3 className="cfg-title">{nStep +1}. Type de commande</h3>
          <div className="cfg-tabs">
            {(['filaire', 'radio'] as MotorLayer[]).map((l) => (
              <button
                key={l}
                type="button"
                disabled={!layerAvailable(l)}
                className={`cfg-tab${layer === l ? ' active' : ''}`}
                onClick={() => setLayer(l)}
              >
                {l === 'filaire' ? 'Filaire' : 'Radio'}
              </button>
            ))}
          </div>
        </section>

        {/* Dimensions */}
        <section className="cfg-section">
          <h3 className="cfg-title">{nStep +2}. Dimensions (en mm)</h3>
          <div className="cfg-dims">
            <div className="cfg-field">
              <label>Largeur dos de coulisse</label>
              <input type="number" value={largeurStr} step={1}
                onChange={(e) => setLargeurStr(e.target.value)} />
              <span className="cfg-unit">mm</span>
            </div>
            <div className="cfg-field">
              <label>Hauteur sous coffre</label>
              <input type="number" value={hauteurStr} step={1}
                onChange={(e) => setHauteurStr(e.target.value)} />
              <span className="cfg-unit">mm</span>
            </div>
          </div>
          {result && (result.largeurSnap !== largeur || result.hauteurSnap !== hauteur) && (
            <p className="cfg-snap-note">
              Fabriqué en <strong>{result.largeurSnap} × {result.hauteurSnap} mm</strong> (arrondi au pas supérieur du barème)
            </p>
          )}
          {!result && largeur > 0 && hauteur > 0 && (
            <p className="cfg-error">
              Dimensions hors barème disponible
              {currentLimit && <> — largeur {currentLimit.largeurMin}–{currentLimit.largeurMax} mm, surface max {currentLimit.surfaceMaxM2} m²</>}.
            </p>
          )}
        </section>

        {/* Coloris */}
        <section className="cfg-section">
          <h3 className="cfg-title">{nStep +3}. Coloris</h3>
          <div className="cfg-coloris-row">
            {visibleColors.map((c) => {
              const pv = colorTier(c.code) === 'pv';
              return (
                <button key={c.code} type="button"
                  title={pv ? `${c.label} — laqué +${colorPvM2} €/m²` : c.label}
                  className={`cfg-swatch${colorCode === c.code ? ' active' : ''}${pv ? ' pv' : ''}`}
                  style={{ background: c.hex }} aria-label={c.label}
                  onClick={() => setColorCode(c.code)} />
              );
            })}
            <span className="cfg-coloris-label">
              {visibleColors.find((c) => c.code === colorCode)?.label ?? ''}
              {selectedColorIsPv && <em className="cfg-coloris-pv"> · laqué +{colorPvM2} €/m²</em>}
            </span>
          </div>
          {selectedColorIsPv && (
            <p className="cfg-snap-note">
              Coloris laqué RAL : <strong>forfait laquage 77 € HT par commande</strong> (offert dès 2 000 € HT de commande) — non compté dans le prix unitaire.
            </p>
          )}
        </section>

        {/* Options */}
        {(optionalAdjustments.length > 0 || def.options.length > 0) && (
          <section className="cfg-section">
            <h3 className="cfg-title">{nStep +4}. Options</h3>
            <div className="cfg-options">
              {optionalAdjustments.map((a) => (
                <label className="cfg-check" key={a.code}>
                  <input type="checkbox" checked={opts.has(a.code)} onChange={() => toggleOpt(a.code)} />
                  <span>{a.label}</span>
                </label>
              ))}
              {def.options
                .filter((o) => Object.entries(o.scope ?? {}).every(([k, v]) => axes[k] === v))
                .map((o) => (
                  <label className="cfg-check" key={o.code}>
                    <input type="checkbox" checked={opts.has(o.code)} onChange={() => toggleOpt(o.code)} />
                    <span>{o.label}{o.priceHT > 0 && <em> +{euro(o.priceHT)}</em>}</span>
                  </label>
                ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Colonne droite (sticky) ── */}
      <div className="cfg-right">
        <div className="cfg-summary">
          <div className="cfg-summary-head"><span>Récapitulatif</span></div>
          <div className="cfg-summary-lame">
            <strong>{def.name}</strong>
            <span>{def.colors.find((c) => c.code === colorCode)?.label}</span>
          </div>

          {result ? (
            <>
              <div className="cfg-summary-dims">{result.largeurSnap} × {result.hauteurSnap} mm · {layer}</div>

              <div className="cfg-price-breakdown">
                <div className="cfg-price-row"><span>Prix de base</span><span>{euro(result.base)}</span></div>
                {result.adjustments.map((a) => (
                  <div className="cfg-price-row" key={a.code}>
                    <span>{a.label}</span><span>{a.montant < 0 ? '−' : '+'}{euro(Math.abs(a.montant))}</span>
                  </div>
                ))}
                {result.options.map((o) => (
                  <div className="cfg-price-row" key={o.code}><span>{o.label}</span><span>+{euro(o.montant)}</span></div>
                ))}
                {result.colorSupplement > 0 && (
                  <div className="cfg-price-row"><span>Supplément coloris</span><span>+{euro(result.colorSupplement)}</span></div>
                )}
                {discountPct > 0 && (
                  <div className="cfg-price-row"><span>Remise pro −{discountPct}%</span><span>−{euro(result.total - unitNet)}</span></div>
                )}
              </div>

              <div className="cfg-total"><span>Total HT</span><strong>{euro(unitNet * qty)}</strong></div>
              <div className="cfg-total-ttc">{euro(unitNet * qty * 1.2)} TTC</div>

              <div className="cfg-qty-row">
                <label htmlFor="cfg-qty">Quantité</label>
                <div className="cfg-qty-ctrl">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <input id="cfg-qty" type="number" min={1} value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
                  <button type="button" onClick={() => setQty(qty + 1)}>+</button>
                </div>
              </div>

              <button type="button" className="btn solid full cfg-cta" onClick={() => {
                const lameLabel = def.selectors.find((s) => s.id === 'lame')?.options.find((o) => o.value === axes.lame)?.label ?? '';
                const colorLabel = def.colors.find((c) => c.code === colorCode)?.label ?? '';
                const optLabels = [
                  ...result.adjustments.map((a) => a.label),
                  ...result.options.map((o) => o.label),
                ];
                const detail = [
                  lameLabel, `${layer}`, `L ${result.largeurSnap} × H ${result.hauteurSnap} mm`, colorLabel,
                  ...optLabels,
                ].filter(Boolean).join(' — ');
                addLine({
                  key: `cfg-${slug}-${JSON.stringify(axes)}-${layer}-${result.largeurSnap}x${result.hauteurSnap}-${colorCode}-${[...opts].sort().join(',')}`,
                  name: def.name,
                  detail,
                  unitPriceHT: unitNet,
                  quantity: qty,
                  uom: 'unite',
                  // Re-tarification serveur (audit S2) : dimensions/options brutes.
                  pricing: { kind: 'configurateur', slug, axes, layer, largeur, hauteur, colorCode, options: [...opts] },
                });
                openCart();
                toast.success('Produit ajouté au panier');
              }}>
                Ajouter au panier
              </button>
            </>
          ) : (
            <div className="cfg-summary-empty">
              {largeur > 0 && hauteur > 0 ? 'Dimensions hors barème' : 'Saisissez les dimensions pour obtenir un prix'}
            </div>
          )}

          <p className="cfg-ht-note">Prix en euros HT — TVA 20 % applicable</p>
        </div>
      </div>
    </div>
  );
}
