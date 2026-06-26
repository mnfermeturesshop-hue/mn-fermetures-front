'use client';

import { useRef, useState } from 'react';
import { toast } from '@/components/ui/Toast';
import { upsertProduct } from '@/lib/catalog/db';
import { categorySlugFromHref } from '@/lib/catalog/menuResolve';

interface PreviewRow {
  slug: string;
  nom: string;
  menu_path: string;
  marque: string;
  type_prix: string;
  reference: string;
  prix_ht: number;
  description: string;
  pro_uniquement: boolean;
  status: 'pending' | 'ok' | 'erreur';
  erreur?: string;
}

// Colonnes du fichier (en français)
const TEMPLATE_HEADERS = [
  'slug', 'nom', 'menu_path', 'marque',
  'type_prix', 'reference', 'prix_ht', 'description', 'pro_uniquement',
];

const DESCRIPTIONS_COLONNES: Record<string, string> = {
  slug:           'Identifiant URL unique (ex: moteur-lt50-10nm)',
  nom:            'Nom affiché du produit',
  menu_path:      'Position dans le catalogue (ex: /catalogue/motorisations/somfy-filaires)',
  marque:         'Slug de la marque : somfy, mn, gaposa…',
  type_prix:      'unitaire | sur_mesure | kit',
  reference:      'Référence fournisseur (ex: MOTLT50010)',
  prix_ht:        'Prix HT en euros (ex: 255.00)',
  description:    'Texte libre (optionnel)',
  pro_uniquement: 'oui | non',
};

// Mapping type_prix français → valeur interne
const TYPE_PRIX_MAP: Record<string, string> = {
  unitaire: 'unit',
  sur_mesure: 'matrix',
  kit: 'kit',
  // compatibilité anglais
  unit: 'unit',
  matrix: 'matrix',
};

