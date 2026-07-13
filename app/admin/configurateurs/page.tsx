'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';

interface ImportOk {
  ok: true;
  slug: string;
  name: string;
  stats: { grids: number; heights: number; selectors: number; options: number; colors: number };
}

export default function AdminConfigurateurs() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportOk | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('Choisissez un classeur .xlsx'); return; }
    setBusy(true); setErrors([]); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/configurateurs/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErrors(Array.isArray(data.details) ? data.details : [data.error ?? 'Import refusé']);
        toast.error(data.error ?? 'Import refusé');
      } else {
        setResult(data as ImportOk);
        toast.success('Tarif importé');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Configurateurs</h1>
      </div>

      <div className="adm-card" style={{ maxWidth: 640 }}>
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Importez un classeur Excel de tarif (grilles L×H, moins-values, options, coloris, limites).
          Le format attendu est décrit dans <code>docs/configurateur-modele-tarif.md</code>.
          L&apos;import remplace la définition existante (même <em>slug</em>) et actualise le configurateur en ligne.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ''); setResult(null); setErrors([]); }}
          />
          <button className="btn solid" type="button" disabled={busy} onClick={handleImport}>
            {busy ? 'Import…' : 'Importer le tarif'}
          </button>
        </div>
        {fileName && <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>Fichier : {fileName}</p>}

        {result && (
          <div style={{ marginTop: 18, padding: 14, background: '#e8f7ef', border: '1px solid #b6e6c9', borderRadius: 8 }}>
            <strong style={{ color: 'var(--success)' }}>✓ Importé : {result.name}</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#256b45' }}>
              <li>{result.stats.grids} grille(s) · {result.stats.heights} bande(s) de hauteur au total</li>
              <li>{result.stats.selectors} axe(s) · {result.stats.options} option(s) · {result.stats.colors} coloris</li>
            </ul>
            <Link href={`/configurateur/${result.slug}`} className="btn ghost sm" style={{ marginTop: 10, display: 'inline-block' }}>
              Ouvrir le configurateur →
            </Link>
          </div>
        )}

        {errors.length > 0 && (
          <div style={{ marginTop: 18, padding: 14, background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8 }}>
            <strong style={{ color: '#cf1322' }}>Import refusé</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#a8071a' }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
