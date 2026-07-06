'use client';

import { useState, useMemo, useCallback } from 'react';
import { LAMES, resoudrePrix } from '@/lib/tablier/engine';
import type { LameTablier } from '@/lib/tablier/types';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';
import { PUBLIC_PRICES } from '@/lib/config';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function LameCard({
  lame,
  selected,
  onSelect,
}: {
  lame: LameTablier;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`cfg-lame-card${selected ? ' active' : ''}`}
      onClick={onSelect}
    >
      <div className="cfg-lame-nom">{lame.nom}</div>
      <div className="cfg-lame-meta">
        <span className={`cfg-badge ${lame.matiere}`}>{lame.matiere.toUpperCase()}</span>
        {lame.agrafage === 'agrafe' && <span className="cfg-badge agrafe">Agrafée</span>}
        <span className="cfg-lame-detail">{lame.fourniture}</span>
      </div>
    </button>
  );
}

function ColorisSwatches({
  coloris,
  value,
  onChange,
}: {
  coloris: LameTablier['coloris'];
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="cfg-coloris-row">
      {coloris.map((c) => (
        <button
          key={c.code}
          type="button"
          title={c.label}
          className={`cfg-swatch${value === c.code ? ' active' : ''}`}
          style={{ background: c.hex }}
          onClick={() => onChange(c.code)}
          aria-label={c.label}
        />
      ))}
      <span className="cfg-coloris-label">
        {coloris.find((c) => c.code === value)?.label ?? ''}
      </span>
    </div>
  );
}

