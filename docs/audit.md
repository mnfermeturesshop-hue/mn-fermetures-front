# Audit MM/MN Fermetures — Cohérence · Base de données · Sécurité

> **Phase 1 — Lecture seule.** Aucun fichier applicatif modifié. Ce document est le seul livrable de cette phase.
> Outils exécutés : `npm run typecheck` ✅ (exit 0) · `npm run build` ✅ · `npm audit` (3 vulns) · `npx depcheck` (aucune dépendance inutilisée).
> Périmètre lu : contrat `lib/catalog/*`, `lib/tablier/*`, toutes les routes `app/api/**`, `middleware.ts`, clients Supabase, stores Zustand, migrations `supabase/**`, flux checkout/paiement.

---

## Synthèse

### 🔴 Top 5 des risques

| # | Risque | Sévérité | Où |
|---|--------|----------|-----|
| S1 | **Routes `/api/admin/*` sans aucun contrôle d'accès** — service_role exposé à tout internet (supprimer/bannir users, changer remises, CRUD produits, s'auto-approuver pro) | 🔴 Critique | `app/api/admin/**` |
| S2 | **Montants & totaux de commande/paiement font confiance au client** — payer 0,01 € pour n'importe quelle commande | 🔴 Critique | `create-payment-intent`, `api/orders`, `bon-de-commande` |
| S3 | **Aucun webhook Stripe** — le paiement n'est jamais vérifié côté serveur ; commande créée sur un paramètre d'URL client | 🔴 Critique | flux Stripe |
| S4 | **Next.js 14.2.5 — CVE de contournement de middleware** (la protection `/admin` repose entièrement sur le middleware) | 🔴 Critique | `package.json` |
| S5 | **`user_id` de commande pris depuis le body client** + `/api/orders` public non authentifié | 🟠 Élevé | `api/orders`, `api/devis` |

### ✅ Top 5 des simplifications sûres

