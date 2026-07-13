'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { MENU, isNavGroup } from '@/lib/catalog/mock';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { toast } from '@/components/ui/Toast';
import { B2C_ENABLED } from '@/lib/config';

interface Props { isOpen: boolean; onClose: () => void }

interface SuggestItem {
  slug: string;
  name: string;
  categorySlug: string;
  pricingType: string;
  reference?: string;
  imageUrl?: string | null;
  priceHT?: number | null;
}

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export function MobileMenu({ isOpen, onClose }: Props) {
  const [openTop, setOpenTop]       = useState<string | null>(null);
  const [openGroup, setOpenGroup]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([]);
  const { totalLines, openCart }    = useCartStore();
  const { user, isPro, logout }     = useAuthStore();
  const router = useRouter();
  const count  = totalLines();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchSuggest = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
    const data: SuggestItem[] = await res.json();
    setSuggestions(data);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggest(v), 200);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSuggestions([]);
    onClose();
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  };

  const goToProduct = (slug: string) => {
    setSuggestions([]);
    onClose();
    router.push(`/produit/${slug}`);
  };

  // Mobile : fige le défilement de la page derrière le menu ouvert
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

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

        {/* Barre de recherche */}
        <div className="mob-search-area">
          <form className="search" onSubmit={handleSearchSubmit}>
            <input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Référence, produit, marque…"
              autoComplete="off"
              aria-label="Rechercher"
            />
            <button type="submit">OK</button>
          </form>

          {suggestions.length > 0 && (
            <div className="mob-suggest">
              {suggestions.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  className="mob-suggest-item"
                  onClick={() => goToProduct(r.slug)}
                >
                  <div className="suggest-thumb">
                    {r.imageUrl ? (
                      <Image src={r.imageUrl} alt={r.name} width={36} height={36} style={{ objectFit: 'contain' }} unoptimized />
                    ) : (
                      <span className="suggest-glyph">{GLYPHS[r.categorySlug] ?? '▣'}</span>
                    )}
                  </div>
                  <div className="suggest-left">
                    {r.reference && <span className="suggest-ref">{r.reference}</span>}
                    <span className="suggest-name">{r.name}</span>
                  </div>
                  {r.priceHT != null && (
                    <span className="mob-suggest-price">{euro(r.priceHT)}&nbsp;<small>HT</small></span>
                  )}
                </button>
              ))}
              <button
                type="button"
                className="mob-suggest-all"
                onClick={handleSearchSubmit}
              >
                Voir tous les résultats →
              </button>
            </div>
          )}
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
            <Link className="btn solid full" href={B2C_ENABLED ? '/connexion' : '/pro'} onClick={onClose}>
              {B2C_ENABLED ? 'Connexion' : 'Espace pro'}
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
          <Link href="/" className="mob-cat-btn" onClick={onClose}>
            <span>🏠 Accueil</span>
          </Link>

          <div className="mob-section-label">Catalogue</div>

          {/* Documentation est affichée à part dans « Ressources » (ci-dessous) — on l'exclut ici pour éviter le doublon */}
          {MENU.filter((top) => top.href !== '/documentation').map((top) => {
            const isTopOpen = openTop === top.href;
            const hasChildren = top.children && top.children.length > 0;

            return (
              <div key={top.href} className="mob-cat-group">
                {hasChildren ? (
                  <button
                    type="button"
                    className={`mob-cat-btn ${isTopOpen ? 'open' : ''}`}
                    onClick={() => toggleTop(top.href)}
                  >
                    <span>{top.icon} {top.name}</span>
                    <span className="mob-chevron">{isTopOpen ? '▲' : '▼'}</span>
                  </button>
                ) : (
                  <Link
                    href={top.href}
                    className="mob-cat-btn"
                    onClick={onClose}
                  >
                    <span>{top.icon} {top.name}</span>
                  </Link>
                )}

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

        {/* Documentation */}
        <div className="mob-cats">
          <div className="mob-section-label">Ressources</div>
          <Link href="/documentation" className="mob-cat-btn" onClick={onClose}>
            <span>📄 Documentation</span>
          </Link>
        </div>

        {/* Liens bas */}
        <div className="mob-footer-links">
          <a href="tel:0467780663">📞 04 67 78 06 63</a>
        </div>
      </nav>
    </>
  );
}
