'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DiscountMap } from '@/lib/familles';

export type UserRole = 'guest' | 'b2c' | 'b2b' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: string;
  proDiscounts?: DiscountMap;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;

  isPro: () => boolean;
  isAdmin: () => boolean;
  isLoggedIn: () => boolean;

  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;

  _devLoginPro: () => void;
  _devLoginB2C: () => void;
}

const isSupabaseConfigured = () =>
  typeof process !== 'undefined' &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      isPro: () => get().user?.role === 'b2b' || get().user?.role === 'admin',
      isAdmin: () => get().user?.role === 'admin',
      isLoggedIn: () => get().user !== null,

      login: async (email, password) => {
        set({ isLoading: true });

        if (isSupabaseConfigured()) {
          try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();

            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
              set({ isLoading: false });
              return { error: error.message };
            }

            // Récupère le profil étendu (rôle, entreprise, remises)
            const { data: profile } = await supabase
              .from('profiles')
              .select('name, role, company, discounts')
              .eq('id', data.user.id)
              .single();

            set({
              isLoading: false,
              user: {
                id: data.user.id,
                email: data.user.email ?? email,
                name: profile?.name ?? email.split('@')[0],
                role: (profile?.role as UserRole) ?? 'b2c',
                company: profile?.company ?? undefined,
                proDiscounts: (profile?.discounts as DiscountMap) ?? {},
              },
            });
            return {};
          } catch (err) {
            set({ isLoading: false });
            return { error: 'Erreur de connexion. Veuillez réessayer.' };
          }
        }

        // ── Fallback mock (Supabase non configuré) ──
        await new Promise((r) => setTimeout(r, 600));
        set({
          isLoading: false,
          user: {
            id: 'demo-b2b',
            email,
            name: 'Démo Pro',
            role: 'b2b',
            company: 'Pose & Déco SARL',
            proDiscounts: {},
          },
        });
        return {};
      },

      logout: async () => {
        if (isSupabaseConfigured()) {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase.auth.signOut();
        }
        set({ user: null });
      },

      _devLoginPro: () =>
        set({
          user: {
            id: 'dev-pro',
            email: 'pro@mmfermetures.fr',
            name: 'Pro Test',
            role: 'b2b',
            company: 'Test SARL',
            proDiscounts: { 'volet-roulant': 10, 'accessoires': 5 },
          },
        }),

      _devLoginB2C: () =>
        set({
          user: {
            id: 'dev-b2c',
            email: 'client@example.com',
            name: 'Client Test',
            role: 'b2c',
          },
        }),
    }),
    {
      name: 'mm-auth',
      partialize: (s) => ({ user: s.user }),
    }
  )
);
