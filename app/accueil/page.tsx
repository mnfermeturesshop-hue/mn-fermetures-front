import { redirect } from 'next/navigation';

// La vitrine est désormais servie sur `/`. On conserve `/accueil` (URL de
// prévisualisation) en simple redirection permanente vers la home.
export default function AccueilRedirect() {
  redirect('/');
}
