import Link from 'next/link';
import Image from 'next/image';

/** En-tête minimal du site vitrine (public) — sans recherche, panier ni méga-menu. */
export function VitrineHeader() {
  return (
    <header className="vt-header">
      <div className="vt-wrap vt-header-in">
        <Link href="#top" className="vt-logo" aria-label="MN Fermetures, accueil">
          <Image src="/logo.png" alt="MN Fermetures" width={150} height={58} priority style={{ objectFit: 'contain', height: 'auto' }} />
        </Link>
        <nav className="vt-nav">
          <a className="vt-link" href="#produits">Produits</a>
          <a className="vt-link" href="#contact">Contact</a>
          <a className="vt-link" href="#compte">Ouvrir un compte</a>
          <Link className="btn solid" href="/pro" style={{ padding: '10px 20px' }}>
            Espace pro
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
