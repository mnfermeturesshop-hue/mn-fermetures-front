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
