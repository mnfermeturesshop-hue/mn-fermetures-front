'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/store/auth';

interface NavItem { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',    icon: '◈' },
  { href: '/admin/produits',     label: 'Produits',     icon: '▣' },
  { href: '/admin/nomenclature', label: 'Nomenclature', icon: '🗂' },
  { href: '/admin/clients',      label: 'Clients pro',  icon: '👥' },
  { href: '/admin/pro-requests', label: 'Demandes pro', icon: '📋' },
  { href: '/admin/devis',        label: 'Devis',        icon: '📝' },
  { href: '/admin/commandes',    label: 'Commandes',    icon: '🧾' },
  { href: '/admin/mailing',      label: 'Mailing',      icon: '✉️' },
  { href: '/admin/inventaire',   label: 'Inventaire',   icon: '📦' },
  { href: '/admin/tarifs',       label: 'Tarifs',       icon: '💶' },
  { href: '/admin/import',       label: 'Import Excel', icon: '⬆' },
  { href: '/admin/configurateurs', label: 'Configurateurs', icon: '⚙' },
  { href: '/admin/equipe',       label: 'Équipe',       icon: '🤝' },
];

/** Rubriques accessibles à un commercial (droits restreints à ses clients). */
const COMMERCIAL_NAV = new Set(['/admin', '/admin/clients', '/admin/devis', '/admin/commandes', '/admin/mailing']);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [role, setRole] = useState<'admin' | 'commercial' | null>(null);
  const [checked, setChecked] = useState(false);
  const wasAuthed = useRef(false);

  const isLogin = pathname === '/admin/login';

  // Vérifie l'accès (session serveur) et récupère le rôle (filtrage du menu).
  // Accès refusé (non admin/commercial) → redirection vers la page de connexion.
  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.role) setRole(data.role);
        else router.replace('/admin/login');
        setChecked(true);
      })
      .catch(() => { if (!cancelled) { setChecked(true); router.replace('/admin/login'); } });
    return () => { cancelled = true; };
  }, [isLogin, router]);

  // Réagit à la DÉCONNEXION : un compte connecté qui repasse à `null` → page de connexion
  // admin (le `wasAuthed` évite de rediriger un chargement initial non encore hydraté).
  useEffect(() => { if (user) wasAuthed.current = true; }, [user]);
  useEffect(() => {
    if (!isLogin && wasAuthed.current && user === null) router.replace('/admin/login');
  }, [user, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!checked) return <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>Chargement…</div>;
  // Accès refusé ou déconnexion en cours → on n'affiche pas le back-office (redirection).
  if (!role || (wasAuthed.current && user === null)) return null;

  const nav = role === 'commercial'
    ? NAV.filter((item) => COMMERCIAL_NAV.has(item.href))
    : NAV;

  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-logo">
          <div className="adm-logo-mark">MN</div>
          <div>
            <div className="adm-logo-name">FERMETURES</div>
            <div className="adm-logo-tag">
              {role === 'commercial' ? 'Espace commercial' : 'Administration'}
            </div>
          </div>
        </div>

        <nav className="adm-nav">
          {nav.map((item) => {
            const active = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`adm-nav-item ${active ? 'active' : ''}`}
              >
                <span className="adm-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="adm-sidebar-foot">
          <Link href="/" className="adm-back-link">← Retour au site</Link>
          <button type="button" className="adm-back-link" style={{ background: 'none', border: 0, cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => logout()}>
            ⏻ Déconnexion
          </button>
        </div>
      </aside>

      <main className="adm-main">
        {children}
      </main>
    </div>
  );
}
