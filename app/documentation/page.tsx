'use client';

import { useMemo, useState } from 'react';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/* ============================================================
   DONNÉES — Coulisses
   ============================================================ */
type CoulisseType = 'renovation' | 'traditionnelle';

const COULISSES: Record<CoulisseType, { dim: string; offset: number }[]> = {
  renovation: [
    { dim: '53 × 22 mm', offset: 68 },
    { dim: '66 × 27 mm', offset: 70 },
    { dim: '75 × 27 mm', offset: 88 },
    { dim: '95 × 34 mm', offset: 92 },
  ],
  traditionnelle: [
    { dim: '40 × 22 mm', offset: 20 },
    { dim: '40 × 27 mm', offset: 20 },
    { dim: '60 × 27 mm', offset: 20 },
    { dim: '45 × 22 mm', offset: 30 },
    { dim: '45 × 27 mm', offset: 30 },
  ],
};

/* ============================================================
   DONNÉES — Abaques moteurs
   ============================================================ */
type AbaqueType = 'thin' | 'thick' | 'garage';

const ABAQUES: Record<AbaqueType, {
  label: string; weight: string;
  heights: number[]; widths: number[]; data: number[][];
}> = {
  thin: {
    label: 'Volets roulants (lames < 10 mm)',
    weight: 'Poids de calcul : 4,5 kg/m²  —  lames PVC 40 : 4 kg/m²  |  alu double paroi + mousse : 4,5 kg/m²  |  bois : 11 kg/m²',
    heights: [850,950,1050,1150,1250,1350,1450,1550,1650,1750,1850,1950,2050,2150,2250,2350,2450,2550],
    widths:  [800,900,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000],
    data: [
      [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,10,10],
      [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10],
      [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10],
      [6,6,6,6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10],
      [6,6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10],
      [6,6,6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,10],
      [6,6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,10,10,15],
      [6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,10,15,15,15],
      [6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15],
      [6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15],
      [6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15],
      [6,6,6,6,6,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15],
      [6,6,6,6,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,20],
      [6,6,6,6,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,20,20,20],
      [6,6,6,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,20,20,20,20],
      [6,6,6,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,20,20,20,20,20],
      [6,6,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,20,20,20,20,20,20],
      [6,6,10,10,10,10,10,10,10,15,15,15,15,15,15,15,20,20,20,20,20,20,20],
    ],
  },
  thick: {
    label: 'Volets roulants (lames 10–14 mm)',
    weight: 'Poids de calcul : 5,5 kg/m²  —  lames PVC 55 : 4,5 kg/m²  |  alu double paroi + mousse : 5,5 kg/m²  |  bois : 11 kg/m²',
    heights: [850,950,1050,1150,1250,1350,1450,1550,1650,1750,1850,1950,2050,2150,2250,2350,2450,2550],
    widths:  [1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,3400,3500,3600,3700,3800,3900,4000],
    data: [
      [6,6,6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,15],
      [6,6,6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,15,15,20,20],
      [6,6,6,6,10,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,15,20,20,20,20,20],
      [6,6,6,10,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20],
      [6,6,10,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,20,30],
      [6,10,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,30,30,30,30],
      [6,10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,20,30,30,30,30,30],
      [10,10,10,10,10,10,10,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30],
      [10,10,10,10,10,10,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,30],
      [10,10,10,10,10,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,30,35],
      [10,10,10,10,15,15,15,15,15,15,15,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,30,35,35,35],
      [10,10,10,10,15,15,15,15,15,15,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,35,35,35,35,35],
      [10,10,10,15,15,15,15,15,15,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,30,35,35,35,35,35,50],
      [10,10,15,15,15,15,15,15,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,35,35,35,35,35,35,50,50],
      [10,10,15,15,15,15,15,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,35,35,35,35,35,50,50,50,50],
      [10,15,15,15,15,15,15,20,20,20,20,20,30,30,30,30,30,30,30,30,30,35,35,35,35,35,50,50,50,50,50],
      [10,15,15,15,15,15,20,20,20,20,20,30,30,30,30,30,30,30,30,35,35,35,35,35,35,50,50,50,50,50,50],
      [15,15,15,15,15,20,20,20,20,20,30,30,30,30,30,30,30,30,35,35,35,35,35,50,50,50,50,50,50,50,50],
    ],
  },
  garage: {
    label: 'Porte de garage',
    weight: 'Poids de calcul : 6,5 kg/m²  —  lame alu 77 double paroi + mousse : 6,5 kg/m²  |  lame alu extrudé 77 : 9 kg/m²',
    heights: [2050,2150,2250,2350,2450,2550,2650,2750,2850,2950,3050,3150,3250,3350,3450,3550,3650,3750,3850,3950],
    widths:  [2000,2100,2200,2300,2400,2500,2600,2700,2800,2900,3000,3100,3200,3300,3400,3500,3600,3700,3800,3900,4000,4100,4200,4300,4400,4500,4600,4700,4800,4900,5000],
    data: [
      [30,30,30,30,30,30,30,30,35,35,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60],
      [30,30,30,30,30,30,30,35,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60],
      [30,30,30,30,30,30,35,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,60],
      [30,30,30,30,30,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,60,60,70],
      [30,30,30,30,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,60,60,70,70,70],
      [30,30,30,35,35,35,35,50,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,60,70,70,70,70,70],
      [30,30,35,35,35,35,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,60,70,70,70,70,70,70,70],
      [30,35,35,35,35,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,70,70,70,70,70,70,70,85,85],
      [35,35,35,35,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,70,70,70,70,70,70,85,85,85,85],
      [35,35,35,50,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,60,70,70,70,70,70,70,85,85,85,85,85],
      [35,35,35,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,70,85,85,85,85,85,85,85],
      [35,35,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,70,85,85,85,85,85,85,85,85],
      [35,50,50,50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,70,85,85,85,85,85,85,85,85,85],
      [35,50,50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,85,100,100],
      [50,50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,85,100,100,100],
      [50,50,50,50,50,50,50,60,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,100,100,100,100,100],
      [50,50,50,50,50,50,50,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,100,100,100,100,100,100],
      [50,50,50,50,50,50,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,100,100,100,100,100,100,100],
      [50,50,50,50,50,60,60,60,60,60,70,70,70,70,70,85,85,85,85,85,85,85,85,100,100,100,100,100,100,100,120],
      [50,50,50,50,50,60,60,60,60,60,70,70,70,70,85,85,85,85,85,85,85,85,100,100,100,100,100,100,100,120,120],
    ],
  },
};

