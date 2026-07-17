/* Définition « Volet roulant traditionnel » au format du moteur UNIVERSEL (v2),
   produite par scripts/build-vr-v2.cjs à partir du def v1 validé (iso-prix
   garanti : 147 323 comparaisons v1↔v2 sans écart).
   Sert de repli quand la table `configurators` n'est pas encore peuplée. */

import type { DefV2 } from './v2/types';
import raw from './data/volet-roulant-traditionnel.v2.json';

export const VR_TRADI_SEED = raw as unknown as DefV2;
