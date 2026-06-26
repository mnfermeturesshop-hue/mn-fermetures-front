'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/components/ui/Toast';

const MOCK_ORDERS = [
  {
    id: 'CMD-2026-0184',
    date: '18/06/2026',
    lines: ['Tablier lame PVC 40 — 1200 × 1250 mm', 'Moteur filaire LT50 Meteor 20 nm × 2'],
    totalHT: 565,
    status: 'Livré',
    statusCls: 'status-ok',
  },
  {
    id: 'CMD-2026-0171',
    date: '04/06/2026',
    lines: ['Kit axe rénovation filaire Somfy — Largeur 1500 × 3'],
    totalHT: 855,
    status: 'Livré',
    statusCls: 'status-ok',
  },
  {
    id: 'CMD-2026-0162',
    date: '22/05/2026',
    lines: ['Lame aluminium 42 ajourée blanc — 84 ml', 'Coulisse 40×22 blanc — 12 ml'],
    totalHT: 501.48,
    status: 'Livré',
    statusCls: 'status-ok',
  },
];

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

export default function ComptePage() {
  const { user, isPro, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/pro');
    }
  }, [user, router]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    toast.info('Déconnexion effectuée');
    router.push('/');
  };

  return (
    <div className="wrap compte-page">
      <Breadcrumb crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Mon compte' }]} />

      <div className="compte-layout">
        {/* Sidebar */}
        <aside className="compte-sidebar">
          <div className="compte-avatar">
            <div className="avatar-circle">
              {user.name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="compte-user-name">{user.name}</div>
              {isPro() && user.company && (
                <div className="compte-company">{user.company}</div>
              )}
              {isPro() && <span className="pro-chip">PRO</span>}
            </div>
          </div>

          <nav className="compte-nav">
            <a className="compte-nav-item active" href="#commandes">Mes commandes</a>
            <a className="compte-nav-item" href="#profil">Mon profil</a>
            {isPro() && <a className="compte-nav-item" href="#tarifs">Tarifs préférentiels</a>}
            <Link className="compte-nav-item" href="/panier">Mon panier</Link>
          </nav>

          <button className="btn ghost full" type="button" onClick={handleLogout} style={{ marginTop: 'auto' }}>
            Déconnexion
          </button>
        </aside>

        {/* Contenu */}
        <div className="compte-content">
          {/* KPIs */}
          <div className="compte-kpis">
            <div className="kpi">
              <div className="kpi-value">{MOCK_ORDERS.length}</div>
              <div className="kpi-label">Commandes</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{euro(MOCK_ORDERS.reduce((s, o) => s + o.totalHT, 0))}</div>
              <div className="kpi-label">Total HT 2026</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{isPro() ? `−${user.proDiscountPct ?? 0} %` : 'Standard'}</div>
              <div className="kpi-label">Remise compte</div>
            </div>
          </div>

          {/* Commandes */}
          <section id="commandes" className="compte-section">
            <div className="compte-section-head">
              <h2>Mes commandes</h2>
            </div>
            <div className="orders-list">
              {MOCK_ORDERS.map((o) => (
                <div key={o.id} className="order-card">
                  <div className="order-card-head">
                    <div>
                      <div className="order-id ref">{o.id}</div>
                      <div className="order-date">{o.date}</div>
                    </div>
                    <span className={`order-status ${o.statusCls}`}>{o.status}</span>
                  </div>
                  <ul className="order-lines">
                    {o.lines.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                  <div className="order-card-foot">
                    <span className="order-total">{euro(o.totalHT)} HT</span>
                    <div className="order-actions">
                      <button className="btn ghost sm" type="button">Réclamation</button>
                      <button className="btn ghost sm" type="button">Refaire la commande</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Profil */}
          <section id="profil" className="compte-section">
            <div className="compte-section-head">
              <h2>Mon profil</h2>
              <button className="btn ghost sm" type="button">Modifier</button>
            </div>
            <div className="profil-grid">
              <div className="profil-field"><span>Nom</span><strong>{user.name}</strong></div>
              <div className="profil-field"><span>Email</span><strong>{user.email}</strong></div>
              {user.company && (
                <div className="profil-field"><span>Entreprise</span><strong>{user.company}</strong></div>
              )}
              <div className="profil-field">
                <span>Type de compte</span>
                <strong>{isPro() ? 'Professionnel (B2B)' : 'Particulier (B2C)'}</strong>
              </div>
            </div>
          </section>

          {/* Tarifs pro */}
          {isPro() && (
            <section id="tarifs" className="compte-section">
              <div className="compte-section-head">
                <h2>Vos conditions tarifaires</h2>
              </div>
              <div className="tarifs-box">
                <div className="tarif-row">
                  <span>Remise négociée</span>
                  <strong>{user.proDiscountPct ?? 0} %</strong>
                </div>
                <div className="tarif-row">
                  <span>Franco de port</span>
                  <strong>Dès 400 € HT</strong>
                </div>
                <div className="tarif-row">
                  <span>Mode de paiement</span>
                  <strong>Virement 30 jours fin de mois</strong>
                </div>
                <div className="tarif-row">
                  <span>Commercial référent</span>
                  <strong>Est-Hérault — 06 52 96 52 14</strong>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
