'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { useCartStore } from '@/lib/store/cart';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import type { CartLine } from '@/lib/catalog/types';
import { orderCountsForLoyalty } from '@/lib/loyalty';
import { LoyaltyGauge } from '@/components/compte/LoyaltyGauge';
import { ClientStats } from '@/components/compte/ClientStats';
import { CommentThread } from '@/components/comments/CommentThread';

interface OrderLine { name: string; quantity: number; unitPriceHT: number }

interface ProfileAddress {
  firstName: string;
  lastName:  string;
  company:   string;
  address1:  string;
  address2:  string;
  postalCode: string;
  city:      string;
  phone:     string;
}

const BLANK_ADDR: ProfileAddress = {
  firstName: '', lastName: '', company: '',
  address1: '', address2: '', postalCode: '', city: '', phone: '',
};

interface OrderDocuments {
  arc?: string;
  proforma?: string;
  bl?: string;
  facture?: string;
  suivi?: string;
}

interface DevisRow {
  id: string;
  devis_number: string;
  created_at: string;
  valid_until: string;
  total_ht: number;
  total_ttc: number;
  lines: CartLine[];
  status: string;
  source?: string;
  pdf_path?: string | null;
  reminder_at?: string | null;
  reminder_sent_at?: string | null;
}

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
  documents?: OrderDocuments;
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

type CompteTab = 'commandes' | 'devis' | 'stats' | 'profil' | 'tarifs';

