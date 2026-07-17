# Classeur Excel du configurateur (moteur universel v2)

Le configurateur est piloté par une **définition** (`DefV2`) stockée en base (table `configurators`, jsonb) ou servie par le seed intégré. L'admin met à jour les **prix** chaque année via un aller-retour Excel, **sans développeur** et **sans toucher à la logique** (champs, étapes, règles, conditions).

> Le moteur est **universel** : la même mécanique gère volet roulant, store banne, portail, pergola… La logique (champs/règles/formules) est de la **donnée**, éditée par un futur éditeur visuel ; l'Excel sert à **éditer les prix**.

## Structure du classeur exporté

| Feuille | Contenu | Éditable |
|---|---|---|
| `_structure` | La définition **hors prix** (champs, étapes, règles de prix, conditions, contraintes) en **JSON découpé** (colonne A). Garantit un round-trip **sans perte**. | ❌ Ne pas modifier |
| `G1`, `G2`, … | **Grilles de prix (tables 2D)**. `A1` = identifiant de la table (ex. `g_independant_cd942_mn_filaire`). Ligne 2 = largeurs (bornes hautes). Lignes suivantes : `hauteur` puis les prix. Cellule vide = hors abaque. | ✅ Prix |
| `B1`, `B2`, … | **Barèmes (tables 1D)** : ajustements par largeur (attaches, manœuvre, plus-values coffre…). `A1` = identifiant. Ligne 2 = `key/value`. Lignes suivantes : largeur, montant. | ✅ Montants |

Exemple de feuille `G1` (grille) :

| id | g_independant_cd942_mn_filaire | | |
|---|---|---|---|
| | 450 | 700 | 800 |
| 850 | 407 | 309 | 316 |
| 950 | 416 | 318 | 325 |

## Mode opératoire annuel (mise à jour des prix)

Depuis **Admin → Configurateurs** :

1. **Exporter** — « Exporter le tarif (.xlsx) » : toutes les valeurs en cours, réparties dans les feuilles `Gn`/`Bn`.
2. **Éditer** — modifier **uniquement les prix** dans les feuilles `Gn` (grilles) et `Bn` (barèmes). **Ne pas renommer les feuilles ni toucher à `_structure`.** On peut ajouter des lignes/colonnes de dimensions (nouvelles bandes de largeur/hauteur) en respectant l'ordre croissant.
3. **Ré-importer** — le classeur édité. L'import **archive** le tarif précédent (rollback via `configurator_versions`), remplace la définition et affiche un aperçu (champs, règles, tables, **prix « à partir de » avant/après**).
4. **Vérifier** — ouvrir le configurateur et contrôler quelques prix repères. Le configurateur **et** la re-tarification serveur reflètent immédiatement le nouveau tarif.

> Modifier la **logique** (nouvelles questions, règles, formules) ne se fait pas dans l'Excel mais dans la définition (`DefV2`) — via le futur éditeur low-code, ou par un développeur. L'Excel est le canal d'édition des **prix**.
