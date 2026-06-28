export type Matiere = 'pvc' | 'alu';
export type Agrafage = 'agrafe' | 'non_agrafe';
export type AttacheParDefaut = 'souple' | 'verrou';

export interface Coloris {
  code: string;
  label: string;
  hex: string;
}

/** Supplément € HT indexé sur la largeur de commande (mm). */
export type BaremeParLargeur = Record<number, number>;

export interface LameTablier {
  slug: string;
  nom: string;
  matiere: Matiere;
  agrafage: Agrafage;
  /** Mention de fourniture affichée (ex. "fourni avec attaches souples"). */
  fourniture: string;
  coloris: Coloris[];
  /** Lignes de la grille (pas de 100 mm). */
  hauteurs: number[];
  /** Colonnes de la grille (pas de 100 mm). */
  largeurs: number[];
  /** grille[hauteur][i] aligné sur `largeurs` ; null = hors abaque. */
  grille: Record<number, (number | null)[]>;
  /** Supplément attaches rigides (absent si non proposé, ex. Alu 77). */
  pvAttache?: BaremeParLargeur;
  /** Supplément verrous automatiques avec bagues. */
  pvVerrou?: BaremeParLargeur;
  /** Type d'attache fourni par défaut ('verrou' pour Alu 77). */
  attacheParDefaut: AttacheParDefaut;
}
