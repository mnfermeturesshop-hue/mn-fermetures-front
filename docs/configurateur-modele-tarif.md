# Gabarit Excel — Tarif configurateur

Ce document décrit le **classeur Excel** à remplir pour alimenter un configurateur (prix instantané). Un classeur = un produit configurable (ex. « Volet roulant traditionnel »). L'import admin le transforme en définition stockée en base (table `configurators`) sans toucher au code.

> Objectif : que le service tarif puisse **mettre à jour le tarif chaque année** (Tarif 2027…) en ré-important un classeur, sans développeur.

## Règles générales

- Une **feuille par section** (noms exacts ci-dessous, insensibles à la casse).
- Prix en **euros HT**. Cellule vide = « hors abaque » (pas de prix pour cette dimension).
- Les **largeurs** et **hauteurs** sont les **bornes hautes de bande** (le moteur arrondit au pas supérieur, comme le tablier).

## Feuille `Meta`

| clé | valeur |
|---|---|
| slug | `volet-roulant-traditionnel` |
| name | `Volet roulant traditionnel` |
| famille | `volet-roulant` |

## Feuilles `Grille …` (une par pose × lame × moteur)

Nom : `Grille <pose> <lame> <moteur>` — ex. **`Grille independant cd942 mn`**.

Mise en page :
- **Ligne 1** : à partir de la colonne C, les **largeurs** (bornes hautes) : `450, 600, 700, 800, …, 3000`.
- **Colonnes A/B** : `A` = hauteur (borne haute), `B` = couche (`filaire` ou `radio`).
- Ensuite les prix, une ligne `filaire` et une ligne `radio` par hauteur.
- **Dernière ligne** : `A` = `MV_AR`, `B` vide, puis la **moins-value attaches rigides** par largeur (valeurs négatives).

Exemple (extrait) :

| A (hauteur) | B (couche) | 450 | 600 | 700 | 800 | … |
|---|---|---|---|---|---|---|
| 850 | filaire | 407 |  | 309 | 316 | … |
| 850 | radio |  | 540 | 528 | 540 | … |
| 950 | filaire | 416 |  | 318 | 325 | … |
| … | … | | | | | |
| MV_AR |  | −16 | −16 | −16 | −16 | … |

## Feuille `Selecteurs`

Axes de choix affichés à l'utilisateur (pose, lame, motorisation…).

| selecteur_id | selecteur_label | option_value | option_label | hint |
|---|---|---|---|---|
| pose | Type de pose | independant | Traditionnel indépendant | |
| lame | Lame | cd942 | Aluminium CD942 | Surface max 8 m² |
| moteur | Motorisation | mn | Moteur MN | |

## Feuille `Options` (prix fixe)

| code | label | prix_ht | groupe | scope |
|---|---|---|---|---|
| inverseur | Inverseur (applique ou encastré) | 21 | commande | moteur=mn |
| genouillere_60 | Genouillère 60° (sans plus-value) | 0 | manoeuvre | |
| genouillere_90a | Genouillère 90° aimantée | 59 | manoeuvre | |

`scope` (facultatif) = filtre `axe=valeur` qui restreint l'option (ex. `moteur=somfy`).

## Feuille `MoinsValues` (manœuvre, ajustements optionnels par largeur)

Pour les moins-values indexées par largeur autres que `MV_AR` (ex. manœuvre manuelle). Une ligne par (code, largeur) OU un barème compact `largeur:montant` séparés par `;`.

| code | label | layer | optional | bareme |
|---|---|---|---|---|
| manoeuvre_manuelle | Manœuvre manuelle (tringle) | filaire | oui | 450:-72;3000:-13 |

## Feuille `Coloris`

| code | label | hex | lame | type | montant | seuil_laquage |
|---|---|---|---|---|---|---|
| blanc-9010 | Blanc 9010 | #F1F0EA | cd942 | standard | | |
| rouge-3004 | Rouge 3004 | #6B1C23 | cd942 | pv_m2 | 14 | |
| noir-9005 | Noir 9005 | #0A0A0A | cd942 | forfait | 77 | 2000 |

`type` ∈ `standard` (inclus) · `pv_m2` (+montant/m²) · `forfait` (+montant, laquage si commande < seuil).

## Feuille `Limites`

| lame | surface_max_m2 | largeur_min | largeur_max | hauteur_max |
|---|---|---|---|---|
| cd942 | 8 | 300 | 3000 | 3230 |

---

**Import** : Admin → import du classeur → validation (dimensions cohérentes, pas de trou) → mise à jour de la table `configurators`. Le configurateur en ligne reflète immédiatement le nouveau tarif.
