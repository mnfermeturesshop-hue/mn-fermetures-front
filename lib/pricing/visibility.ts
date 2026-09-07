import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PRICES } from '@/lib/config';
import { getUserHiddenNodes } from '@/lib/pricing/discounts';

/**
 * Les prix sont-ils visibles pour la requête en cours ? (serveur uniquement)
 * - `true` si PUBLIC_PRICES (prix publics) ou si un utilisateur est connecté
 *   (session Supabase lue depuis les cookies — non falsifiable côté client).
 * - En dev sans Supabase configuré, les prix restent visibles (mode mock).
 */
export async function pricesVisible(): Promise<boolean> {
  if (PUBLIC_PRICES) return true;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return true;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Nœuds de nomenclature masqués pour l'utilisateur de la requête (serveur).
 * Lit la session Supabase (cookies, non falsifiable) puis `profiles.hidden_nodes`.
 * `[]` pour un invité / sans Supabase / avant migration → aucun masquage.
 * Sert au filtrage d'affichage (catalogue, configurateurs) et au 404 discret ;
 * le blocage autoritaire d'achat reste dans verifyCart.
 */
export async function getRequestHiddenNodes(): Promise<string[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? getUserHiddenNodes(user.id) : [];
}
