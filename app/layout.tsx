import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};
import { Archivo, Inter, JetBrains_Mono } from 'next/font/google';
import './design-tokens.css';
import './globals.css';
import { AppHeader, AppFooter } from '@/components/layout/ChromeGate';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { ToastContainer } from '@/components/ui/Toast';
import { OrganizationJsonLd } from '@/components/seo/JsonLd';
import { AuthSync } from '@/components/auth/AuthSync';
import { SurchargeSync } from '@/components/pricing/SurchargeSync';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { CookieBanner } from '@/components/consent/CookieBanner';

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

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mnfermetures.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'MN Fermetures, fabricant de fermetures pour les professionnels en Occitanie',
    template: '%s | MN Fermetures',
  },
  description:
    'Fabricant français depuis 40 ans : volets roulants, blocs baie, volets battants et coulissants, portes de garage enroulables, portails, clôtures, moustiquaires, kits d\'axes et pièces détachées. Réservé aux professionnels.',
  keywords: ['fabricant volet roulant', 'volet roulant professionnel', 'bloc baie', 'porte de garage enroulable', 'moustiquaire', 'portail aluminium', 'kit axe volet roulant', 'pièces détachées volet roulant', 'fabricant fermetures Occitanie', 'motorisation Somfy'],
  authors: [{ name: 'MN Fermetures' }],
  openGraph: {
    siteName: 'MN Fermetures',
    locale: 'fr_FR',
    type: 'website',
    title: 'MN Fermetures, fabricant de fermetures pour les professionnels en Occitanie',
    description: 'Fabricant français depuis 40 ans : volets, blocs baie, portes de garage, portails, clôtures, moustiquaires et pièces détachées. Réservé aux professionnels.',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  verification: { google: 'w1_5UzyCRdJpQ4wLyvpLFKSyi88m1R_xzH2LYe3_HZ8' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <AuthSync />
        <SurchargeSync />
        <AppHeader />
        <main>{children}</main>
        <AppFooter />
        <CartDrawer />
        <ToastContainer />
        <AssistantWidget />
        <CookieBanner />
        <OrganizationJsonLd />
      </body>
    </html>
  );
}
