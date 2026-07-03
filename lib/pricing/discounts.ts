import { createAdminClient } from '@/lib/supabase/admin';
import type { DiscountMap } from '@/lib/familles';

/**
 * Remises B2B d'un utilisateur, lues côté serveur depuis `profiles.discounts`.
 * Source de vérité pour le calcul de prix — jamais la valeur envoyée par le
 * client (cf. audit S2). Renvoie `{}` pour un invité ou en cas d'erreur.
 */
export async function getUserDiscounts(userId: string | null): Promise<DiscountMap> {
  if (!userId || !process.env.SUPABASE_SERVICE_ROLE_KEY) return {};
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('profiles')
      .select('discounts')
      .eq('id', userId)
      .single();
    return (data?.discounts as DiscountMap) ?? {};
  } catch {
    return {};
  }
}
