'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { resolvePrice } from '@/lib/configurateur/v2/engine';
import { repairValues, availableOptions, isVisible, withDerivedValues } from '@/lib/configurateur/v2/cascade';
import type { DefV2, Field, Primitive, Values } from '@/lib/configurateur/v2/types';
import { Stepper } from './Stepper';
import { resolveB2BDiscountSeed, resolveB2BSurchargeSeed, splitB2BPrice } from '@/lib/pricing/discount-resolver';
import { useSurchargeStore } from '@/lib/store/surcharge';
import { generatorNode, TAXONOMY_SEED } from '@/lib/catalog/taxonomy';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ── Brouillon en cours (par configurateur) ──
// Persiste valeurs / étape / quantité dans sessionStorage : la configuration
// survit à un rechargement de page ou à une mise en veille de l'onglet (le
// navigateur peut « décharger » un onglet en arrière-plan et le recharger au
// retour). Portée = onglet (effacé à sa fermeture).
const WIP_PREFIX = 'cfg-wip:';
interface WipState { values: Values; stepIdx: number; qty: number }
function readWip(slug: string): WipState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(WIP_PREFIX + slug);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<WipState>;
    if (o && typeof o === 'object' && o.values && typeof o.values === 'object') {
      return { values: o.values as Values, stepIdx: Number(o.stepIdx) || 0, qty: Number(o.qty) || 1 };
    }
  } catch { /* stockage indisponible / JSON invalide → init par défaut */ }
  return null;
}
function writeWip(slug: string, state: WipState) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(WIP_PREFIX + slug, JSON.stringify(state)); } catch { /* quota / privé */ }
}
function clearWip(slug: string) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.removeItem(WIP_PREFIX + slug); } catch { /* ignore */ }
}

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
  // Dépend de l'ID utilisateur (et pas de l'objet `user`) : un simple re-sync de
  // session (retour d'onglet, rafraîchissement de jeton) change la référence de
  // `user` sans changer l'ID — on évite ainsi de relancer le chargement et de
  // réinitialiser le formulaire en cours.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setStatus('gated'); return; }
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
        // Reprise du brouillon si présent (rechargement / mise en veille de
        // l'onglet), sinon initialisation par défaut.
        const saved = readWip(slug);
        if (saved) {
          setValues(repairValues(d, saved.values));
          setStepIdx(saved.stepIdx);
          setQty(saved.qty);
        } else {
          const init: Values = {};
          for (const f of d.fields) if (f.default !== undefined) init[f.id] = f.default;
          setValues(repairValues(d, init));
          setStepIdx(0);
        }
        setStatus('ok');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [slug, userId]);

  // Sauvegarde continue du brouillon (valeurs, étape, quantité) par configurateur.
  useEffect(() => {
    if (status === 'ok' && def) writeWip(slug, { values, stepIdx, qty });
  }, [slug, def, values, stepIdx, qty, status]);

  const result = useMemo(() => (def ? resolvePrice(def, values) : null), [def, values]);
  const surchargeMap = useSurchargeStore((s) => s.map);
  // Nœud de rattachement : la valeur du champ `nodeField` (sous-famille choisie)
  // prime — sinon le nœud portant le générateur, sinon def.famille.
  const selNode = def?.nodeField ? values[def.nodeField] : undefined;
  const node = def
    ? (typeof selNode === 'string' && selNode ? selNode : (generatorNode(TAXONOMY_SEED, def.slug) ?? def.famille))
    : undefined;
  const discountPct = node ? resolveB2BDiscountSeed(user?.proDiscounts ?? {}, node) : 0;
  const surchargePct = node ? resolveB2BSurchargeSeed(surchargeMap, node) : 0;
  const split = result?.ok ? splitB2BPrice(result.total, surchargePct, discountPct) : null;
  const unitNet = split ? split.productNet + split.surchargeNet : 0;

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
  // Un champ de choix « couleur » (pastilles) : on préfixe son libellé dans le détail
  // pour lever l'ambiguïté (Coloris tablier / coulisse / lame finale).
  const isColorField = (f: Field) => !!f.options?.some((o) => o.hex);
  // Interpolation `{{var}}` depuis le contexte résolu (valeurs + dérivées, ex.
  // `coulisse_defaut`). Permet aux champs info d'afficher une valeur calculée.
  const hasTemplate = (s: string | undefined): s is string => !!s && /\{\{\w+\}\}/.test(s);
  const interpolate = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, k) => { const v = result?.context?.[k]; return v == null ? '' : String(v); });

  // ── Rendu générique d'un champ ──
  const renderField = (f: Field): ReactNode => {
    if (f.type === 'info') {
      const txt = hasTemplate(f.help) ? interpolate(f.help) : (f.help ?? '');
      return <p className="cfg-dim-hint" key={f.id}>{f.label ? `${f.label} : ${txt}` : txt}</p>;
    }

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
    })
    // Étapes sans aucun champ visible masquées (ex. coffre seul : pas de lame /
    // manœuvre / coloris). Le récapitulatif est toujours conservé.
    .filter((s) => s.isRecap || s.fields.length > 0);
  const cur = Math.min(stepIdx, steps.length - 1);
  const step = steps[cur];
  const isLast = cur === steps.length - 1;
  // La progression bloque tant que le prix n'est pas calculable (dimensions / récap).
  const stepBlocked = (step.hasDim || step.isRecap) && !result?.ok;
  const primaryDisabled = isLast ? !result?.ok : stepBlocked;
  const onPrimary = () => { if (isLast) addToCart(); else setStepIdx(cur + 1); };

  // ── Détail + ajout panier (générique) ──
  // Sur mesure : les cotes affichées/enregistrées sont les cotes EXACTES saisies.
  const buildDetail = (): string => {
    const parts: string[] = [];
    for (const f of def.fields) {
      if (!isVisible(f.visibleWhen, ctx)) continue;
      const val = values[f.id];
      if (f.type === 'dimension' || f.type === 'number') {
        if (val != null && val !== '') parts.push(`${f.label} ${val}${f.unit ? ' ' + f.unit : ''}`);
      } else if (f.type === 'choice') {
        const lbl = optionLabel(f, val);
        // Coloris : préfixé par la nature (Coloris tablier/coulisse/lame finale).
        if (lbl) parts.push(isColorField(f) ? `${f.label} : ${lbl}` : lbl);
      } else if (f.type === 'boolean') {
        if (val === true) parts.push(f.label);
      } else if (f.type === 'text') {
        if (val) parts.push(`${f.label} : ${val}`);
      } else if (f.type === 'info' && hasTemplate(f.help)) {
        // Info calculée (ex. coulisse par défaut) → remontée au détail/devis/BC.
        const v = interpolate(f.help);
        if (v) parts.push(f.label ? `${f.label} : ${v}` : v);
      }
    }
    return parts.filter(Boolean).join(' — ');
  };

  const addToCart = () => {
    if (!result?.ok) return;
    const laque = result.lineItems.some((li) => li.code.startsWith('color_') && li.code.endsWith('_pv'));
    addLine({
      key: `cfg-${slug}-${JSON.stringify(values)}`,
      name: def.name,
      detail: buildDetail(),
      grossUnitPriceHT: result.total,
      unitPriceHT: split!.productNet,
      ...(split!.surchargeNet > 0 ? { surchargePct, surchargeGrossUnitHT: split!.surchargeGross, surchargeUnitHT: split!.surchargeNet } : {}),
      quantity: qty,
      uom: 'unite',
      pricing: { kind: 'configurateur', slug, values, laque },
    });
    clearWip(slug);   // configuration validée : le brouillon repart propre à la prochaine ouverture
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
          else if (f.type === 'info' && hasTemplate(f.help)) display = interpolate(f.help);   // ex. coulisse par défaut
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
              {step.hasDim && result?.ok && (
                <p className="cfg-dim-hint">Fabriqué <strong>sur mesure</strong> aux cotes exactes indiquées.</p>
              )}
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
                {surchargePct > 0 && split && (
                  <div className="cfg-price-row"><span>Surcharge temporaire +{surchargePct}%</span><span>+{euro(split.surchargeGross)}</span></div>
                )}
                {discountPct > 0 && split && (
                  <div className="cfg-price-row"><span>Remise pro −{discountPct}%</span><span>−{euro(result.total + split.surchargeGross - unitNet)}</span></div>
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
