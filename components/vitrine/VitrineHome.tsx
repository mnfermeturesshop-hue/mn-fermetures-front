import Link from 'next/link';
import { VitrineHeader } from '@/components/vitrine/VitrineHeader';
import { VitrineFooter } from '@/components/vitrine/VitrineFooter';
import { ContactForms } from '@/components/vitrine/ContactForms';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

const PRODUCTS: { title: string; desc: string; bg: string; img?: string; icon: React.ReactNode }[] = [
  {
    title: 'Volets roulants',
    desc: 'MN Fermetures vous accompagne sur vos projets volet roulant en neuf et rénovation grâce à ses produits manuels, filaires, radio et solaires.',
    bg: 'linear-gradient(145deg,#2e6c98,#163a5f)',
    img: '/vitrine/volet-roulant.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M4 11h16M4 14h16M4 17h16" /></svg>),
  },
  {
    title: 'Volets battants & coulissants',
    desc: "En panneau isolé ou profils extrudés, les volets battants et coulissants en neuf et rénovation s'adaptent à toutes vos envies et configurations.",
    bg: 'linear-gradient(145deg,#6f93ad,#2e6c98)',
    img: '/vitrine/volets-battants.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="3" y="4" width="8" height="16" rx="1" /><rect x="13" y="4" width="8" height="16" rx="1" /><path d="M6 4v16M16 4v16" /></svg>),
  },
  {
    title: 'Porte de garage enroulable',
    desc: "Protégeant l'habitat, la porte de garage enroulable offre un passage optimal. Sans encombrement au plafond ni au mur, tout le garage reste accessible.",
    bg: 'linear-gradient(145deg,#8b97a3,#6f93ad)',
    img: '/vitrine/porte-garage.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M3 20V9l9-5 9 5v11" /><path d="M3 11h18M3 14h18M3 17h18" /></svg>),
  },
  {
    title: 'Moustiquaires',
    desc: 'Limitez les intrusions de moustiques et autres insectes indésirables grâce à notre large gamme : moustiquaire éco, plissée, enroulable verticale et latérale, fixe…',
    bg: 'linear-gradient(145deg,#1d4e7a,#0e2f4c)',
    img: '/vitrine/moustiquaire.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M8 4v16M12 4v16M16 4v16M4 8h16M4 12h16M4 16h16" opacity=".8" /></svg>),
  },
  {
    title: 'Portails & clôtures',
    desc: 'Alu ou PVC, adaptez vos offres portail battant, coulissant, portillon et clôture à toutes les demandes avec nos produits.',
    bg: 'linear-gradient(145deg,#2e6c98,#1d4e7a)',
    img: '/vitrine/portails-clotures.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><path d="M3 20V9l4-2 5 2 5-2 4 2v11" /><path d="M3 20h18M8 9v11M12 8v12M16 9v11" /></svg>),
  },
  {
    title: 'Bloc baie',
    desc: 'Le bloc baie associe menuiserie et volet roulant en un ensemble monobloc prêt à poser, pour un chantier plus rapide en neuf comme en rénovation.',
    bg: 'linear-gradient(145deg,#163a5f,#0e2f4c)',
    img: '/vitrine/bloc-baie.jpg',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="4" y="3" width="16" height="5" rx="1" /><rect x="4" y="9" width="16" height="12" rx="1" /><path d="M12 9v12" /></svg>),
  },
  {
    title: "Kits d'axes & motorisation",
    desc: "Kits d'axe complets et motorisations Somfy & MN, prêts à poser pour équiper ou moderniser vos volets roulants.",
    bg: 'linear-gradient(145deg,#2e6c98,#6f93ad)',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><rect x="3" y="9" width="18" height="6" rx="3" /><circle cx="6" cy="12" r="1.4" fill="#fff" /><path d="M19 9V7a2 2 0 0 0-2-2M19 15v2a2 2 0 0 1-2 2" /></svg>),
  },
  {
    title: 'Pièces détachées',
    desc: 'Tabliers sur mesure, lames, profilés, coulisses et pièces détachées : la référence exacte pour chaque réparation ou remplacement.',
    bg: 'linear-gradient(145deg,#8b97a3,#163a5f)',
    icon: (<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>),
  },
];

