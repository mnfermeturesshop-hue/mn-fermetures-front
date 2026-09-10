'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { TrustBar } from './TrustBar';
import { Footer } from './Footer';

// Routes « site vitrine » qui fournissent leur propre en-tête/pied de page minimal
// et n'affichent donc pas le chrome de l'application pro (recherche, panier, méga-menu).
const VITRINE_ROUTES = ['/accueil'];

function isVitrine(pathname: string | null): boolean {
  if (!pathname) return false;
  return VITRINE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

/** En-tête applicatif (Header + TrustBar) — masqué sur les routes vitrine. */
export function AppHeader() {
  if (isVitrine(usePathname())) return null;
  return (
    <>
      <Header />
      <TrustBar />
    </>
  );
}

/** Pied de page applicatif — masqué sur les routes vitrine. */
export function AppFooter() {
  if (isVitrine(usePathname())) return null;
  return <Footer />;
}
