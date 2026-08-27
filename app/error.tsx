'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Écran d'erreur applicatif (App Router). Remplace le message technique par défaut de
 * Next.js (« Application error: a client-side exception… ») par un message clair, avec
 * une option de reconnexion. Rendu à l'intérieur du layout (header/footer conservés).
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Trace console pour le diagnostic (le digest identifie l'erreur si logguée serveur).
    console.error('[app error]', error);
  }, [error]);

  return (
    <div
      className="wrap"
      style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
    >
      <div style={{ maxWidth: 460, padding: '32px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>⚠️</div>
        <h1 style={{ fontSize: 22, color: 'var(--navy-700)', margin: '0 0 10px' }}>
          Oups, une erreur est survenue
        </h1>
        <p style={{ color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.6 }}>
          Nous n'avons pas pu afficher cette page. Vous pouvez réessayer, ou vous reconnecter à votre espace.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn solid" type="button" onClick={() => reset()}>Réessayer</button>
          <Link className="btn ghost" href="/pro">Se reconnecter</Link>
          <Link className="btn ghost" href="/">Accueil</Link>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 20 }}>
          Si le problème persiste, contactez-nous au 04 67 78 06 63.
        </p>
      </div>
    </div>
  );
}
