# Évolutions possibles — MN Fermetures (B2B)

> Propositions classées par horizon, avec effort estimé (S = jours, M = ~1–2 semaines, L = plusieurs semaines).
> Contexte : offre recentrée B2B (juillet 2026), prix réservés aux connectés, vente par bon de commande.

## 1. Court terme — consolider le socle

| # | Évolution | Pourquoi | Effort |
|---|-----------|----------|--------|
| 1 | **Finir l'audit** : lot Base de données (migration manquante `profiles.discounts`, schema.sql désynchronisé, index) + lot cohérence (README, doublons) | La colonne `discounts` n'existe dans aucune migration → une base recréée casse les remises B2B | S–M |
| 2 | **Serveur de prix tablier** : déplacer le barème du générateur (`lib/tablier/data.ts`) côté serveur (API de résolution de prix) | Aujourd'hui le barème complet est dans le JavaScript envoyé au navigateur — un concurrent peut l'extraire malgré le masquage des prix. C'est le complément logique de la décision « prix masqués » | M |
| 3 | **Remplacer `xlsx` par `exceljs`** (import admin) | Vulnérabilité haute sans correctif amont sur `xlsx` | S |
| 4 | **Migration email pro** : domaine + SMTP dédié (plan déjà esquissé : sortir de Gmail) | Délivrabilité, image professionnelle, quotas | S–M |
| 5 | **Tests automatisés + monitoring d'erreurs** (Sentry ou équivalent) | Aucun test aujourd'hui ; on a corrigé plusieurs régressions à la main. Un site marchand a besoin d'alertes en production | M |

## 2. Moyen terme — valeur commerciale B2B (attentes PDG)

| # | Évolution | Pourquoi | Effort |
|---|-----------|----------|--------|
| 6 | **Devis éditable par les commerciaux** : modifier lignes/remises avant envoi, statuts (envoyé / accepté / expiré), relances automatiques | Attente PDG. Aujourd'hui le devis est figé tel que généré par le client | M–L |
| 7 | **Signature électronique** des devis et bons de commande | Attente PDG. Ferme la boucle commerciale sans papier | M |
| 8 | **Intégration ERP** : import stock/prix automatisé, export des commandes, synchronisation des statuts (les documents ARC/facture sont déjà uploadables à la main — l'automatiser) | Attente PDG. Supprime la double saisie | L |
| 9 | **Commande rapide par référence** : coller une liste de réfs, re-commander une commande passée en 1 clic | Le réassort est LE geste récurrent d'un pro ; gain de temps massif | M |
| 10 | **Comptes multi-utilisateurs par entreprise** : le poseur prépare, le gérant valide ; adresses de chantier multiples | Reflète l'organisation réelle des clients pros | M–L |
| 11 | **Prix nets par client** : au-delà de la remise par famille, grille tarifaire individuelle (issue de l'ERP) | Aligne le site sur la pratique commerciale existante | M |

## 3. Long terme — différenciateurs

| # | Évolution | Pourquoi | Effort |
|---|-----------|----------|--------|
| 12 | **PWA** : site installable, catalogue consultable hors ligne, scan de code-barres pour réassort au dépôt | Usage terrain/chantier des poseurs | M–L |
| 13 | **Suivi de livraison temps réel** + notifications email/SMS aux étapes clés | Réduit les appels entrants « où est ma commande ? » | M |
| 14 | **Mode commercial itinérant** : un commercial passe commande/devis au nom d'un client en visite | Outil de vente terrain | M–L |
| 15 | **Tableau de bord PDG** : CA par client/famille, taux de conversion devis→commande, top produits | Pilotage commercial | M |

## Recommandation de priorisation

1. **#1 + #3** (dette technique rapide, évite les mauvaises surprises) ;
2. **#2** (cohérence avec la décision prix masqués — sinon elle est contournable) ;
3. **#9 commande rapide** (le meilleur ratio valeur/effort pour des clients pros) ;
4. puis les attentes PDG **#6 → #7 → #8** dans cet ordre (le devis éditable est le prérequis naturel de la signature, l'ERP est le plus gros chantier).
