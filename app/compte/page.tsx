'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

interface OrderLine { name: string; quantity: number; unitPriceHT: number }

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_ht: number;
  total_ttc: number;
  status: string;
  lines: OrderLine[];
  payment_method: string;
  shipping_method: string;
}

const euro = (n: number) =>
  Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €';

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'En attente',    cls: 'status-pending' },
  paid:       { label: 'Payé',          cls: 'status-ok' },
  processing: { label: 'En préparation', cls: 'status-shipping' },
  shipped:    { label: 'Expédié',        cls: 'status-shipping' },
  delivered:  { label: 'Livré',          cls: 'status-ok' },
  cancelled:  { label: 'Annulé',         cls: 'status-rupture' },
};

export default function ComptePage() {
  const { user, isPro, logout } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) router.replace('/pro');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('orders')
      .select('id, order_number, created_at, total_ht, total_ttc, status, lines, payment_method, shipping_method')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[compte] orders fetch:', error);
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    toast.info('Déconnexion effectuée');
    router.push('/');
  };

  const totalHT = orders.reduce((s, o) => s + Number(o.total_ht), 0);

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
              <div className="kpi-value">{loading ? '…' : orders.length}</div>
              <div className="kpi-label">Commandes</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{loading ? '…' : euro(totalHT)}</div>
              <div className="kpi-label">Total HT {new Date().getFullYear()}</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{isPro() && user.proDiscounts && Object.keys(user.proDiscounts).length > 0 ? 'Remises pro' : 'Standard'}</div>
              <div className="kpi-label">Remise compte</div>
            </div>
          </div>

          {/* Commandes */}
          <section id="commandes" className="compte-section">
            <div className="compte-section-head">
              <h2>Mes commandes</h2>
            </div>

            {loading && (
              <p style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>Chargement…</p>
            )}

            {!loading && orders.length === 0 && (
              <div style={{ padding: '24px 0', color: 'var(--muted)', fontSize: 14 }}>
                <p style={{ margin: '0 0 12px' }}>Vous n&apos;avez pas encore de commande.</p>
                <Link className="btn solid sm" href="/catalogue/tabliers">Découvrir le catalogue →</Link>
              </div>
            )}

            {!loading && orders.length > 0 && (
              <div className="orders-list">
                {orders.map((o) => {
                  const st = STATUS[o.status] ?? { label: o.status, cls: 'status-pending' };
                  const date = new Date(o.created_at).toLocaleDateString('fr-FR');
                  return (
                    <div key={o.id} className="order-card">
                      <div className="order-card-head">
                        <div>
                          <div className="order-id ref">{o.order_number}</div>
                          <div className="order-date">{date}</div>
                        </div>
                        <span className={`order-status ${st.cls}`}>{st.label}</span>
                      </div>
                      <ul className="order-lines">
                        {(o.lines ?? []).slice(0, 3).map((l, i) => (
                          <li key={i}>{l.quantity} × {l.name}</li>
                        ))}
                        {(o.lines ?? []).length > 3 && (
                          <li style={{ color: 'var(--muted)', fontSize: 12 }}>
                            + {o.lines.length - 3} article{o.lines.length - 3 > 1 ? 's' : ''}
                          </li>
                        )}
                      </ul>
                      <div className="order-card-foot">
                        <span className="order-total">{euro(Number(o.total_ht))} HT</span>
                        <div className="order-actions">
                          <button
                            className="btn ghost sm"
                            type="button"
                            onClick={() => window.open(`/devis?order=${o.order_number}`, '_blank')}
                          >
                            Facture PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Profil */}
          <section id="profil" className="compte-section">
            <div className="compte-section-head">
              <h2>Mon profil</h2>
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
                  <strong>{user.proDiscounts && Object.keys(user.proDiscounts).length > 0 ? 'Par famille' : '—'}</strong>
                </div>
                <div className="tarif-row">
                  <span>Livraison offerte</span>
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
