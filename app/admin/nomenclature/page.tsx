'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import type { TaxonomyNode } from '@/lib/catalog/taxonomy';

type Source = 'db' | 'seed';

const LEVEL_LABEL: Record<string, string> = { gamme: 'Gamme', famille: 'Famille', sous_famille: 'Sous‑famille' };

export default function AdminNomenclature() {
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [source, setSource] = useState<Source>('seed');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [moving, setMoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/nomenclature');
    if (!r.ok) { toast.error('Chargement impossible'); return; }
    const { items, source } = await r.json();
    setNodes(items ?? []);
    setSource(source);
  }, []);
  useEffect(() => { load(); }, [load]);

  const call = async (payload: Record<string, unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/nomenclature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(data.error ?? 'Échec'); return false; }
      if (okMsg) toast.success(okMsg);
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const childrenOf = useCallback(
    (parent: string | null) => nodes.filter((n) => n.parentSlug === parent).sort((a, b) => a.sortOrder - b.sortOrder),
    [nodes],
  );

  /** Descendants d'un nœud (pour exclure des cibles de déplacement). */
  const descendants = useCallback((slug: string): Set<string> => {
    const out = new Set<string>();
    const walk = (s: string) => { for (const c of nodes.filter((n) => n.parentSlug === s)) { out.add(c.slug); walk(c.slug); } };
    walk(slug);
    return out;
  }, [nodes]);

  const seedToDb = () => call({ action: 'seed' }, 'Nomenclature copiée en base — éditable.');
  const addChild = (parentSlug: string | null) => {
    const name = window.prompt(parentSlug ? 'Nom du nouveau nœud' : 'Nom de la nouvelle gamme');
    if (name?.trim()) call({ action: 'create', name: name.trim(), parentSlug }, 'Créé.');
  };
  const rename = (slug: string) => {
    if (editName.trim()) call({ action: 'update', slug, name: editName.trim() }, 'Renommé.');
    setEditing(null);
  };
  const toggleActive = (n: TaxonomyNode) => call({ action: 'update', slug: n.slug, active: !n.active });
  const reorder = (parent: string | null, slug: string, dir: -1 | 1) => {
    const sibs = childrenOf(parent).map((s) => s.slug);
    const i = sibs.indexOf(slug);
    const j = i + dir;
    if (j < 0 || j >= sibs.length) return;
    [sibs[i], sibs[j]] = [sibs[j], sibs[i]];
    call({ action: 'reorder', parentSlug: parent, orderedSlugs: sibs });
  };
  const del = (n: TaxonomyNode) => {
    const kids = descendants(n.slug).size;
    if (window.confirm(`Supprimer « ${n.name} »${kids ? ` et ses ${kids} descendant(s)` : ''} ?`)) {
      call({ action: 'delete', slug: n.slug }, 'Supprimé.');
    }
  };
  const move = (slug: string, parentSlug: string | null) => { setMoving(null); call({ action: 'move', slug, parentSlug }, 'Déplacé.'); };

  const moveTargets = (n: TaxonomyNode) => {
    const excl = descendants(n.slug); excl.add(n.slug);
    // Parents valides = racine (gamme) + gammes + familles, hors sous‑arbre du nœud.
    return nodes.filter((t) => t.level !== 'sous_famille' && !excl.has(t.slug));
  };

  const dbReady = source === 'db';

  // Surcharge temporaire INDÉPENDANTE (sans héritage) : le taux vaut pour le
  // nœud exact seulement (à poser sur la sous-famille).
  const setSurcharge = (n: TaxonomyNode, val: string) => {
    // Taux à décimales autorisé (ex. 5,5 %) — arrondi à 2 décimales, borné 0–200.
    const num = val === '' ? 0 : Math.min(200, Math.max(0, Math.round((Number(val) || 0) * 100) / 100));
    if (num !== (n.surcharge ?? 0)) call({ action: 'update', slug: n.slug, surcharge: num }, 'Surcharge mise à jour.');
  };

  // Éco-contribution (€) INDÉPENDANTE (nœud exact) — à poser sur la sous-famille.
  const setEco = (n: TaxonomyNode, val: string) => {
    const num = val === '' ? 0 : Math.max(0, Math.round((Number(val) || 0) * 100) / 100);
    if (num !== (n.ecoContribution ?? 0)) call({ action: 'update', slug: n.slug, ecoContribution: num }, 'Éco-contribution mise à jour.');
  };

  const Row = ({ n }: { n: TaxonomyNode }) => {
    const kids = childrenOf(n.slug);
    const canHaveChild = n.level !== 'sous_famille';
    const pad = n.level === 'gamme' ? 0 : n.level === 'famille' ? 20 : 40;
    return (
      <li>
        <div className={`nom-row nom-${n.level} ${n.active ? '' : 'nom-off'}`} style={{ paddingLeft: 12 + pad }}>
          <span className="nom-code">{n.code}</span>
          {editing === n.slug ? (
            <input
              className="nom-edit" autoFocus value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') rename(n.slug); if (e.key === 'Escape') setEditing(null); }}
              onBlur={() => rename(n.slug)}
            />
          ) : (
            <span className="nom-name" onDoubleClick={() => { setEditing(n.slug); setEditName(n.name); }}>{n.name}</span>
          )}
          <span className="nom-level">{LEVEL_LABEL[n.level]}</span>
          {n.generatorSlug && <span className="nom-gen" title="Générateur rattaché">⚙ {n.generatorSlug}</span>}

          <span className="nom-surcharge" title="Surcharge temporaire (%) sur CE nœud — sans héritage (à poser sur la sous-famille)">
            <input
              type="number" min={0} max={200} step="any" defaultValue={n.surcharge ?? 0} disabled={busy || !dbReady}
              onBlur={(e) => setSurcharge(n, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            />
            <span className="nom-surcharge-unit">% surch.</span>
          </span>

          <span className="nom-surcharge" title="Éco-contribution (€) sur CE nœud — sans héritage, ajoutée une fois par produit (non remisable)">
            <input
              type="number" min={0} step="any" defaultValue={n.ecoContribution ?? 0} disabled={busy || !dbReady}
              onBlur={(e) => setEco(n, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            />
            <span className="nom-surcharge-unit">€ éco</span>
          </span>

          <span className="nom-actions">
            <button disabled={busy} title="Monter" onClick={() => reorder(n.parentSlug, n.slug, -1)}>↑</button>
            <button disabled={busy} title="Descendre" onClick={() => reorder(n.parentSlug, n.slug, 1)}>↓</button>
            {canHaveChild && <button disabled={busy || !dbReady} title="Ajouter un enfant" onClick={() => addChild(n.slug)}>＋</button>}
            <button disabled={busy || !dbReady} title="Renommer" onClick={() => { setEditing(n.slug); setEditName(n.name); }}>✎</button>
            <button disabled={busy || !dbReady} title="Déplacer" onClick={() => setMoving(moving === n.slug ? null : n.slug)}>⇄</button>
            <button disabled={busy || !dbReady} title={n.active ? 'Désactiver' : 'Activer'} onClick={() => toggleActive(n)}>{n.active ? '◉' : '○'}</button>
            <button disabled={busy || !dbReady} title="Supprimer" className="nom-del" onClick={() => del(n)}>🗑</button>
          </span>
        </div>

        {moving === n.slug && (
          <div className="nom-move" style={{ paddingLeft: 12 + pad + 24 }}>
            Déplacer sous&nbsp;:
            <select
              defaultValue=""
              onChange={(e) => { const v = e.target.value; move(n.slug, v === '__root__' ? null : v || null); }}
            >
              <option value="" disabled>choisir…</option>
              <option value="__root__">— Racine (gamme) —</option>
              {moveTargets(n).map((t) => <option key={t.slug} value={t.slug}>{t.code} · {t.name} ({LEVEL_LABEL[t.level]})</option>)}
            </select>
            <button onClick={() => setMoving(null)}>annuler</button>
          </div>
        )}

        {kids.length > 0 && <ul className="nom-children">{kids.map((c) => <Row key={c.slug} n={c} />)}</ul>}
      </li>
    );
  };

  const gammes = useMemo(() => childrenOf(null), [childrenOf]);

  return (
    <div className="adm-page">
      <header className="adm-page-head">
        <div>
          <h1>Nomenclature produits</h1>
          <p className="adm-sub">Gamme › Famille › Sous‑famille — pilote la navigation, le rattachement des produits et les remises B2B héritées.</p>
        </div>
        <button className="adm-btn" disabled={busy || !dbReady} onClick={() => addChild(null)}>＋ Nouvelle gamme</button>
      </header>

      {!dbReady && (
        <div className="nom-banner">
          <b>Mode lecture (seed).</b> La nomenclature affichée provient du code. Copiez‑la en base pour l’éditer.
          <button className="adm-btn" disabled={busy} onClick={seedToDb}>Copier le seed en base</button>
        </div>
      )}

      <div className="nom-legend">
        Double‑clic sur un nom pour le renommer. Les codes se recalculent automatiquement.
      </div>

      <ul className="nom-tree">
        {gammes.map((g) => <Row key={g.slug} n={g} />)}
      </ul>

      <style jsx>{`
        .nom-banner { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:12px 16px; border-radius:10px; margin-bottom:16px; }
        .nom-legend { color:#64748b; font-size:13px; margin-bottom:10px; }
        .nom-tree, .nom-children { list-style:none; margin:0; padding:0; }
        .nom-row { display:flex; align-items:center; gap:10px; padding:8px 12px; border-bottom:1px solid #eef2f7; }
        .nom-row:hover { background:#f8fafc; }
        .nom-gamme { font-weight:700; background:#f1f5f9; }
        .nom-famille { font-weight:600; }
        .nom-off { opacity:.45; }
        .nom-code { font-variant-numeric:tabular-nums; color:#0f4c81; min-width:46px; font-weight:600; }
        .nom-name { cursor:text; }
        .nom-edit { font:inherit; padding:2px 6px; border:1px solid #94a3b8; border-radius:6px; }
        .nom-level { font-size:11px; color:#94a3b8; text-transform:uppercase; letter-spacing:.03em; }
        .nom-gen { font-size:12px; color:#0f766e; background:#ccfbf1; padding:1px 8px; border-radius:999px; }
        .nom-surcharge { margin-left:auto; display:flex; align-items:center; gap:5px; font-size:12px; color:#64748b; }
        .nom-surcharge input { width:52px; text-align:center; font:inherit; padding:2px 5px; border:1px solid #cbd5e1; border-radius:6px; }
        .nom-surcharge-unit { color:#94a3b8; }
        .nom-surcharge-inh { font-style:normal; color:#a16207; background:#fef9c3; padding:1px 6px; border-radius:999px; }
        .nom-actions { display:flex; gap:4px; }
        .nom-actions button { border:1px solid #e2e8f0; background:#fff; border-radius:6px; width:28px; height:28px; cursor:pointer; font-size:13px; }
        .nom-actions button:hover:not(:disabled) { background:#f1f5f9; }
        .nom-actions button:disabled { opacity:.4; cursor:not-allowed; }
        .nom-del:hover:not(:disabled) { background:#fee2e2 !important; }
        .nom-move { display:flex; align-items:center; gap:8px; padding:6px 12px; font-size:13px; color:#475569; background:#f8fafc; }
        .nom-move select { font:inherit; padding:4px 8px; border:1px solid #cbd5e1; border-radius:6px; }
      `}</style>
    </div>
  );
}
