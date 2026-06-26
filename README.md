# MM Fermetures — Front (Bloc 2 : Accueil + design system)

Vitrine Next.js 14 (App Router). Accueil + design system, branchés sur un
**mock** qui implémente le contrat de données du Bloc 1. Quand le backend
arrivera, on remplace `lib/catalog/mock.ts` par des requêtes Supabase — sans
toucher aux composants.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit (déjà vert)
```

## Arborescence

```
app/
  layout.tsx              header + trust bar + footer (toutes pages)
  page.tsx                ACCUEIL (hero+configurateur, familles, à la une, doc)
  design-tokens.css       charte PDF -> variables CSS (Bloc 1)
  globals.css             classes du design system
components/
  layout/    Header · MegaMenu · TrustBar · Footer
  product/   ProductCard · TablierConfigurator
lib/catalog/
  types.ts                CONTRAT de données (4 modèles de prix) — Bloc 1
  resolvePrice.ts         priceFrom() · resolveMatrixPrice()
  mock.ts                 données réelles (à remplacer par Supabase)
```

## Principe clé

Les composants n'appellent que `priceFrom()` / `resolveMatrixPrice()` et
consomment le type `Product`. Ils ignorent la source des données. Passer du
mock à Supabase = réimplémenter ces fonctions + `mock.ts`, rien d'autre.

## Périmètre

- **Fait (Bloc 2)** : accueil, design system, cartes à CTA contextuel,
  configurateur tablier (modèle matriciel réel).
- **Bloc 3** : pages catalogue `/catalogue/[categorie]` + fiche produit
  `/produit/[slug]` (filtres, recherche, fiche adaptée au modèle de prix).
- **Bloc 4** : panier + devis (UI). Puis backend Supabase.

Voir aussi la démo HTML autonome `accueil-mm-fermetures.html` (même rendu).
