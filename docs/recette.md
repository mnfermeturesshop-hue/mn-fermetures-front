# Cahier de recette — MN Fermetures

Cahier de tests à dérouler avant mise en production. Il couvre l'ensemble des parcours : **catalogue/produits, client pro, commercial, admin** et les points **transverses** (emails, mobile, sauvegardes).

## Comment l'utiliser

- Dérouler les tableaux dans l'ordre. Pour chaque ligne, cocher **OK** ou **KO** dans la colonne prévue (remplacer `☐`).
- Toute anomalie est reportée dans la **feuille de suivi** en fin de document (§7) avec sa gravité.
- **Périmètre : parcours nominal** (les cas qui doivent fonctionner). Les tests de sécurité / contrôles d'accès (accès refusés, cloisonnement, liens expirés) sont traités séparément dans [audit.md](audit.md).
- Réaliser idéalement la recette **deux fois** : une sur desktop, une sur mobile (voir §6).

---

## 1. Pré-requis — jeu de comptes & données de test

À préparer **avant** de commencer. Cocher au fur et à mesure.

### 1.1 Environnement

| # | Élément | Valeur / à noter | ☐ |
|---|---|---|---|
| E1 | URL du site testé (prod ou preview Vercel) | `__________________` | ☐ |
| E2 | Accès au tableau de bord Supabase (lecture des tables) | oui / non | ☐ |
| E3 | Accès GitHub (onglet Actions, pour les sauvegardes) | oui / non | ☐ |
| E4 | 2 à 3 boîtes mail de test **réelles** (réception des emails) | `__________________` | ☐ |

### 1.2 Comptes à préparer

