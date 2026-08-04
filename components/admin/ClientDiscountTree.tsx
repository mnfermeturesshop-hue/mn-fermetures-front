'use client';

import { useMemo, useState } from 'react';
import { children, type TaxonomyNode } from '@/lib/catalog/taxonomy';
import { resolveDiscount, normalizeDiscounts } from '@/lib/pricing/discount-resolver';

/** Éditeur de remises B2B en arbre (Gamme › Famille › Sous‑famille) pour un
 *  client. Une remise peut être posée à n'importe quel niveau ; la plus précise
 *  l'emporte. Le « taux effectif » montre ce qui s'appliquera réellement (héritage). */
export function ClientDiscountTree({
  clientLabel, nodes, initial, saving, onSave, onClose,
}: {
  clientLabel: string;
  nodes: TaxonomyNode[];
  initial: Record<string, number>;
  saving: boolean;
  onSave: (discounts: Record<string, number>) => void;
  onClose: () => void;
}) {
  // Remises normalisées en clés de nœuds (mappe les anciennes familles plates).
  const [draft, setDraft] = useState<Record<string, number>>(() => normalizeDiscounts(initial));

  const setRate = (slug: string, val: string) => {
    const n = val === '' ? undefined : Math.min(60, Math.max(0, Math.round(Number(val) || 0)));
    setDraft((prev) => {
      const next = { ...prev };
      if (!n) delete next[slug];
      else next[slug] = n;
      return next;
    });
  };

  // Arbre aplati (ordre + profondeur) pour le rendu.
  const rows = useMemo(() => {
    const out: { node: TaxonomyNode; depth: number }[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const n of children(nodes, parent, false)) { out.push({ node: n, depth }); walk(n.slug, depth + 1); }
    };
    walk(null, 0);
    return out;
  }, [nodes]);

  const definedCount = Object.keys(draft).length;

  return (
    <div className="adm-overlay">
      <div className="cdt-box">
        <header className="cdt-head">
          <div>
            <h3>Remises — {clientLabel}</h3>
            <p>Posez un taux à n’importe quel niveau. Le plus précis l’emporte ; les nœuds vides <b>héritent</b> du parent.</p>
          </div>
          <span className="cdt-count">{definedCount} taux défini{definedCount > 1 ? 's' : ''}</span>
        </header>

        <div className="cdt-tree">
          <div className="cdt-row cdt-th">
            <span>Nœud</span><span className="cdt-in">Remise %</span><span className="cdt-eff">Effectif</span>
          </div>
          {rows.map(({ node, depth }) => {
            const own = draft[node.slug];
            const effective = resolveDiscount(draft, node.slug, nodes);
            const inherited = own === undefined && effective > 0;
            return (
              <div key={node.slug} className={`cdt-row cdt-l${node.level}`} style={{ paddingLeft: 10 + depth * 20 }}>
                <span className="cdt-name"><b className="cdt-code">{node.code}</b> {node.name}</span>
                <span className="cdt-in">
                  <input
                    type="number" min={0} max={60} placeholder="hérite"
                    value={own ?? ''} onChange={(e) => setRate(node.slug, e.target.value)}
                  />
                </span>
                <span className="cdt-eff">
                  {effective > 0
                    ? <span className={inherited ? 'cdt-inh' : 'cdt-set'}>{effective}%{inherited ? ' (hérité)' : ''}</span>
                    : <span className="cdt-none">—</span>}
                </span>
              </div>
            );
          })}
        </div>

        <footer className="cdt-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>Annuler</button>
          <button type="button" className="btn solid" onClick={() => onSave(draft)} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer les remises'}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .cdt-box { background:#fff; border-radius:14px; width:min(720px,94vw); max-height:88vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .cdt-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:18px 22px; border-bottom:1px solid #eef2f7; }
        .cdt-head h3 { margin:0 0 4px; }
        .cdt-head p { margin:0; color:#64748b; font-size:13px; max-width:52ch; }
        .cdt-count { white-space:nowrap; font-size:12px; color:#0f4c81; background:#e0f2fe; padding:3px 10px; border-radius:999px; }
        .cdt-tree { overflow:auto; padding:6px 12px; }
        .cdt-row { display:grid; grid-template-columns:1fr 110px 120px; align-items:center; gap:8px; padding:5px 8px; border-bottom:1px solid #f1f5f9; }
        .cdt-th { position:sticky; top:0; background:#fff; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:#94a3b8; }
        .cdt-lgamme { background:#f8fafc; font-weight:700; }
        .cdt-lfamille { font-weight:600; }
        .cdt-code { color:#0f4c81; font-variant-numeric:tabular-nums; margin-right:4px; }
        .cdt-in { text-align:center; }
        .cdt-in input { width:70px; text-align:center; font:inherit; padding:3px 6px; border:1px solid #cbd5e1; border-radius:6px; }
        .cdt-eff { text-align:center; font-size:13px; }
        .cdt-set { color:#166534; font-weight:600; }
        .cdt-inh { color:#a16207; }
        .cdt-none { color:#cbd5e1; }
        .cdt-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid #eef2f7; }
      `}</style>
    </div>
  );
}