const REASSURE: { label: string; icon: React.ReactNode }[] = [
  { label: 'Réactivité', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-3 7h6l-5 13 2-9H7z" /></svg>) },
  { label: 'Innovation', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2Z" /></svg>) },
  { label: 'Qualité', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" /></svg>) },
  { label: 'Fabrication française', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21V8l9-5 9 5v13" /><path d="M9 21v-6h6v6" /></svg>) },
  { label: 'Commercial dédié', icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-8 0v2" /><circle cx="12" cy="7" r="4" /></svg>) },
];

const ACCOUNT_PERKS = ['Tarifs négociés HT', 'Devis PDF instantané', 'Franco dès 400 € HT', 'Paiement à 30 jours'];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'MN Fermetures',
  description:
    "Fabricant français de volets roulants, blocs baie, volets battants et coulissants, portes de garage enroulables, portails, clôtures, moustiquaires et pièces détachées pour les professionnels.",
  url: SITE,
  telephone: '+33467780663',
  email: 'contact@mnfermetures.com',
  foundingDate: '1986',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Chemin du Mas de Pastrou',
    postalCode: '34560',
    addressLocality: 'Villeveyrac',
    addressRegion: 'Occitanie',
    addressCountry: 'FR',
  },
  location: [
    { '@type': 'Place', name: 'Site de Villeveyrac', address: { '@type': 'PostalAddress', streetAddress: 'Chemin du Mas de Pastrou', postalCode: '34560', addressLocality: 'Villeveyrac', addressCountry: 'FR' } },
    { '@type': 'Place', name: 'Site de Pérols', address: { '@type': 'PostalAddress', streetAddress: '2066 Av. Marcel Pagnol', postalCode: '34470', addressLocality: 'Pérols', addressCountry: 'FR' } },
  ],
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Occitanie' },
    ...['Hérault', 'Gard', 'Aude', 'Pyrénées-Orientales', 'Vaucluse'].map((d) => ({ '@type': 'AdministrativeArea', name: d })),
  ],
};

/** Contenu de la page d'accueil « site vitrine » (public). Rendu sur `/`. */
export function VitrineHome() {
  return (
    <div className="vitrine" id="top">
      <VitrineHeader />

      {/* HERO */}
      <section className="vt-hero">
        <div className="vt-wrap vt-hero-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <span className="eyebrow" style={{ color: 'var(--somfy)' }}>Fabricant français depuis 40 ans</span>
            <h1>Spécialiste de la fermeture pour les professionnels en Occitanie, depuis 40&nbsp;ans</h1>
            <p className="vt-hero-lead">
              Volets roulants, blocs baie, volets battants et coulissants, portes de garage enroulables,
              portails, portillons, clôtures et moustiquaires, fabriqués et assemblés en France, à Villeveyrac
              et Pérols (Hérault), pour les professionnels de toute l&apos;Occitanie.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
              <Link href="/pro" className="btn gold lg">
                Accéder à l&apos;espace pro
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </Link>
              <a href="#compte" className="btn ghost-inv lg">Ouvrir un compte</a>
            </div>
          </div>
          {/* Visuel hero (photo produit) avec repli dégradé marque si le fichier est absent. */}
          <div
            className="vt-hero-visual"
            aria-hidden="true"
            style={{ background: "linear-gradient(120deg, rgba(16,49,79,.28), rgba(14,47,76,.08)), url('/vitrine/bloc-baie.jpg') center / cover no-repeat, linear-gradient(155deg,#2e6c98 0%,#163a5f 55%,#0e2f4c 100%)" }}
          />
        </div>
      </section>

      {/* RÉASSURANCE (bandeau clair, sous le hero) */}
      <section className="vt-reassure">
        <div className="vt-wrap vt-reassure-row">
          {REASSURE.map((r) => (
            <div className="vt-reassure-item" key={r.label}>{r.icon}<span>{r.label}</span></div>
          ))}
        </div>
      </section>

      {/* PRÉSENTATION */}
      <section className="vt-sec">
        <div className="vt-wrap">
          <div className="vt-lead">
            <h2 style={{ fontSize: 34, lineHeight: 1.12 }}>Fabricant de solutions de fermeture sur mesure</h2>
            <p className="vt-lead-p">
              MN Fermetures est un fabricant de volets roulants, blocs baie, volets battants, volets coulissants
              ainsi que de portes de garage enroulables, de portails, portillons et clôtures en aluminium ou PVC
              et de moustiquaires.
            </p>
            <p className="vt-lead-strong">Réactivité, innovation et qualité sont au cœur de nos engagements.</p>
            <p className="vt-lead-p">
              Basés en Occitanie, nous accompagnons les professionnels de l&apos;
              <strong style={{ color: 'var(--navy-700)', fontWeight: 600 }}>Hérault (34), du Gard (30), de l&apos;Aude (11), des Pyrénées-Orientales (66) et du Vaucluse (84)</strong>
              , avec un commercial dédié par secteur.
            </p>
          </div>
          <div className="vt-stats-row">
            <div><div className="n">40 ans</div><div className="l">d&apos;expérience à vos côtés</div></div>
            <div><div className="n">8</div><div className="l">familles de produits</div></div>
            <div><div className="n">2 sites</div><div className="l">de production en Occitanie</div></div>
            <div><div className="n">100&nbsp;%</div><div className="l">réservé aux professionnels</div></div>
          </div>
        </div>
      </section>

      {/* PRODUITS */}
      <section className="vt-sec alt" id="produits">
        <div className="vt-wrap">
          <div className="vt-sec-head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 style={{ fontSize: 32 }}>Des fermetures aux pièces détachées</h2>
            </div>
            <Link href="/pro" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Configurer dans l&apos;espace pro →</Link>
          </div>
          <div className="vt-grid">
            {PRODUCTS.slice(0, 6).map((p) => (
              <div className="vt-card" key={p.title}>
                <div
                  className="vt-card-media"
                  style={p.img
                    ? { background: `linear-gradient(0deg, rgba(14,47,76,.10), rgba(14,47,76,.10)), url('${p.img}') center / cover no-repeat, ${p.bg}` }
                    : { background: p.bg }}
                >
                  {p.img ? null : p.icon}
                </div>
                <div className="vt-card-body">
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="vt-subhead">Accessoires &amp; pièces détachées</div>
          <div className="vt-acc">
            {PRODUCTS.slice(6).map((p) => (
              <div className="vt-acc-card" key={p.title}>
                <div className="vt-acc-ic">{p.icon}</div>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OUVERTURE DE COMPTE */}
      <section className="vt-sec" id="compte">
        <div className="vt-wrap">
          <div className="vt-account">
            <div className="vt-account-head">
              <h2 style={{ fontSize: 30 }}>Ouvrez votre compte professionnel</h2>
              <p style={{ color: 'var(--muted)', fontSize: 16 }}>
                Accédez à vos tarifs préférentiels HT, générez vos devis, suivez vos commandes et échangez
                avec votre commercial dédié. Validation de votre compte sous 24&nbsp;h ouvrées.
              </p>
            </div>
            <ul className="vt-perks">
              {ACCOUNT_PERKS.map((perk) => (
                <li key={perk}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  {perk}
                </li>
              ))}
            </ul>
            <div className="vt-account-cta">
              <Link href="/pro?tab=register" className="btn solid lg">Ouvrir un compte pro</Link>
              <Link href="/pro" className="btn ghost lg">J&apos;ai déjà un compte</Link>
            </div>
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 18 }}>Une question ? 04 67 78 06 63</p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="vt-sec alt" id="contact">
        <div className="vt-wrap">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 30, textAlign: 'center', alignItems: 'center' }}>
            <h2 style={{ fontSize: 32 }}>Parlons de votre projet</h2>
            <p style={{ color: 'var(--muted)', maxWidth: 560 }}>Professionnel ou particulier, notre équipe vous répond sous 24&nbsp;h ouvrées.</p>
          </div>
          <div className="vt-contact-grid">
            <ContactForms />
            <div className="vt-coords">
              <h3 style={{ color: '#fff', fontSize: 18 }}>Nous joindre</h3>
              <div className="vt-coord">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></svg>
                <div><div style={{ fontWeight: 700 }}>04 67 78 06 63</div><div className="sub">Lun. au ven. 8h–17h</div></div>
              </div>
              <div className="vt-coord">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7L22 6" /></svg>
                <div><div style={{ fontWeight: 700 }}>contact@mnfermetures.com</div><div className="sub">Réponse sous 24 h ouvrées</div></div>
              </div>
              <div className="vt-coord">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                <div><div style={{ fontWeight: 700 }}>2 sites de production</div><div className="sub">Chemin du Mas de Pastrou, 34560 Villeveyrac<br />2066 Av. Marcel Pagnol, 34470 Pérols</div></div>
              </div>
              <div className="vt-coord">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--somfy)" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" /></svg>
                <div><div style={{ fontWeight: 700 }}>Zone d&apos;intervention</div><div className="sub">Occitanie et Vaucluse : Hérault, Gard, Aude, P.-O., Vaucluse</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BANDEAU ESPACE PRO */}
      <section className="vt-pro-band" id="espace-pro">
        <div className="vt-wrap vt-pro-band-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ color: '#fff', fontSize: 28 }}>Votre espace professionnel MN Fermetures</h2>
            <p style={{ color: '#c7d5e2', maxWidth: 620, fontSize: 16 }}>
              Configurez vos produits sur mesure, obtenez le prix HT net instantané, éditez vos devis et suivez
              vos commandes, le tout au même endroit.
            </p>
          </div>
          <Link href="/pro" className="btn gold lg" style={{ whiteSpace: 'nowrap' }}>
            Accéder à l&apos;espace pro
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </Link>
        </div>
      </section>

      <VitrineFooter />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
