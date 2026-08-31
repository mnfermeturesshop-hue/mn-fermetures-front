'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useConsentStore } from '@/lib/consent';

const NAVY = '#10314f';

/**
 * Bandeau de consentement cookies (RGPD/CNIL). S'affiche au 1er accès (ou si la
 * version de consentement a changé), et à la demande via « Gérer les cookies ».
 * Boutons Refuser / Personnaliser / Accepter d'égale importance (pas de dark pattern).
 */
export function CookieBanner() {
  const { consent, prefsOpen, needsBanner, acceptAll, refuseAll, save, openPrefs, closePrefs } = useConsentStore();
  const [mounted, setMounted] = useState(false);
  const [audience, setAudience] = useState(false);

  // Évite le flash SSR/hydratation (le store persisté n'est lu que côté client).
  useEffect(() => { setMounted(true); }, []);
  // Pré-remplit le toggle avec le choix courant à l'ouverture des préférences.
  useEffect(() => { if (prefsOpen) setAudience(!!consent?.audience); }, [prefsOpen, consent]);

  if (!mounted) return null;
  const show = needsBanner() || prefsOpen;
  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      aria-live="polite"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1100,
        background: '#fff', borderTop: `3px solid ${NAVY}`,
        boxShadow: '0 -8px 30px rgba(0,0,0,.16)',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '18px 20px' }}>
        <div style={{ fontWeight: 700, color: NAVY, fontSize: 16, marginBottom: 6 }}>🍪 Vos cookies</div>
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#374151', lineHeight: 1.6 }}>
          Nous utilisons des cookies <strong>nécessaires</strong> au fonctionnement du site (connexion,
          panier, sécurité, paiement) — ils ne requièrent pas votre accord. Avec votre consentement, nous
          pourrons aussi <strong>mesurer l'audience</strong> pour améliorer nos services. Vous pouvez
          accepter, refuser, ou choisir. Détails dans notre{' '}
          <Link href="/cookies" style={{ color: NAVY, textDecoration: 'underline' }}>politique cookies</Link>.
        </p>

        {prefsOpen && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 14 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', opacity: 0.7 }}>
              <input type="checkbox" checked readOnly disabled style={{ marginTop: 3 }} />
              <span style={{ fontSize: 13.5 }}>
                <strong>Cookies essentiels</strong> — toujours actifs. Nécessaires au fonctionnement
                (session, panier, sécurité anti-robot, paiement).
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', cursor: 'pointer' }}>
              <input type="checkbox" checked={audience} onChange={(e) => setAudience(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 13.5 }}>
                <strong>Mesure d'audience</strong> — statistiques de visite anonymisées pour améliorer le site.
                <span style={{ color: '#9ca3af' }}> (aucun traceur de ce type n'est actif pour l'instant)</span>
              </span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {prefsOpen ? (
            <>
              <button type="button" onClick={closePrefs} style={btn('ghost')}>Retour</button>
              <button type="button" onClick={() => save(audience)} style={btn('solid')}>Enregistrer mes choix</button>
            </>
          ) : (
            <>
              <button type="button" onClick={refuseAll} style={btn('ghost')}>Tout refuser</button>
              <button type="button" onClick={openPrefs} style={btn('ghost')}>Personnaliser</button>
              <button type="button" onClick={acceptAll} style={btn('solid')}>Tout accepter</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function btn(kind: 'solid' | 'ghost'): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
    border: `1px solid ${kind === 'solid' ? NAVY : '#cbd5e1'}`,
    background: kind === 'solid' ? NAVY : '#fff',
    color: kind === 'solid' ? '#fff' : NAVY,
  };
}
