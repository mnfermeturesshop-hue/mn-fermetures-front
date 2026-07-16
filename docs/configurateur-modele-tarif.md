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

| selecteur_id | selecteur_label | option_value | option_label | hint | scope | layer | derived |
|---|---|---|---|---|---|---|---|
| type_volet | Type de volet | independant | Traditionnel indépendant | | | | pose=independant |
| type_volet | Type de volet | drapeau | Tradi drapeau | | | | pose=independant |
| type_volet | Type de volet | tunnel_mn | Coffre tunnel MN | | | | pose=coffre |
| type_volet | Type de volet | express | Tradi express | | | | pose=express |
| lame | Lame | cd942 | Aluminium CD942 | Surface max 8 m² | | | |
| moteur | Motorisation | mn | Moteur MN | | | | |
| coffre | Type de coffre | briquelite | Briquélite | | pose=coffre | | |
| radio_somfy | Motorisation radio Somfy | rts | RTS — émetteur Smoove (+55 €) | | moteur=somfy | radio | |

- `scope` (facultatif) = filtre `axe=valeur[,axe=valeur]` : le sélecteur n'apparaît que si les axes correspondent (ex. `pose=coffre`).
- `layer` (facultatif) = `filaire` ou `radio` : le sélecteur n'apparaît que sur cette couche (ex. motorisation radio Somfy).
- `derived` (facultatif) = axes internes posés automatiquement par l'**option** (ex. l'étiquette client `type_volet` pilote la clé de grille `pose`). Les grilles restent nommées par `pose` (independant/coffre/express).

## Feuille `Options` (prix fixe)

| code | label | prix_ht | groupe | scope | layer |
|---|---|---|---|---|---|---|
| inverseur | Inverseur (applique ou encastré) | 21 | commande | moteur=mn | |
| genouillere_60 | Genouillère 60° (sans plus-value) | 0 | manoeuvre | | |
| genouillere_90a | Genouillère 90° aimantée | 59 | manoeuvre | | |
| amy_4c_io | Émetteur Amy 4 canaux IO | 131 | commande | moteur=somfy | radio |

- `scope` (facultatif) = filtre `axe=valeur` qui restreint l'option (ex. `moteur=somfy`).
- `layer` (facultatif) = `filaire` / `radio` (ex. options radio Somfy).

## Feuille `Ajustements` (moins-values et plus-values par largeur)

Ajustements indexés par largeur autres que `MV_AR` : manœuvre manuelle, plus-values de coffre, motorisation RTS/solaire… `bareme` = barème compact `largeur:montant` séparés par `;` (le montant vaut pour toutes les largeurs ≤ borne). `optional` = `oui` (case à cocher) / `non` (appliqué d'office quand le `scope` correspond).

| code | label | scope | layer | optional | bareme |
|---|---|---|---|---|---|
| manoeuvre_manuelle | Manœuvre manuelle (tringle) | pose=independant | filaire | oui | 450:-72;3000:-13 |
| coffre_briquelite | Coffre Briquélite | pose=coffre,coffre=briquelite | | non | 700:37;3000:37 |
| somfy_rts | Motorisation RTS | moteur=somfy,radio_somfy=rts | radio | non | 99999:55 |

> Ancien nom `MoinsValues` encore accepté à l'import (compatibilité).

## Feuille `Coloris`

| code | label | hex | lame | type | montant | seuil_laquage |
|---|---|---|---|---|---|---|
| blanc-9010 | Blanc 9010 | #F1F0EA | cd942 | standard | | |
| rouge-3004 | Rouge 3004 | #6B1C23 | cd942 | pv_m2 | 14 | |
| noir-9005 | Noir 9005 | #0A0A0A | cd942 | forfait | 77 | 2000 |

`type` ∈ `standard` (inclus) · `pv_m2` (+montant/m²) · `forfait` (+montant, laquage si commande < seuil).

## Feuille `Limites`

| lame | pose | surface_max_m2 | largeur_min | largeur_min_modes | largeur_max | hauteur_max |
|---|---|---|---|---|---|---|
| cd942 | | 8 | 400 | filaire_mn:420;radio_mn:506;filaire_somfy:400;radio_somfy:400;tringle:400;tirage_direct:630 | 3000 | 3230 |
| cd942 | express | 8 | 400 | filaire_mn:505;radio_mn:591;filaire_somfy:400;radio_somfy:400;tringle:400;tirage_direct:630 | 3000 | 3230 |

- `pose` (facultatif) = limite propre à une pose (ex. `express`), sinon s'applique à toutes.
- `largeur_min_modes` (facultatif) = **largeur mini selon le mode** manœuvre/moteur `mode:mini;…`. Modes : `filaire_mn`, `radio_mn`, `filaire_somfy`, `radio_somfy`, `tringle` (manœuvre manuelle), `tirage_direct`. À défaut, `largeur_min` s'applique.

## Feuille `Champs` (fabrication, sans impact prix)

Champs capturés pour la production (remontés au bon de commande / email atelier) — n'entrent **pas** dans le prix.

| id | label | type | options | required | defaut | scope | layer | group |
|---|---|---|---|---|---|---|---|---|
| enroulement | Enroulement | radio | int=Intérieur (INT)\|ext=Extérieur (EXT) | oui | int | | | pose |

- `type` ∈ `select` · `radio` · `text`.
- `options` = liste `valeur=Libellé` séparée par `|` (pour select/radio).
- `scope`/`layer` = mêmes règles que pour les sélecteurs (affichage conditionnel).

---

## Mode opératoire annuel (mise à jour du tarif, ex. 2027)

Depuis le back-office **Admin → Configurateurs** :

1. **Exporter** — cliquer sur **« Exporter le tarif (.xlsx) »**. Le classeur téléchargé contient **toutes les valeurs en cours**, déjà réparties dans les bonnes feuilles/grilles.
2. **Éditer** — dans Excel, reporter les nouveaux prix du fabricant (modifier les cellules ; on peut ajouter des lignes/colonnes de largeur ou de hauteur, de nouvelles options, etc. en suivant le format ci-dessus). Ne pas renommer les feuilles ni les colonnes d'en-tête.
3. **Ré-importer** — charger le classeur édité. L'import **valide** (largeurs/hauteurs croissantes, cohérence), **archive automatiquement** le tarif précédent (rollback possible via la table `configurator_versions`), remplace la définition et affiche un récapitulatif (grilles, options, coloris, **prix « à partir de » avant/après**).
4. **Vérifier** — ouvrir le configurateur en ligne et contrôler quelques prix repères. Le configurateur **et** la re-tarification serveur (devis/commande) reflètent immédiatement le nouveau tarif.

> En cas d'erreur d'import : le tarif précédent reste dans `configurator_versions` et peut être restauré (copie de `definition` vers `configurators`).