| # | Compte | Rôle | Détail | ☐ |
|---|---|---|---|---|
| CP1 | Admin | `admin` | Compte back-office complet | ☐ |
| CP2 | Commercial « Jean » | `commercial` | Créé via `/admin/equipe` | ☐ |
| CP3 | Client pro A | `b2b` | **Rattaché** au commercial Jean, remises par famille renseignées | ☐ |
| CP4 | Client pro B | `b2b` | **Non rattaché** à Jean, remises différentes | ☐ |
| CP5 | Demande pro en attente | `pending` | Inscription non encore validée (pour tester l'approbation) | ☐ |

### 1.3 Données témoins

| # | Donnée | Détail | ☐ |
|---|---|---|---|
| D1 | Produit **unitaire** | Avec référence + prix HT (ex. moteur) | ☐ |
| D2 | Produit **kit** | Avec configuration/référence (ex. volet rénovation) | ☐ |
| D3 | **Tablier sur mesure** | Produit matriciel + générateur (dimensions) | ☐ |
| D4 | **Devis ERP** (PDF) | Un fichier `DEV-XXXX.pdf` prêt à importer | ☐ |

---

## 2. Parcours PRODUITS / CATALOGUE (visiteur non connecté)

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| P1 | Ouvrir l'accueil `/` | La page se charge, logo, méga-menu et bandeaux visibles | ☐ | |
| P2 | Survoler chaque entrée du **méga-menu** (desktop) | Les sous-catégories s'affichent, les liens fonctionnent | ☐ | |
| P3 | Ouvrir une **catégorie** `/catalogue/<catégorie>` | La liste des produits de la catégorie s'affiche | ☐ | |
| P4 | Ouvrir une **sous-catégorie** (menu à plusieurs niveaux) | Le bon sous-ensemble de produits s'affiche | ☐ | |
| P5 | Ouvrir la fiche d'un produit **unitaire** (D1) | Photo, description, référence affichées | ☐ | |
| P6 | Ouvrir la fiche d'un produit **kit** (D2) | Configuration/variantes affichées | ☐ | |
| P7 | Ouvrir la fiche d'un produit **tablier/matrice** (D3) | Sélecteur de dimensions/options présent | ☐ | |
| P8 | Utiliser la **recherche** (2+ lettres) | L'**autocomplétion** propose des produits pertinents | ☐ | |
| P9 | Valider une recherche → `/recherche?q=...` | La page de résultats liste les bons produits | ☐ | |
| P10 | Ouvrir le **configurateur** de tablier `/configurateur` | Saisie largeur/hauteur/options → aperçu | ☐ | |
| P11 | Ouvrir `/documentation` | Le contenu documentaire s'affiche | ☐ | |
| P12 | Ouvrir `/cgv` | Les CGV s'affichent (version à jour) | ☐ | |
| P13 | Non connecté : constater l'affichage des **prix** | Les prix sont **masqués**, invitation à se connecter (comportement pro attendu) | ☐ | |
| P14 | Ouvrir `/inscription` puis `/connexion` | Redirection automatique vers `/pro` (parcours particulier masqué) | ☐ | |

---

## 3. Parcours CLIENT PRO

### 3.1 Inscription & accès

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| C1 | Aller sur `/pro`, remplir le formulaire d'**inscription pro** | Champs entreprise, SIRET, contact, mot de passe, CGV, Kbis | ☐ | |
| C2 | Saisir un **SIRET** ≠ 14 chiffres | Message d'erreur « SIRET 14 chiffres » | ☐ | |
| C3 | Saisir un mot de passe < 8 caractères | Message d'erreur « 8 caractères minimum » | ☐ | |
| C4 | Ne pas cocher les **CGV** | Soumission refusée tant que non accepté | ☐ | |
| C5 | Joindre un **Kbis** (PDF/JPG/PNG) et valider l'anti-robot | Inscription acceptée, message de confirmation | ☐ | |
| C6 | Vérifier la boîte mail **admin** | Email « Nouvelle inscription PRO » reçu | ☐ | |
| C7 | Tenter de commander avec le compte **pending** (CP5) | Commande **refusée** tant que non approuvé (message) | ☐ | |
| C8 | Se connecter via `/pro` (compte approuvé A) | Connexion réussie, retour à l'espace | ☐ | |
| C9 | Utiliser **mot de passe oublié** `/pro/mot-de-passe-oublie` | Email de réinitialisation reçu, nouveau mot de passe OK | ☐ | |

### 3.2 Catalogue, panier, devis, commande

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| C10 | Connecté (A), parcourir le catalogue | Les **prix sont visibles** | ☐ | |
| C11 | Vérifier les prix d'une famille avec remise | Les **remises pro** de A sont appliquées | ☐ | |
| C12 | Ajouter un produit **unitaire** au panier | Ligne ajoutée, quantité/total corrects | ☐ | |
| C13 | Configurer un **tablier** et l'ajouter au panier | Ligne avec dimensions/options + bon prix | ☐ | |
| C14 | Ouvrir `/panier` | Récapitulatif correct, modification quantité OK | ☐ | |
| C15 | Générer un **devis** `/devis` | Devis affiché avec lignes et totaux | ☐ | |
| C16 | **Sauvegarder** le devis | Confirmation « Devis sauvegardé » | ☐ | |
| C17 | Exporter le devis en **PDF** | Fichier PDF téléchargé, contenu lisible | ☐ | |
| C18 | Passer un **bon de commande** `/commande-pro` | Confirmation à l'écran + n° de commande | ☐ | |
| C19 | Vérifier la boîte mail **client** | Email de confirmation du bon de commande reçu | ☐ | |
| C20 | Vérifier la boîte mail **équipe MN** | Email « Bon de commande à traiter » reçu | ☐ | |
| C21 | Vérifier le **montant** de la commande | Total = prix remisés recalculés (cohérent avec le panier) | ☐ | |

### 3.3 Espace compte

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| C22 | Ouvrir `/compte` → onglet **Commandes** | La commande C18 apparaît avec son statut | ☐ | |
| C23 | Ouvrir le **détail** d'une commande `/commande/[id]` | Lignes, adresse, totaux corrects | ☐ | |
| C24 | Onglet **Devis** | Le devis sauvegardé (C16) apparaît | ☐ | |
| C25 | Onglet **Tarifs** : voir remises + **commercial référent** | Les remises de A et le nom/tél/email de Jean s'affichent | ☐ | |
| C26 | Onglet **Fidélité** | Jauge + palier (Bronze→Diamant) calculés sur le CA | ☐ | |
| C27 | **Convertir un devis** en bon de commande | Devis passe en « converti », commande `BC-…` créée | ☐ | |
| C28 | Vérifier les emails de conversion (client + équipe) | « Devis accepté » (équipe) + confirmation (client) reçus | ☐ | |
| C29 | Programmer un **rappel de devis** (J+15) | Confirmation d'activation du rappel | ☐ | |

### 3.4 Configurateur volet roulant traditionnel (prix instantané)

Configurateur **réservé aux pros connectés** : `/configurateur/volet-roulant-traditionnel` (menu « Volet sur mesure »). Prix HT instantané, remise pro appliquée, recalcul serveur au panier.

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| CF1 | Non connecté, ouvrir le configurateur | Écran « réservé aux professionnels » (prix masqués) | ☐ | |
| CF2 | Connecté (A), sélectionner **Tradi express** | Les lames **Aluminium 56 et 55 sont grisées** ; la lame bascule sur CD942 | ☐ | |
| CF3 | Sélectionner **Monté dans coffre tunnel** | La lame **55 est grisée** ; un sélecteur **« Type de coffre »** apparaît | ☐ | |
| CF4 | Sélectionner **Traditionnel indépendant** | Les **3 lames** sont disponibles ; pas de sélecteur coffre | ☐ | |
| CF5 | Changer **Type de coffre** (Thermic'élite → Briquélite/Néothermic/Néobric) | Le prix augmente de la **plus-value coffre** correspondante | ☐ | |
| CF6 | Cocher **Sous-face coloris 7016** (coffre) | +12 € (selon largeur) au prix | ☐ | |
| CF7 | Basculer **Filaire / Radio** | Le prix de base change ; en filaire, l'option **Manœuvre manuelle** est proposée | ☐ | |
| CF8 | Cocher **Manœuvre manuelle** (filaire) | Le prix **baisse** (moins-value selon la pose) | ☐ | |
| CF9 | Choisir **Moteur Somfy** puis couche **Radio** | Un sélecteur **« Motorisation radio Somfy »** (RS100 io / RTS / Solaire) apparaît **sous** le choix filaire/radio | ☐ | |
| CF10 | Sélectionner **RTS** puis **Solaire** | +55 € (RTS) puis +232 € (Solaire) ; options **Amy 4 canaux / Alim. dépannage** proposées | ☐ | |
| CF11 | Repasser en **Filaire** | Le sélecteur radio Somfy et ses options **disparaissent** ; leur plus-value n'est plus comptée | ☐ | |
| CF12 | Ouvrir la section **Coloris** pour la lame CD942 | ~21 coloris proposés ; teintes laquées marquées d'une **pastille « + »** | ☐ | |
| CF13 | Passer à la **lame 55** | La liste de coloris se **réduit** (12) ; si le coloris courant devient indispo, il **se réinitialise** | ☐ | |
| CF14 | Choisir un coloris **laqué** (ex. Rouge 3004) | Ligne **« Supplément coloris » (+14 €/m²)** au récapitulatif + note **forfait laquage** | ☐ | |
| CF15 | Saisir des **dimensions hors barème** (ex. 3000 × 3000 en CD942) | Message **« hors barème »**, pas de prix ni d'ajout possible | ☐ | |
| CF16 | **Ajouter au panier** une config valide | Ligne créée avec le détail (lame, couche, dimensions, coloris, options) et le bon prix remisé | ☐ | |
| CF17 | Vérifier la **remise pro** sur le prix | Le prix unitaire reflète la remise famille « volet-roulant » de A | ☐ | |
| CF18 | Choisir **Tradi drapeau** ou **Tradi ZF** | Tarifés comme l'indépendant (mêmes prix) ; les 3 lames dispo | ☐ | |
| CF19 | Choisir **Coffre tunnel MN** / **tunnel (marque inconnue)** | Tarifés comme le coffre ; sélecteur « Type de coffre » présent | ☐ | |
| CF20 | Régler **filaire MN** puis saisir largeur **410 mm** | Refus « hors barème » (mini 420 en filaire MN) ; l'intervalle autorisé est affiché sous les dimensions | ☐ | |
| CF21 | Cocher **Manœuvre manuelle** puis largeur **400 mm** | Accepté (mini tringle 400) — l'intervalle mini s'adapte au mode | ☐ | |
| CF22 | Section **Fabrication** : régler **Enroulement INT/EXT** | Le choix apparaît dans le détail de la ligne panier (et sur le bon de commande / email atelier) | ☐ | |

### 3.5 Forfait laquage (coloris RAL) — au niveau commande

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| CL1 | Panier avec **1 ligne coloris laqué** (< 2 000 € HT) | Ligne **« Forfait laquage » +77 € HT** dans le tiroir, `/panier` et le récap checkout | ☐ | |
| CL2 | Ajouter **plusieurs** lignes laquées (< 2 000 € HT) | Le forfait reste **77 € une seule fois** (par commande, pas par ligne) | ☐ | |
| CL3 | Atteindre **≥ 2 000 € HT** de produits | Le forfait laquage passe à **Offert** (n'apparaît plus) | ☐ | |
| CL4 | Panier **sans coloris laqué** (que des standards) | **Aucun** forfait laquage | ☐ | |
| CL5 | Aller au **paiement** (ou bon de commande) avec un forfait actif | Le **montant débité / total commande** inclut bien les 77 € (parité avec l'affichage) | ☐ | |

### 3.6 Documents & commentaires

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| C30 | Sur une commande avec documents joints, **télécharger l'ARC** | Le PDF s'ouvre (lien signé) | ☐ | |
| C31 | Télécharger **facture / BL / proforma / suivi** | Chaque PDF disponible s'ouvre | ☐ | |
| C32 | Télécharger le **PDF d'un devis ERP** | Le PDF du devis s'ouvre | ☐ | |
| C33 | Poster un **commentaire** sur un devis / une commande | Le message apparaît dans le fil | ☐ | |
| C34 | Vérifier la **pastille non-lu** côté destinataire | Une pastille signale le nouveau message | ☐ | |
| C35 | Vérifier l'**email de notification** du commentaire | L'autre partie reçoit l'email | ☐ | |
| C36 | Cliquer sur le lien **« Ne plus recevoir ces emails »** (mailing) | Page « Désinscription confirmée », opt-out enregistré | ☐ | |

---

## 4. Parcours COMMERCIAL (back-office restreint)

Se connecter avec le compte commercial **Jean** (CP2).

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| CO1 | Se connecter et arriver sur `/admin` | Back-office avec **seulement** ses rubriques (Dashboard, Clients, Devis, Commandes, Mailing) | ☐ | |
| CO2 | Ouvrir le **Dashboard** | CA / top clients / conversion **limités à ses clients** | ☐ | |
| CO3 | Ouvrir **Clients** | Voit **uniquement** ses clients (A oui, B non) | ☐ | |
| CO4 | Modifier une **remise** d'un de ses clients | Enregistrement OK, valeur persistée après rechargement | ☐ | |
| CO5 | Ouvrir **Devis** | Voit seulement les devis de ses clients | ☐ | |
| CO6 | **Importer un devis ERP** (D4) pour son client A | Devis rattaché à A, visible côté client | ☐ | |
| CO7 | Ouvrir **Commandes** | Voit seulement les commandes de ses clients | ☐ | |
| CO8 | **Joindre un document** (ex. ARC) à une commande de A | Document uploadé, visible côté client | ☐ | |
| CO9 | **Mailing** à ses clients (avec `{nom}` / `{entreprise}`) | Emails envoyés, désinscrits exclus, historique créé | ☐ | |
| CO10 | Poster un **commentaire** sur un devis/commande de A | Message posté, email au client | ☐ | |
| CO11 | Vérifier les **statistiques** | Chiffres cohérents et limités à ses clients | ☐ | |

---

## 5. Parcours ADMIN (back-office complet)

Se connecter avec le compte **admin** (CP1) via `/admin/login`.

### 5.1 Tableau de bord & produits

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| A1 | Se connecter `/admin/login` | Accès au back-office complet | ☐ | |
| A2 | Ouvrir le **Dashboard** `/admin` | CA par client/mois, top clients, conversion moyenne (données réelles) | ☐ | |
| A3 | Ouvrir **Produits** `/admin/produits` | Liste complète des produits | ☐ | |
| A4 | **Créer / éditer** un produit `/admin/produits/[slug]` | Enregistrement OK, produit visible au catalogue | ☐ | |
| A5 | **Uploader une image** produit (JPG/PNG/WebP ≤ 5 Mo) | Image acceptée et affichée | ☐ | |
| A6 | Tenter un upload **hors format** (ex. PDF) ou > 5 Mo | Refus avec message clair | ☐ | |
| A7 | **Activer / désactiver** un produit | Statut reflété au catalogue | ☐ | |

### 5.2 Import, inventaire

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| A8 | Ouvrir **Import** `/admin/import` | Modèle de colonnes FR affiché (slug, nom, menu_path…) | ☐ | |
| A9 | Importer un fichier produits | **Aperçu** ligne par ligne (ok/erreur), puis import | ☐ | |
| A10 | Ouvrir **Inventaire** `/admin/inventaire` | Liste des références unitaires + stock | ☐ | |
| A11 | Modifier un **stock** (en stock / quantité) | Valeur enregistrée | ☐ | |

### 5.3 Demandes pro, clients, équipe

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| A12 | Ouvrir **Demandes pro** `/admin/pro-requests` | La demande en attente (CP5) apparaît | ☐ | |
| A13 | **Télécharger le Kbis** d'une demande | Le PDF s'ouvre (lien signé) | ☐ | |
| A14 | **Approuver** la demande CP5 | Le compte passe `b2b`, peut se connecter et commander | ☐ | |
| A15 | **Rejeter** une autre demande | Statut « rejeté », compte non actif | ☐ | |
| A16 | Ouvrir **Clients** `/admin/clients` | Liste des clients pro + CA fidélité | ☐ | |
| A17 | Modifier des **remises** par famille | Enregistré, appliqué côté client | ☐ | |
| A18 | **Bloquer** puis **débloquer** un client | Le client bloqué ne peut plus se connecter | ☐ | |
| A19 | **Assigner un commercial** référent à un client | Persisté après rechargement, visible côté client | ☐ | |
| A20 | Ouvrir **Équipe** `/admin/equipe` | Liste des commerciaux + nb de clients | ☐ | |
| A21 | **Créer** un compte commercial | Compte créé, peut se connecter au back-office restreint | ☐ | |
| A22 | **Supprimer** un compte commercial | Compte supprimé (avec confirmation) | ☐ | |

### 5.4 Devis, commandes, mailing

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| A23 | Ouvrir **Devis** `/admin/devis` | Liste des devis (site + ERP) | ☐ | |
| A24 | **Importer un devis ERP** (PDF) rattaché à un client | Devis créé, visible côté client | ☐ | |
| A25 | Ouvrir **Commandes** `/admin/commandes` | Liste complète des commandes | ☐ | |
| A26 | **Changer le statut** d'une commande | Statut mis à jour (ex. expédié/livré) | ☐ | |
| A27 | **Uploader un document** (arc/proforma/bl/facture/suivi) | Document rattaché, téléchargeable côté client | ☐ | |
| A28 | Ouvrir **Mailing** `/admin/mailing` | Envoi possible à tous les clients pro + historique | ☐ | |
| A29 | Envoyer un **mailing** de test | Réception + désinscrits exclus + entrée d'historique | ☐ | |

---

## 6. Transverse

### 6.1 Emails (récapitulatif)

Vérifier la **réception** et le **contenu** (bon numéro, bon montant, liens cliquables) de chaque email.

| # | Email | Déclencheur | OK/KO | Remarque |
|---|---|---|---|---|
| T1 | Nouvelle inscription pro | C1 (→ admin) | ☐ | |
| T2 | Confirmation bon de commande (client) | C18 | ☐ | |
| T3 | Bon de commande à traiter (équipe) | C18 | ☐ | |
| T4 | Devis accepté (équipe) + confirmation (client) | C27 | ☐ | |
| T5 | Nouveau commentaire | C33 / CO10 | ☐ | |
| T6 | Rappel de devis (J+15) | C29 | ☐ | |
| T7 | Mailing commercial / admin | CO9 / A29 | ☐ | |

### 6.2 Responsive / mobile

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| T8 | Ouvrir le site sur **mobile** | Mise en page adaptée, pas de débordement | ☐ | |
| T9 | Ouvrir le **menu mobile** | Navigation catalogue complète, fermeture OK | ☐ | |
| T10 | Rechercher depuis mobile | Autocomplétion et résultats OK | ☐ | |
| T11 | Panier + compte sur mobile | Consultation/actions possibles | ☐ | |
| T12 | Bouton **Accueil** accessible | Retour à l'accueil facile depuis toute page | ☐ | |

### 6.3 Sauvegardes automatiques

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| T13 | GitHub → Actions → lancer **Sauvegarde Supabase** | Workflow vert, dump créé | ☐ | |
| T14 | Backblaze : dossier `db/` | Fichier `supabase_…sql.gz` présent | ☐ | |
| T15 | GitHub → Actions → lancer **Sauvegarde Storage** | Workflow vert | ☐ | |
| T16 | Backblaze : dossier `storage/…` | PDF présents (order-documents, devis-documents, kbis-documents), images produits | ☐ | |

### 6.4 Déconnexion

| # | Action à réaliser | Résultat attendu | OK/KO | Remarque |
|---|---|---|---|---|
| T17 | Se déconnecter (client, commercial, admin) | Session fermée, retour à l'accueil / login | ☐ | |

> **Contrôles d'accès & sécurité** (compte non validé, cloisonnement commercial, un client ne voit pas les commandes d'un autre, liens de documents expirés) : voir la recette dédiée dans [audit.md](audit.md).

---

## 7. Annexe — Feuille de suivi des anomalies

| # | Page / Parcours | Description de l'anomalie | Gravité | Statut |
|---|---|---|---|---|
| 1 | | | bloquant / majeur / mineur | ouvert / corrigé |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Gravité** — *bloquant* : empêche l'usage / la mise en prod · *majeur* : fonctionnalité dégradée mais contournable · *mineur* : cosmétique ou confort.
