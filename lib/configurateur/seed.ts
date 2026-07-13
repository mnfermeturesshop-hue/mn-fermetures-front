/* =====================================================================
   MN FERMETURES — Seed du configurateur « Volet roulant traditionnel »
   Données de démarrage transcrites du Tarif TRADI 2026 (page 10), pour la
   TRANCHE v1 : pose indépendant · lame alu CD942 · motorisation MN
   (filaire + radio) · coloris standards.

   ⚠️ PARTIEL : seules les 3 premières bandes de hauteur (≤ 1050) sont
   saisies ici. Le tarif complet (toutes lames/hauteurs/moteurs) est
   destiné à être chargé via l'import Excel admin, qui remplacera ce seed
   dans la table `configurators`.
   ===================================================================== */

import type { ConfiguratorDef } from './types';

// Colonnes largeur (bornes hautes de bande) — page 10.
const W = [450, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100];

// Grille CD942 · motorisation MN — 3 bandes de hauteur (850, 950, 1050).
const CD942_MN = {
  filaire: {
    850:  [407, null, 309, 316, 329, 342, 351, 355, 367, 380, 388, 401, 416, 428, 440, 452, 464],
    950:  [416, null, 318, 325, 338, 351, 355, 367, 380, 392, 401, 407, 432, 444, 456, 469, 469],
    1050: [421, null, 327, 338, 351, 355, 367, 380, 397, 409, 407, 420, 448, 464, 477, 477, 489],
  } as Record<number, (number | null)[]>,
  radio: {
    850:  [null, 540, 528, 540, 548, 560, 572, 569, 580, 588, 596, 623, 618, 629, 640, 648, 666],
    950:  [null, 548, 536, 548, 560, 572, 569, 580, 592, 600, 611, 621, 633, 644, 655, 666, 667],
    1050: [null, 560, 544, 560, 572, 569, 580, 592, 607, 615, 610, 636, 648, 662, 674, 667, 685],
  } as Record<number, (number | null)[]>,
};

// Moins-value attaches rigides (« Moins value AR », page 10), indexée largeur.
const MV_AR: Record<number, number> = {
  450: -16, 600: -16, 700: -16, 800: -16, 900: -16, 1000: -16,
  1100: -24, 1200: -24, 1300: -24, 1400: -24, 1500: -24, 1600: -24,
  1700: -34, 1800: -34, 1900: -34, 2000: -34, 2100: -34,
};

export const VR_TRADI_SEED: ConfiguratorDef = {
  slug: 'volet-roulant-traditionnel',
  name: 'Volet roulant traditionnel',
  famille: 'volet-roulant',

  selectors: [
    { id: 'pose', label: 'Type de pose', options: [
      { value: 'independant', label: 'Traditionnel indépendant' },
    ] },
    { id: 'lame', label: 'Lame', options: [
      { value: 'cd942', label: 'Aluminium CD942', hint: 'Surface max 8 m²' },
    ] },
    { id: 'moteur', label: 'Motorisation', options: [
      { value: 'mn', label: 'Moteur MN' },
    ] },
  ],

  grids: [
    { key: { pose: 'independant', lame: 'cd942', moteur: 'mn' }, widths: W, heights: [850, 950, 1050], cells: CD942_MN },
  ],

  adjustments: [
    {
      code: 'attaches_rigides', label: 'Attaches rigides (au lieu des verrous)',
      scope: { lame: 'cd942' }, optional: true, baremeParLargeur: MV_AR,
    },
    {
      code: 'manoeuvre_manuelle', label: 'Manœuvre manuelle (tringle oscillante)',
      layer: 'filaire', optional: true, baremeParLargeur: { 450: -72, 3000: -13 },
    },
  ],

  options: [
    { code: 'inverseur',        label: 'Inverseur (applique ou encastré)', priceHT: 21, group: 'commande', scope: { moteur: 'mn' } },
    { code: 'genouillere_60a',  label: 'Genouillère 60° aimantée',          priceHT: 41, group: 'manoeuvre' },
    { code: 'genouillere_90',   label: 'Genouillère 90°',                   priceHT: 18, group: 'manoeuvre' },
    { code: 'genouillere_90a',  label: 'Genouillère 90° aimantée',          priceHT: 59, group: 'manoeuvre' },
  ],

  colors: [
    { code: 'blanc-9010', label: 'Blanc 9010',   hex: '#F1F0EA' },
    { code: 'ivoire-1015', label: 'Ivoire 1015', hex: '#E6D2B5' },
    { code: 'gris-7016',  label: 'Gris 7016',    hex: '#383E42' },
    { code: 'gris-7035',  label: 'Gris 7035',    hex: '#D7D7D7' },
    { code: 'gris-7038',  label: 'Gris 7038',    hex: '#B5B8B1' },
    { code: 'alu-9006',   label: 'Alu AS 9006',  hex: '#A5A8A8' },
    { code: 'marron-8019', label: 'Marron 8019', hex: '#3D2B24' },
  ],
  colorPolicies: [
    { lame: 'cd942', standard: ['blanc-9010', 'ivoire-1015', 'gris-7016', 'gris-7035', 'gris-7038', 'alu-9006', 'marron-8019'] },
  ],

  limits: [
    { lame: 'cd942', surfaceMaxM2: 8, largeurMin: 300, largeurMax: 3000, hauteurMax: 3230 },
  ],
};
