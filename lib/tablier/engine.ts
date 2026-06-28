import type { LameTablier } from './types';
import { LAMES } from './data';

export interface ConfigTablier {
  slug: string;
  colorisCode: string;
  largeur: number;
  hauteur: number;
  avecAttacheRigide: boolean;
  avecVerrou: boolean;
}

export interface ResultatTablier {
  lame: LameTablier;
  largeurSnap: number;
  hauteurSnap: number;
  prixBase: number;
  supAttache: number;
  supVerrou: number;
  total: number;
}

function snapUp(value: number, values: number[]): number | null {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.find((v) => v >= value) ?? null;
}

function lookupSupplement(bareme: Record<number, number> | undefined, largeur: number): number {
  if (!bareme) return 0;
  const keys = Object.keys(bareme)
    .map(Number)
    .sort((a, b) => a - b);
  const key = keys.find((k) => k >= largeur);
  return key !== undefined ? bareme[key] : 0;
}

export function resoudrePrix(config: ConfigTablier): ResultatTablier | null {
  const lame = LAMES.find((l) => l.slug === config.slug);
  if (!lame) return null;

  const largeurSnap = snapUp(config.largeur, lame.largeurs);
  const hauteurSnap = snapUp(config.hauteur, lame.hauteurs);
  if (largeurSnap === null || hauteurSnap === null) return null;

  const row = lame.grille[hauteurSnap];
  if (!row) return null;

  const colIdx = lame.largeurs.indexOf(largeurSnap);
  const prixBase = row[colIdx];
  if (prixBase === null || prixBase === undefined) return null;

  const supAttache = config.avecAttacheRigide
    ? lookupSupplement(lame.pvAttache, largeurSnap)
    : 0;

  const supVerrou = config.avecVerrou
    ? lookupSupplement(lame.pvVerrou, largeurSnap)
    : 0;

  return {
    lame,
    largeurSnap,
    hauteurSnap,
    prixBase,
    supAttache,
    supVerrou,
    total: prixBase + supAttache + supVerrou,
  };
}

export { LAMES };
