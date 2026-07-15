/* Définition complète du configurateur « Volet roulant traditionnel »,
   générée depuis le tarif fabricant (docs/TARIF TRADI 2026 VF.xlsx) par
   scripts/build-vr-tradi.cjs → lib/configurateur/data/…json.

   12 grilles (pose indépendant / coffre tunnel / express × lame CD942/56/55
   × moteur MN/Somfy, couches filaire & radio) + attaches rigides, options,
   coloris, limites. Sert de repli quand la table `configurators` (import
   admin) n'est pas encore peuplée. */

import type { ConfiguratorDef } from './types';
import raw from './data/volet-roulant-traditionnel.json';

export const VR_TRADI_SEED = raw as unknown as ConfiguratorDef;
