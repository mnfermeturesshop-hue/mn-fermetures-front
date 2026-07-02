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

const X2_RE = /deux|2×/i;
const ABAQUE_KEYS = Object.keys(ABAQUES) as AbaqueType[];

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
  }, [type, hNum, lNum]);

  const outOfRange = (!!h || !!l) && !result;

  return (
    <div>
      <h1 className="doc-title">Abaques d&apos;utilisation des moteurs</h1>
      <div className="doc-warning">
        Ces abaques calculés avec un coefficient de sécurité sont donnés à titre indicatif pour des tabliers génériques.
        Ils ne correspondent pas forcément à ceux utilisés pour la fabrication spécifique de nos produits.
      </div>

      <div className="doc-calculator">
        <div className="doc-toggle-row">
          {ABAQUE_KEYS.map(k => (
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
   VISUELS — Télécommandes & Store
   ============================================================ */

function SomfyRemote({ pressed = [] }: { pressed?: string[] }) {
  const on = (k: string) => pressed.includes(k);
  return (
    <div className="rs-remote">
      <div className="rs-io" />
      <div className={`rs-btn ${on('up') ? 'rs-on' : ''}`}>∧</div>
      <div className={`rs-btn rs-my ${on('my') ? 'rs-on' : ''}`}>my</div>
      <div className={`rs-btn ${on('dn') ? 'rs-on' : ''}`}>∨</div>
    </div>
  );
}

function GaposaRemote({ front = [], back = [] }: { front?: string[]; back?: string[] }) {
  const fp = (k: string) => front.includes(k);
  const bp = (k: string) => back.includes(k);
  return (
    <div className="rg-remote">
      <div className="rg-front">
        <div className={`rg-btn ${fp('up') ? 'rg-on' : ''}`}>△</div>
        <div className={`rg-btn rg-sq ${fp('stop') ? 'rg-on' : ''}`}>□</div>
        <div className={`rg-btn ${fp('dn') ? 'rg-on' : ''}`}>▽</div>
      </div>
      <div className="rg-back">
        <div className={`rg-bk ${bp('tx') ? 'rg-on' : ''}`}>TX</div>
        <div className={`rg-bk ${bp('fc') ? 'rg-on' : ''}`}>FC</div>
      </div>
    </div>
  );
}

function StoreVis({ pos }: { pos: 'up' | 'mid' | 'dn' }) {
  return (
    <div className="stv">
      <div className="stv-frame">
        <div className={`stv-slats stv-${pos}`} />
      </div>
      <div className="stv-lbl">
        {pos === 'up' ? '↑ haute' : pos === 'dn' ? '↓ basse' : '— mi-course'}
      </div>
    </div>
  );
}

function MFB({ text }: { text: string }) {
  const x2 = X2_RE.test(text);
  return (
    <div className={`mfb ${x2 ? 'mfb-x2' : ''}`}>
      <div className="mfb-icon">{x2 ? '↕↕' : '↕'}</div>
      <div>{text}</div>
    </div>
  );
}

function SC({
  n, vis, label, sub, fb, or: showOr,
}: {
  n: number | string;
  vis?: React.ReactNode;
  label: string;
  sub?: string;
  fb?: string;
  or?: boolean;
}) {
  return (
    <div className="sc">
      {showOr && <span className="sc-or">OU</span>}
      <div className="sc-n">{n}</div>
      {vis && <div className="sc-vis">{vis}</div>}
      <div className="sc-lbl">{label}</div>
      {sub && <div className="sc-sub">{sub}</div>}
      {fb && <MFB text={fb} />}
    </div>
  );
}

const RWARN = (
  <div className="doc-warning" style={{ marginTop: 16 }}>
    <strong>NE CHERCHEZ PAS À CHANGER LE SENS DE ROTATION.</strong>{' '}
    Le moteur détermine automatiquement en 2 cycles maximum son sens de rotation après le réglage des fins de course.
  </div>
);

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
        <div>
          <h2 className="doc-subtitle">Vérifier si le moteur est réglé</h2>
          <p className="doc-step-intro">Mettre <strong>UN SEUL</strong> moteur sous tension, puis observer :</p>
          <div className="sgrid">
            <SC n="⚡" vis={<SomfyRemote />}
              label="Mise sous tension"
              sub="UN SEUL moteur à la fois"
            />
          </div>
          <div className="check-cases">
            <div className="check-case">
              <div className="check-arrow">→</div>
              <div>
                <strong>1 — Aucun mouvement</strong>
                <ul>
                  <li><strong>A —</strong> Le moteur est déjà programmé sur le point de commande fourni → faire un test DESCENTE / MONTÉE</li>
                  <li><strong>B —</strong> Le moteur n&apos;est pas encore réglé → voir &quot;Mise en service&quot;</li>
                </ul>
              </div>
            </div>
            <div className="check-case">
              <div className="check-arrow">→</div>
              <div>
                <strong>2 — Va-et-vient du moteur</strong>
                <p>Le moteur est réglé mais aucun point de commande n&apos;est enregistré → voir &quot;Mise en service&quot;</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'auto' && (
        <div>
          <h2 className="doc-subtitle">Mise en service — Réglage automatique</h2>
          <div className="doc-info-box">
            Moteur qui se règle totalement de lui-même. Seul le point de commande doit être programmé.<br />
            Mettre <strong>UN SEUL</strong> moteur sous tension.
          </div>
          <p className="guide-section-lbl">Programmer le point de commande</p>
          <div className="sgrid">
            <SC n={1} vis={<SomfyRemote />}
              label="Prendre en main le moteur"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<SomfyRemote pressed={['my']} />}
              label="Programmer le point de commande"
              sub="Appuyer sur PROG"
              fb="Le moteur réagit"
            />
            <SC n={3} vis={<><SomfyRemote pressed={['up']} /><SomfyRemote pressed={['dn']} /></>}
              label="Vérifier le bon fonctionnement"
              sub="Réaliser un cycle complet"
            />
          </div>
          {RWARN}
        </div>
      )}

      {tab === 'manual' && (
        <div>
          <h2 className="doc-subtitle">Mise en service — Réglage manuel des fins de course</h2>
          <p className="doc-step-intro">Mettre <strong>UN SEUL</strong> moteur sous tension.</p>
          <div className="sgrid">
            <SC n={1} vis={<SomfyRemote />}
              label="Prendre en main le moteur"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<StoreVis pos="mid" />}
              label="Positionner le volet à mi-course"
              or
            />
            <SC n={3} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={4} vis={<><SomfyRemote pressed={['up']} /><StoreVis pos="up" /></>}
              label="Placer à la fin de course haute"
            />
            <SC n={5} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={6} vis={<><SomfyRemote pressed={['dn']} /><StoreVis pos="dn" /></>}
              label="Placer à la fin de course basse"
            />
            <SC n={7} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur fait deux va-et-vient"
            />
          </div>
          <div className="suite-note">Suite →</div>
          <div className="sgrid">
            <SC n={8} vis={<SomfyRemote pressed={['my']} />}
              label="Programmer le point de commande"
              sub="Appuyer sur PROG"
              fb="Le moteur réagit"
            />
            <SC n={9} vis={<><SomfyRemote pressed={['up']} /><SomfyRemote pressed={['dn']} /></>}
              label="Vérifier le bon fonctionnement"
              sub="Réaliser un cycle complet"
            />
          </div>
          {RWARN}
        </div>
      )}

      {tab === 'mod-auto' && (
        <div>
          <h2 className="doc-subtitle">Modification automatique des fins de course</h2>
          <div className="sgrid">
            <SC n={1} vis={<StoreVis pos="mid" />}
              label="Positionner le volet à mi-course"
              or
            />
            <SC n={2} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={3} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={4} vis={<><SomfyRemote pressed={['up']} /><SomfyRemote pressed={['dn']} /></>}
              label="Vérifier le bon fonctionnement"
              sub="Réaliser un cycle complet"
            />
          </div>
          {RWARN}
        </div>
      )}

      {tab === 'mod-manual' && (
        <div>
          <h2 className="doc-subtitle">Modification manuelle des fins de course</h2>
          <div className="sgrid">
            <SC n={1} vis={<StoreVis pos="mid" />}
              label="Positionner le volet à mi-course"
              or
            />
            <SC n={2} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={3} vis={<><SomfyRemote pressed={['up']} /><StoreVis pos="up" /></>}
              label="Placer à la fin de course haute"
            />
            <SC n={4} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur réagit"
            />
            <SC n={5} vis={<><SomfyRemote pressed={['dn']} /><StoreVis pos="dn" /></>}
              label="Placer à la fin de course basse"
            />
            <SC n={6} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur fait deux va-et-vient"
            />
            <SC n={7} vis={<><SomfyRemote pressed={['up']} /><SomfyRemote pressed={['dn']} /></>}
              label="Vérifier le bon fonctionnement"
              sub="Réaliser un cycle complet"
            />
          </div>
          {RWARN}
        </div>
      )}

      {tab === 'factory' && (
        <div>
          <h2 className="doc-subtitle">Mettre le moteur RS100 IO en mode usine</h2>
          <div className="sgrid">
            <SC n={1} vis={<StoreVis pos="mid" />}
              label="Positionner le volet à mi-course"
              or
            />
            <SC n={2} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé jusqu'au va-et-vient"
              fb="Le moteur fait un va-et-vient"
            />
            <SC n={3} vis={<SomfyRemote pressed={['up', 'my', 'dn']} />}
              label="Rester appuyé sur les 3 touches jusqu'au va-et-vient"
              fb="Le moteur fait un va-et-vient"
            />
            <SC n={4} vis={<SomfyRemote pressed={['my']} />}
              label="Rester appuyé sur PROG jusqu'au 2ème va-et-vient"
              fb="Le moteur fait deux va-et-vient"
            />
          </div>
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
  { id: 'pair',         label: '2. Appairer émetteur' },
  { id: 'rotation',     label: '3. Sens de rotation' },
  { id: 'limits',       label: '4. Fins de course' },
  { id: 'mod-limits',   label: '5. Modifier fins de course' },
  { id: 'intermediate', label: '6. Position intermédiaire' },
  { id: 'second',       label: '7. Second émetteur' },
  { id: 'obstacle',     label: '8-9. Détection obstacle' },
  { id: 'erase',        label: '10. Effacer canal' },
  { id: 'reset',        label: '11. Remise à zéro' },
];

function GaposaSection() {
  const [tab, setTab] = useState<GaposaTab>('pair');

  return (
    <div>
      <h1 className="doc-title">Guide de programmation — Moteur Gaposa XQ50EX Latente</h1>

      {/* Légende */}
      <div className="gaposa-legend">
        <GaposaRemote />
        <table className="gaposa-legend-table">
          <tbody>
            <tr><td><span className="gl-key">△ 1</span></td><td>HAUT — montée</td></tr>
            <tr><td><span className="gl-key">□ 2</span></td><td>STOP — arrêt</td></tr>
            <tr><td><span className="gl-key">▽ 3</span></td><td>BAS — descente</td></tr>
            <tr><td><span className="gl-key">TX 4</span></td><td>PROG-TX — appairage télécommande (face arrière)</td></tr>
            <tr><td><span className="gl-key">FC 5</span></td><td>PROG-FC — réglage des fins de course (face arrière)</td></tr>
          </tbody>
        </table>
        <div className="gl-tension">
          <div className="gl-tension-icon">⚡</div>
          <div><strong>1.</strong> Mettre le moteur sous tension</div>
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
        <div>
          <h2 className="doc-subtitle">2. Appairer l&apos;émetteur</h2>
          <div className="sgrid">
            <SC n={1} vis={<GaposaRemote back={['tx']} />}
              label="Appuyer sur PROG-TX (face arrière)"
              sub="Jusqu'à ce que le moteur réagisse"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<GaposaRemote />}
              label="Vérifier le sens de rotation, relâcher PROG-TX"
              fb="Le moteur s'arrête"
            />
            <SC n={3} vis={<GaposaRemote front={['up']} />}
              label="Dans les 5 sec, appuyer sur le bouton correspondant"
              sub="HAUT si monte · BAS si descend"
              fb="Télécommande appairée ✓"
            />
          </div>
        </div>
      )}

      {tab === 'rotation' && (
        <div>
          <h2 className="doc-subtitle">3. Changement du sens de rotation</h2>
          <div className="doc-warning">
            ⚠ Nécessaire uniquement si le moteur ne tourne pas dans le bon sens.<br />
            Doit être fait <strong>AVANT</strong> de régler les fins de course, sinon il faut tout refaire.
          </div>
          <div className="sgrid">
            <SC n={1} vis={<GaposaRemote back={['tx']} />}
              label="Maintenir appuyé PROG-TX"
              sub="Jusqu'à ce que le moteur réagisse"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<GaposaRemote front={['stop']} />}
              label="Relâcher PROG-TX puis presser STOP"
              fb="Le moteur fait un bref aller-retour — sens changé ✓"
            />
          </div>
        </div>
      )}

      {tab === 'limits' && (
        <div>
          <h2 className="doc-subtitle">4. Régler les fins de course</h2>
          <div className="doc-info-box">
            Toujours régler la <strong>fin de course haute en premier</strong>.<br />
            Les limites se règlent en <strong>homme mort</strong> (maintien continu du bouton).
          </div>
          <div className="sgrid">
            <SC n={1} vis={<GaposaRemote back={['fc']} />}
              label="Appuyer sur PROG-FC (face arrière, 2 sec)"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<><GaposaRemote front={['up']} /><StoreVis pos="up" /></>}
              label="Presser HAUT jusqu'en butée"
              sub="Maintien continu (homme mort)"
            />
            <SC n={3} vis={<GaposaRemote front={['stop']} />}
              label="À la hauteur voulue, appuyer STOP"
              fb="Le moteur fait un aller-retour — fin haute réglée ✓"
            />
            <SC n={4} vis={<><GaposaRemote front={['dn']} /><StoreVis pos="dn" /></>}
              label="Presser BAS jusqu'en butée"
              sub="Maintien continu (homme mort)"
            />
            <SC n={5} vis={<GaposaRemote front={['stop']} />}
              label="À la hauteur voulue, appuyer STOP"
              fb="Le moteur fait un aller-retour — fin basse réglée ✓"
            />
            <SC n={6} vis={<><GaposaRemote front={['up']} /><GaposaRemote front={['dn']} /></>}
              label="Vérifier en faisant un cycle montée-descente complet"
            />
          </div>
        </div>
      )}

      {tab === 'mod-limits' && (
        <div>
          <h2 className="doc-subtitle">5. Modification des fins de course</h2>
          <p className="guide-section-lbl">Fin de course haute</p>
          <div className="sgrid">
            <SC n={1} vis={<GaposaRemote front={['up']} back={['fc']} />}
              label="Appuyer simultanément PROG-FC + HAUT"
              sub="Jusqu'à ce que le moteur réagisse"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<><GaposaRemote front={['up']} /><StoreVis pos="up" /></>}
              label="Presser HAUT jusqu'en butée"
              sub="Maintien continu (homme mort)"
            />
            <SC n={3} vis={<GaposaRemote front={['stop']} />}
              label="À la hauteur voulue, appuyer STOP"
              fb="Le moteur fait un aller-retour — fin haute réglée ✓"
            />
          </div>
          <p className="doc-step-intro" style={{ marginTop: 20 }}>
            Pour la <strong>fin de course basse</strong> : même procédure avec <strong>PROG-FC + BAS</strong>.
          </p>
        </div>
      )}

      {tab === 'intermediate' && (
        <div>
          <h2 className="doc-subtitle">6. Position intermédiaire</h2>
          <div className="inter-grid">
            <div>
              <p className="guide-section-lbl">1. Configurer</p>
              <div className="sgrid">
                <SC n={1} vis={<StoreVis pos="mid" />}
                  label="Placer le volet à la position désirée"
                />
                <SC n={2} vis={<GaposaRemote front={['up', 'dn']} />}
                  label="Presser HAUT + BAS simultanément"
                  fb="Le moteur fait un bref aller-retour — position réglée ✓"
                />
              </div>
            </div>
            <div>
              <p className="guide-section-lbl">2. Activer</p>
              <div className="sgrid">
                <SC n="3s" vis={<GaposaRemote front={['stop']} />}
                  label="Appuyer sur STOP pendant 3 secondes"
                  sub="Le moteur va en position intermédiaire"
                />
              </div>
            </div>
            <div>
              <p className="guide-section-lbl">3. Effacer</p>
              <div className="sgrid">
                <SC n="✕" vis={<GaposaRemote front={['up', 'dn']} />}
                  label="Maintenir HAUT + BAS simultanément"
                  fb="Le moteur fait un bref aller-retour — position effacée"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'second' && (
        <div>
          <h2 className="doc-subtitle">7. Appairer un second émetteur</h2>
          <div className="sgrid">
            <SC n={1} vis={<GaposaRemote back={['tx']} />}
              label="Sur un émetteur déjà appairé, appuyer sur PROG-TX"
              sub="Jusqu'à ce que le moteur réagisse"
              fb="Le moteur réagit"
            />
            <SC n={2} vis={<GaposaRemote />}
              label="Vérifier le sens de rotation, relâcher PROG-TX"
              fb="Le moteur s'arrête"
            />
            <SC n={3} vis={<GaposaRemote front={['up']} />}
              label="Dans les 5 sec, sur le 2ᵉ émetteur"
              sub="HAUT si monte · BAS si descend"
              fb="2ᵉ émetteur appairé ✓"
            />
          </div>
        </div>
      )}

      {tab === 'obstacle' && (
        <div>
          <h2 className="doc-subtitle">8-9. Détection d&apos;obstacle</h2>
          <div className="doc-info-box">
            La détection d&apos;obstacle est <strong>activée par défaut</strong> en sortie d&apos;usine.
          </div>
          <div className="obstacle-cols">
            <div>
              <p className="guide-section-lbl">8. Désactiver</p>
              <div className="sgrid sgrid-v">
                <SC n={1} vis={<GaposaRemote back={['fc']} />}
                  label="Appuyer sur PROG-FC pendant 2 sec, puis relâcher"
                />
                <SC n={2} vis={<GaposaRemote front={['up']} />}
                  label="Sans attendre, appuyer sur HAUT"
                />
                <SC n={3} vis={<GaposaRemote front={['dn']} />}
                  label="Dès que le volet monte, appuyer sur BAS"
                />
                <SC n={4} vis={<GaposaRemote front={['up']} />}
                  label="Dès que le volet descend, appuyer sur HAUT"
                />
                <SC n={5} vis={<GaposaRemote front={['dn']} />}
                  label="Dès que le volet monte, appuyer sur BAS"
                />
                <SC n={6} vis={<GaposaRemote front={['up']} />}
                  label="Dès que le volet descend, appuyer sur HAUT"
                />
                <SC n={7} vis={<GaposaRemote front={['dn']} />}
                  label="Dès que le volet monte, maintenir BAS"
                  fb="Le moteur fait 1 aller-retour — désactivée ✓"
                />
              </div>
            </div>
            <div>
              <p className="guide-section-lbl">9. Activer</p>
              <div className="doc-info-box">
                Reproduire exactement la même séquence (étapes 1-7).<br /><br />
                En étape 7, le moteur fait <strong>2 allers-retours</strong> pour confirmer l&apos;activation.
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'erase' && (
        <div>
          <h2 className="doc-subtitle">10. Effacer un canal ou un émetteur</h2>
          <div className="sgrid">
            <SC n="✕" vis={<GaposaRemote front={['stop']} back={['tx']} />}
              label="Sur l'émetteur à effacer, presser et maintenir PROG-TX + STOP"
              fb="Le moteur fait un aller-retour ✓"
            />
          </div>
        </div>
      )}

      {tab === 'reset' && (
        <div>
          <h2 className="doc-subtitle">11. Remise à zéro de la mémoire</h2>
          <p className="doc-step-intro">Supprime tous les émetteurs, canaux et senseurs.</p>
          <div className="reset-cols">
            <div className="reset-opt">
              <div className="reset-opt-lbl">Option 1 — Émetteur programmé</div>
              <div className="sgrid">
                <SC n="15s" vis={<GaposaRemote front={['stop']} back={['tx']} />}
                  label="Appuyer simultanément PROG-TX + STOP pendant 15 secondes"
                  fb="Le moteur fait 2 allers-retours à 5 sec d'intervalle ✓"
                />
              </div>
            </div>
            <div className="reset-opt">
              <div className="reset-opt-lbl">Option 2 — Émetteur non programmé</div>
              <div className="sgrid">
                <SC n={1} vis={<div className="power-cycle">⚡↓↑</div>}
                  label="Couper le courant au moteur, puis le reconnecter"
                />
                <SC n={2} vis={<GaposaRemote front={['stop']} back={['tx']} />}
                  label="Dans les 8 sec, sur n'importe quel émetteur Gaposa"
                  sub="PROG-TX + STOP pendant 15 secondes"
                  fb="Le moteur fait 2 allers-retours à 5 sec d'intervalle ✓"
                />
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
