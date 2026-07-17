'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';

interface ImportOk {
  ok: true;
  slug: string;
  name: string;
  stats: { fields: number; steps: number; priceRules: number; tables: number; priceFrom: number; priceFromBefore: number | null };
}

const SLUG = 'volet-roulant-traditionnel';
const euro = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

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

      <div className="adm-card" style={{ maxWidth: 640, marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Mise à jour du tarif (annuelle)</h2>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          <strong>1.</strong> Exportez le tarif <em>en cours</em> (toutes les valeurs pré-remplies) &nbsp;
          <strong>2.</strong> Éditez les prix dans Excel &nbsp;
          <strong>3.</strong> Ré-importez le classeur ci-dessous.
          La structure (grilles, coffres, options, coloris) est conservée à l&apos;identique.
        </p>
        <a className="btn ghost" href={`/api/admin/configurateurs/export?slug=${SLUG}`}>
          ⬇ Exporter le tarif (.xlsx)
        </a>
      </div>

      <div className="adm-card" style={{ maxWidth: 640 }}>
        <p style={{ margin: '0 0 16px', color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          Ré-importez le classeur Excel de tarif (grilles L×H, ajustements, options, coloris, limites).
          Le format attendu est décrit dans <code>docs/configurateur-modele-tarif.md</code>.
          L&apos;import remplace la définition existante (même <em>slug</em>), archive la précédente
          (rollback possible) et actualise le configurateur en ligne.
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
              <li>{result.stats.fields} champ(s) · {result.stats.steps} étape(s) · {result.stats.priceRules} règle(s) de prix · {result.stats.tables} table(s) de prix</li>
              <li>
                Prix à partir de : <strong>{euro(result.stats.priceFrom)}</strong> HT
                {result.stats.priceFromBefore != null && result.stats.priceFromBefore !== result.stats.priceFrom && (
                  <> &nbsp;(avant : {euro(result.stats.priceFromBefore)})</>
                )}
              </li>
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
