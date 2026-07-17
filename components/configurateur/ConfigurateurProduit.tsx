'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolvePrice } from '@/lib/configurateur/v2/engine';
import { repairValues, availableOptions, isVisible, withDerivedValues } from '@/lib/configurateur/v2/cascade';
import type { DefV2, Field, Primitive, Values } from '@/lib/configurateur/v2/types';
import { Stepper } from './Stepper';
import { applyDiscount, getDiscount, type FamilleSlug } from '@/lib/familles';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface Props { slug: string }

/** Assistant de configuration pas-à-pas, entièrement piloté par la définition
 *  (moteur universel v2) : champs, étapes, règles et prix viennent des données. */
export function ConfigurateurProduit({ slug }: Props) {
  const addLine = useCartStore((s) => s.addLine);
  const openCart = useCartStore((s) => s.openCart);
  const { user } = useAuthStore();

  const [def, setDef] = useState<DefV2 | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'gated' | 'error'>('loading');
  const [values, setValues] = useState<Values>({});
  const [qty, setQty] = useState(1);
  const [stepIdx, setStepIdx] = useState(0);

  // Chargement de la définition (réservé aux connectés : prix = donnée pro).
  useEffect(() => {
    if (!user) { setStatus('gated'); return; }
    let alive = true;
    setStatus('loading');
    fetch(`/api/configurateurs/${slug}`)
      .then(async (r) => {
        if (r.status === 401) { if (alive) setStatus('gated'); return null; }
        if (!r.ok) { if (alive) setStatus('error'); return null; }
        return r.json() as Promise<DefV2>;
      })
      .then((d) => {
        if (!alive || !d) return;
        setDef(d);
        const init: Values = {};
        for (const f of d.fields) if (f.default !== undefined) init[f.id] = f.default;
        setValues(repairValues(d, init));
        setStepIdx(0);
        setStatus('ok');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [slug, user]);

  const result = useMemo(() => (def ? resolvePrice(def, values) : null), [def, values]);
  const discountPct = def ? getDiscount(user?.proDiscounts ?? {}, def.famille as FamilleSlug) : 0;
  const unitNet = result?.ok ? applyDiscount(result.total, discountPct) : 0;

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

  const ctx = withDerivedValues(def, values);                 // valeurs + axes dérivés (setsValues)
  const setField = (id: string, val: Primitive) => setValues((v) => repairValues(def, { ...v, [id]: val }));
  const fieldById = (id: string) => def.fields.find((f) => f.id === id);
  const visibleFields = (ids: string[]): Field[] =>
    ids.map(fieldById).filter((f): f is Field => !!f && isVisible(f.visibleWhen, ctx));
  const optionLabel = (f: Field, val: Primitive | undefined) => f.options?.find((o) => o.value === val)?.label ?? '';

  // ── Rendu générique d'un champ ──
  const renderField = (f: Field): ReactNode => {
    if (f.type === 'info') return <p className="cfg-dim-hint" key={f.id}>{f.help}</p>;

    if (f.type === 'boolean') {
      return (
        <label className="cfg-check" key={f.id}>
          <input type="checkbox" checked={values[f.id] === true} onChange={(e) => setField(f.id, e.target.checked)} />
          <span>{f.label}</span>
        </label>
      );
    }

    if (f.type === 'dimension' || f.type === 'number') {
      return (
        <div className="cfg-field" key={f.id}>
          <label>{f.label}</label>
          <input type="number" value={String(values[f.id] ?? '')} step={f.step ?? 1}
            onChange={(e) => setField(f.id, parseInt(e.target.value, 10) || 0)} />
          {f.unit && <span className="cfg-unit">{f.unit}</span>}
        </div>
      );
    }

    if (f.type === 'text') {
      return (
        <div className="cfg-spec-field" key={f.id}>
          <label className="cfg-spec-label">{f.label}</label>
          <input type="text" value={String(values[f.id] ?? '')} onChange={(e) => setField(f.id, e.target.value)} />
        </div>
      );
    }

    // choice
    const avail = availableOptions(def, f, values);
    const opts = f.options ?? [];
    const isColor = opts.some((o) => o.hex);
    if (isColor) {
      const shown = opts.filter((o) => avail.has(o.value));
      return (
        <div className="cfg-section" key={f.id}>
          <h3 className="cfg-title">{f.label}</h3>
          <div className="cfg-coloris-row">
            {shown.map((o) => (
              <button key={o.value} type="button" title={o.label}
                className={`cfg-swatch${values[f.id] === o.value ? ' active' : ''}`}
                style={{ background: o.hex }} aria-label={o.label} onClick={() => setField(f.id, o.value)} />
            ))}
            <span className="cfg-coloris-label">{shown.find((o) => o.value === values[f.id])?.label ?? ''}</span>
          </div>
          {f.helpImage && <img className="cfg-help-img" src={f.helpImage} alt="" />}
        </div>
      );
    }
    return (
      <div className="cfg-section" key={f.id}>
        <h3 className="cfg-title">{f.label}</h3>
        <div className={f.role === 'spec' ? 'cfg-tabs' : 'cfg-tabs'}>
          {opts.map((o) => {
            const disabled = !avail.has(o.value);
            return (
              <button key={o.value} type="button" disabled={disabled}
                className={`cfg-tab${values[f.id] === o.value ? ' active' : ''}`}
                onClick={() => setField(f.id, o.value)}
                title={disabled ? 'Non disponible pour ce choix' : o.hint}>
                {o.label}
              </button>
            );
          })}
        </div>
        {f.help && <p className="cfg-dim-hint">{f.help}</p>}
      </div>
    );
  };

  // ── Étapes visibles (pilotées par les données) ──
  const steps = def.steps
    .filter((s) => isVisible(s.visibleWhen, ctx))
    .map((s) => {
      const fields = visibleFields(s.fields);
      const hasDim = fields.some((f) => f.type === 'dimension' || f.type === 'number');
      const isRecap = s.id === 'recap';
      return { ...s, fields, hasDim, isRecap };
    });
  const cur = Math.min(stepIdx, steps.length - 1);
  const step = steps[cur];
  const isLast = cur === steps.length - 1;
  // La progression bloque tant que le prix n'est pas calculable (dimensions / récap).
  const stepBlocked = (step.hasDim || step.isRecap) && !result?.ok;
  const primaryDisabled = isLast ? !result?.ok : stepBlocked;
  const onPrimary = () => { if (isLast) addToCart(); else setStepIdx(cur + 1); };

  // Note d'arrondi (dimensions fabriquées).
  const snapNote = result?.ok && (result.context.largeur_snap !== values.largeur || result.context.hauteur_snap !== values.hauteur)
    ? `Fabriqué en ${result.context.largeur_snap} × ${result.context.hauteur_snap} mm (arrondi au pas du barème)`
    : null;

  // ── Détail + ajout panier (générique) ──
  const buildDetail = (): string => {
    const parts: string[] = [];
    let dimsInserted = false;
    for (const f of def.fields) {
      if (!isVisible(f.visibleWhen, ctx)) continue;
      const val = values[f.id];
      if (f.type === 'dimension' || f.type === 'number') {
        if (!dimsInserted && result?.ok) { parts.push(`L ${result.context.largeur_snap} × H ${result.context.hauteur_snap} mm`); dimsInserted = true; }
      } else if (f.type === 'choice') {
        const lbl = optionLabel(f, val);
        if (lbl) parts.push(lbl);
      } else if (f.type === 'boolean') {
        if (val === true) parts.push(f.label);
      } else if (f.type === 'text') {
        if (val) parts.push(`${f.label} : ${val}`);
      }
    }
    return parts.filter(Boolean).join(' — ');
  };

  const addToCart = () => {
    if (!result?.ok) return;
    const laque = result.lineItems.some((li) => li.code === 'color_pv');
    addLine({
      key: `cfg-${slug}-${JSON.stringify(values)}`,
      name: def.name,
      detail: buildDetail(),
      unitPriceHT: unitNet,
      quantity: qty,
      uom: 'unite',
      pricing: { kind: 'configurateur', slug, values, laque },
    });
    openCart();
    toast.success('Produit ajouté au panier');
  };

  // ── Panneau récap (étape finale) ──
  const recapNode = (
    <section className="cfg-section">
      <h3 className="cfg-title">Récapitulatif</h3>
      <ul className="cfg-recap-list">
        {def.fields.filter((f) => isVisible(f.visibleWhen, ctx)).map((f) => {
          const val = values[f.id];
          let display = '';
          if (f.type === 'choice') display = optionLabel(f, val);
          else if (f.type === 'boolean') display = val === true ? 'Oui' : '';
          else if ((f.type === 'dimension' || f.type === 'number')) display = val != null ? `${val} ${f.unit ?? ''}`.trim() : '';
          else if (f.type === 'text') display = String(val ?? '');
          if (!display) return null;
          return <li key={f.id}><span>{f.label}</span><strong>{display}</strong></li>;
        })}
      </ul>
      <div className="cfg-qty-row">
        <label htmlFor="cfg-qty">Quantité</label>
        <div className="cfg-qty-ctrl">
          <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <input id="cfg-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
          <button type="button" onClick={() => setQty(qty + 1)}>+</button>
        </div>
      </div>
      {result?.ok && <div className="cfg-total"><span>Total HT</span><strong>{euro(unitNet * qty)}</strong></div>}
    </section>
  );

  const themeStyle = def.theme?.primary ? ({ '--steel-600': def.theme.primary } as React.CSSProperties) : undefined;

  return (
    <div className="cfg-wrap cfg-wizard" style={themeStyle}>
      {/* ── Colonne étapes ── */}
      <div className="cfg-left">
        {def.theme?.logo && <img className="cfg-logo" src={def.theme.logo} alt="" />}
        <Stepper steps={steps.map((s) => s.title)} current={cur} onJump={setStepIdx} />
        {step.help && <p className="cfg-step-help">{step.help}</p>}
        <div className="cfg-step">
          {step.isRecap ? recapNode : (
            <>
              {step.fields.map((f) => renderField(f))}
              {step.hasDim && snapNote && <p className="cfg-snap-note">{snapNote}</p>}
              {step.hasDim && !result?.ok && (result?.errors.length ?? 0) > 0 && (
                <p className="cfg-error">{result!.errors[0]}</p>
              )}
            </>
          )}
        </div>
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
          <div className="cfg-summary-head"><span>Votre produit</span></div>
          <div className="cfg-summary-lame"><strong>{def.name}</strong></div>
          {result?.ok ? (
            <>
              <div className="cfg-price-breakdown">
                {result.lineItems.map((li) => (
                  <div className="cfg-price-row" key={li.code}>
                    <span>{li.label}</span>
                    <span>{li.kind === 'base' ? euro(li.montant) : `${li.montant < 0 ? '−' : '+'}${euro(Math.abs(li.montant))}`}</span>
                  </div>
                ))}
                {discountPct > 0 && (
                  <div className="cfg-price-row"><span>Remise pro −{discountPct}%</span><span>−{euro(result.total - unitNet)}</span></div>
                )}
              </div>
              <div className="cfg-total"><span>Prix unitaire HT</span><strong>{euro(unitNet)}</strong></div>
              <div className="cfg-total-ttc">{euro(unitNet * 1.2)} TTC{qty > 1 ? ` · × ${qty}` : ''}</div>
            </>
          ) : (
            <div className="cfg-summary-empty">
              {result && result.errors.length > 0 ? result.errors[0] : 'Renseignez les dimensions pour le prix'}
            </div>
          )}
          <p className="cfg-ht-note">Prix en euros HT — TVA 20 % applicable</p>
        </div>
      </div>

      {/* ── Barre de prix collante (mobile) ── */}
      <div className="cfg-mobar">
        <div className="cfg-mobar-price">{result?.ok ? `${euro(unitNet)} HT` : '—'}</div>
        <button type="button" className="btn solid" disabled={primaryDisabled} onClick={onPrimary}>
          {isLast ? 'Ajouter' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
