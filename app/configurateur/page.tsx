import { redirect } from 'next/navigation';

// Le générateur de tablier est désormais un configurateur v2 à part entière.
// On conserve l'ancienne URL en la redirigeant vers le nouveau slug.
export default function ConfigurateurPage() {
  redirect('/configurateur/tablier-sur-mesure');
}
