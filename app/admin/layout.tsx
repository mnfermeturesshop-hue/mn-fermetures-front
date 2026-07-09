'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NavItem { href: string; label: string; icon: string }

const NAV: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',    icon: '◈' },
  { href: '/admin/produits',     label: 'Produits',     icon: '▣' },
  { href: '/admin/clients',      label: 'Clients pro',  icon: '👥' },
  { href: '/admin/pro-requests', label: 'Demandes pro', icon: '📋' },
  { href: '/admin/devis',        label: 'Devis',        icon: '📝' },
  { href: '/admin/commandes',    label: 'Commandes',    icon: '🧾' },
  { href: '/admin/mailing',      label: 'Mailing',      icon: '✉️' },
  { href: '/admin/inventaire',   label: 'Inventaire',   icon: '📦' },
  { href: '/admin/import',       label: 'Import Excel', icon: '⬆' },
  { href: '/admin/equipe',       label: 'Équipe',       icon: '🤝' },
];

/** Rubriques accessibles à un commercial (droits restreints à ses clients). */
const COMMERCIAL_NAV = new Set(['/admin', '/admin/clients', '/admin/devis', '/admin/commandes', '/admin/mailing']);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<'admin' | 'commercial' | null>(null);

  const isLogin = pathname === '/admin/login';

  useEffect(() => {
    if (isLogin) return;
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.role) setRole(data.role); })
      .catch(() => {});
  }, [isLogin]);

  if (isLogin) return <>{children}</>;

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
        </div>
      </aside>

      <main className="adm-main">
        {children}
      </main>
    </div>
  );
}
