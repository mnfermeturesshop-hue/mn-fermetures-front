import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
import { Archivo, Inter, JetBrains_Mono } from 'next/font/google';
import './design-tokens.css';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { TrustBar } from '@/components/layout/TrustBar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ToastContainer } from '@/components/ui/Toast';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
});

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mmfermetures.fr';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'MN Fermetures — Accessoires volets roulants',
    template: '%s | MN Fermetures',
  },
  description:
    'Tabliers sur mesure, kits axes, motorisations Somfy & MN, profilés et pièces détachées. Prix HT, livraison offerte dès 400 € HT en Occitanie.',
  keywords: ['volet roulant', 'tablier sur mesure', 'motorisation Somfy', 'accessoires fermeture', 'pièces détachées volet'],
  authors: [{ name: 'MN Fermetures' }],
  openGraph: {
    siteName: 'MN Fermetures',
    locale: 'fr_FR',
    type: 'website',
    title: 'MN Fermetures — Accessoires volets roulants',
    description: 'Tabliers sur mesure, kits axes, motorisations Somfy & MN. Livraison offerte dès 400 € HT.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Header />
        <TrustBar />
        <main>{children}</main>
        <Footer />
        <CartDrawer />
        <ToastContainer />
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
