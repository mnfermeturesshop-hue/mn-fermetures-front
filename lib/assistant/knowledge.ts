/**
 * Base de connaissances documentaire de l'assistant — extraite FIDÈLEMENT de la
 * page /documentation et des règles métier stables. L'assistant s'appuie dessus
 * pour répondre aux questions techniques (pose, réglage, dimensionnement) SANS
 * inventer : chaque entrée est une donnée vérifiée, avec un lien vers la source.
 *
 * Les procédures longues (réglage moteur pas à pas) ne sont pas recopiées ici :
 * l'entrée renvoie vers la section détaillée de /documentation.
 */
export interface DocEntry {
  id: string;
  titre: string;
  mots_cles: string[];
  contenu: string;
  lien?: string;
}

export const KNOWLEDGE: DocEntry[] = [
  {
    id: 'tablier-largeur-finie',
    titre: 'Calcul de la largeur de tablier fini',
    mots_cles: ['tablier', 'largeur', 'coulisse', 'déduction', 'fini', 'dos de coulisse', 'dimension'],
    contenu:
      "Largeur du tablier fini = largeur dos de coulisse − déduction selon la coulisse.\n" +
      "Coulisses RÉNOVATION : 53×22 mm → −68 mm ; 66×27 mm → −70 mm ; 75×27 mm → −88 mm ; 95×34 mm → −92 mm.\n" +
      "Coulisses TRADITIONNELLES : 40×22 mm → −20 mm ; 40×27 mm → −20 mm ; 60×27 mm → −20 mm ; 45×22 mm → −30 mm ; 45×27 mm → −30 mm.\n" +
      "Un outil de calcul interactif est disponible sur la page Documentation.",
    lien: '/documentation',
  },
  {
    id: 'abaques-moteurs',
    titre: 'Dimensionnement moteur (abaques)',
    mots_cles: ['abaque', 'moteur', 'dimensionnement', 'puissance', 'newton', 'choisir', 'motorisation', 'poids', 'surface'],
    contenu:
      "Un outil d'abaque moteur est disponible sur la page Documentation pour dimensionner le moteur selon les caractéristiques du volet. " +
      "En pratique, les configurateurs sur mesure sélectionnent automatiquement le moteur adapté aux dimensions saisies : pour une commande, s'appuyer sur le configurateur. Pour un cas limite ou particulier, orienter vers le commercial.",
    lien: '/documentation',
  },
  {
    id: 'moteurs-prerégles',
    titre: 'Moteurs préréglés en atelier',
    mots_cles: ['préréglé', 'atelier', 'renobox', 'minibox', 'bloc baie', 'tradi', 'coffre tunnel', 'réglage', 'usine'],
    contenu:
      "Produits livrés avec moteur PRÉRÉGLÉ en atelier : RENOBOX, MINIBOX, BLOC BAIE, TRADI + COFFRE TUNNEL. " +
      "Les autres produits TRADI sont livrés avec moteur NON préréglé : il faut suivre la procédure de mise en service (voir la section moteur de la Documentation).",
    lien: '/documentation',
  },
  {
    id: 'sens-rotation',
    titre: 'Sens de rotation du moteur',
    mots_cles: ['sens', 'rotation', 'inversé', 'monte descend', 'moteur', 'fins de course'],
    contenu:
      "Ne cherchez pas à changer le sens de rotation : le moteur détermine automatiquement son sens en 2 cycles maximum après le réglage des fins de course.",
    lien: '/documentation',
  },
  {
    id: 'reglage-somfy-rs100',
    titre: 'Réglage moteur Somfy RS100 IO',
    mots_cles: ['somfy', 'rs100', 'io', 'réglage', 'mise en service', 'fins de course', 'mode usine', 'télécommande', 'point de commande', 'programmer'],
    contenu:
      "La page Documentation détaille pas à pas, pour le moteur Somfy RS100 IO : vérifier si le moteur est réglé, la mise en service automatique et manuelle, la modification des fins de course (auto/manuelle), et le passage en mode usine. Toujours mettre UN SEUL moteur sous tension à la fois. Renvoie l'utilisateur vers cette section pour la procédure complète.",
    lien: '/documentation',
  },
  {
    id: 'reglage-gaposa',
    titre: 'Réglage moteur Gaposa',
    mots_cles: ['gaposa', 'réglage', 'appairer', 'émetteur', 'télécommande', 'sens de rotation', 'fins de course', 'mise en service'],
    contenu:
      "La page Documentation détaille la procédure Gaposa : appairer l'émetteur, régler le sens de rotation puis les fins de course. Renvoie l'utilisateur vers cette section pour le détail des manipulations (boutons TX / FC).",
    lien: '/documentation',
  },
  {
    id: 'motorisations',
    titre: 'Motorisations proposées',
    mots_cles: ['motorisation', 'somfy', 'mn', 'io', 'rts', 'solaire', 'filaire', 'radio', 'émetteur', 'tahoma', 'situo', 'amy'],
    contenu:
      "Marques : Somfy et MN. Types : filaire, radio, solaire. Émetteurs selon la marque (portatif, mural ; côté Somfy io : Situo, Amy, box TaHoma switch en option). Le choix précis (marque, type, émetteurs, options) se fait dans le configurateur du produit ; pour les options disponibles et les limites, utiliser l'outil des capacités configurateur.",
    lien: '/documentation',
  },
  {
    id: 'livraison-franco',
    titre: 'Livraison et franco de port',
    mots_cles: ['livraison', 'franco', 'port', 'frais', 'délai', 'express', 'occitanie', 'seuil'],
    contenu:
      "Franco de port dès 400 € HT de commande (Occitanie). En dessous : port standard 26 € HT, ou express 24h 42 € HT. Les prix affichés sont HT nets (remises pro déjà appliquées). Pour une date de livraison précise, orienter vers le commercial (pas de suivi transporteur en temps réel).",
  },
  {
    id: 'configurateurs',
    titre: 'Configurateurs sur mesure disponibles',
    mots_cles: ['configurateur', 'sur mesure', 'volet roulant', 'traditionnel', 'rénovation', 'bloc baie', 'tablier', 'store banne', 'configurer'],
    contenu:
      "Produits configurables sur mesure : volet roulant traditionnel, volet roulant rénovation, volet roulant bloc-baie, tablier sur mesure (et store banne). Pour les dimensions mini/maxi, options et limites exactes d'un configurateur, utiliser l'outil des capacités configurateur.",
  },
  {
    id: 'laquage',
    titre: 'Laquage des coloris RAL',
    mots_cles: ['laquage', 'ral', 'coloris', 'laqué', 'peinture', 'forfait', 'couleur'],
    contenu:
      "Les coloris RAL laqués (hors coloris standard) entraînent un forfait de laquage de 77 € HT par commande, offert dès 2000 € HT de commande.",
  },
];

const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Recherche par mots-clés (aucun appel externe). Renvoie les entrées les plus pertinentes. */
export function rechercherDoc(question: string, limit = 3): DocEntry[] {
  const tokens = norm(question).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  if (tokens.length === 0) return [];
  const scored = KNOWLEDGE.map((e) => {
    const titre = norm(e.titre);
    const cles = e.mots_cles.map(norm);
    const contenu = norm(e.contenu);
    let score = 0;
    for (const t of tokens) {
      if (cles.some((c) => c.includes(t))) score += 3;
      if (titre.includes(t)) score += 2;
      if (contenu.includes(t)) score += 1;
    }
    return { e, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.e);
}
