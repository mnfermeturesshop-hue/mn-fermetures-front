# Intégration ERP Optilog → site MN Fermetures — note de cadrage

*Note rédigée par MN Fermetures (éditeur du site e-commerce), à l'attention d'Optilog.*

**Objet :** récupération automatique des devis, ARC et factures depuis votre ERP vers notre espace client.
**Sens des données :** Optilog (émet les documents) → site MN Fermetures (les reçoit et les présente au client).

## 1. Objectif et périmètre

Éviter la ressaisie / le dépôt manuel par l'ADV : les **devis**, **ARC** (accusés de réception de commande) et **factures** émis par Optilog doivent remonter **automatiquement** dans notre espace client, rattachés au bon client ou à la bonne commande.

- **Sens unique : Optilog → site.** Le site n'envoie **aucune** donnée vers l'ERP.
- **Trois types de documents, au format PDF : devis, ARC, facture.**
- Le site sait déjà stocker et présenter ces documents (aujourd'hui déposés à la main) ; il s'agit d'automatiser cette étape.

## 2. Mode d'échange retenu : HTTPS (Optilog pousse)

Après analyse, nous retenons un **échange par API HTTPS** plutôt qu'un dépôt de fichiers (SFTP) :

- immédiat (le document est disponible pour le client dès son émission) ;
- sécurisé nativement (HTTPS chiffré) ;
- adapté à notre hébergement (serverless) et à nos mécanismes déjà en place.

Concrètement, **Optilog appelle un point d'accès de notre site** en y transmettant, pour chaque document : le **PDF**, le **type** (devis / ARC / facture) et l'**identifiant de rattachement** (voir §4).

> Le format des documents reste le **PDF**. La question « XML ou CSV » ne se pose pas ici : il n'y a pas de fichier de données structurées à échanger, seulement des documents et quelques métadonnées transmises dans l'appel.

## 3. Adresse du point d'accès et authentification

Nous exposerons un point d'accès dédié, protégé par une **clé secrète** fournie à Optilog (transmise dans un en-tête d'authentification à chaque appel) :

```
POST https://<domaine-définitif>/api/optilog/documents
```

Nous fixerons le **domaine définitif** (nom de domaine MN Fermetures, ou sous-domaine dédié) **avant** l'intégration, afin que l'URL soit configurée **une seule fois** chez Optilog et n'ait plus à changer ensuite (y compris en cas de changement d'hébergeur). Le certificat HTTPS est géré automatiquement.

## 4. Rattachement des documents — deux cas distincts

Pour classer automatiquement chaque document, Optilog fournit son **type** et l'**identifiant** correspondant :

| Type de document | Rattaché à… | Identifiant attendu |
|---|---|---|
| **Devis** | un **client** (crée une nouvelle entrée dans son espace) | identifiant client (SIRET / email / code client — à convenir) |
| **ARC** | une **commande** existante | numéro de commande |
| **Facture** | une **commande** existante | numéro de commande |

⚠️ Point à convenir : **quel identifiant fait référence** — le nôtre (numéro de commande / compte client du site) ou une référence Optilog (que nous devrons alors stocker à la création de la commande/du compte).

### Clé de correspondance client : le SIRET

Tous les clients d'Optilog **n'ont pas** de compte sur le site — le site n'en gère qu'un sous-ensemble. Pour savoir à quel client rattacher (ou non) un document, il faut une **clé commune aux deux systèmes** : nous proposons le **SIRET**, collecté à l'inscription pro sur le site et présent sur vos fiches clients. Prérequis : **même format des deux côtés** (14 chiffres, sans espaces).

### Filtrage : seuls les clients présents sur le site sont concernés

Deux approches possibles :

- **Option 1 — le site filtre (recommandée).** Optilog envoie ses documents avec le SIRET ; à la réception, le site rattache ceux dont le SIRET correspond à un compte existant et **ignore** les autres (réponse « pas de compte correspondant »). Avantage : respecte strictement le principe « aucune donnée du site vers Optilog » — le site reste seul juge de ses comptes, aucune liste à synchroniser.
- **Option 2 — Optilog filtre.** Optilog n'émet que pour les clients « web ». Cela suppose qu'Optilog sache lesquels le sont : soit votre équipe **tague le client dans Optilog** à la validation de son compte, soit MN fournit **périodiquement la liste des SIRET web-actifs** (export, pas de flux temps réel).

**Recommandation : Option 1** (le site filtre par SIRET), plus simple et sans référentiel à maintenir. Le volume rend indolores les documents écartés.

*Cas limite :* un document émis **avant** la création du compte web du client est écarté ; les documents de ce client remontent à partir de l'ouverture de son compte. Une reprise de l'historique serait un sujet distinct (supposerait un renvoi de l'existant par Optilog).

## 5. Volume et robustesse

Volume estimé : **~1 600 documents/semaine** (~230/jour). C'est **léger pour un échange HTTPS** :
- ~230 appels/jour (moins d'un toutes les 2 minutes en moyenne) ; même un envoi groupé en pic reste négligeable pour notre infrastructure ;
- volume de données ≈ **240 Mo/semaine** (PDF de 100–300 Ko).

Deux principes retenus pour la fiabilité à ce volume :
- **Idempotence** — chaque document est identifié par (type + numéro) ; une réémission (reprise après incident) **remplace** l'existant, elle ne crée pas de doublon.
- **Accusé par document** — chaque appel renvoie un code de succès/erreur, afin qu'Optilog puisse **rejouer uniquement les échecs** (jamais un renvoi global).

Point d'attention côté MN Fermetures (sans impact pour Optilog) : le **stockage cumulé** (~12 Go/an) est planifié, avec une politique de conservation en ligne des documents (les originaux restant archivés dans Optilog).

## 6. Questions à Optilog

1. Confirmez-vous pouvoir **pousser** les documents par appel HTTPS vers l'URL que nous fournissons, avec une clé d'authentification dans l'en-tête ?
2. Le **SIRET** est-il disponible et fiable sur toutes vos fiches clients, au format 14 chiffres ? (c'est notre clé de correspondance proposée pour savoir si un client existe sur le site.)
3. Comment identifiez-vous la **commande** d'un ARC/facture (notre numéro de commande ? une référence Optilog ?) ?
4. Préférez-vous **tout pousser** (le site filtre par SIRET) ou n'émettre que pour les clients « web » (nécessite un tag/une liste côté MN) ?
5. Envoyez-vous **un appel par document**, ou plusieurs documents groupés ?
6. Format d'échange des métadonnées que vous privilégiez (champs de formulaire multipart, JSON…) — nous nous adaptons.
7. Environnement de **test / recette** disponible avant la mise en production ?

## 7. Prochaine étape

Court atelier pour figer deux points : (a) le **domaine définitif** de l'URL, (b) les **clés de rattachement** (identifiant client pour les devis, numéro de commande pour les ARC/factures). Ces deux points arrêtés, l'intégration côté site est rapide : nous réutilisons les mécanismes déjà en place (stockage privé des documents de commande, import de devis rattachés à un client).
