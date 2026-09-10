'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/** En-tête minimal du site vitrine (public) — nav inline au desktop, menu hamburger sur mobile. */
export function VitrineHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="vt-header">
      <div className="vt-wrap vt-header-in">
        <Link href="#top" className="vt-logo" aria-label="MN Fermetures, accueil" onClick={close}>
          <Image src="/logo.png" alt="MN Fermetures" width={150} height={58} priority style={{ objectFit: 'contain', height: 'auto' }} />
        </Link>

        {/* Nav desktop */}
        <nav className="vt-nav">
          <a className="vt-link" href="#produits">Produits</a>
          <a className="vt-link" href="#contact">Contact</a>
          <a className="vt-link" href="#compte">Ouvrir un compte</a>
          <Link className="btn solid" href="/pro" style={{ padding: '10px 20px' }}>
            Espace pro
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </Link>
        </nav>

        {/* Bouton hamburger (mobile) */}
        <button
          className={`vt-hamburger${open ? ' open' : ''}`}
          type="button"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Menu déroulant mobile */}
      <div className={`vt-mobile-menu${open ? ' open' : ''}`}>
        <a href="#produits" onClick={close}>Produits</a>
        <a href="#contact" onClick={close}>Contact</a>
        <a href="#compte" onClick={close}>Ouvrir un compte</a>
        <Link className="btn solid full" href="/pro" onClick={close}>Espace pro →</Link>
      </div>
    </header>
  );
}