function downloadTemplate() {
  const csv = [
    TEMPLATE_HEADERS.join(';'),
    'tablier-lame-pvc-40-blanc;Tablier lame PVC 40 Blanc;/catalogue/tabliers/pvc-40;mn;unitaire;LAMA40BLCS;4.50;Tablier agrafé coloris blanc;non',
    'kit-axe-1500-somfy;Kit axe rénovation 1500 Somfy 10Nm;/catalogue/kits-axes/renovation/somfy;somfy;kit;KIT-AX-1500-S10;245.00;;non',
    'moteur-lt50-20nm;Moteur filaire LT50 20 Nm;/catalogue/motorisations/somfy-filaires;somfy;unitaire;MOTLT50020;255.00;;non',
  ].join('\n');

  // BOM UTF-8 pour Excel
  const bom = '﻿';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modele-import-produits.csv';
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
      const text = await file.text();
      const lines = text.replace(/^﻿/, '').trim().split('\n');
      const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
      const data = lines.slice(1).map((line) => {
        const vals = line.split(';');
        return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? '').trim()]));
      });
      setRows(data.map(parseRow));
    }
  };

  function parseRow(r: Record<string, string>): PreviewRow {
    const erreurs: string[] = [];

    // Support colonnes françaises et anglaises (compat)
    const slug        = r.slug ?? '';
    const nom         = r.nom ?? r.name ?? '';
    const menu_path   = r.menu_path ?? '';
    const marque      = r.marque ?? r.brand_slug ?? '';
    const type_brut   = (r.type_prix ?? r.pricing_type ?? 'unitaire').toLowerCase().trim();
    const reference   = r.reference ?? '';
    const prix_ht     = parseFloat((r.prix_ht ?? r.price ?? '0').replace(',', '.')) || 0;
    const description = r.description ?? '';
    const pro_raw     = (r.pro_uniquement ?? r.pro_only ?? 'non').toLowerCase();
    const pro_uniquement = pro_raw === 'oui' || pro_raw === 'true' || pro_raw === '1';

    if (!slug)       erreurs.push('slug manquant');
    if (!nom)        erreurs.push('nom manquant');
    if (!menu_path)  erreurs.push('menu_path manquant');
    if (!TYPE_PRIX_MAP[type_brut]) erreurs.push(`type_prix invalide (reçu : "${type_brut}")`);

    return {
      slug, nom, menu_path, marque,
      type_prix: TYPE_PRIX_MAP[type_brut] ?? type_brut,
      reference, prix_ht, description, pro_uniquement,
      status: erreurs.length ? 'erreur' : 'pending',
      erreur: erreurs.join(' · ') || undefined,
    };
  }

  const validRows  = rows.filter((r) => r.status !== 'erreur');
  const errorRows  = rows.filter((r) => r.status === 'erreur');

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    let ok = 0; let fail = 0;
    const updated = [...rows];

    for (const row of validRows) {
      const idx = rows.indexOf(row);
      try {
        await upsertProduct({
          slug: row.slug,
          name: row.nom,
          description: row.description || null,
          menu_path: row.menu_path,
          category_slug: categorySlugFromHref(row.menu_path),
          brand_slug: row.marque || null,
          pricing_type: row.type_prix,
          pro_only: row.pro_uniquement,
          active: true,
          variants: row.type_prix === 'unit' ? [{
            reference: row.reference,
            label: '',
            uom: 'unite',
            priceHT: row.prix_ht,
            inStock: true,
          }] : undefined,
          configs: row.type_prix === 'kit' ? [{
            reference: row.reference,
            label: row.nom,
            priceHT: row.prix_ht,
            bom: [],
          }] : undefined,
        });
        updated[idx] = { ...row, status: 'ok' };
        ok++;
      } catch (e) {
        updated[idx] = { ...row, status: 'erreur', erreur: String(e) };
        fail++;
      }
      setRows([...updated]);
    }

    setImporting(false);
    setDone(true);
    toast.success(`${ok} produit${ok > 1 ? 's' : ''} importé${ok > 1 ? 's' : ''}${fail ? ` · ${fail} erreur${fail > 1 ? 's' : ''}` : ''}`);
  };

  const TYPE_LABELS: Record<string, string> = { unit: 'Unitaire', matrix: 'Sur mesure', kit: 'Kit' };

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
        <p>Fichier <strong>.xlsx</strong> ou <strong>.csv</strong> (séparateur <code>;</code> · encodage UTF-8). Colonnes :</p>
        <table className="adm-import-cols-table">
          <thead><tr><th>Colonne</th><th>Description</th></tr></thead>
          <tbody>
            {TEMPLATE_HEADERS.map((h) => (
              <tr key={h}>
                <td><code>{h}</code></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{DESCRIPTIONS_COLONNES[h]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Zone de dépôt */}
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
            {errorRows.length > 0 && (
              <span className="adm-import-err">✗ {errorRows.length} erreur{errorRows.length > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Slug</th>
                  <th>Nom</th>
                  <th>Position menu</th>
                  <th>Type prix</th>
                  <th>Prix HT</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={`adm-tr adm-import-row-${r.status}`}>
                    <td>
                      {r.status === 'ok'      && <span className="adm-yes">✓ Importé</span>}
                      {r.status === 'erreur'  && <span className="adm-no" title={r.erreur}>✗ {r.erreur}</span>}
                      {r.status === 'pending' && <span className="adm-pending">En attente</span>}
                    </td>
                    <td><span className="ref">{r.slug}</span></td>
                    <td>{r.nom}</td>
                    <td style={{ fontSize: 11 }}>{r.menu_path}</td>
                    <td><span className={`adm-pill adm-pill-${r.type_prix}`}>{TYPE_LABELS[r.type_prix] ?? r.type_prix}</span></td>
                    <td>{r.prix_ht.toFixed(2)} €</td>
                    <td>{r.pro_uniquement ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!done && (
            <div className="adm-form-actions">
              <button type="button" className="btn ghost" onClick={() => { setRows([]); setFileName(''); }}>
                Annuler
              </button>
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
