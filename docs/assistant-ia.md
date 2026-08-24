# Assistant IA — aide utilisateur (MVP)

> Assistant d'aide en ligne pour les clients pros connectés : renseigner sur un produit,
> retrouver une commande, donner son statut/suivi. **Règle absolue : ne jamais inventer —
> si l'agent ne sait pas, il renvoie au service commercial.**

## Principe anti-hallucination

Agent **outillé et ancré** (*grounded*) via l'API Claude. Le modèle ne dispose d'**aucune donnée**
hors des résultats de ses **outils** (lecture seule, exécutés côté serveur). S'ils ne renvoient
rien → il n'a rien à inventer → il escalade. Ce n'est pas un chatbot libre, c'est un **routeur
intelligent au-dessus des données du site**.

## Architecture

- **Endpoint** : `app/api/assistant/route.ts` (POST). Garde : utilisateur connecté **+ rôle pro**
  (`b2b` / `admin` / `commercial`), sinon 403. Rate-limit `20 messages / 5 min` par utilisateur.
  Boucle *tool-use* manuelle (max 5 itérations), modèle **`claude-haiku-4-5`**.
- **Outils** : `lib/assistant/tools.ts` — exécutés avec l'**ID de session** (`ctx.userId`), donc
  la **propriété est respectée** (mêmes garanties que `orders/mine` / `orders/[id]`, cf.
  `docs/audit.md`). Tous en **lecture seule**.

| Outil | Rôle | Source |
|---|---|---|
| `rechercher_produit(requete)` | trouver des produits | `getAllProducts` + `searchProducts` + `priceFrom` |
| `detail_produit(slug)` | fiche produit | `getProductBySlugDB` |
| `mes_commandes()` | lister les commandes du client | `orders` filtré `user_id` |
| `statut_commande(numero)` | statut + documents d'une commande | `orders` (propriété vérifiée) |
| `capacites_configurateur(slug?)` | faisabilité / dimensions / options exactes | défs `DefV2` (`loadConfiguratorDef`) — limites = messages de contraintes |
| `rechercher_documentation(question)` | technique / pose / réglage | base `lib/assistant/knowledge.ts` (extraite de /documentation) |
| `contacter_commercial()` | coordonnées du référent | `profiles.commercial_id` + `auth.getUserById` |

- **UI** : `components/assistant/AssistantWidget.tsx` — widget flottant, **monté seulement pour un
  pro connecté** (`useAuthStore().isPro()`), monté dans `app/layout.tsx`. Chips d'amorce +
  contact commercial toujours visible.
- **Env** : `ANTHROPIC_API_KEY` (serveur uniquement). **Absente → mode dégradé** : l'endpoint
  répond avec le contact commercial, le widget reste utilisable. **Ne casse jamais le site.**

## Garde-fous

1. Grounding strict (system prompt) : réponse uniquement depuis les outils.
2. Périmètre fermé (produit / commande / livraison) — hors sujet → escalade.
3. Données déterministes pour commandes/suivi (pas de reformulation des numéros/statuts).
4. **Livraison** : statut + documents seulement ; pas de position transporteur temps réel →
   escalade, **jamais de date inventée** (choix produit : pas de flux ERP/Optilog en direct).
5. Isolation : outils commande filtrés par `user_id` (pas d'IDOR — une commande d'autrui = introuvable).
6. Rate-limit par utilisateur ; toute erreur d'outil/API → message d'escalade (jamais de crash).
7. Réservé aux pros connectés (cohérent `B2C_ENABLED=false`).

## Décisions de cadrage (19 août 2026)
- Audience : **pros connectés uniquement**.
- Périmètre MVP : **3 cas + escalade commercial**.
- Suivi : **statut + documents seulement** (détail transporteur → commercial).

## Reste à faire / phases suivantes
- **Prérequis prod** : provisionner `ANTHROPIC_API_KEY` (coût — calable sur la mise en production).
- **RGPD / logs** : rétention des conversations (non journalisées en base dans ce MVP).
- **Handoff enrichi** (optionnel) : poster la question sur le fil `document_comments` de la
  commande (notifie le commercial) — au lieu du seul contact.
- **Phase 2** : RAG documentation (notices/abaques/FAQ via pgvector), aide à la configuration.
- **Phase 3** : tracking livraison en direct si/quand le flux ERP est disponible.
- **Modèle** : `claude-haiku-4-5` par défaut (volume/latence) ; `claude-sonnet-5` ou
  `claude-opus-5` en une ligne (`MODEL` dans la route) pour des réponses plus fines.
