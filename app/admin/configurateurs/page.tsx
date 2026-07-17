'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';

interface ListItem { slug: string; name: string; famille: string; active: boolean; source: 'seed' | 'db'; updatedAt?: string }

const euro = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const TEMPLATE = {
  slug: 'nouveau-produit', name: 'Nouveau produit', famille: 'divers',
  fields: [
    { id: 'largeur', label: 'Largeur', type: 'dimension', unit: 'mm', default: 1000 },
    { id: 'hauteur', label: 'Hauteur', type: 'dimension', unit: 'mm', default: 1000 },
  ],
  derived: [
    { id: 'surface_m2', expr: { op: '*', args: [{ op: '/', args: [{ var: 'largeur' }, 1000] }, { op: '/', args: [{ var: 'hauteur' }, 1000] }] } },
  ],
  steps: [
    { id: 'dim', title: 'Dimensions', fields: ['largeur', 'hauteur'] },
    { id: 'recap', title: 'Récapitulatif', fields: [] },
  ],
  priceRules: [
    { code: 'base', label: 'Prix', kind: 'base', amount: { op: 'round', arg: { op: '*', args: [{ var: 'surface_m2' }, 100] } } },
  ],
  constraints: [] as unknown[],
};

export default function AdminConfigurateurs() {
  const [list, setList] = useState<ListItem[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [busy, setBusy] = useState(false);
  const [check, setCheck] = useState<{ ok: boolean; priceFrom?: number | null; warnings?: string[]; errors?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const catalogRef = useRef<HTMLInputElement>(null);
  const [catalog, setCatalog] = useState<{ rows: (string | number)[][]; cols: number } | null>(null);
  const [cmap, setCmap] = useState({ field: '', value: 0, label: 1, hex: -1, hint: -1, header: true });

  const loadList = useCallback(async () => {
    const r = await fetch('/api/admin/configurateurs');
    if (r.ok) setList((await r.json()).items ?? []);
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const openDef = async (s: string) => {
    setCheck(null);
    const r = await fetch(`/api/admin/configurateurs/def?slug=${encodeURIComponent(s)}`);
    if (!r.ok) { toast.error('Chargement impossible'); return; }
    const { def } = await r.json();
    setSlug(def.slug);
    setJsonText(JSON.stringify(def, null, 2));
  };
  const duplicate = () => {
    try {
      const d = JSON.parse(jsonText);
      d.slug = `${d.slug}-copie`;
      d.name = `${d.name} (copie)`;
      setSlug(null);
      setJsonText(JSON.stringify(d, null, 2));
      setCheck(null);
      toast.success('Dupliqué — ajustez le slug puis enregistrez');
    } catch { toast.error('JSON invalide'); }
  };
  const newDef = () => { setSlug(null); setJsonText(JSON.stringify(TEMPLATE, null, 2)); setCheck(null); };

  const parse = (): unknown | null => {
    try { return JSON.parse(jsonText); } catch (e) { setCheck({ ok: false, errors: ['JSON invalide : ' + (e as Error).message] }); return null; }
  };
  const validate = async () => {
    const def = parse(); if (!def) return;
    setBusy(true);
    const r = await fetch('/api/admin/configurateurs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ definition: def, dryRun: true }) });
    const data = await r.json();
    setBusy(false);
    if (r.ok) setCheck({ ok: true, priceFrom: data.priceFrom, warnings: data.warnings });
    else setCheck({ ok: false, errors: data.details ?? [data.error], warnings: data.warnings });
  };
  const save = async () => {
    const def = parse(); if (!def) return;
    setBusy(true);
    const r = await fetch('/api/admin/configurateurs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ definition: def }) });
    const data = await r.json();
    setBusy(false);
    if (r.ok) { toast.success('Configurateur enregistré'); setSlug(data.slug); setCheck({ ok: true, priceFrom: data.priceFrom, warnings: data.warnings }); loadList(); }
    else { setCheck({ ok: false, errors: data.details ?? [data.error], warnings: data.warnings }); toast.error(data.error ?? 'Refusé'); }
  };

  const importExcel = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('Choisissez un .xlsx'); return; }
    setBusy(true);
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/admin/configurateurs/import', { method: 'POST', body: fd });
    const data = await r.json();
    setBusy(false);
    if (r.ok) { toast.success('Prix importés'); if (data.slug) openDef(data.slug); loadList(); }
    else toast.error(data.error ?? 'Import refusé');
  };

  // ── Import catalogue (options d'un champ) ──
  const loadCatalog = async () => {
    const file = catalogRef.current?.files?.[0];
    if (!file) { toast.error('Choisissez un fichier CSV/Excel'); return; }
    setBusy(true);
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/admin/configurateurs/catalog', { method: 'POST', body: fd });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { toast.error(data.error ?? 'Fichier illisible'); return; }
    setCatalog({ rows: data.rows, cols: data.cols });
    setCmap((m) => ({ ...m, field: choiceFields[0]?.id ?? '' }));
  };
  const applyCatalog = () => {
    if (!catalog) return;
    let d: { fields?: { id: string; label: string; options?: unknown }[] };
    try { d = JSON.parse(jsonText); } catch { toast.error('JSON invalide'); return; }
    const f = (d.fields ?? []).find((x) => x.id === cmap.field);
    if (!f) { toast.error('Champ cible introuvable'); return; }
    const cell = (row: (string | number)[], i: number) => (i >= 0 ? String(row[i] ?? '').trim() : '');
    const start = cmap.header ? 1 : 0;
    const opts = catalog.rows.slice(start)
      .filter((row) => cell(row, cmap.value))
      .map((row) => {
        const o: Record<string, string> = { value: cell(row, cmap.value), label: cell(row, cmap.label) || cell(row, cmap.value) };
        if (cell(row, cmap.hex)) o.hex = cell(row, cmap.hex);
        if (cell(row, cmap.hint)) o.hint = cell(row, cmap.hint);
        return o;
      });
    f.options = opts;
    setJsonText(JSON.stringify(d, null, 2));
    setCheck(null);
    toast.success(`${opts.length} option(s) importée(s) dans « ${f.label} »`);
  };

  const editing = jsonText.length > 0;
  let choiceFields: { id: string; label: string }[] = [];
  try { const d = JSON.parse(jsonText) as { fields?: { id: string; label: string; type: string }[] }; choiceFields = (d.fields ?? []).filter((f) => f.type === 'choice').map((f) => ({ id: f.id, label: f.label })); } catch { /* json en cours d'édition */ }
  const colOptions = catalog ? Array.from({ length: catalog.cols }, (_, i) => ({ i, name: cmap.header && catalog.rows[0] ? String(catalog.rows[0][i] ?? `Col ${i + 1}`) : `Colonne ${i + 1}` })) : [];
  const colSel = (val: number, onChange: (v: number) => void, allowNone?: boolean) => (
    <select value={val} onChange={(e) => onChange(Number(e.target.value))} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }}>
      {allowNone && <option value={-1}>(aucune)</option>}
      {colOptions.map((c) => <option key={c.i} value={c.i}>{c.name}</option>)}
    </select>
  );

  return (
    <div className="adm-page">
      <div className="adm-page-head"><h1 className="adm-h1">Configurateurs</h1></div>

      {/* Liste */}
      <div className="adm-card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {list.map((it) => (
            <button key={it.slug} type="button" className={`btn ${slug === it.slug ? 'solid' : 'ghost'} sm`} onClick={() => openDef(it.slug)}>
              {it.name} <span style={{ opacity: .6, fontSize: 11 }}>({it.source === 'db' ? 'en base' : 'intégré'})</span>
            </button>
          ))}
          <button type="button" className="btn ghost sm" onClick={newDef}>+ Nouveau</button>
        </div>
      </div>

      {editing && (
        <div className="adm-card" style={{ maxWidth: 900 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button className="btn ghost sm" type="button" disabled={busy} onClick={validate}>Valider</button>
            <button className="btn solid sm" type="button" disabled={busy} onClick={save}>Enregistrer</button>
            <button className="btn ghost sm" type="button" onClick={duplicate}>Dupliquer</button>
            {slug && <Link className="btn ghost sm" href={`/configurateur/${slug}`}>Ouvrir →</Link>}
            {slug && <a className="btn ghost sm" href={`/api/admin/configurateurs/export?slug=${slug}`}>⬇ Prix (.xlsx)</a>}
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>
            Définition (JSON) — champs, étapes, règles de prix et conditions. Édition des <strong>prix</strong> possible aussi via l&apos;Excel (grilles/barèmes).
          </p>
          <textarea value={jsonText} onChange={(e) => { setJsonText(e.target.value); setCheck(null); }} spellCheck={false}
            style={{ width: '100%', minHeight: 380, fontFamily: 'monospace', fontSize: 12.5, padding: 12, border: '1px solid var(--line)', borderRadius: 8, lineHeight: 1.5 }} />

          {check && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, fontSize: 13,
              background: check.ok ? '#e8f7ef' : '#fff1f0', border: `1px solid ${check.ok ? '#b6e6c9' : '#ffccc7'}` }}>
              {check.ok ? (
                <strong style={{ color: 'var(--success)' }}>
                  ✓ Définition valide{check.priceFrom != null ? ` — prix à partir de ${euro(check.priceFrom)} HT` : ' (pas de prix sur les valeurs par défaut)'}
                </strong>
              ) : (
                <><strong style={{ color: '#cf1322' }}>Définition refusée</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{(check.errors ?? []).map((e, i) => <li key={i}>{e}</li>)}</ul></>
              )}
              {(check.warnings ?? []).length > 0 && (
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#8a6d00' }}>{check.warnings!.map((w, i) => <li key={i}>⚠ {w}</li>)}</ul>
              )}
            </div>
          )}

          {/* Import Excel des prix (pour le configurateur en cours) */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>Mettre à jour les <strong>prix</strong> depuis un classeur Excel exporté :</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" />
              <button className="btn ghost sm" type="button" disabled={busy} onClick={importExcel}>Importer les prix</button>
            </div>
          </div>

          {/* Import catalogue → options d'un champ */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)' }}>
              Importer un <strong>catalogue fournisseur</strong> (CSV/Excel) pour remplir en masse les options d&apos;un champ (coloris, références…) :
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={catalogRef} type="file" accept=".csv,.xlsx,.xls" />
              <button className="btn ghost sm" type="button" disabled={busy} onClick={loadCatalog}>Charger le catalogue</button>
            </div>

            {catalog && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 10px', alignItems: 'center', maxWidth: 460 }}>
                  <label>Champ cible</label>
                  <select value={cmap.field} onChange={(e) => setCmap({ ...cmap, field: e.target.value })} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--line)' }}>
                    {choiceFields.length === 0 && <option value="">(aucun champ « choix »)</option>}
                    {choiceFields.map((f) => <option key={f.id} value={f.id}>{f.label} ({f.id})</option>)}
                  </select>
                  <label>Colonne « valeur »</label>{colSel(cmap.value, (v) => setCmap({ ...cmap, value: v }))}
                  <label>Colonne « libellé »</label>{colSel(cmap.label, (v) => setCmap({ ...cmap, label: v }), true)}
                  <label>Colonne « couleur (hex) »</label>{colSel(cmap.hex, (v) => setCmap({ ...cmap, hex: v }), true)}
                  <label>Colonne « aide »</label>{colSel(cmap.hint, (v) => setCmap({ ...cmap, hint: v }), true)}
                  <label>Ignorer la 1re ligne (en-têtes)</label>
                  <input type="checkbox" checked={cmap.header} onChange={(e) => setCmap({ ...cmap, header: e.target.checked })} style={{ justifySelf: 'start' }} />
                </div>
                <p style={{ margin: '10px 0 4px', color: 'var(--muted)' }}>
                  {catalog.rows.length} ligne(s) lue(s). Aperçu :{' '}
                  {catalog.rows.slice(cmap.header ? 1 : 0, (cmap.header ? 1 : 0) + 3).map((r) => `${r[cmap.value]}${cmap.label >= 0 ? ' → ' + r[cmap.label] : ''}`).join(' · ')}
                </p>
                <button className="btn solid sm" type="button" disabled={!cmap.field} onClick={applyCatalog}>Remplir les options du champ</button>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>puis « Valider » / « Enregistrer »</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
