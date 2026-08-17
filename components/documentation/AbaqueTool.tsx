'use client';

import { useMemo, useState } from 'react';
import { ABAQUES, ABAQUE_KEYS, nmColor, requiredNm, type AbaqueType } from '@/lib/documentation/abaques';

/** Calculateur d'abaques moteurs (partagé Documentation + fiches moteurs).
 *  `motorNm` fourni = fiche moteur : on affiche en plus un verdict de compatibilité
 *  (le moteur de puissance `motorNm` couvre-t-il la dimension saisie ?). */
export function AbaqueTool({ motorNm }: { motorNm?: number }) {
  const [type, setType] = useState<AbaqueType>('thin');
  const [h, setH] = useState('');
  const [l, setL] = useState('');
  const [showTable, setShowTable] = useState(false);

  const ab = ABAQUES[type];
  const hNum = parseInt(h);
  const lNum = parseInt(l);

  const result = useMemo(() => requiredNm(type, hNum, lNum), [type, hNum, lNum]);
  const outOfRange = (!!h || !!l) && !result;
  const fits = motorNm != null && result != null ? motorNm >= result.nm : null;

  return (
    <div>
      <div className="doc-warning">
        Ces abaques calculés avec un coefficient de sécurité sont donnés à titre indicatif pour des tabliers génériques.
        Ils ne correspondent pas forcément à ceux utilisés pour la fabrication spécifique de nos produits.
      </div>

      <div className="doc-calculator">
        <div className="doc-toggle-row">
          {ABAQUE_KEYS.map((k) => (
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
              value={h} onChange={(e) => setH(e.target.value)}
            />
          </div>
          <div className="doc-field">
            <label>Largeur finie L (mm)</label>
            <input type="number" min={200} max={9000}
              placeholder={`${ab.widths[0]} – ${ab.widths[ab.widths.length - 1]}`}
              value={l} onChange={(e) => setL(e.target.value)}
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

        {/* Verdict de compatibilité — uniquement sur une fiche moteur */}
        {fits !== null && result && (
          <div className={`abaque-verdict ${fits ? 'abaque-verdict--ok' : 'abaque-verdict--ko'}`}>
            {fits
              ? <>✅ Ce moteur <b>{motorNm} Nm</b> convient pour cette dimension (requis&nbsp;: {result.nm}&nbsp;Nm).</>
              : <>⚠️ Ce moteur <b>{motorNm} Nm</b> est insuffisant : <b>{result.nm}&nbsp;Nm</b> requis pour cette dimension.</>}
          </div>
        )}
      </div>

      <div className="doc-nm-legend">
        {[6, 10, 15, 20, 30, 35, 50, 60, 85, 100, 120].map((nm) => (
          <span key={nm} className="doc-nm-chip" style={{ background: nmColor(nm) }}>{nm} Nm</span>
        ))}
      </div>

      <button type="button" className="doc-toggle-table-btn" onClick={() => setShowTable((v) => !v)}>
        {showTable ? '▲ Masquer le tableau complet' : '▼ Afficher le tableau complet'}
      </button>

      {showTable && (
        <div className="doc-table-wrap">
          <table className="doc-abaque-table">
            <thead>
              <tr>
                <th className="doc-abaque-corner">H \ L</th>
                {ab.widths.map((w) => <th key={w}>{w}</th>)}
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
