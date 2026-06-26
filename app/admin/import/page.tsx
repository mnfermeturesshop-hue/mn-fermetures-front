'use client';

import { useRef, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { upsertProduct } from '@/lib/catalog/db';

interface PreviewRow {
  slug: string;
  name: string;
  category_slug: string;
  brand_slug: string;
  pricing_type: string;
  price: number;
  reference: string;
  description: string;
  pro_only: boolean;
  status: 'pending' | 'ok' | 'error';
  error?: string;
}

const TEMPLATE_HEADERS = [
  'slug', 'name', 'category_slug', 'brand_slug', 'pricing_type',
  'reference', 'price', 'description', 'pro_only',
];

function downloadTemplate() {
  const csv = [
    TEMPLATE_HEADERS.join(';'),
    'lame-pvc-40-blanc;Lame PVC 40 Blanc;tabliers;mn;unit;LAMA40BLCS;4.50;Lame PVC 40mm coloris blanc;false',
    'kit-axe-1500-somfy;Kit axe 1500 Somfy 10Nm;kits-axes;somfy;kit;KIT-AX-1500-S10;245.00;;false',
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'template-import-produits.csv';
  a.click();
}

export default function AdminImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setDone(false);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: Record<string, string>[] = utils.sheet_to_json(ws, { defval: '' });
      setRows(data.map(parseRow));
    } else {
      // CSV
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(';').map((h) => h.trim());
      const data = lines.slice(1).map((line) => {
        const vals = line.split(';');
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
      });
      setRows(data.map(parseRow));
    }
  };

  function parseRow(r: Record<string, string>): PreviewRow {
    const errors: string[] = [];
    if (!r.slug) errors.push('slug manquant');
    if (!r.name) errors.push('nom manquant');
    if (!r.category_slug) errors.push('catégorie manquante');
    if (!['unit', 'matrix', 'kit'].includes(r.pricing_type)) errors.push('pricing_type invalide');
    return {
      slug: r.slug ?? '',
      name: r.name ?? '',
      category_slug: r.category_slug ?? '',
      brand_slug: r.brand_slug ?? '',
      pricing_type: r.pricing_type ?? 'unit',
      reference: r.reference ?? '',
      price: parseFloat(r.price?.replace(',', '.') ?? '0') || 0,
      description: r.description ?? '',
      pro_only: r.pro_only === 'true' || r.pro_only === '1',
      status: errors.length ? 'error' : 'pending',
      error: errors.join(', ') || undefined,
    };
  }

  const validRows = rows.filter((r) => r.status !== 'error');

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let ok = 0;
    let fail = 0;

    const updated = [...rows];

    for (const row of validRows) {
      const idx = rows.indexOf(row);
      try {
        await upsertProduct({
          slug: row.slug,
          name: row.name,
          description: row.description || null,
          category_slug: row.category_slug,
          brand_slug: row.brand_slug || null,
          pricing_type: row.pricing_type,
          pro_only: row.pro_only,
          active: true,
          variants: row.pricing_type === 'unit' ? [{
            reference: row.reference,
            label: '',
            uom: 'unite',
            priceHT: row.price,
            inStock: true,
          }] : undefined,
          configs: row.pricing_type === 'kit' ? [{
            reference: row.reference,
            label: row.name,
            priceHT: row.price,
            bom: [],
          }] : undefined,
        });
        updated[idx] = { ...row, status: 'ok' };
        ok++;
      } catch (e) {
        updated[idx] = { ...row, status: 'error', error: String(e) };
        fail++;
      }
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
    toast.success(`${ok} produit${ok > 1 ? 's' : ''} importé${ok > 1 ? 's' : ''}${fail ? `, ${fail} erreur${fail > 1 ? 's' : ''}` : ''}`);
  };

  return (
    <div className="adm-page">
      <div className="adm-page-head">
        <h1 className="adm-h1">Import Excel / CSV</h1>
        <button type="button" className="btn ghost adm-btn-tpl" onClick={downloadTemplate}>
          ⬇ Télécharger le modèle CSV
        </button>
      </div>

      {/* Instructions */}
      <div className="adm-import-info">
        <h3>Format attendu</h3>
        <p>Fichier <strong>.xlsx</strong> ou <strong>.csv</strong> (séparateur <code>;</code>) avec les colonnes :</p>
        <div className="adm-import-cols">
          {TEMPLATE_HEADERS.map((h) => <code key={h}>{h}</code>)}
        </div>
        <p style={{ marginTop: 8 }}>Le champ <code>pricing_type</code> accepte : <code>unit</code>, <code>matrix</code>, <code>kit</code>.</p>
      </div>

      {/* Drop zone */}
      <div
        className="adm-drop-zone"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && fileRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            fileRef.current.files = dt.files;
            fileRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }}
      >
        <span className="adm-drop-icon">⬆</span>
        {fileName ? (
          <span><strong>{fileName}</strong> — {rows.length} ligne{rows.length > 1 ? 's' : ''} détectée{rows.length > 1 ? 's' : ''}</span>
        ) : (
          <span>Glisser un fichier ici ou <u>cliquer pour parcourir</u></span>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: 'none' }} />

      {/* Prévisualisation */}
      {rows.length > 0 && (
        <>
          <div className="adm-import-summary">
            <span className="adm-import-ok">✓ {validRows.length} valide{validRows.length > 1 ? 's' : ''}</span>
            {rows.filter((r) => r.status === 'error').length > 0 && (
              <span className="adm-import-err">✗ {rows.filter((r) => r.status === 'error').length} erreur{rows.filter((r) => r.status === 'error').length > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Statut</th><th>Slug</th><th>Nom</th><th>Catégorie</th><th>Type</th><th>Prix HT</th><th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`adm-tr adm-import-row-${r.status}`}>
                    <td>
                      {r.status === 'ok'    && <span className="adm-yes">✓ Importé</span>}
                      {r.status === 'error' && <span className="adm-no" title={r.error}>✗ Erreur</span>}
                      {r.status === 'pending' && <span className="adm-pending">En attente</span>}
                    </td>
                    <td><span className="ref">{r.slug}</span></td>
                    <td>{r.name}</td>
                    <td>{r.category_slug}</td>
                    <td><span className={`adm-pill adm-pill-${r.pricing_type}`}>{r.pricing_type}</span></td>
                    <td>{r.price.toFixed(2)} €</td>
                    <td>{r.pro_only ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!done && (
            <div className="adm-form-actions">
              <button type="button" className="btn ghost" onClick={() => { setRows([]); setFileName(''); }}>Annuler</button>
              <button
                type="button"
                className="btn solid adm-btn-save"
                disabled={importing || validRows.length === 0}
                onClick={handleImport}
              >
                {importing ? 'Import en cours…' : `Importer ${validRows.length} produit${validRows.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