export default function ComptePage() {
  const { user, isPro, logout } = useAuthStore();
  const { setLines, clearCart }  = useCartStore();
  const router = useRouter();
  const [orders, setOrders]   = useState<Order[]>([]);
  const [devis, setDevis]     = useState<DevisRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Onglet actif — une seule rubrique affichée à la fois
  const [tab, setTab] = useState<CompteTab>('commandes');

  // Commercial référent assigné (affiché dans l'onglet Tarifs)
  const [commercial, setCommercial] = useState<{ name?: string; phone?: string | null; email?: string | null } | null>(null);

  // Fil de commentaires ouvert (clé : `${type}-${numéro}`)
  const [openThread, setOpenThread] = useState<string | null>(null);
  const toggleThread = (key: string) => setOpenThread((cur) => (cur === key ? null : key));

  // Rappel automatique à 15 jours sur un devis (activer/annuler)
  const [togglingReminder, setTogglingReminder] = useState<string | null>(null);
  const toggleReminder = async (d: DevisRow, enable: boolean) => {
    setTogglingReminder(d.devis_number);
    try {
      const res = await fetch(`/api/devis/${d.devis_number}/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
      setDevis((prev) => prev.map((x) =>
        x.id === d.id ? { ...x, reminder_at: data.reminderAt ?? null, reminder_sent_at: null } : x
      ));
      toast.success(enable
        ? `Rappel programmé le ${new Date(data.reminderAt).toLocaleDateString('fr-FR')}`
        : 'Rappel annulé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setTogglingReminder(null);
    }
  };

  // Pastilles "non lu" par document (clé : `${type}:${numéro}`)
  const [unread, setUnread] = useState<Record<string, number>>({});
  const clearUnread = (key: string) =>
    setUnread((prev) => (prev[key] ? { ...prev, [key]: 0 } : prev));

  // Filtres (même outil que l'admin)
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [devisSearch, setDevisSearch] = useState('');
  const [devisStatus, setDevisStatus] = useState('');

  // Profil éditable
  const [profil, setProfil]       = useState({ name: '', company: '', phone: '' });
  const [shipAddr, setShipAddr]   = useState<ProfileAddress>(BLANK_ADDR);
  const [billAddr, setBillAddr]   = useState<ProfileAddress>(BLANK_ADDR);
  const [sameAddr, setSameAddr]   = useState(true);
  const [savingProfil, setSavingProfil] = useState(false);

  useEffect(() => {
    if (!user) router.replace('/pro');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    // Commandes via API route (évite les problèmes de colonnes manquantes et de RLS)
    fetch('/api/orders/mine')
      .then((r) => r.json())
      .then((data) => {
        setOrders((data as Order[]) ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Pastilles de commentaires non lus
    fetch('/api/comments/unread')
      .then((r) => (r.ok ? r.json() : {}))
      .then((u) => setUnread(u ?? {}))
      .catch(() => {});

    const supabase = createClient();
    if (isPro()) {
      // Commercial référent (pour l'onglet Tarifs)
      fetch('/api/account/commercial')
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => { if (c?.name) setCommercial(c); })
        .catch(() => {});

      supabase
        .from('devis')
        .select('id, devis_number, created_at, valid_until, total_ht, total_ttc, lines, status, source, pdf_path, reminder_at, reminder_sent_at')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error) { setDevis((data as DevisRow[]) ?? []); return; }
          // Migrations 20260706/20260709 pas encore jouées — fallback minimal
          supabase
            .from('devis')
            .select('id, devis_number, created_at, valid_until, total_ht, total_ttc, lines, status')
            .order('created_at', { ascending: false })
            .then(({ data: fallback }) => setDevis((fallback as DevisRow[]) ?? []));
        });
    }

    // Charger le profil étendu (adresses + téléphone)
    supabase
      .from('profiles')
      .select('name, company, phone, shipping_address, billing_address')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setProfil({
          name:    data.name    ?? user.name,
          company: data.company ?? user.company ?? '',
          phone:   data.phone   ?? '',
        });
        if (data.shipping_address) {
          setShipAddr(data.shipping_address as ProfileAddress);
        } else {
          setShipAddr((prev) => ({
            ...prev,
            firstName: user.name.split(' ')[0] ?? '',
            lastName:  user.name.split(' ').slice(1).join(' ') ?? '',
            company:   user.company ?? '',
          }));
        }
        if (data.billing_address) {
          setBillAddr(data.billing_address as ProfileAddress);
          setSameAddr(false);
        }
      });
  }, [user]);

  if (!user) return null;

  const handleSaveProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfil(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update({
      name:             profil.name,
      company:          profil.company || null,
      phone:            profil.phone   || null,
      shipping_address: shipAddr,
      billing_address:  sameAddr ? shipAddr : billAddr,
    }).eq('id', user!.id);
    setSavingProfil(false);
    if (error) { toast.error('Erreur sauvegarde : ' + error.message); }
    else        { toast.success('Profil mis à jour'); }
  };

  const handleLogout = () => {
    logout();
    toast.info('Déconnexion effectuée');
    router.push('/');
  };

  // Confirmation avant transformation d'un devis en bon de commande
  const [confirmConvert, setConfirmConvert] = useState<DevisRow | null>(null);
  const [converting, setConverting] = useState(false);

  const convertDevisToBc = async (d: DevisRow) => {
    // Devis ERP (PDF importé par nos équipes) : l'acceptation vaut bon de
    // commande — l'équipe MN est notifiée et traite la commande dans l'ERP.
    if (d.source === 'erp') {
      try {
        const res = await fetch(`/api/devis/${d.devis_number}/convert`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue');
        setDevis((prev) => prev.map((x) => x.id === d.id ? { ...x, status: 'converted' } : x));
        // La commande créée apparaît immédiatement dans « Mes commandes »
        fetch('/api/orders/mine')
          .then((r) => r.json())
          .then((orders) => setOrders((orders as Order[]) ?? []))
          .catch(() => {});
        toast.success(`Commande ${data.orderNumber ?? ''} créée — retrouvez-la dans « Mes commandes »`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la commande');
      }
      return;
    }

    // Devis créés sur le site : recharge le panier et suit le flux BC classique
    setLines(d.lines);
    // Marquer le devis comme converti (masque le bouton immédiatement)
    setDevis((prev) => prev.map((x) => x.id === d.id ? { ...x, status: 'converted' } : x));
    fetch('/api/devis', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devisNumber: d.devis_number, status: 'converted' }),
    });
    toast.info('Panier chargé depuis le devis ' + d.devis_number);
    router.push('/commande-pro');
  };

  // Total des commandes passées (hors annulées) sur l'année en cours —
  // le libellé du KPI reflète exactement ce périmètre
  const kpiYear = new Date().getFullYear();
  const totalHT = orders
    .filter((o) => o.status !== 'cancelled' && new Date(o.created_at).getFullYear() === kpiYear)
    .reduce((s, o) => s + Number(o.total_ht), 0);

  // CA fidélité : bons de commande expédiés/livrés de l'année en cours
  const loyaltyYear = new Date().getFullYear();
  const loyaltyCaHT = orders
    .filter((o) => orderCountsForLoyalty(o, loyaltyYear))
    .reduce((s, o) => s + Number(o.total_ht), 0);

  // Listes filtrées (recherche + statut)
  const filteredOrders = orders.filter((o) => {
    if (orderStatus && o.status !== orderStatus) return false;
    const q = orderSearch.trim().toLowerCase();
    if (!q) return true;
    return o.order_number?.toLowerCase().includes(q) ||
      (o.lines ?? []).some((l) => l.name?.toLowerCase().includes(q));
  });

  const devisState = (d: DevisRow) =>
    d.status === 'converted' ? 'converted'
    : new Date(d.valid_until) < new Date() ? 'expired'
    : 'active';

  const filteredDevis = devis.filter((d) => {
    if (devisStatus && devisState(d) !== devisStatus) return false;
    const q = devisSearch.trim().toLowerCase();
    if (!q) return true;
    return d.devis_number?.toLowerCase().includes(q) ||
      (d.lines ?? []).some((l) => l.name?.toLowerCase().includes(q));
  });

  return (
    <div className="wrap compte-page">
      {/* Confirmation : transformer un devis en bon de commande */}
      {confirmConvert && (
        <div className="adm-overlay">
          <div className="adm-confirm-box">
            <h3 className="adm-confirm-title">Transformer en bon de commande ?</h3>
            <p className="adm-confirm-body">
              {confirmConvert.source === 'erp' ? (
                <>
                  Le devis <strong className="ref">{confirmConvert.devis_number}</strong>
                  {Number(confirmConvert.total_ht) > 0 && <> ({euro(Number(confirmConvert.total_ht))} HT)</>}
                  {' '}sera transformé en <strong>bon de commande ferme</strong>.
                  Notre équipe le traitera et vous recontactera sous 24&nbsp;h ouvrées.
                </>
              ) : (
                <>
                  Les articles du devis <strong className="ref">{confirmConvert.devis_number}</strong>
                  {' '}seront chargés dans votre panier pour finaliser votre bon de commande
                  (adresse et validation). Le devis sera marqué comme converti.
                </>
              )}
            </p>
            <div className="adm-confirm-actions">
              <button
                className="btn ghost"
                type="button"
                disabled={converting}
                onClick={() => setConfirmConvert(null)}
              >
                Annuler
              </button>
              <button
                className="btn solid"
                type="button"
                disabled={converting}
                onClick={async () => {
                  setConverting(true);
                  await convertDevisToBc(confirmConvert);
                  setConverting(false);
                  setConfirmConvert(null);
                }}
              >
                {converting ? 'Transformation…' : 'Confirmer la commande'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button type="button" className={`compte-nav-item ${tab === 'commandes' ? 'active' : ''}`} onClick={() => setTab('commandes')}>Mes commandes</button>
            {isPro() && (
              <button type="button" className={`compte-nav-item ${tab === 'devis' ? 'active' : ''}`} onClick={() => setTab('devis')}>Mes devis</button>
            )}
            {isPro() && (
              <button type="button" className={`compte-nav-item ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Statistiques</button>
            )}
            <button type="button" className={`compte-nav-item ${tab === 'profil' ? 'active' : ''}`} onClick={() => setTab('profil')}>Mon profil</button>
            {isPro() && (
              <button type="button" className={`compte-nav-item ${tab === 'tarifs' ? 'active' : ''}`} onClick={() => setTab('tarifs')}>Tarifs préférentiels</button>
            )}
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
              <div className="kpi-label">Total commandes HT · {kpiYear}</div>
            </div>
            <div className="kpi">
              <div className="kpi-value">{isPro() && user.proDiscounts && Object.keys(user.proDiscounts).length > 0 ? 'Remises pro' : 'Standard'}</div>
              <div className="kpi-label">Remise compte</div>
            </div>
          </div>

          {/* Programme de fidélité — pros uniquement, visible sur tous les onglets */}
          {isPro() && !loading && (
            <LoyaltyGauge caHT={loyaltyCaHT} year={loyaltyYear} />
          )}

          {/* Commandes */}
          {tab === 'commandes' && (
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
              <div className="compte-toolbar">
                <input
                  className="profil-input"
                  type="search"
                  placeholder="N° de commande, produit…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
                <select className="profil-input" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                </select>
                <span className="compte-count">{filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''}</span>
              </div>
            )}

            {!loading && orders.length > 0 && filteredOrders.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>
                Aucune commande ne correspond à votre recherche.
              </p>
            )}

            {!loading && filteredOrders.length > 0 && (
              <div className="orders-list">
                {filteredOrders.map((o) => {
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
                          {o.payment_method === 'bon_de_commande' ? (
                            <div className="order-docs">
                              {(['arc', 'proforma', 'bl', 'facture', 'suivi'] as const).map((type) => {
                                const LABELS = { arc: 'ARC', proforma: 'Pro Forma', bl: 'Bon de livraison', facture: 'Facture', suivi: 'Suivi' };
                                return o.documents?.[type] ? (
                                  <a
                                    key={type}
                                    className="btn ghost sm"
                                    href={`/api/orders/${o.order_number}/documents/${type}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    ↓ {LABELS[type]}
                                  </a>
                                ) : (
                                  <span key={type} className="doc-pending">{LABELS[type]}</span>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              className="btn ghost sm"
                              type="button"
                              onClick={() => window.open(`/devis?order=${o.order_number}`, '_blank')}
                            >
                              Facture PDF
                            </button>
                          )}
                          <button
                            className="btn ghost sm"
                            type="button"
                            onClick={() => toggleThread(`order-${o.order_number}`)}
                          >
                            💬 Commentaires
                            {(unread[`order:${o.order_number}`] ?? 0) > 0 && (
                              <span className="cmt-dot">{unread[`order:${o.order_number}`]}</span>
                            )}
                          </button>
                        </div>
                      </div>
                      {openThread === `order-${o.order_number}` && (
                        <CommentThread
                          targetType="order"
                          targetNumber={o.order_number}
                          onRead={() => clearUnread(`order:${o.order_number}`)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          )}

          {/* Devis PRO */}
          {tab === 'devis' && isPro() && (
            <section id="devis" className="compte-section">
              <div className="compte-section-head">
                <h2>Mes devis</h2>
                <Link className="btn ghost sm" href="/panier">Nouveau devis</Link>
              </div>

              {devis.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>
                  Aucun devis sauvegardé. Ajoutez des produits au panier et cliquez sur &quot;Créer un devis&quot;.
                </p>
              )}

              {devis.length > 0 && (
                <div className="compte-toolbar">
                  <input
                    className="profil-input"
                    type="search"
                    placeholder="N° de devis, produit…"
                    value={devisSearch}
                    onChange={(e) => setDevisSearch(e.target.value)}
                  />
                  <select className="profil-input" value={devisStatus} onChange={(e) => setDevisStatus(e.target.value)}>
                    <option value="">Tous les statuts</option>
                    <option value="active">En cours de validité</option>
                    <option value="converted">Converti</option>
                    <option value="expired">Expiré</option>
                  </select>
                  <span className="compte-count">{filteredDevis.length} devis</span>
                </div>
              )}

              {devis.length > 0 && filteredDevis.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>
                  Aucun devis ne correspond à votre recherche.
                </p>
              )}

              {filteredDevis.length > 0 && (
                <div className="orders-list">
                  {filteredDevis.map((d) => {
                    const date      = new Date(d.created_at).toLocaleDateString('fr-FR');
                    const validDate = new Date(d.valid_until).toLocaleDateString('fr-FR');
                    const isExpired = new Date(d.valid_until) < new Date();
                    return (
                      <div key={d.id} className="order-card">
                        <div className="order-card-head">
                          <div>
                            <div className="order-id ref">
                              {d.devis_number}
                              {d.source === 'erp' && (
                                <span className="pro-chip" style={{ marginLeft: 8 }}>Devis MN</span>
                              )}
                            </div>
                            <div className="order-date">
                              {d.source === 'erp' ? 'Établi par nos équipes le ' : 'Créé le '}{date}
                            </div>
                          </div>
                          <span className={`order-status ${isExpired ? 'status-rupture' : d.status === 'converted' ? 'status-ok' : 'status-pending'}`}>
                            {isExpired ? 'Expiré' : d.status === 'converted' ? 'Converti' : `Valide jusqu'au ${validDate}`}
                          </span>
                        </div>
                        <ul className="order-lines">
                          {(d.lines ?? []).length === 0 && (
                            <li style={{ color: 'var(--muted)' }}>Détail dans le PDF du devis</li>
                          )}
                          {(d.lines ?? []).slice(0, 3).map((l, i) => (
                            <li key={i}>{l.quantity} × {l.name}</li>
                          ))}
                          {(d.lines ?? []).length > 3 && (
                            <li style={{ color: 'var(--muted)', fontSize: 12 }}>
                              + {d.lines.length - 3} article{d.lines.length - 3 > 1 ? 's' : ''}
                            </li>
                          )}
                        </ul>
                        <div className="order-card-foot">
                          <span className="order-total">
                            {Number(d.total_ht) > 0 ? `${euro(Number(d.total_ht))} HT` : ''}
                          </span>
                          <div className="order-actions">
                            {d.pdf_path ? (
                              <a
                                className="btn ghost sm"
                                href={`/api/devis/${d.devis_number}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                ↓ PDF
                              </a>
                            ) : (
                              <Link
                                className="btn ghost sm"
                                href={`/devis?devis=${d.devis_number}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Voir / PDF
                              </Link>
                            )}
                            {!isExpired && d.status !== 'converted' && (
                              d.reminder_at && !d.reminder_sent_at ? (
                                <button
                                  className="btn ghost sm"
                                  type="button"
                                  disabled={togglingReminder === d.devis_number}
                                  onClick={() => toggleReminder(d, false)}
                                  title="Rappel programmé — cliquer pour annuler"
                                >
                                  ⏰ Rappel le {new Date(d.reminder_at).toLocaleDateString('fr-FR')} ✕
                                </button>
                              ) : (
                                <button
                                  className="btn ghost sm"
                                  type="button"
                                  disabled={togglingReminder === d.devis_number}
                                  onClick={() => toggleReminder(d, true)}
                                  title="Recevoir un email de rappel dans 15 jours"
                                >
                                  ⏰ Rappel dans 15 j
                                </button>
                              )
                            )}
                            <button
                              className="btn ghost sm"
                              type="button"
                              onClick={() => toggleThread(`devis-${d.devis_number}`)}
                            >
                              💬 Commentaires
                              {(unread[`devis:${d.devis_number}`] ?? 0) > 0 && (
                                <span className="cmt-dot">{unread[`devis:${d.devis_number}`]}</span>
                              )}
                            </button>
                            {!isExpired && d.status !== 'converted' && (
                              <button
                                className="btn solid sm"
                                type="button"
                                onClick={() => setConfirmConvert(d)}
                              >
                                {d.source === 'erp' ? 'Commander ce devis →' : 'Créer un bon de commande →'}
                              </button>
                            )}
                          </div>
                        </div>
                        {openThread === `devis-${d.devis_number}` && (
                          <CommentThread
                            targetType="devis"
                            targetNumber={d.devis_number}
                            onRead={() => clearUnread(`devis:${d.devis_number}`)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Statistiques PRO */}
          {tab === 'stats' && isPro() && (
            <section id="stats" className="compte-section">
              <div className="compte-section-head">
                <h2>Mes statistiques</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>12 derniers mois</span>
              </div>
              {loading ? (
                <p style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>Chargement…</p>
              ) : (
                <ClientStats orders={orders} devis={devis} />
              )}
            </section>
          )}

          {/* Profil */}
          {tab === 'profil' && (
          <section id="profil" className="compte-section">
            <div className="compte-section-head">
              <h2>Mon profil</h2>
            </div>
            <form className="profil-form" onSubmit={handleSaveProfil}>

              {/* Informations personnelles */}
              <div className="profil-form-block">
                <div className="profil-form-title">Informations personnelles</div>
                <div className="profil-grid-2">
                  <label className="profil-label">
                    Nom complet
                    <input className="profil-input" value={profil.name}
                      onChange={(e) => setProfil((p) => ({ ...p, name: e.target.value }))} />
                  </label>
                  <label className="profil-label">
                    Téléphone
                    <input className="profil-input" type="tel" value={profil.phone}
                      onChange={(e) => setProfil((p) => ({ ...p, phone: e.target.value }))} />
                  </label>
                  <label className="profil-label">
                    Entreprise
                    <input className="profil-input" value={profil.company}
                      onChange={(e) => setProfil((p) => ({ ...p, company: e.target.value }))} />
                  </label>
                  <div className="profil-label">
                    Email
                    <div className="profil-input profil-input--ro">{user.email}</div>
                  </div>
                </div>
              </div>

              {/* Adresse de livraison */}
              <div className="profil-form-block">
                <div className="profil-form-title">Adresse de livraison par défaut</div>
                <div className="profil-grid-2">
                  <label className="profil-label">Prénom
                    <input className="profil-input" value={shipAddr.firstName}
                      onChange={(e) => setShipAddr((a) => ({ ...a, firstName: e.target.value }))} />
                  </label>
                  <label className="profil-label">Nom
                    <input className="profil-input" value={shipAddr.lastName}
                      onChange={(e) => setShipAddr((a) => ({ ...a, lastName: e.target.value }))} />
                  </label>
                  <label className="profil-label" style={{ gridColumn: '1 / -1' }}>Adresse
                    <input className="profil-input" value={shipAddr.address1} placeholder="N° et rue"
                      onChange={(e) => setShipAddr((a) => ({ ...a, address1: e.target.value }))} />
                  </label>
                  <label className="profil-label" style={{ gridColumn: '1 / -1' }}>Complément
                    <input className="profil-input" value={shipAddr.address2} placeholder="Bâtiment, étage…"
                      onChange={(e) => setShipAddr((a) => ({ ...a, address2: e.target.value }))} />
                  </label>
                  <label className="profil-label">Code postal
                    <input className="profil-input" value={shipAddr.postalCode}
                      onChange={(e) => setShipAddr((a) => ({ ...a, postalCode: e.target.value }))} />
                  </label>
                  <label className="profil-label">Ville
                    <input className="profil-input" value={shipAddr.city}
                      onChange={(e) => setShipAddr((a) => ({ ...a, city: e.target.value }))} />
                  </label>
                  <label className="profil-label">Téléphone livraison
                    <input className="profil-input" type="tel" value={shipAddr.phone}
                      onChange={(e) => setShipAddr((a) => ({ ...a, phone: e.target.value }))} />
                  </label>
                </div>
              </div>

              {/* Adresse de facturation */}
              <div className="profil-form-block">
                <div className="profil-form-title">Adresse de facturation</div>
                <label className="profil-same-addr">
                  <input type="checkbox" checked={sameAddr}
                    onChange={(e) => setSameAddr(e.target.checked)} />
                  Identique à l&apos;adresse de livraison
                </label>
                {!sameAddr && (
                  <div className="profil-grid-2" style={{ marginTop: 12 }}>
                    <label className="profil-label">Prénom
                      <input className="profil-input" value={billAddr.firstName}
                        onChange={(e) => setBillAddr((a) => ({ ...a, firstName: e.target.value }))} />
                    </label>
                    <label className="profil-label">Nom
                      <input className="profil-input" value={billAddr.lastName}
                        onChange={(e) => setBillAddr((a) => ({ ...a, lastName: e.target.value }))} />
                    </label>
                    <label className="profil-label" style={{ gridColumn: '1 / -1' }}>Adresse
                      <input className="profil-input" value={billAddr.address1} placeholder="N° et rue"
                        onChange={(e) => setBillAddr((a) => ({ ...a, address1: e.target.value }))} />
                    </label>
                    <label className="profil-label" style={{ gridColumn: '1 / -1' }}>Complément
                      <input className="profil-input" value={billAddr.address2}
                        onChange={(e) => setBillAddr((a) => ({ ...a, address2: e.target.value }))} />
                    </label>
                    <label className="profil-label">Code postal
                      <input className="profil-input" value={billAddr.postalCode}
                        onChange={(e) => setBillAddr((a) => ({ ...a, postalCode: e.target.value }))} />
                    </label>
                    <label className="profil-label">Ville
                      <input className="profil-input" value={billAddr.city}
                        onChange={(e) => setBillAddr((a) => ({ ...a, city: e.target.value }))} />
                    </label>
                  </div>
                )}
              </div>

              <div className="profil-form-foot">
                <div className="profil-label" style={{ margin: 0 }}>
                  Type de compte : <strong>{isPro() ? 'Professionnel (B2B)' : 'Particulier (B2C)'}</strong>
                </div>
                <button className="btn solid" type="submit" disabled={savingProfil}>
                  {savingProfil ? 'Sauvegarde…' : 'Sauvegarder le profil'}
                </button>
              </div>
            </form>
          </section>
          )}

          {/* Tarifs pro */}
          {tab === 'tarifs' && isPro() && (
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
                  <strong>
                    {commercial?.name
                      ? [commercial.name, commercial.phone || commercial.email].filter(Boolean).join(' — ')
                      : 'Nous contacter — 04 67 78 06 63'}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
