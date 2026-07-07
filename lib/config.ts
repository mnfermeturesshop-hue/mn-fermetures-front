/**
 * Drapeaux de configuration du site.
 *
 * B2C_ENABLED — décision PDG (juillet 2026) : concentration sur l'offre B2B.
 * À `false`, tout le parcours particulier est masqué (sans suppression de code) :
 *   - pages /inscription et /connexion → redirigées vers /pro
 *   - mode « particulier » de /pro, carte « Espace particulier » de l'accueil
 *   - tunnel /checkout (paiement CB/virement B2C) → les non-pros sont invités
 *     à se connecter via l'espace pro
 *   - API /api/auth/register (création de compte B2C) → 403
 * Repasser à `true` réactive l'ensemble du parcours particulier.
 */
export const B2C_ENABLED = false;

/**
 * PUBLIC_PRICES — décision PDG (juillet 2026) : les prix ne sont visibles
 * qu'après connexion (audience pro). À `false` :
 *   - les pages serveur masquent les prix AVANT envoi au navigateur
 *     (via maskProductPrices — aucun prix dans le payload de la page)
 *   - l'API de recherche renvoie priceHT: null aux visiteurs non connectés
 *   - le JSON-LD n'expose plus d'offres tarifaires
 *   - le générateur de tablier n'affiche prix/ajout qu'aux connectés
 * Repasser à `true` rend les prix publics à nouveau.
 */
export const PUBLIC_PRICES = false;

/**
 * CGV_VERSION — version des conditions générales de vente affichées sur /cgv.
 * À incrémenter à CHAQUE révision du texte : la preuve d'acceptation stockée
 * dans `pro_requests` (clickwrap : date + version + IP) référence cette valeur.
 */
export const CGV_VERSION = '2026-07-07';