export function TablierGenerateur() {
  const addLine = useCartStore((s) => s.addLine);
  const openCart = useCartStore((s) => s.openCart);
  const { user } = useAuthStore();
  // Prix réservés aux connectés (PUBLIC_PRICES=false)
  const priceGated = !PUBLIC_PRICES && !user;

  const [matiere, setMatiere] = useState<'pvc' | 'alu'>('alu');
  const [selectedSlug, setSelectedSlug] = useState<string>('alu-cd942');
  const [colorisCode, setColorisCode] = useState<string>('');
  const [largeurStr, setLargeurStr] = useState('1200');
  const [hauteurStr, setHauteurStr] = useState('1500');
  const [avecAttache, setAvecAttache] = useState(false);
  const [avecVerrou, setAvecVerrou] = useState(false);
  const [qty, setQty] = useState(1);

  const lamesFiltered = useMemo(
    () => LAMES.filter((l) => l.matiere === matiere),
    [matiere]
  );

  const lame = useMemo(
    () => LAMES.find((l) => l.slug === selectedSlug) ?? LAMES[0],
    [selectedSlug]
  );

  const activeColoris = useMemo(() => {
    if (colorisCode && lame.coloris.some((c) => c.code === colorisCode)) return colorisCode;
    return lame.coloris[0]?.code ?? '';
  }, [colorisCode, lame]);

  const largeur = parseInt(largeurStr, 10) || 0;
  const hauteur = parseInt(hauteurStr, 10) || 0;

  const result = useMemo(() => {
    if (!largeur || !hauteur) return null;
    return resoudrePrix({
      slug: selectedSlug,
      colorisCode: activeColoris,
      largeur,
      hauteur,
      avecAttacheRigide: avecAttache,
      avecVerrou,
    });
  }, [selectedSlug, activeColoris, largeur, hauteur, avecAttache, avecVerrou]);

  const handleSelectLame = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      const newLame = LAMES.find((l) => l.slug === slug);
      if (newLame) {
        setColorisCode(newLame.coloris[0]?.code ?? '');
        if (newLame.attacheParDefaut === 'verrou') {
          setAvecVerrou(true);
          setAvecAttache(false);
        } else {
          setAvecVerrou(false);
          setAvecAttache(false);
        }
      }
    },
    []
  );

  const handleMatiere = useCallback(
    (m: 'pvc' | 'alu') => {
      setMatiere(m);
      const first = LAMES.find((l) => l.matiere === m);
      if (first) handleSelectLame(first.slug);
    },
    [handleSelectLame]
  );

  const handleAddToCart = () => {
    if (!result) return;
    const colorisLabel = lame.coloris.find((c) => c.code === activeColoris)?.label ?? '';
    const key = `tablier-${selectedSlug}-${activeColoris}-${result.largeurSnap}-${result.hauteurSnap}-${avecAttache ? 'att' : ''}-${avecVerrou ? 'ver' : ''}`;
    const optionsParts: string[] = [];
    if (avecAttache) optionsParts.push('+ attaches rigides');
    if (avecVerrou) optionsParts.push('+ verrous auto');
    const detail = [
      colorisLabel,
      `L ${result.largeurSnap} × H ${result.hauteurSnap} mm`,
      ...optionsParts,
    ].join(' — ');

    addLine({
      key,
      name: lame.nom,
      detail,
      unitPriceHT: result.total,
      quantity: qty,
      uom: 'unite',
      // Descripteur pour le recalcul serveur (audit S2) — dimensions brutes
      // (le serveur ré-applique le snap via resoudrePrix).
      pricing: {
        kind: 'tablier',
        slug: selectedSlug,
        colorisCode: activeColoris,
        largeur,
        hauteur,
        avecAttache,
        avecVerrou,
      },
    });
    openCart();
    toast.success('Tablier ajouté au panier');
  };

  const dimWarning = result === null && largeur > 0 && hauteur > 0;

  return (
    <div className="cfg-wrap">
      {/* ── Colonne gauche ── */}
      <div className="cfg-left">

        {/* 1. Matière */}
        <section className="cfg-section">
          <h3 className="cfg-title">1. Matière</h3>
          <div className="cfg-tabs">
            {(['pvc', 'alu'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={`cfg-tab${matiere === m ? ' active' : ''}`}
                onClick={() => handleMatiere(m)}
              >
                {m === 'pvc' ? 'PVC' : 'Aluminium'}
              </button>
            ))}
          </div>
        </section>

        {/* 2. Lame */}
        <section className="cfg-section">
          <h3 className="cfg-title">2. Type de lame</h3>
          <div className="cfg-lames">
            {lamesFiltered.map((l) => (
              <LameCard
                key={l.slug}
                lame={l}
                selected={l.slug === selectedSlug}
                onSelect={() => handleSelectLame(l.slug)}
              />
            ))}
          </div>
        </section>

        {/* 3. Coloris */}
        <section className="cfg-section">
          <h3 className="cfg-title">3. Coloris</h3>
          <ColorisSwatches
            coloris={lame.coloris}
            value={activeColoris}
            onChange={setColorisCode}
          />
        </section>

        {/* 4. Dimensions */}
        <section className="cfg-section">
          <h3 className="cfg-title">4. Dimensions (en mm)</h3>
          <div className="cfg-dims">
            <div className="cfg-field">
              <label>Largeur</label>
              <input
                type="number"
                value={largeurStr}
                min={800}
                max={lame.largeurs[lame.largeurs.length - 1]}
                step={1}
                onChange={(e) => setLargeurStr(e.target.value)}
              />
              <span className="cfg-unit">mm</span>
            </div>
            <div className="cfg-field">
              <label>Hauteur</label>
              <input
                type="number"
                value={hauteurStr}
                min={850}
                max={lame.hauteurs[lame.hauteurs.length - 1]}
                step={1}
                onChange={(e) => setHauteurStr(e.target.value)}
              />
              <span className="cfg-unit">mm</span>
            </div>
          </div>
          {result && (
            <p className="cfg-snap-note">
              Fabriqué en <strong>{result.largeurSnap} × {result.hauteurSnap} mm</strong>
              {(result.largeurSnap !== largeur || result.hauteurSnap !== hauteur) && (
                <> (arrondi au pas supérieur du barème)</>
              )}
            </p>
          )}
          {dimWarning && (
            <p className="cfg-error">
              Dimensions hors abaque — vérifiez largeur ({lame.largeurs[0]}–{lame.largeurs[lame.largeurs.length - 1]} mm) et hauteur ({lame.hauteurs[0]}–{lame.hauteurs[lame.hauteurs.length - 1]} mm).
            </p>
          )}
        </section>

        {/* 5. Options */}
        <section className="cfg-section">
          <h3 className="cfg-title">5. Options</h3>
          <div className="cfg-options">
            {lame.pvAttache && (
              <label className="cfg-check">
                <input
                  type="checkbox"
                  checked={avecAttache}
                  onChange={(e) => setAvecAttache(e.target.checked)}
                />
                <span>
                  Attaches rigides
                  {result && avecAttache && !priceGated && (
                    <em> +{euro(result.supAttache)}</em>
                  )}
                </span>
              </label>
            )}
            {lame.pvVerrou && (
              <label className="cfg-check">
                <input
                  type="checkbox"
                  checked={avecVerrou}
                  onChange={(e) => setAvecVerrou(e.target.checked)}
                />
                <span>
                  Verrous automatiques avec bagues
                  {lame.attacheParDefaut === 'verrou' && (
                    <strong className="cfg-default-badge"> (inclus)</strong>
                  )}
                  {result && avecVerrou && lame.attacheParDefaut !== 'verrou' && !priceGated && (
                    <em> +{euro(result.supVerrou)}</em>
                  )}
                </span>
              </label>
            )}
            {!lame.pvAttache && lame.attacheParDefaut === 'verrou' && (
              <p className="cfg-fourniture-note">
                Ce tablier est fourni <strong>sans attaches rigides</strong> — verrous automatiques uniquement.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ── Colonne droite (sticky) ── */}
      <div className="cfg-right">
        <div className="cfg-summary">
          <div className="cfg-summary-head">
            <span>Récapitulatif</span>
          </div>

          <div className="cfg-summary-lame">
            <strong>{lame.nom}</strong>
            <span>{lame.coloris.find((c) => c.code === activeColoris)?.label}</span>
          </div>

          {result && priceGated ? (
            <>
              <div className="cfg-summary-dims">
                {result.largeurSnap} × {result.hauteurSnap} mm
              </div>
              <div className="cfg-gate">
                <p className="cfg-gate-text">
                  <strong>Prix réservé aux professionnels.</strong><br />
                  Connectez-vous pour obtenir votre tarif instantané et commander.
                </p>
                <a className="btn solid full cfg-cta" href="/pro">Se connecter à l&apos;espace pro</a>
              </div>
            </>
          ) : result ? (
            <>
              <div className="cfg-summary-dims">
                {result.largeurSnap} × {result.hauteurSnap} mm
              </div>

              <div className="cfg-price-breakdown">
                <div className="cfg-price-row">
                  <span>Tablier</span>
                  <span>{euro(result.prixBase)}</span>
                </div>
                {avecAttache && result.supAttache > 0 && (
                  <div className="cfg-price-row">
                    <span>Attaches rigides</span>
                    <span>+{euro(result.supAttache)}</span>
                  </div>
                )}
                {avecVerrou && result.supVerrou > 0 && (
                  <div className="cfg-price-row">
                    <span>Verrous auto</span>
                    <span>+{euro(result.supVerrou)}</span>
                  </div>
                )}
              </div>

              <div className="cfg-total">
                <span>Total HT</span>
                <strong>{euro(result.total * qty)}</strong>
              </div>
              <div className="cfg-total-ttc">
                {euro(result.total * qty * 1.2)} TTC
              </div>

              <div className="cfg-qty-row">
                <label htmlFor="cfg-qty">Quantité</label>
                <div className="cfg-qty-ctrl">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <input
                    id="cfg-qty"
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <button type="button" onClick={() => setQty(qty + 1)}>+</button>
                </div>
              </div>

              <button
                type="button"
                className="btn solid full cfg-cta"
                onClick={handleAddToCart}
              >
                Ajouter au panier
              </button>
            </>
          ) : (
            <div className="cfg-summary-empty">
              {largeur > 0 && hauteur > 0
                ? 'Dimensions hors abaque'
                : 'Saisissez les dimensions pour obtenir un prix'}
            </div>
          )}

          <p className="cfg-ht-note">Prix en euros HT — TVA 20 % applicable</p>
        </div>
      </div>
    </div>
  );
}
