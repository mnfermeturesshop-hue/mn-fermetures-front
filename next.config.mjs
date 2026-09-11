/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Redirections 301 des anciennes URLs (site WordPress) vers le nouveau site.
  // Actives une fois le domaine mnfermetures.com basculé sur ce projet Vercel.
  async redirects() {
    const toDoc = [
      '/volet-roulant-renovation-et-neuf',
      '/volets-battant-et-coulissant-tarif-et-doc',
      '/moustiquaires-tarifs-et-documentations',
      '/porte-de-garage-tarifs-et-documentations',
      '/portail-portillon-et-cloture-tarifs-et-documentations',
      '/bloc-baie-tarif-et-documentation',
      '/brise-soleil-orientable-tarif-et-documentation',
      '/pergola-tarif-et-documentation',
    ];
    return [
      // Contact / recrutement
      { source: '/nous-contacter/recrutement', destination: '/', permanent: true },
      { source: '/nous-contacter', destination: '/#contact', permanent: true },
      // Légal
      { source: '/mentions-legales/politique-de-confidentialite', destination: '/confidentialite', permanent: true },
      // Anciens articles de blog datés (/AAAA/MM/JJ/...) -> accueil
      { source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*', destination: '/', permanent: true },
      // Ancien espace / auth / test WordPress
      { source: '/test/:path*', destination: '/pro', permanent: true },
      { source: '/login', destination: '/pro', permanent: true },
      { source: '/account', destination: '/pro', permanent: true },
      { source: '/user', destination: '/pro', permanent: true },
      { source: '/members', destination: '/pro', permanent: true },
      { source: '/logout', destination: '/', permanent: true },
      // Produits (toutes les sous-pages) -> catalogue gammes
      { source: '/produits/:slug*', destination: '/gammes', permanent: true },
      { source: '/motorisation-solaire-2', destination: '/gammes', permanent: true },
      // Tarifs & documentation -> page documentation
      ...toDoc.map((source) => ({ source, destination: '/documentation', permanent: true })),
      { source: '/espace-pro', destination: '/pro', permanent: true },
      // Pages institutionnelles
      { source: '/professionnel', destination: '/pro', permanent: true },
      { source: '/particulier', destination: '/', permanent: true },
      { source: '/pourquoi-nous-choisir', destination: '/', permanent: true },
      { source: '/actualites', destination: '/', permanent: true },
      { source: '/page-photos', destination: '/', permanent: true },
    ];
  },
  // En-têtes de sécurité (audit S11)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
};
export default nextConfig;
