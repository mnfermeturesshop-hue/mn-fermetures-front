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

  const editing = jsonText.length > 0;

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
        </div>
      )}
    </div>
  );
}
