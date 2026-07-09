import { createHmac } from 'crypto';

/**
 * Signature du lien de désinscription mailing (HMAC-SHA256 de l'user_id,
 * clé = service_role). Non forgeable sans le secret serveur ; permet la
 * désinscription en un clic sans connexion.
 */
export function unsubscribeSig(userId: string): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '')
    .update(`unsubscribe:${userId}`)
    .digest('hex');
}
