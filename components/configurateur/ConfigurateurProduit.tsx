'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolveConfiguratorPrice, largeurMinFor } from '@/lib/configurateur/engine';
import { availableFor, repairAxes, findGrid } from '@/lib/configurateur/cascade';
import { Stepper } from './Stepper';
import type { ConfiguratorDef, MotorLayer } from '@/lib/configurateur/types';
import { applyDiscount, getDiscount, type FamilleSlug } from '@/lib/familles';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface Props { slug: string }

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
  const [specs, setSpecs] = useState<Record<string, string>>({});   // champs de fabrication
  const [qty, setQty] = useState(1);
  const [stepIdx, setStepIdx] = useState(0);                        // étape courante (wizard)

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
        setSpecs(Object.fromEntries((d.specFields ?? []).map((f) => [f.id, f.defaultValue ?? f.options?.[0]?.value ?? ''])));
        setStatus('ok');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [slug, user]);

  // La couche filaire/radio choisie doit exister dans la grille courante (robustesse).
  useEffect(() => {
    if (!def) return;
    const g = findGrid(def, axes);
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
  const currentLimit = def.limits.find((l) => l.lame === axes.lame && l.pose === axes.pose)
    ?? def.limits.find((l) => l.lame === axes.lame && !l.pose);
  // Largeur mini courante (dépend du mode manœuvre/moteur) — pour l'intervalle affiché.
  const curLargeurMin = largeurMinFor(def, { axes, layer, largeur, hauteur, colorCode, optionCodes: [...opts] });

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
  const currentGrid = findGrid(def, axes);
  const layerAvailable = (l: MotorLayer) => !currentGrid || !!currentGrid.layers[l];
  // Sélecteurs conditionnels : par axes (« Type de coffre » → pose coffre) ET par
  // couche (« Motorisation radio Somfy » → radio seulement). Les sélecteurs liés à
  // une couche sont rendus APRÈS le choix filaire/radio.
  const visibleSelectors = def.selectors.filter((s) => scopeOk(s.scope) && (!s.layer || s.layer === layer));
  // Champs de fabrication visibles (selon axes/couche courants).
  const visibleSpecFields = (def.specFields ?? []).filter((f) => scopeOk(f.scope) && (!f.layer || f.layer === layer));

  const renderSelector = (sel: ConfiguratorDef['selectors'][number]) => {
    const avail = availableFor(def, sel.id, order, axes);
    return (
      <section className="cfg-section" key={sel.id}>
        <h3 className="cfg-title">{sel.label}</h3>
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
  };

  // ── Rendu des sections (réutilisées comme panneaux d'étape) ──
  const selById = (id: string) => visibleSelectors.find((s) => s.id === id);
  const selLabel = (id: string) => def.selectors.find((s) => s.id === id)?.options.find((o) => o.value === axes[id])?.label ?? '';

  const layerToggle = (
    <section className="cfg-section" key="layer">
      <h3 className="cfg-title">Type de commande</h3>
      <div className="cfg-tabs">
        {(['filaire', 'radio'] as MotorLayer[]).map((l) => (
          <button key={l} type="button" disabled={!layerAvailable(l)}
            className={`cfg-tab${layer === l ? ' active' : ''}`} onClick={() => setLayer(l)}>
            {l === 'filaire' ? 'Filaire' : 'Radio'}
          </button>
        ))}
      </div>
    </section>
  );

  const dimsNode = (
    <section className="cfg-section" key="dims">
      <h3 className="cfg-title">Dimensions (en mm)</h3>
      <div className="cfg-dims">
        <div className="cfg-field">
          <label>Largeur dos de coulisse</label>
          <input type="number" value={largeurStr} step={1} onChange={(e) => setLargeurStr(e.target.value)} />
          <span className="cfg-unit">mm</span>
        </div>
        <div className="cfg-field">
          <label>Hauteur sous coffre</label>
          <input type="number" value={hauteurStr} step={1} onChange={(e) => setHauteurStr(e.target.value)} />
          <span className="cfg-unit">mm</span>
        </div>
      </div>
      {currentLimit && (
        <p className="cfg-dim-hint">
          Largeur autorisée <strong>{curLargeurMin}–{currentLimit.largeurMax} mm</strong> · hauteur max {currentLimit.hauteurMax} mm · surface max {currentLimit.surfaceMaxM2} m²
        </p>
      )}
      {result && (result.largeurSnap !== largeur || result.hauteurSnap !== hauteur) && (
        <p className="cfg-snap-note">
          Fabriqué en <strong>{result.largeurSnap} × {result.hauteurSnap} mm</strong> (arrondi au pas supérieur du barème)
        </p>
      )}
      {!result && largeur > 0 && hauteur > 0 && (
        <p className="cfg-error">
          Dimensions hors barème disponible
          {currentLimit && <> — largeur {curLargeurMin}–{currentLimit.largeurMax} mm, surface max {currentLimit.surfaceMaxM2} m²</>}.
        </p>
      )}
    </section>
  );

  const specsNode = visibleSpecFields.length > 0 ? (
    <section className="cfg-section" key="specs">
      <h3 className="cfg-title">Fabrication</h3>
      <div className="cfg-specs">
        {visibleSpecFields.map((f) => (
          <div className="cfg-spec-field" key={f.id}>
            <label className="cfg-spec-label">{f.label}</label>
            {f.type === 'text' ? (
              <input type="text" value={specs[f.id] ?? ''} onChange={(e) => setSpecs((s) => ({ ...s, [f.id]: e.target.value }))} />
            ) : (
              <div className="cfg-tabs">
                {(f.options ?? []).map((o) => (
                  <button key={o.value} type="button"
                    className={`cfg-tab${specs[f.id] === o.value ? ' active' : ''}`}
                    onClick={() => setSpecs((s) => ({ ...s, [f.id]: o.value }))}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  ) : null;

  const colorsNode = (
    <section className="cfg-section" key="coloris">
      <h3 className="cfg-title">Coloris</h3>
      <div className="cfg-coloris-row">
        {visibleColors.map((c) => {
          const pv = colorTier(c.code) === 'pv';
          return (
            <button key={c.code} type="button"
              title={pv ? `${c.label} — laqué +${colorPvM2} €/m²` : c.label}
              className={`cfg-swatch${colorCode === c.code ? ' active' : ''}${pv ? ' pv' : ''}`}
              style={{ background: c.hex }} aria-label={c.label} onClick={() => setColorCode(c.code)} />
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
  );

  const applicableOptions = def.options.filter((o) => Object.entries(o.scope ?? {}).every(([k, v]) => axes[k] === v) && (!o.layer || o.layer === layer));
  const hasOptions = optionalAdjustments.length > 0 || applicableOptions.length > 0;
  const optionsNode = (
    <section className="cfg-section" key="options">
      <h3 className="cfg-title">Options</h3>
      <div className="cfg-options">
        {optionalAdjustments.map((a) => (
          <label className="cfg-check" key={a.code}>
            <input type="checkbox" checked={opts.has(a.code)} onChange={() => toggleOpt(a.code)} />
            <span>{a.label}</span>
          </label>
        ))}
        {applicableOptions.map((o) => (
          <label className="cfg-check" key={o.code}>
            <input type="checkbox" checked={opts.has(o.code)} onChange={() => toggleOpt(o.code)} />
            <span>{o.label}{o.priceHT > 0 && <em> +{euro(o.priceHT)}</em>}</span>
          </label>
        ))}
      </div>
    </section>
  );

  // Libellés / charge utile de la sélection (partagés récap + ajout panier).
  const selectedOptionLabels = applicableOptions.filter((o) => opts.has(o.code)).map((o) => o.label);
  const specEntries = visibleSpecFields.filter((f) => specs[f.id]).map((f) => {
    const opt = f.options?.find((o) => o.value === specs[f.id]);
    return { id: f.id, value: specs[f.id], label: `${f.label} : ${opt?.label ?? specs[f.id]}` };
  });
  const specsPayload = Object.fromEntries(specEntries.map((e) => [e.id, e.value]));

  const addToCart = () => {
    if (!result) return;
    const detail = [
      selLabel('type_volet'), selLabel('lame'), `${layer}`,
      `L ${result.largeurSnap} × H ${result.hauteurSnap} mm`,
      def.colors.find((c) => c.code === colorCode)?.label ?? '',
      ...result.adjustments.map((a) => a.label),
      ...selectedOptionLabels,
      ...specEntries.map((e) => e.label),
    ].filter(Boolean).join(' — ');
    addLine({
      key: `cfg-${slug}-${JSON.stringify(axes)}-${layer}-${result.largeurSnap}x${result.hauteurSnap}-${colorCode}-${[...opts].sort().join(',')}-${JSON.stringify(specsPayload)}`,
      name: def.name,
      detail,
      unitPriceHT: unitNet,
      quantity: qty,
      uom: 'unite',
      pricing: { kind: 'configurateur', slug, axes, layer, largeur, hauteur, colorCode, options: [...opts], laque: selectedColorIsPv, specs: specsPayload },
    });
    openCart();
    toast.success('Produit ajouté au panier');
  };

  const recapNode = (
    <section className="cfg-section" key="recap">
      <h3 className="cfg-title">Récapitulatif</h3>
      <ul className="cfg-recap-list">
        <li><span>Type de volet</span><strong>{selLabel('type_volet')}</strong></li>
        {selById('coffre') && <li><span>Type de coffre</span><strong>{selLabel('coffre')}</strong></li>}
        <li><span>Lame</span><strong>{selLabel('lame')}</strong></li>
        <li><span>Motorisation</span><strong>{selLabel('moteur')} · {layer}{selById('radio_somfy') ? ` · ${selLabel('radio_somfy')}` : ''}</strong></li>
        <li><span>Dimensions</span><strong>{result ? `${result.largeurSnap} × ${result.hauteurSnap} mm` : '—'}</strong></li>
        <li><span>Coloris</span><strong>{def.colors.find((c) => c.code === colorCode)?.label ?? ''}</strong></li>
        {selectedOptionLabels.length > 0 && <li><span>Options</span><strong>{selectedOptionLabels.join(', ')}</strong></li>}
        {specEntries.map((e) => (<li key={e.id}><span>{e.label.split(' : ')[0]}</span><strong>{e.label.split(' : ')[1]}</strong></li>))}
      </ul>
      <div className="cfg-qty-row">
        <label htmlFor="cfg-qty">Quantité</label>
        <div className="cfg-qty-ctrl">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <input id="cfg-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          <button type="button" onClick={() => setQty(qty + 1)}>+</button>
        </div>
      </div>
      {result && <div className="cfg-total"><span>Total HT</span><strong>{euro(unitNet * qty)}</strong></div>}
    </section>
  );

  // ── Étapes du wizard (type-aware) ──
  const steps: { id: string; title: string; valid: boolean; node: ReactNode }[] = [
    { id: 'type', title: 'Type de volet', valid: true, node: <>{selById('type_volet') && renderSelector(selById('type_volet')!)}{selById('coffre') && renderSelector(selById('coffre')!)}</> },
    { id: 'lame', title: 'Lame', valid: true, node: selById('lame') ? renderSelector(selById('lame')!) : null },
    { id: 'moteur', title: 'Motorisation', valid: true, node: <>{selById('moteur') && renderSelector(selById('moteur')!)}{layerToggle}{selById('radio_somfy') && renderSelector(selById('radio_somfy')!)}</> },
    { id: 'dim', title: 'Dimensions', valid: !!result, node: <>{dimsNode}{specsNode}</> },
    { id: 'coloris', title: 'Coloris', valid: true, node: colorsNode },
    ...(hasOptions ? [{ id: 'options', title: 'Options', valid: true, node: optionsNode }] : []),
    { id: 'recap', title: 'Récapitulatif', valid: !!result, node: recapNode },
  ];
  const cur = Math.min(stepIdx, steps.length - 1);
  const step = steps[cur];
  const isLast = cur === steps.length - 1;
  const primaryDisabled = isLast ? !result : !step.valid;
  const onPrimary = () => { if (isLast) addToCart(); else setStepIdx(cur + 1); };

  return (
    <div className="cfg-wrap cfg-wizard">
      {/* ── Colonne étapes ── */}
      <div className="cfg-left">
        <Stepper steps={steps.map((s) => s.title)} current={cur} onJump={setStepIdx} />
        <div className="cfg-step">{step.node}</div>
        <div className="cfg-nav">
          <button type="button" className="btn ghost" disabled={cur === 0} onClick={() => setStepIdx(cur - 1)}>← Précédent</button>
          <button type="button" className="btn solid" disabled={primaryDisabled} onClick={onPrimary}>
            {isLast ? 'Ajouter au panier' : 'Suivant →'}
          </button>
        </div>
      </div>

      {/* ── Prix toujours visible (desktop) ── */}
      <div className="cfg-right">
        <div className="cfg-summary">
          <div className="cfg-summary-head"><span>Votre volet</span></div>
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
                  <div className="cfg-price-row" key={a.code}><span>{a.label}</span><span>{a.montant < 0 ? '−' : '+'}{euro(Math.abs(a.montant))}</span></div>
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
              <div className="cfg-total"><span>Prix unitaire HT</span><strong>{euro(unitNet)}</strong></div>
              <div className="cfg-total-ttc">{euro(unitNet * 1.2)} TTC{qty > 1 ? ` · × ${qty}` : ''}</div>
            </>
          ) : (
            <div className="cfg-summary-empty">
              {largeur > 0 && hauteur > 0 ? 'Dimensions hors barème' : 'Renseignez les dimensions pour le prix'}
            </div>
          )}
          <p className="cfg-ht-note">Prix en euros HT — TVA 20 % applicable</p>
        </div>
      </div>

      {/* ── Barre de prix collante (mobile) ── */}
      <div className="cfg-mobar">
        <div className="cfg-mobar-price">{result ? `${euro(unitNet)} HT` : '—'}</div>
        <button type="button" className="btn solid" disabled={primaryDisabled} onClick={onPrimary}>
          {isLast ? 'Ajouter' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
