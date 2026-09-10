import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { VitrineHome } from '@/components/vitrine/VitrineHome';

export const metadata: Metadata = {
  title: { absolute: 'MN Fermetures - Fermetures pour professionnels en Occitanie' },
  description:
    "Fabricant français depuis 40 ans : volets roulants, blocs baie, volets battants et coulissants, portes de garage enroulables, portails, clôtures, moustiquaires, kits d'axes et pièces détachées. Réservé aux professionnels. Hérault, Gard, Aude, Pyrénées-Orientales, Vaucluse.",
  alternates: { canonical: '/' },
  openGraph: {
    title: 'MN Fermetures, fabricant de fermetures pour les professionnels en Occitanie',
    description:
      "40 ans de savoir-faire. Volets, blocs baie, portes de garage, portails, clôtures, moustiquaires et pièces détachées, fabriqués en France pour les professionnels.",
  },
};

export default async function HomePage() {
  // Site vitrine public sur `/`. Un utilisateur identifié est envoyé vers son
  // espace (« site une fois le client identifié »). Fail-open : en cas d'erreur
  // de session, on affiche la vitrine publique.
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect('/compte');
  } catch (err) {
    // `redirect()` lève une exception de contrôle interne à Next — la relayer.
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    // Toute autre erreur (session/réseau) : on rend la vitrine publique.
  }

  return <VitrineHome />;
}
