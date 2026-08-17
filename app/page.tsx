import Link from 'next/link';
import { listConfigurators } from '@/lib/configurateur/loader';
import { FEATURED_CONFIGURATORS as CONFIGURATORS } from '@/lib/configurateur/featured';

const QUICK_LINKS = [
  { label: 'Nos gammes', sub: 'Catalogue par nomenclature', href: '/gammes', icon: '🗂' },
  { label: 'Mes devis', sub: 'Créer & retrouver vos devis', href: '/devis', icon: '📄' },
  { label: 'Mes commandes', sub: 'Suivi & documents', href: '/compte', icon: '📦' },
];

const B2B_STRIP = [
  ['🚚', 'Expédition 24-48h'],
  ['✓', 'Franco de port dès 400 € HT'],
  ['🏦', 'Virement 30 j fin de mois'],
  ['％', 'Remises pro négociées'],
  ['🎧', 'Commercial dédié'],
];

const DOCS = [
  ['48', 'Notices & plans de montage'],
  ['12', 'Fiches conseil'],
  ['9', 'Abaques moteurs'],
  ['2', 'Catalogues en ligne'],
];

export default async function HomePage() {
  // N'afficher que les configurateurs ACTIFS (l'admin peut en désactiver depuis le back-office).
  let activeSlugs: Set<string>;
  try {
    const configs = await listConfigurators();
    activeSlugs = new Set(configs.filter((c) => c.active).map((c) => c.slug));
  } catch {
    activeSlugs = new Set(CONFIGURATORS.map((c) => c.slug));
  }
  const configurators = CONFIGURATORS.filter((c) => activeSlugs.has(c.slug));

  return (
    <>
      {/* HERO compact B2B */}
      <section className="hero home-hero">
        <div className="wrap">
          <span className="eyebrow">Tarif 2026 · Espace professionnel</span>
          <h1>Configurez vos solutions de fermetures sur mesure — prix HT à la dimension.</h1>
          <p className="lead">
            Volets roulants, Volets battants, Moustiquaires, Portails &amp; Clôtures, Tabliers seuls :
            le prix HT net (remise pro déduite) est calculé instantanément. Franco dès 400 € HT.
          </p>
          <div className="home-hero-cta">
            <Link className="btn solid lg" href="#configurateurs">Configurer un produit</Link>
            <Link className="btn ghost lg" href="/compte">Mon compte</Link>
          </div>
        </div>
      </section>

      {/* VOS CONFIGURATEURS — le cœur */}
      <section className="block" id="configurateurs">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Sur mesure — prix instantané</span>
              <h2>Vos configurateurs</h2>
            </div>
            <Link className="link-all" href="/gammes">Voir toutes les gammes →</Link>
          </div>
          <div className="config-grid">
            {configurators.map((c) => (
              <Link className="config-card" href={c.href} key={c.href}>
                <div className="config-ic">{c.icon}</div>
                <div className="config-body">
                  <b>{c.name}</b>
                  <span>{c.desc}</span>
                </div>
                <span className="config-cta">Configurer →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RACCOURCIS */}
      <section className="block alt">
        <div className="wrap">
          <div className="quick-links">
            {QUICK_LINKS.map((q) => (
              <Link className="quick-link" href={q.href} key={q.href}>
                <span className="quick-ic">{q.icon}</span>
                <span className="quick-txt"><b>{q.label}</b><span>{q.sub}</span></span>
                <span className="quick-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DOCUMENTATION (conservée) */}
      <section className="block">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <span className="eyebrow">Aide à la pose</span>
              <h2>Documentation</h2>
            </div>
          </div>
          <div className="docs">
            {DOCS.map(([n, label]) => (
              <div className="doc" key={label}>
                <div className="n">{n}</div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RÉASSURANCE B2B */}
      <section className="b2b-strip">
        <div className="wrap">
          <div className="b2b-strip-row">
            {B2B_STRIP.map(([ic, label]) => (
              <div className="b2b-item" key={label}>
                <span className="b2b-ic">{ic}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
