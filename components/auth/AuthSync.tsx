'use client';

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore, type UserRole } from '@/lib/store/auth';
import type { DiscountMap } from '@/lib/familles';

/**
 * Synchronise le store d'authentification (persisté en localStorage) avec la
 * VRAIE session Supabase (cookies).
 *
 * Sans ça, l'utilisateur restait affiché « connecté » après expiration de sa
 * session — mais toute action serveur (sauvegarde de devis, bon de commande,
 * commentaires…) renvoyait un 401 « Non autorisé ». Ici :
 *  - session absente/expirée → le store est vidé (interface = déconnecté) ;
 *  - reconnexion / rafraîchissement de jeton → le store se met à jour seul.
 *
 * Monté une seule fois dans le layout racine.
 */
export function AuthSync() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const supabase = createClient();

    // Reflète une session dans le store (avec le profil étendu : rôle, remises).
    async function apply(session: Session | null) {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, role, company, discounts')
        .eq('id', session.user.id)
        .single();

      const role = (profile?.role as string) ?? 'b2c';
      // Un compte en attente d'approbation n'est pas « connecté » côté app.
      if (role === 'pending') {
        setUser(null);
        return;
      }

      setUser({
        id: session.user.id,
        email: session.user.email ?? '',
        name: profile?.name ?? (session.user.email?.split('@')[0] ?? ''),
        role: role as UserRole,
        company: profile?.company ?? undefined,
        proDiscounts: (profile?.discounts as DiscountMap) ?? {},
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      // TOKEN_REFRESHED : session prolongée, l'utilisateur ne change pas —
      // inutile de refaire une requête profil.
      if (event === 'TOKEN_REFRESHED') return;

      // INITIAL_SESSION, SIGNED_IN, USER_UPDATED → (re)synchronise.
      // setTimeout : on ne rappelle pas Supabase directement dans le callback
      // (recommandation officielle, évite un blocage du verrou interne).
      setTimeout(() => { void apply(session); }, 0);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  return null;
}
