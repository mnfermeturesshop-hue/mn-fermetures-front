'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/store/cart';
import { useAuthStore } from '@/lib/store/auth';
import { MegaMenu } from './MegaMenu';
import { SearchBar } from './SearchBar';
import { MobileMenu } from './MobileMenu';

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

export function Header() {
  const { totalLines, openCart } = useCartStore();
  const { user, isPro, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? totalLines() : 0;

  return (
    <>
      <header className="top">
        <div className="wrap topbar">
          {/* Hamburger — mobile only */}
          <button
            className="hamburger"
            type="button"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <span /><span /><span />
          </button>

          <Link className="brand logo-pill" href="/">
            <Image
              src="/logo.png"
              alt="MN Fermetures"
              width={140}
              height={54}
              priority
              className="logo-img"
            />
          </Link>

          <SearchBar />

          {/* Icône recherche visible uniquement sur mobile */}
          <Link href="/recherche" className="mob-search-icon" aria-label="Rechercher">
            <SearchIcon />
          </Link>

          <div className="acts">
            {user ? (
              <div className="act-user">
                <Link className="act" href="/compte">
                  {isPro() && <span className="pro-chip">PRO</span>}
                  {user.name.split(' ')[0]}
                </Link>
                <button className="act" type="button" onClick={logout}>Déconnexion</button>
              </div>
            ) : (
              <Link className="act" href="/pro">
                Espace pro
              </Link>
            )}

            <button className="act primary" type="button" onClick={openCart} aria-label={`Panier (${count} article${count > 1 ? 's' : ''})`}>
              Panier
              <span className={`badge ${count > 0 ? 'badge-live' : ''}`}>{count}</span>
            </button>
          </div>
        </div>
        <MegaMenu />
      </header>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
