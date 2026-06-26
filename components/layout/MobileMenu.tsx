'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MENU, isNavGroup } from '@/lib/catalog/mock';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

interface Props { isOpen: boolean; onClose: () => void }

export function MobileMenu({ isOpen, onClose }: Props) {
  const [openTop, setOpenTop]     = useState<string | null>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const { totalLines, openCart }  = useCartStore();
  const { user, isPro, logout }   = useAuthStore();
  const router = useRouter();
  const count  = totalLines();

  const toggleTop = (href: string) => {
    setOpenTop(openTop === href ? null : href);
    setOpenGroup(null);
  };

  const handleCartClick = () => { onClose(); openCart(); };

  const handleLogout = () => {
    logout();
    toast.info('Déconnexion effectuée');
    onClose();
    router.push('/');
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="mob-overlay" onClick={onClose} aria-hidden />
      <nav className="mob-menu" aria-label="Navigation mobile">

        <div className="mob-head">
          <Link href="/" onClick={onClose} className="logo-pill">
            <Image src="/logo.png" alt="MN Fermetures" width={120} height={46} className="logo-img" />
          </Link>
          <button className="mob-close" type="button" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Compte */}
        <div className="mob-account">
          {user ? (
            <div className="mob-user">
              <div className="mob-user-info">
                <span>{user.name}</span>
                {isPro() && <span className="pro-chip">PRO</span>}
              </div>
              <div className="mob-user-links">
                <Link href="/compte" onClick={onClose}>Mon compte</Link>
                <button type="button" onClick={handleLogout}>Déconnexion</button>
              </div>
            </div>
          ) : (
            <Link className="btn solid full" href="/pro" onClick={onClose}>
              Connexion / Espace pro
            </Link>
          )}
        </div>

        {/* Panier */}
        <button className="mob-cart-btn" type="button" onClick={handleCartClick}>
          <span>🛒 Mon panier</span>
          {count > 0 && <span className="badge badge-live">{count}</span>}
        </button>

        {/* Catalogue */}
        <div className="mob-cats">
          <div className="mob-section-label">Catalogue</div>

          {MENU.map((top) => {
            const hasGroups = top.children?.some(isNavGroup) ?? false;
            const isTopOpen = openTop === top.href;

            return (
              <div key={top.href} className="mob-cat-group">
                <button
                  type="button"
                  className={`mob-cat-btn ${isTopOpen ? 'open' : ''}`}
                  onClick={() => toggleTop(top.href)}
                >
                  <span>{top.icon} {top.name}</span>
                  <span className="mob-chevron">{isTopOpen ? '▲' : '▼'}</span>
                </button>

                {isTopOpen && top.children && (
                  <div className="mob-sub">
                    <Link href={top.href} className="mob-sub-all" onClick={onClose}>
                      Tout voir — {top.name}
                    </Link>

                    {top.children.map((child) => {
                      if (!isNavGroup(child)) {
                        return (
                          <Link key={child.href} href={child.href} className="mob-sub-item" onClick={onClose}>
                            {child.name}
                          </Link>
                        );
                      }

                      const isGroupOpen = openGroup === child.href;
                      return (
                        <div key={child.href} className="mob-subgroup">
                          <button
                            type="button"
                            className={`mob-subgroup-btn ${isGroupOpen ? 'open' : ''}`}
                            onClick={() => setOpenGroup(isGroupOpen ? null : child.href)}
                          >
                            <span>{child.name}</span>
                            <span className="mob-chevron">{isGroupOpen ? '▲' : '▼'}</span>
                          </button>
                          {isGroupOpen && (
                            <div className="mob-sub-lvl3">
                              <Link href={child.href} className="mob-sub-all" onClick={onClose}>
                                Tout voir — {child.name}
                              </Link>
                              {child.children.map((leaf) => (
                                <Link key={leaf.href} href={leaf.href} className="mob-sub-item mob-sub-item--leaf" onClick={onClose}>
                                  {leaf.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Liens bas */}
        <div className="mob-footer-links">
          <Link href="/recherche" onClick={onClose}>🔍 Recherche avancée</Link>
          <a href="tel:0467780663">📞 04 67 78 06 63</a>
        </div>
      </nav>
    </>
  );
}
