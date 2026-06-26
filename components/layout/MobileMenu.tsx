'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { categories, MENU } from '@/lib/catalog/mock';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';

interface Props { isOpen: boolean; onClose: () => void }

export function MobileMenu({ isOpen, onClose }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null);
  const { totalLines, openCart } = useCartStore();
  const { user, isPro, logout } = useAuthStore();
  const router = useRouter();
  const count = totalLines();

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
            <Image
              src="/logo.png"
              alt="MN Fermetures"
              width={120}
              height={46}
              className="logo-img"
            />
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

        {/* Catégories */}
        <div className="mob-cats">
          <div className="mob-section-label">Catalogue</div>
          {MENU.map((m) => (
            <div key={m.categorySlug} className="mob-cat-group">
              <button
                type="button"
                className={`mob-cat-btn ${openCat === m.categorySlug ? 'open' : ''}`}
                onClick={() => setOpenCat(openCat === m.categorySlug ? null : m.categorySlug)}
              >
                <span>{categories.find((c) => c.slug === m.categorySlug)?.icon} {m.name}</span>
                <span className="mob-chevron">{openCat === m.categorySlug ? '▲' : '▼'}</span>
              </button>
              {openCat === m.categorySlug && (
                <div className="mob-sub">
                  <Link
                    href={`/catalogue/${m.categorySlug}`}
                    className="mob-sub-all"
                    onClick={onClose}
                  >
                    Tout voir — {m.name}
                  </Link>
                  {m.sub.map((s) => (
                    <Link
                      key={s}
                      href={`/catalogue/${m.categorySlug}`}
                      className="mob-sub-item"
                      onClick={onClose}
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            href="/catalogue/pieces-detachees"
            className="mob-cat-btn"
            style={{ color: 'var(--somfy)', fontWeight: 700 }}
            onClick={onClose}
          >
            ⚡ Pièces détachées
          </Link>
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