function nmColor(nm: number) {
  if (nm <= 6)  return '#16a34a';
  if (nm <= 10) return '#65a30d';
  if (nm <= 15) return '#ca8a04';
  if (nm <= 20) return '#ea580c';
  if (nm <= 35) return '#dc2626';
  if (nm <= 60) return '#b91c1c';
  return '#7f1d1d';
}

/* ============================================================
   SECTION — Calcul tablier fini
   ============================================================ */
function TablierSection() {
  const [type, setType] = useState<CoulisseType>('renovation');
  const [idx, setIdx] = useState(0);
  const [largeur, setLargeur] = useState('');

  const coulisses = COULISSES[type];
  const sel = coulisses[Math.min(idx, coulisses.length - 1)];
  const num = parseInt(largeur);
  const result = !isNaN(num) && num > 0 ? num - sel.offset : null;

  return (
    <div>
      <h1 className="doc-title">Calcul largeur tablier fini</h1>
      <p className="doc-intro">Saisissez la largeur dos de coulisse pour obtenir la largeur de tablier fini correspondante.</p>

      <div className="doc-calculator">
        <div className="doc-toggle-row">
          {(['renovation', 'traditionnelle'] as CoulisseType[]).map(t => (
            <button key={t} type="button"
              className={`doc-toggle-btn ${type === t ? 'active' : ''}`}
              onClick={() => { setType(t); setIdx(0); }}
            >
              {t === 'renovation' ? 'Rénovation' : 'Traditionnelle'}
            </button>
          ))}
        </div>

        <div className="doc-field">
          <label>Type de coulisse</label>
          <select value={idx} onChange={e => setIdx(Number(e.target.value))}>
            {coulisses.map((c, i) => (
              <option key={i} value={i}>{c.dim} — déduction : {c.offset} mm</option>
            ))}
          </select>
        </div>

        <div className="doc-field">
          <label>Largeur dos de coulisse (mm)</label>
          <input
            type="number" min={100} max={5000} placeholder="ex : 1500"
            value={largeur} onChange={e => setLargeur(e.target.value)}
          />
        </div>

        <div className="doc-formula-bar">
          <span className="doc-formula-pill">Largeur tablier fini</span>
          <span className="doc-formula-eq">=</span>
          <span className="doc-formula-pill">Largeur dos de coulisse</span>
          <span className="doc-formula-eq">−</span>
          <span className="doc-formula-pill doc-formula-pill--accent">{sel.offset} mm</span>
        </div>

        {result !== null && (
          <div className="doc-result">
            <div className="doc-result-label">Largeur tablier fini</div>
            <div className="doc-result-value">{result} mm</div>
            <div className="doc-result-sub">{num} − {sel.offset} = {result} mm</div>
          </div>
        )}
      </div>

      <h2 className="doc-subtitle">Tableau de référence</h2>
      <div className="doc-table-wrap doc-table-wrap--sm">
        <table>
          <thead>
            <tr><th>Type</th><th>Coulisse</th><th>Déduction</th></tr>
          </thead>
          <tbody>
            {(['renovation', 'traditionnelle'] as CoulisseType[]).map(t =>
              COULISSES[t].map((c, i) => (
                <tr key={`${t}-${i}`}>
                  {i === 0 && <td rowSpan={COULISSES[t].length} className="doc-td-type">
                    {t === 'renovation' ? 'Rénovation' : 'Traditionnelle'}
                  </td>}
                  <td>{c.dim}</td>
                  <td><strong>− {c.offset} mm</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION — Abaques moteurs
   ============================================================ */
function AbaquesSection() {
  const [type, setType] = useState<AbaqueType>('thin');
  const [h, setH] = useState('');
  const [l, setL] = useState('');
  const [showTable, setShowTable] = useState(false);

  const ab = ABAQUES[type];
  const hNum = parseInt(h);
  const lNum = parseInt(l);

  const result = useMemo(() => {
    if (isNaN(hNum) || isNaN(lNum) || hNum <= 0 || lNum <= 0) return null;
    const hi = ab.heights.findIndex(v => v >= hNum);
    const li = ab.widths.findIndex(v => v >= lNum);
    if (hi === -1 || li === -1) return null;
    return { nm: ab.data[hi][li], hUsed: ab.heights[hi], lUsed: ab.widths[li], hi, li };
  }, [type, hNum, lNum, ab]);

  const outOfRange = (h || l) && !result;

  return (
    <div>
      <h1 className="doc-title">Abaques d&apos;utilisation des moteurs</h1>
      <div className="doc-warning">
        Ces abaques calculés avec un coefficient de sécurité sont donnés à titre indicatif pour des tabliers génériques.
        Ils ne correspondent pas forcément à ceux utilisés pour la fabrication spécifique de nos produits.
      </div>

      <div className="doc-calculator">
        <div className="doc-toggle-row">
          {(Object.keys(ABAQUES) as AbaqueType[]).map(k => (
            <button key={k} type="button"
              className={`doc-toggle-btn ${type === k ? 'active' : ''}`}
              onClick={() => { setType(k); setH(''); setL(''); }}
            >
              {ABAQUES[k].label}
            </button>
          ))}
        </div>

        <p className="doc-weight-note">{ab.weight}</p>

        <div className="doc-dim-row">
          <div className="doc-field">
            <label>Hauteur finie H (mm)</label>
            <input type="number" min={200} max={9000}
              placeholder={`${ab.heights[0]} – ${ab.heights[ab.heights.length - 1]}`}
              value={h} onChange={e => setH(e.target.value)}
            />
          </div>
          <div className="doc-field">
            <label>Largeur finie L (mm)</label>
            <input type="number" min={200} max={9000}
              placeholder={`${ab.widths[0]} – ${ab.widths[ab.widths.length - 1]}`}
              value={l} onChange={e => setL(e.target.value)}
            />
          </div>
        </div>

        {result && (
          <div className="doc-result">
            <div className="doc-result-label">Puissance moteur recommandée</div>
            <div className="doc-result-nm" style={{ color: nmColor(result.nm) }}>{result.nm} Nm</div>
            {(hNum !== result.hUsed || lNum !== result.lUsed) && (
              <div className="doc-result-sub">
                Dimensions arrondies à H {result.hUsed} × L {result.lUsed} mm (valeur supérieure dans l&apos;abaque)
              </div>
            )}
          </div>
        )}
        {outOfRange && (
          <div className="doc-result doc-result--warn">
            Dimensions hors abaque — contactez-nous pour conseil.
          </div>
        )}
      </div>

      <div className="doc-nm-legend">
        {[6, 10, 15, 20, 30, 35, 50, 60, 85, 100, 120].map(nm => (
          <span key={nm} className="doc-nm-chip" style={{ background: nmColor(nm) }}>{nm} Nm</span>
        ))}
      </div>

      <button type="button" className="doc-toggle-table-btn" onClick={() => setShowTable(v => !v)}>
        {showTable ? '▲ Masquer le tableau complet' : '▼ Afficher le tableau complet'}
      </button>

      {showTable && (
        <div className="doc-table-wrap">
          <table className="doc-abaque-table">
            <thead>
              <tr>
                <th className="doc-abaque-corner">H \ L</th>
                {ab.widths.map(w => <th key={w}>{w}</th>)}
              </tr>
            </thead>
            <tbody>
              {ab.heights.map((rowH, hi) => (
                <tr key={rowH}>
                  <th>{rowH}</th>
                  {ab.widths.map((_, li) => {
                    const nm = ab.data[hi][li];
                    const hl = result && hi === result.hi && li === result.li;
                    return (
                      <td key={li}
                        style={{
                          background: hl ? '#10314f' : undefined,
                          color: hl ? '#fff' : nmColor(nm),
                          fontWeight: hl ? 800 : 600,
                          outline: hl ? '2px solid #10314f' : undefined,
                        }}
                      >{nm}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SECTION — Somfy RS100 IO
   ============================================================ */
type SomfyTab = 'check' | 'auto' | 'manual' | 'mod-auto' | 'mod-manual' | 'factory';

const SOMFY_TABS: { id: SomfyTab; label: string }[] = [
  { id: 'check',     label: 'Vérifier le moteur' },
  { id: 'auto',      label: 'Mise en service auto' },
  { id: 'manual',    label: 'Mise en service manuelle' },
  { id: 'mod-auto',  label: 'Modifier fins de course auto' },
  { id: 'mod-manual',label: 'Modifier fins de course manuelle' },
  { id: 'factory',   label: 'Mode usine' },
];

const ROTATION_WARNING = (
  <div className="doc-warning">
    ⚠ NE CHERCHEZ PAS À CHANGER LE SENS DE ROTATION. Le moteur détermine automatiquement en 2 cycles maximum son sens de rotation après le réglage des fins de course.
  </div>
);

function SomfySection() {
  const [tab, setTab] = useState<SomfyTab>('check');

  return (
    <div>
      <h1 className="doc-title">Volet roulant — Moteur Somfy RS100 IO</h1>
      <div className="doc-info-box">
        <p><strong>RENOBOX, MINIBOX, BLOC BAIE, TRADI+COFFRE TUNNEL :</strong> Moteurs préréglés en atelier.</p>
        <p><strong>Autres produits TRADI :</strong> Moteurs non préréglés en atelier — suivre la procédure ci-dessous.</p>
      </div>

      <div className="doc-subtabs">
        {SOMFY_TABS.map(t => (
          <button key={t.id} type="button"
            className={`doc-subtab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'check' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Vérifier si le moteur est réglé</h2>
          <p className="doc-step-intro">Mettre <strong>UN SEUL</strong> moteur sous tension, puis observer :</p>
          <div className="doc-cases">
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#3b82f6' }}>1</div>
              <div className="doc-case-body">
                <strong>Aucun mouvement</strong>
                <ul>
                  <li><strong>A —</strong> Le moteur est déjà programmé sur le point de commande fourni → faire un test DESCENTE / MONTÉE</li>
                  <li><strong>B —</strong> Le moteur n&apos;est pas encore réglé et programmé → voir procédure de mise en service</li>
                </ul>
              </div>
            </div>
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#3b82f6' }}>2</div>
              <div className="doc-case-body">
                <strong>Va-et-vient du moteur</strong>
                <p>Le moteur est réglé mais aucun point de commande n&apos;est enregistré → voir &quot;Mise en service&quot;.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'auto' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Mise en service — Réglage automatique</h2>
          <div className="doc-info-box">
            Le moteur se règle totalement de lui-même. Seul le point de commande doit être programmé.
            Le moteur détermine automatiquement son sens de rotation après le réglage des fins de course (max 2 cycles).
          </div>
          <p className="doc-step-intro">Mettre <strong>UN SEUL</strong> moteur sous tension.</p>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Prendre en main le moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Programmer le point de commande — appuyer sur <strong>PROG</strong> → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Vérifier le bon fonctionnement du volet en réalisant un cycle complet.</div></li>
          </ol>
          {ROTATION_WARNING}
        </div>
      )}

      {tab === 'manual' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Mise en service — Réglage manuel des fins de course</h2>
          <p className="doc-step-intro">Mettre <strong>UN SEUL</strong> moteur sous tension.</p>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Prendre en main le moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Positionner le volet à <strong>mi-course</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Placer le volet à la <strong>fin de course haute</strong> voulue</div></li>
            <li className="doc-step"><span className="doc-step-num">5</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">6</span><div>Placer le volet à la <strong>fin de course basse</strong> voulue</div></li>
            <li className="doc-step"><span className="doc-step-num">7</span><div>Rester appuyé jusqu&apos;au va-et-vient → <strong>Le moteur fait deux va-et-vient</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">8</span><div>Programmer le point de commande — appuyer sur <strong>PROG</strong> → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">9</span><div>Vérifier le bon fonctionnement en réalisant un cycle complet.</div></li>
          </ol>
          {ROTATION_WARNING}
        </div>
      )}

      {tab === 'mod-auto' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Modification automatique des fins de course</h2>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Positionner le volet à <strong>mi-course</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Vérifier le bon fonctionnement en réalisant un cycle complet.</div></li>
          </ol>
          {ROTATION_WARNING}
        </div>
      )}

      {tab === 'mod-manual' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Modification manuelle des fins de course</h2>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Positionner le volet à <strong>mi-course</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Placer le volet à la <strong>fin de course haute</strong> voulue</div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur réagit</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">5</span><div>Placer le volet à la <strong>fin de course basse</strong> voulue</div></li>
            <li className="doc-step"><span className="doc-step-num">6</span><div>Rester appuyé jusqu&apos;au va-et-vient → <strong>Le moteur fait deux va-et-vient</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">7</span><div>Vérifier le bon fonctionnement en réalisant un cycle complet.</div></li>
          </ol>
          {ROTATION_WARNING}
        </div>
      )}

      {tab === 'factory' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">Mettre le moteur RS100 IO en mode usine</h2>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Positionner le volet à <strong>mi-course</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Rester appuyé jusqu&apos;au va-et-vient du moteur → <strong>Le moteur fait un va-et-vient</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Rester appuyé sur les <strong>3 touches</strong> jusqu&apos;au va-et-vient → <strong>Le moteur fait un va-et-vient</strong></div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Rester appuyé sur <strong>PROG</strong> jusqu&apos;au 2ème va-et-vient → <strong>Le moteur fait deux va-et-vient</strong></div></li>
          </ol>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SECTION — Gaposa XQ50EX Latente
   ============================================================ */
type GaposaTab = 'pair' | 'rotation' | 'limits' | 'mod-limits' | 'intermediate' | 'second' | 'obstacle' | 'erase' | 'reset';

const GAPOSA_TABS: { id: GaposaTab; label: string }[] = [
  { id: 'pair',         label: '1. Appairer émetteur' },
  { id: 'rotation',     label: '2. Sens de rotation' },
  { id: 'limits',       label: '3. Fins de course' },
  { id: 'mod-limits',   label: '4. Modifier fins de course' },
  { id: 'intermediate', label: '5. Position intermédiaire' },
  { id: 'second',       label: '6. Second émetteur' },
  { id: 'obstacle',     label: '7. Détection obstacle' },
  { id: 'erase',        label: '8. Effacer canal/émetteur' },
  { id: 'reset',        label: '9. Remise à zéro' },
];

function GaposaSection() {
  const [tab, setTab] = useState<GaposaTab>('pair');

  return (
    <div>
      <h1 className="doc-title">Guide de programmation — Moteur Gaposa XQ50EX Latente</h1>

      <div className="doc-key-map">
        <h3>Légende des touches</h3>
        <div className="doc-key-grid">
          <div><span className="doc-key">▲ HAUT</span> Montée</div>
          <div><span className="doc-key">■ STOP</span> Arrêt</div>
          <div><span className="doc-key">▼ BAS</span> Descente</div>
          <div><span className="doc-key">PROG-TX</span> Appairage télécommande (bouton face arrière)</div>
          <div><span className="doc-key">PROG-FC</span> Réglage fins de course (bouton face arrière)</div>
        </div>
      </div>

      <div className="doc-subtabs">
        {GAPOSA_TABS.map(t => (
          <button key={t.id} type="button"
            className={`doc-subtab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'pair' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">1. Appairer l&apos;émetteur</h2>
          <p className="doc-step-intro">Mettre le moteur sous tension.</p>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Appuyer sur la touche <strong>PROG-TX</strong> (face arrière de l&apos;émetteur) jusqu&apos;à ce que le moteur réagisse.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Vérifier le sens de rotation, puis relâcher <strong>PROG-TX</strong> → le moteur s&apos;arrête.</div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Dans les <strong>5 secondes</strong>, appuyer sur le bouton correspondant :<br />
              — <strong>HAUT</strong> si le volet monte<br />
              — <strong>BAS</strong> si le volet descend<br />
              La télécommande est maintenant appairée.
            </div></li>
          </ol>
        </div>
      )}

      {tab === 'rotation' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">2. Changement du sens de rotation</h2>
          <div className="doc-warning">
            ⚠ Le changement du sens de rotation doit être fait <strong>AVANT</strong> de régler les fins de course, sinon il faut refaire le réglage des fins de course.
          </div>
          <p className="doc-step-intro">Nécessaire uniquement si le moteur ne tourne pas dans le bon sens.</p>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Maintenir appuyé le bouton <strong>PROG-TX</strong> jusqu&apos;à ce que le moteur réagisse.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Relâcher <strong>PROG-TX</strong> puis presser <strong>STOP</strong> → le moteur fait un bref aller-retour. Le sens est désormais changé.</div></li>
          </ol>
        </div>
      )}

      {tab === 'limits' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">3. Régler les fins de course</h2>
          <div className="doc-info-box">Toujours régler la <strong>fin de course haute en premier</strong>. Les limites se règlent en homme mort.</div>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Appuyer sur la touche <strong>PROG-FC</strong> (face arrière) jusqu&apos;à ce que le moteur réagisse.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Presser <strong>HAUT</strong> jusqu&apos;à arriver en butée (maintien continu).</div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>À la hauteur souhaitée, appuyer sur <strong>STOP</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Le moteur fait un aller-retour → <strong>fin de course haute réglée</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">5</span><div>Presser <strong>BAS</strong> jusqu&apos;à arriver en butée (maintien continu).</div></li>
            <li className="doc-step"><span className="doc-step-num">6</span><div>À la hauteur souhaitée, appuyer sur <strong>STOP</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">7</span><div>Le moteur fait un aller-retour → <strong>fin de course basse réglée</strong>. Vérifier en faisant un cycle montée-descente complet.</div></li>
          </ol>
        </div>
      )}

      {tab === 'mod-limits' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">4. Modification des fins de course</h2>
          <p className="doc-step-intro"><strong>Fin de course haute :</strong></p>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Appuyer simultanément sur <strong>PROG-FC + HAUT</strong> jusqu&apos;à ce que le moteur réagisse.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Presser <strong>HAUT</strong> jusqu&apos;à arriver en butée (maintien continu).</div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>À la hauteur souhaitée, appuyer sur <strong>STOP</strong> → le moteur fait un aller-retour. Fin de course haute réglée.</div></li>
          </ol>
          <p className="doc-step-intro" style={{ marginTop: 20 }}><strong>Fin de course basse :</strong> Reproduire la même procédure en appuyant sur <strong>PROG-FC + BAS</strong>.</p>
        </div>
      )}

      {tab === 'intermediate' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">5. Position intermédiaire</h2>
          <div className="doc-cases">
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#10314f' }}>+</div>
              <div className="doc-case-body">
                <strong>Configurer</strong>
                <ol style={{ paddingLeft: 16, marginTop: 6 }}>
                  <li>Placer le volet à la position désirée.</li>
                  <li>Presser simultanément <strong>HAUT + BAS</strong> jusqu&apos;à ce que le moteur fasse un bref aller-retour → position intermédiaire réglée.</li>
                </ol>
              </div>
            </div>
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#10314f' }}>→</div>
              <div className="doc-case-body">
                <strong>Activer</strong>
                <p>Appuyer sur <strong>STOP pendant 3 secondes</strong> → le moteur tourne jusqu&apos;à la position intermédiaire.</p>
              </div>
            </div>
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#6b7280' }}>✕</div>
              <div className="doc-case-body">
                <strong>Effacer</strong>
                <p>Maintenir appuyés <strong>HAUT + BAS</strong> jusqu&apos;à ce que le moteur fasse un bref aller-retour → position intermédiaire effacée.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'second' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">6. Appairer un second émetteur</h2>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Sur un <strong>émetteur déjà appairé</strong>, appuyer sur <strong>PROG-TX</strong> jusqu&apos;à ce que le moteur réagisse.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Vérifier le sens de rotation, puis relâcher <strong>PROG-TX</strong> → le moteur s&apos;arrête.</div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Dans les <strong>5 secondes</strong>, appuyer sur le bouton correspondant du <strong>2e émetteur</strong> :<br />
              — <strong>HAUT</strong> si le volet monte<br />
              — <strong>BAS</strong> si le volet descend<br />
              Le 2e émetteur est maintenant appairé.
            </div></li>
          </ol>
        </div>
      )}

      {tab === 'obstacle' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">7. Détection d&apos;obstacle</h2>
          <div className="doc-info-box">La détection d&apos;obstacle est activée par défaut en sortie d&apos;usine.</div>

          <h3 className="doc-step-sub">Désactiver la détection d&apos;obstacle</h3>
          <ol className="doc-step-list">
            <li className="doc-step"><span className="doc-step-num">1</span><div>Appuyer sur <strong>PROG-FC</strong> pendant <strong>2 secondes</strong> puis relâcher.</div></li>
            <li className="doc-step"><span className="doc-step-num">2</span><div>Sans attendre de réaction, appuyer sur <strong>HAUT</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">3</span><div>Dès que le volet monte, appuyer sur <strong>BAS</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">4</span><div>Dès que le volet descend, appuyer sur <strong>HAUT</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">5</span><div>Dès que le volet monte, appuyer sur <strong>BAS</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">6</span><div>Dès que le volet descend, appuyer sur <strong>HAUT</strong>.</div></li>
            <li className="doc-step"><span className="doc-step-num">7</span><div>Dès que le volet monte, appuyer sur <strong>BAS</strong> et maintenir jusqu&apos;à ce que le moteur fasse <strong>1 aller-retour</strong> de confirmation → détection désactivée.</div></li>
          </ol>

          <h3 className="doc-step-sub" style={{ marginTop: 24 }}>Activer la détection d&apos;obstacle</h3>
          <p>Reproduire la même séquence. En étape 7, le moteur fait <strong>2 allers-retours</strong> pour confirmer l&apos;activation.</p>
        </div>
      )}

      {tab === 'erase' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">8. Effacer un canal ou un émetteur</h2>
          <div className="doc-step-item">
            Sur <strong>l&apos;émetteur à effacer</strong>, presser et maintenir simultanément <strong>PROG-TX + STOP</strong> jusqu&apos;à ce que le moteur fasse un aller-retour.
          </div>
        </div>
      )}

      {tab === 'reset' && (
        <div className="doc-steps">
          <h2 className="doc-subtitle">9. Remise à zéro de la mémoire</h2>
          <p style={{ marginBottom: 16, color: '#6b7280', fontSize: 13 }}>Supprime tous les émetteurs, canaux et senseurs.</p>
          <div className="doc-cases">
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#10314f', fontSize: 11 }}>A</div>
              <div className="doc-case-body">
                <strong>Option 1 — Émetteur programmé</strong>
                <p>Appuyer simultanément sur <strong>PROG-TX + STOP pendant 15 secondes</strong>.<br />Le moteur fait <strong>2 allers-retours à 5 secondes d&apos;intervalle</strong> pour confirmer.</p>
              </div>
            </div>
            <div className="doc-case">
              <div className="doc-case-num" style={{ background: '#6b7280', fontSize: 11 }}>B</div>
              <div className="doc-case-body">
                <strong>Option 2 — Émetteur non programmé</strong>
                <ol style={{ paddingLeft: 16, marginTop: 6 }}>
                  <li>Couper le courant au moteur, puis le reconnecter.</li>
                  <li>Dans les <strong>8 secondes</strong>, sur n&apos;importe quel émetteur Gaposa, appuyer simultanément sur <strong>PROG-TX + STOP pendant 15 secondes</strong>.</li>
                  <li>Le moteur fait <strong>2 allers-retours à 5 secondes d&apos;intervalle</strong> pour confirmer.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAGE PRINCIPALE
   ============================================================ */
type Section = 'tablier' | 'abaques' | 'somfy' | 'gaposa';

const NAV_ITEMS: { id: Section; icon: string; label: string }[] = [
  { id: 'tablier', icon: '📐', label: 'Calcul tablier fini' },
  { id: 'abaques', icon: '⚡', label: 'Abaques moteurs' },
  { id: 'somfy',   icon: '⚙️', label: 'Somfy RS100 IO' },
  { id: 'gaposa',  icon: '🔧', label: 'Gaposa XQ50EX' },
];

export default function DocumentationPage() {
  const [section, setSection] = useState<Section>('tablier');

  return (
    <div className="wrap">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Documentation' }]} />
      <div className="doc-layout">
        <aside className="doc-sidebar">
          <div className="doc-sidebar-title">Documentation technique</div>
          <nav className="doc-sidebar-nav">
            {NAV_ITEMS.map(n => (
              <button key={n.id} type="button"
                className={`doc-nav-item ${section === n.id ? 'active' : ''}`}
                onClick={() => setSection(n.id)}
              >
                <span className="doc-nav-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="doc-content">
          {section === 'tablier' && <TablierSection />}
          {section === 'abaques' && <AbaquesSection />}
          {section === 'somfy'   && <SomfySection />}
          {section === 'gaposa'  && <GaposaSection />}
        </main>
      </div>
    </div>
  );
}