| # | Action | Effort |
|---|--------|--------|
| C1 | Introduire `requireAdmin()` partagé → corrige S1 **et** supprime le boilerplate `if(!SERVICE_ROLE_KEY)` répété dans 5 routes | M |
| C2 | Factoriser `euro()` (dupliqué ≥ 3 fois) dans `lib/format.ts` | S |
| C3 | Consolider les deux routes catalogue `[category]` + `[...slug]` en une seule | M |
| C4 | Retirer la valeur de rôle morte `'blocked'` du filtre admin clients | S |
| C5 | Recadrer le `README.md` (décrit encore « Bloc 2 » alors que l'app est un e-commerce complet) | S |

### État des lieux positif (à préserver)
- `api/orders/[id]/documents/[type]` : authentification + **vérification de propriété** + URL signée 5 min. Modèle à suivre.
- `api/auth/register` : rate-limit + Turnstile + politique de mot de passe.
- RLS activée sur toutes les tables ; bucket `order-documents` privé, `product-images` public en lecture / admin en écriture.
- Contrat de prix **respecté** : les composants consomment `priceFrom()`/`resolveMatrixPrice()`, aucun prix codé en dur trouvé dans l'UI.
- `typecheck` + `build` verts ; aucune dépendance inutilisée.

---

## §4 Sécurité (prioritaire)

### 🔴 S1 — Broken Access Control : `/api/admin/*` n'authentifie rien
**Fichiers** : `app/api/admin/clients/route.ts`, `products/route.ts`, `orders/route.ts`, `pro-requests/route.ts`, `upload/route.ts`, `orders/[id]/documents/route.ts`.
**Preuve** : chaque handler fait directement `createAdminClient()` (clé `service_role`, **bypasse la RLS**) sans lire la session. Le `middleware.ts` ne contrôle le rôle que pour `pathname.startsWith('/admin')` (ligne 44) — or ces routes commencent par `/api/admin`, **jamais** par `/admin`. Elles ne sont donc protégées par rien.
**Impact** : n'importe qui peut appeler
- `DELETE /api/admin/clients` → supprimer un utilisateur (`clients/route.ts:80`)
- `PATCH /api/admin/clients` → bannir / changer les remises B2B (`:49`)
- `POST|DELETE /api/admin/products` → CRUD catalogue (`products/route.ts:4,27`)
- `PATCH /api/admin/pro-requests {action:'approve'}` → **s'auto-promouvoir b2b** (`pro-requests/route.ts:64`)
- `POST /api/admin/upload` → écrire dans le Storage.
**Recommandation** : helper `requireAdmin()` en tête de chaque route (session `getUser()` → lookup rôle via service_role → `403` sinon). Voir C1.
**Effort** : M.

### 🔴 S2 — Prix et montants « de confiance » depuis le navigateur
**Fichiers** : `app/api/stripe/create-payment-intent/route.ts:7`, `app/api/orders/route.ts:199`, `app/api/orders/bon-de-commande/route.ts:256`, `components/checkout/PaymentStep.tsx:69`.
**Preuve** : `create-payment-intent` fait `amount: Math.round(amountTTC * 100)` où `amountTTC` vient du `body` (seul contrôle : `> 0`). Les routes `orders`/`bon-de-commande` insèrent `total_ht/total_ttc/lines/unitPriceHT` tels qu'envoyés. Le panier (`lib/store/cart.ts`) est **persisté en localStorage** → entièrement contrôlable par l'utilisateur, y compris `unitPriceHT` de chaque ligne et les remises B2B (`applyDiscount` est appliqué côté client).
**Impact** : régler 0,01 € une commande à 5 000 €, ou forger des prix/remises. Violation directe de la règle §4 « prix recalculé côté serveur ».
**Recommandation** : côté serveur, recharger chaque produit par `reference`/`slug`, recalculer le prix ligne via `resolvePrice`/`resolveMatrixPrice` (+ dimensions/options + remise du profil serveur), recomposer total + frais de port, puis créer le PaymentIntent sur ce montant serveur. Rejeter tout écart avec le client.
**Effort** : L.

### 🔴 S3 — Aucun webhook Stripe : paiement jamais réconcilié
**Fichiers** : absence de `app/api/stripe/webhook/route.ts` ; `app/commande/confirmation/page.tsx:18-52`.
**Preuve** : après Stripe, la page confirmation lit `redirect_status` (paramètre d'URL **client**) et POST `/api/orders` avec `paymentMethod:'card'`. Le statut réel du PaymentIntent n'est jamais vérifié serveur ; la commande est enregistrée `status:'pending'` quoi qu'il arrive. On peut aussi appeler `/api/orders` directement sans payer.
**Recommandation** : ajouter une route webhook avec `stripe.webhooks.constructEvent` (vérification de signature), et passer la commande à `paid` sur `payment_intent.succeeded` (idempotent, clé = orderNumber en metadata). Ne créer/valider la commande que depuis cet événement.
**Effort** : M.

### 🔴 S4 — Next.js 14.2.5 : CVE de contournement de middleware
**Fichier** : `package.json:18` (`"next": "14.2.5"`).
**Preuve** : `npm audit` remonte 4 advisories Next (dont une critique). Le contournement de middleware (CVE-2025-29927, corrigé en 14.2.25) est **directement pertinent** : toute la protection des pages `/admin` repose sur le middleware.
**Recommandation** : monter `next` ≥ 14.2.35. Corrige aussi la vuln `postcss` transitive.
**Effort** : S. (⚠️ `xlsx@*` : Prototype Pollution + ReDoS **sans correctif amont** — envisager `exceljs` ou isoler l'usage à l'import admin.)

### 🟠 S5 — `user_id` de commande pris du body ; `/api/orders` public
**Fichiers** : `app/api/orders/route.ts:193,204`, `app/api/devis/route.ts:23`.
**Preuve** : `user_id: userId ?? null` où `userId` vient du payload. `devis` fait `sessionUser?.id ?? body.userId` (« en dev : body »). Aucune auth sur `POST /api/orders`.
**Impact** : attribuer une commande à autrui, usurper `isGuest`, polluer la table.
**Recommandation** : dériver `userId`/`email` **exclusivement** de `getUser()` ; ignorer le body pour ces champs.
**Effort** : S.

### 🟠 S6 — `PATCH /api/devis` sans authentification
**Fichier** : `app/api/devis/route.ts:47`.
**Preuve** : met à jour le `status` de n'importe quel devis par `devis_number`, aucune vérification de session/propriété.
**Recommandation** : réserver aux admins (statut « converted/expired ») ou vérifier la propriété.
**Effort** : S.

### 🟠 S7 — `/api/pro-request` : ni rate-limit ni captcha, crée des comptes auth confirmés
**Fichier** : `app/api/pro-request/route.ts:19-27`.
**Preuve** : `supabase.auth.admin.createUser({ email_confirm:true })` avec pour seul garde `password.length >= 8`. Contrairement à `register` (rate-limit + Turnstile), rien ici.
**Impact** : création massive de comptes confirmés (rôle `pending`) + flood d'emails admin.
**Recommandation** : réutiliser le rate-limiter + `verifyTurnstile` de `register` ; valider le SIRET (`lib/siret.ts` existe).
**Effort** : M.

### 🟠 S8 — Injection HTML dans les emails
**Fichiers** : `api/orders/route.ts` (buildEmailHtml), `bon-de-commande`, `pro-request`, `admin/pro-requests`, `auth/register`.
**Preuve** : champs utilisateur (`company`, `siret`, `name`, `email`, `address1/2`, `city`) interpolés bruts dans le HTML des emails (ex. `pro-request/route.ts:78-82`).
**Impact** : injection de contenu/phishing dans les emails envoyés à l'admin et au client.
**Recommandation** : échapper le HTML (`escapeHtml`) sur toute donnée utilisateur avant interpolation.
**Effort** : S.

### 🟡 S9 — Bypass middleware en dev qui peut fuir en prod
**Fichier** : `middleware.ts:9`.
**Preuve** : si `NEXT_PUBLIC_SUPABASE_URL` est absent, `return NextResponse.next()` → `/admin` totalement ouvert. Une variable oubliée en prod ouvre l'admin.
**Recommandation** : « fail closed » hors développement (`if (process.env.NODE_ENV === 'production') return NextResponse.redirect('/admin/login')`).
**Effort** : S.

### 🟡 S10 — XSS potentielle via JSON-LD
**Fichier** : `components/seo/JsonLd.tsx:55,82,102`.
**Preuve** : `dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}` — `JSON.stringify` n'échappe pas `<`/`</script>`. `name`/`description` sont éditables par l'admin (et l'admin est ouvert, cf. S1).
**Recommandation** : échapper `<` → `<` (et `>`,`&`) sur la sortie stringifiée.
**Effort** : S.

### 🟡 S11 — Absence d'en-têtes de sécurité
**Fichier** : `next.config.mjs`.
**Preuve** : pas de `async headers()` — ni CSP, ni HSTS, ni `X-Content-Type-Options`, ni `X-Frame-Options`.
**Recommandation** : ajouter un bloc `headers()` (au minimum `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS ; CSP en `report-only` d'abord).
**Effort** : S.

### 🟡 S12 — `create-payment-intent` sans validation ni rate-limit
**Fichier** : `app/api/stripe/create-payment-intent/route.ts`.
**Preuve** : `orderNumber`/`email` non validés et injectés en `metadata` ; aucune limite de débit.
**Recommandation** : valider (zod), rate-limiter ; montant issu du recalcul serveur (cf. S2).
**Effort** : S.

---

## §3 Base de données (Supabase / Postgres)

### 🟠 D1 — `schema.sql` désynchronisé des migrations (drift)
**Fichiers** : `supabase/schema.sql:173-199` vs `supabase/migrations/20260627_orders.sql`.
**Preuve** : `schema.sql` définit `orders(id, shipping_addr, …)` alors que la migration **drop/recrée** `orders(order_number, customer_name, is_guest, shipping_address, billing_address, documents…)` — c'est cette dernière que le code utilise. `schema.sql` conserve aussi `profiles.pro_discount_pct` tandis que le code lit/écrit `profiles.discounts` (jsonb). `schema.sql` n'est donc plus une source de vérité fiable.
**Recommandation** : régénérer `schema.sql` depuis la base réelle (ou le marquer « legacy » et faire foi des migrations ordonnées). Ajouter un dump de référence.
**Effort** : M.

### 🟠 D2 — Colonne `profiles.discounts` utilisée mais créée par aucune migration
**Fichiers** : `lib/store/auth.ts:64,82`, `app/api/admin/clients/route.ts:12,71` ; recherche : aucune migration ne crée `discounts`.
**Preuve** : le code `select('… discounts')` et `update({ discounts })`, mais seul `pro_discount_pct` existe dans `schema.sql` ; aucun `ADD COLUMN discounts`. La colonne n'existe que si elle a été ajoutée à la main dans Supabase (non versionné).
**Impact** : erreur runtime (colonne inconnue) sur un environnement recréé depuis les migrations ; remises B2B non traçables.
**Recommandation** : ajouter `supabase/migrations/…_profiles_discounts.sql` (`ADD COLUMN IF NOT EXISTS discounts jsonb NOT NULL DEFAULT '{}'`), et décider du sort de `pro_discount_pct` (migrer/supprimer).
**Effort** : S.

### 🟡 D3 — Récursion potentielle de policy RLS sur `profiles`
**Fichier** : `supabase/schema.sql:29-32`.
**Preuve** : la policy `profiles_admin_all` fait `EXISTS (SELECT 1 FROM public.profiles …)` **à l'intérieur d'une policy sur `profiles`** → récursion RLS (footgun Supabase connu). C'est probablement pourquoi le middleware doit passer par `service_role` (`middleware.ts:50`).
**Recommandation** : utiliser une fonction `SECURITY DEFINER` `is_admin(uid)` (search_path vide) au lieu du sous-select direct, sur toutes les policies « admin ».
**Effort** : M.

### 🟡 D4 — Valeur de rôle `'blocked'` inexistante
**Fichiers** : `app/api/admin/clients/route.ts:12` (`.in('role', ['b2b','blocked'])`) vs `20260703_profiles_role_pending.sql` (CHECK = b2c/b2b/admin/pending).
**Preuve** : `'blocked'` n'est jamais une valeur de `role` (le blocage se fait via `auth.ban_duration`). Le filtre est mort.
**Recommandation** : retirer `'blocked'` du `.in(...)`.
**Effort** : S.

### 🟡 D5 — Index manquants sur `products`
**Preuve** : `db.ts` filtre sur `category_slug`, `slug` (UNIQUE ✓), et le code exploite `menu_path`/`famille` ; pas d'index sur `category_slug`/`menu_path`/`famille`.
**Recommandation** : `CREATE INDEX` sur `category_slug`, `menu_path`, `active` (les listings filtrent `active=true`).
**Effort** : S.

### ⚪ D6 — `set_updated_at()` défini deux fois
**Fichiers** : `schema.sql:161` et `20260627_orders.sql:33` (`CREATE OR REPLACE`, idempotent). Sans gravité, à noter pour la cohérence.

---

## §2 Cohérence du projet

### 🟡 P1 — Deux routes catalogue redondantes
**Fichiers** : `app/catalogue/[category]/page.tsx` et `app/catalogue/[...slug]/page.tsx`.
**Preuve** : le `build` accepte les deux, mais `[category]` (segment unique) **fait doublon** avec le catch-all pour `/catalogue/xxx`, avec un comportement légèrement différent (`[category]` importe `TablierGenerateur`, pas `[...slug]`). Logique `resolveMenuPath` quasi identique.
**Recommandation** : fusionner dans `[...slug]` (y déplacer `TablierGenerateur` si nécessaire), puis supprimer `[category]`. **À valider avec toi** (parité de rendu à confirmer avant suppression).
**Effort** : M.

### 🟡 P2 — Helper `euro()` dupliqué
**Fichiers** : `lib/store/cart.ts:96`, `app/api/orders/route.ts:41`, `app/api/orders/bon-de-commande/route.ts:39` (+ variantes de formatage ailleurs).
**Recommandation** : `lib/format.ts` unique, importé partout (serveur inclus). Voir C2.
**Effort** : S.

### 🟡 P3 — Deux logiques de frais de port
**Fichiers** : `lib/store/cart.ts:78-79` (`FRANCO_SEUIL=400`, `FRANCO_FORFAIT=26`) vs `lib/store/checkout.ts` (`shippingCostHT(method, isFranco)` utilisé par le checkout).
**Preuve** : `cart.fraisLivraison()` n'est pas utilisé dans le tunnel (le checkout calcule via `shippingCostHT`) → risque d'incohérence de frais/seuil entre panier et checkout.
**Recommandation** : source unique du barème de port (constantes partagées), vérifier que `cart.fraisLivraison` n'est pas du code mort.
**Effort** : S.

### 🟡 P4 — `README.md` fortement obsolète
**Preuve** : décrit « Bloc 2 : Accueil + design system » sur mock, alors que le dépôt contient un e-commerce complet (Stripe, admin, Supabase, checkout, devis, espace pro).
**Recommandation** : réécrire l'arborescence/périmètre ; ce fichier `docs/audit.md` peut servir de base d'inventaire.
**Effort** : S.

### 🟡 P5 — Mapping matriciel fragile dans `rowToProduct`
**Fichier** : `lib/catalog/db.ts:34-44`.
**Preuve** : `widths` déduit de `Object.keys(Object.values(matrix_prices)[0])` — casse si la 1ʳᵉ ligne est vide ou si les largeurs diffèrent entre lignes ; `colors` lu depuis `matrix_options.colors` alors que le contrat place `colors` sur le produit.
**Recommandation** : normaliser la forme `matrix_*` (schéma JSON documenté) et sécuriser le parsing (garde sur tableau vide).
**Effort** : M.

### ⚪ P6 — Alignement `types.ts` ↔ `mock.ts` ↔ DB
Le contrat `Product` est respecté côté UI (résolveurs de prix, pas de prix codé en dur). `mock.ts` et `lib/tablier/data.ts` sont des **stubs volontaires** (à conserver, cf. brief §5). RAS bloquant.

---

## §5 Simplification & code obsolète (avec garde-fous)

**Sûr à appliquer (preuve à l'appui) :**
- **C1** `requireAdmin()` partagé → sécurise S1 et retire le boilerplate `if(!SERVICE_ROLE_KEY)` répété (products×2, clients×3, pro-requests×2). *Effort M.*
- **C2** Factoriser `euro()`/formatage € dans `lib/format.ts`. *Effort S.*
- **C3** Fusionner `catalogue/[category]` dans `[...slug]` (après validation de parité). *Effort M.*
- **C4** Retirer `'blocked'` du filtre `.in('role', …)`. *Effort S.*
- **C5** Réécrire le `README.md`. *Effort S.*
- **C6** `npm audit fix` ciblé : monter `next` ≥ 14.2.35 (corrige postcss transitif). *Effort S.*

**Faux positif** : `depcheck` signale `@types/node` inutilisé — nécessaire à `tsc`, **ne pas retirer**.

**À NE PAS toucher (stubs volontaires, non-morts)** :
- `lib/catalog/mock.ts`, `lib/tablier/data.ts` — couche données remplaçable par Supabase, par conception.
- Placeholders assumés du Bloc 4 et routes prévues non encore créées.
En cas de doute « mort vs pas encore branché » → te demander avant toute suppression.

---

## Plan de correctifs proposé (Phase 2, après ta validation)

1. **Lot Sécurité‑1 (bloquant prod)** : S1 (`requireAdmin`), S5, S6 — contrôle d'accès. Commit `fix(securite): controle d'acces routes admin & commandes`.
2. **Lot Sécurité‑2 (paiement)** : S2 + S3 (recalcul serveur + webhook Stripe). Commit `fix(securite): recalcul prix serveur + webhook stripe`.
3. **Lot Sécurité‑3 (durcissement)** : S4 (upgrade Next), S7, S8, S9, S10, S11, S12.
4. **Lot Base** : D1, D2 (migration `discounts`), D3, D4, D5.
5. **Lot Cohérence/Sim** : C1‑C5, P2, P3, P5.

`npm run typecheck` **et** `npm run build` verts après **chaque** lot. Toute suppression listée + justifiée. Stubs (mock/data/Bloc 4) intacts.

---

## Journal Phase 2

### ✅ Lot Sécurité‑1 — Contrôle d'accès (S1, S5, S6)
`typecheck` ✅ · `build` ✅.

- **Nouveau** `lib/auth/guards.ts` : `requireAdmin()` (session + rôle admin via service_role) et `requireUser()`.
- **S1** — `requireAdmin()` ajouté en tête de **toutes** les routes `/api/admin/*` : `products` (POST/DELETE), `orders` (GET/PATCH), `clients` (GET/PATCH/DELETE), `pro-requests` (GET/PATCH), `upload` (POST), `orders/[id]/documents` (POST). Le boilerplate `if(!SUPABASE_SERVICE_ROLE_KEY)` dupliqué (C1) est remplacé par la garde.
- **S5** — `user_id`/`email` dérivés de la session (jamais du body) dans `api/orders` (guest → `user_id null`, `is_guest` calculé serveur) et `api/orders/bon-de-commande` (401 si non connecté). `api/devis` POST exige désormais une session.
- **S6** — `PATCH /api/devis` : vérification **propriétaire OU admin** (et non admin seul, pour préserver la conversion de devis par le client B2B depuis `/compte`) + whitelist des statuts (`draft|converted|expired`).

### ✅ Lot Sécurité‑2 — Prix serveur & paiement vérifié (S2, S3)
`typecheck` ✅ · `build` ✅.

**Nouveaux modules**
- `lib/pricing/shipping.ts` : barème de port + TVA + `computeOrderTotals()`, **source unique client ET serveur** (corrige aussi P3). `lib/store/checkout.ts` réutilise ce module.
- `lib/pricing/discounts.ts` : `getUserDiscounts()` — remises lues en base (jamais du client).
- `lib/catalog/verifyCart.ts` : `verifyCartLines()` — recharge le catalogue, recalcule chaque prix unitaire (réf unit/kit ou dimensions matricielles) + remise serveur, rejette toute ligne non vérifiable.
- `lib/catalog/types.ts` : descripteur `LinePricing` (matrix) ajouté à `CartLine` ; `TablierConfigurator` le renseigne (dimensions/options) pour permettre la re-tarification serveur.

**S2 — Montants recalculés côté serveur**
- `create-payment-intent` ne reçoit plus de montant : il prend `{ lines, shippingMethod }`, revérifie et **calcule lui-même** le montant du PaymentIntent. `StripeCardForm`/`PaymentStep` adaptés (envoient le panier, affichent le montant autoritaire renvoyé).
- `api/orders` et `api/orders/bon-de-commande` revérifient le panier et **stockent les totaux serveur** (lignes + HT/TTC/port), y compris dans les emails. Le virement/BC est **rejeté** si le panier n'est pas vérifiable.

**S3 — Paiement vérifié**
- `api/orders` (carte) **récupère le PaymentIntent** (`stripe.paymentIntents.retrieve`) : refuse si `status !== 'succeeded'`, enregistre le **montant réellement encaissé** et passe la commande à `paid`.
- Nouvelle route `api/stripe/webhook` : vérifie la **signature** (`constructEvent` + `STRIPE_WEBHOOK_SECRET`) et marque la commande `paid` sur `payment_intent.succeeded` (filet asynchrone). Variable ajoutée à `.env.local.example` (clés Stripe de test committées **redigées** au passage).

**Correctif suivi** : le **générateur de tablier sur mesure** (`TablierGenerateur`, moteur `lib/tablier`) est un 2ᵉ système de prix distinct du catalogue. Ses lignes (ni référence ni grille catalogue) étaient rejetées par la vérification. Ajout d'un descripteur `pricing: { kind: 'tablier', … }` + prise en charge dans `verifyCartLines` via `resoudrePrix()` côté serveur.

**Limitation connue** : si le client ferme l'onglet avant la page de confirmation, la commande n'est pas créée même si le webhook arrive (le contexte complet — adresses, lignes — dépasse les métadonnées Stripe). Sécurité OK (pas de sous-paiement) ; à traiter ultérieurement en créant la commande dès l'intent.

### ✅ Lot Sécurité‑3 — Durcissement (S4, S7–S12)
`typecheck` ✅ · `build` ✅.

**Nouveaux utilitaires** : `lib/security/rateLimit.ts` (limiteur mémoire + `clientIp`), `lib/security/turnstile.ts` (`verifyTurnstile`), `lib/security/escapeHtml.ts`.

- **S4** — `next` 14.2.5 → **14.2.35** : corrige la CVE de contournement de middleware (critique) + advisories associés. Résiduels `npm audit` : `postcss` (modéré, fix = Next 16 breaking) et `xlsx` (haute, sans patch amont — usage **admin authentifié** uniquement ; à remplacer par `exceljs` ultérieurement).
- **S7** — `/api/pro-request` : rate‑limit + **Turnstile** (widget ajouté au formulaire `app/pro`) + validation SIRET (14 chiffres). `register` refactorisé sur les utilitaires partagés.
- **S8** — **échappement HTML** de tous les champs utilisateur dans les emails (`orders`, `bon-de-commande`, `pro-request`, `register`, `admin/pro-requests`) via `escapeHtml()`.
- **S9** — middleware **fail‑closed** en production : si Supabase non configuré, `/admin` et `/compte` renvoient vers `/` (plus de bypass silencieux).
- **S10** — JSON‑LD : sérialisation sûre (`<`/`>`/`&`) → neutralise `</script>`.
- **S11** — en‑têtes de sécurité dans `next.config.mjs` (`X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, HSTS).
- **S12** — `create-payment-intent` : rate‑limit + validation du `orderNumber`.

Reste à traiter (lots suivants) : D1–D5 (base), C2–C5 & P1/P2/P5 (cohérence/simplification).
</content>
</invoke>
