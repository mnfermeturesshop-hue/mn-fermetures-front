'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';

export function HomeEspaces() {
  const { user, isPro } = useAuthStore();

  return (
    <section className="block">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <span className="eyebrow">Votre espace</span>
            <h2>Clients particuliers &amp; professionnels</h2>
          </div>
        </div>

        <div className="espaces-grid">
          {/* Particuliers */}
          <div className="espace-card">
            <div className="espace-icon">👤</div>
            <div className="espace-body">
              <h3>Espace particulier</h3>
              <p>Suivez vos commandes, téléchargez vos factures et gérez vos adresses de livraison depuis votre espace personnel.</p>
              <ul className="espace-list">
                <li>Historique de commandes</li>
                <li>Factures PDF à tout moment</li>
                <li>Suivi de livraison</li>
              </ul>
            </div>
            <div className="espace-actions">
              {user && !isPro() ? (
                <Link className="btn solid full" href="/compte">Mon espace →</Link>
              ) : user && isPro() ? (
                <Link className="btn ghost full" href="/compte">Mon compte →</Link>
              ) : (
                <>
                  <Link className="btn solid full" href="/pro">Se connecter</Link>
                  <Link className="btn ghost full" href="/inscription">Créer un compte</Link>
                </>
              )}
            </div>
          </div>

          {/* Professionnels */}
          <div className="espace-card espace-card--pro">
            <div className="espace-icon">🏢</div>
            <div className="espace-body">
              <h3>Espace professionnel</h3>
              <p>Accédez à vos tarifs HT négociés, générez vos devis PDF et bénéficiez du paiement par virement à 30 jours.</p>
              <ul className="espace-list">
                <li>Prix HT &amp; remises volume</li>
                <li>Paiement virement 30 jours</li>
                <li>Livraison offerte dès 400 € HT</li>
              </ul>
            </div>
            <div className="espace-actions">
              {user && isPro() ? (
                <Link className="btn solid full" href="/compte">Mon espace pro →</Link>
              ) : (
                <>
                  <Link className="btn solid full" href="/pro">Se connecter</Link>
                  <Link className="btn ghost full" href="/pro?tab=register">Demander un compte pro</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
