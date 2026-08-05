import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Jamais de cache Next.js sur les lectures service-role : sinon une requête
      // mise en cache quand une table était vide (ex. taxonomy_nodes avant le seed)
      // renvoie indéfiniment un résultat périmé. Les lectures admin doivent être fraîches.
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  );
}
