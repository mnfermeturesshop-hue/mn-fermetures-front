'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/admin',            label: 'Dashboard',    icon: '◈' },
  { href: '/admin/produits',   label: 'Produits',     icon: '▣' },
  { href: '/admin/clients',       label: 'Clients pro',  icon: '👥' },
  { href: '/admin/pro-requests',  label: 'Demandes pro', icon: '📋' },
  { href: '/admin/devis',         label: 'Devis',        icon: '📝' },
  { href: '/admin/commandes',     label: 'Commandes',    icon: '🧾' },
  { href: '/admin/inventaire', label: 'Inventaire',   icon: '📦' },
  { href: '/admin/import',     label: 'Import Excel', icon: '⬆' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') return <>{children}</>;


  return (
    <div className="adm-shell">
      <aside className="adm-sidebar">
        <div className="adm-logo">
          <div className="adm-logo-mark">MN</div>
          <div>
            <div className="adm-logo-name">FERMETURES</div>
            <div className="adm-logo-tag">Administration</div>
          </div>
        </div>

        <nav className="adm-nav">
          {NAV.map((item) => {
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
