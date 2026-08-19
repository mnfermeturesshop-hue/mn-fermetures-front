import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

// ── Durée de session (sécurité, défense en profondeur) ──
// Déconnexion forcée après une période d'inactivité et un plafond absolu, quoi qu'il arrive.
// Le back-office (admin/commercial) est plus strict que l'espace client pro. La couche
// AUTORITATIVE reste Supabase (JWT court + timebox natif) ; ici on protège la navigation et
// on purge les cookies. cf. procédure dashboard dans README/notes.
const SESS_START = 'mm_sess_start';   // horodatage (ms) du début de session
const SESS_SEEN = 'mm_sess_seen';     // horodatage (ms) de la dernière activité
const MIN = 60_000;
const HOUR = 3_600_000;
const LIMITS = {
  backoffice: { idle: 20 * MIN, max: 8 * HOUR },
  client: { idle: 30 * MIN, max: 12 * HOUR },
};

function clearSessionTracking(res: NextResponse) {
  res.cookies.set(SESS_START, '', { maxAge: 0, path: '/' });
  res.cookies.set(SESS_SEEN, '', { maxAge: 0, path: '/' });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase non configuré : bypass toléré en DEV uniquement.
  // En production, ne jamais laisser /admin ou /compte ouverts (fail-closed, audit S9).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    if (
      process.env.NODE_ENV === 'production' &&
      pathname !== '/admin/login' &&
      (pathname.startsWith('/admin') || pathname.startsWith('/compte'))
    ) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  // Client SSR pour lire/rafraîchir la session depuis les cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Toujours appeler getUser() pour que le refresh de token se produise
  let user = (await supabase.auth.getUser()).data.user;

  // ── Contrôle de durée de session ──
  let sessionExpired = false;
  if (user) {
    const now = Date.now();
    const scope = pathname.startsWith('/admin') ? 'backoffice' : 'client';
    const { idle, max } = LIMITS[scope];
    const startRaw = request.cookies.get(SESS_START)?.value;
    const start = Number(startRaw) || now;
    const seen = Number(request.cookies.get(SESS_SEEN)?.value) || now;
    const expired = now - start > max || now - seen > idle;
    if (expired) {
      // Révoque la session Supabase (les cookies sb-* effacés arrivent via setAll) puis
      // purge notre suivi. Les gardes ci-dessous voient alors `user = null`.
      try { await supabase.auth.signOut(); } catch { /* réseau : on invalide quand même côté cookies */ }
      clearSessionTracking(supabaseResponse);
      user = null;
      sessionExpired = true;
    } else {
      const opts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
      if (!startRaw) supabaseResponse.cookies.set(SESS_START, String(now), opts);
      supabaseResponse.cookies.set(SESS_SEEN, String(now), opts);
    }
  } else if (request.cookies.get(SESS_START) || request.cookies.get(SESS_SEEN)) {
    // Plus de session : on purge le suivi (évite un « début » périmé au prochain login).
    clearSessionTracking(supabaseResponse);
  }

  // Protège /compte
  if (pathname.startsWith('/compte') && !user) {
    return redirectWithCookies(sessionExpired ? '/pro?expired=1' : '/pro', request, supabaseResponse);
  }

  // Protège /admin — réservé au rôle admin
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      return redirectWithCookies(sessionExpired ? '/admin/login?expired=1' : '/admin/login', request, supabaseResponse);
    }

    // Service role pour vérifier le rôle — bypasse RLS, évite les faux négatifs
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Back-office ouvert aux admins et aux commerciaux (droits restreints) —
    // la granularité fine est appliquée par les gardes de chaque route API.
    if (!profile || (profile.role !== 'admin' && profile.role !== 'commercial')) {
      return redirectWithCookies('/admin/login', request, supabaseResponse);
    }

    // Un commercial est cantonné à SES rubriques : dashboard (filtré sur ses
    // clients), clients, devis, commandes. Toute autre page /admin (produits,
    // import, inventaire, demandes pro, équipe…) le renvoie vers le dashboard
    // — blocage serveur, pas seulement la nav.
    if (profile.role === 'commercial') {
      const allowed = ['/admin/clients', '/admin/devis', '/admin/commandes', '/admin/mailing'];
      const isAllowed = pathname === '/admin'
        || allowed.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (!isAllowed) {
        return redirectWithCookies('/admin', request, supabaseResponse);
      }
    }
  }

  return supabaseResponse;
}

/** Crée un redirect en copiant les cookies rafraîchis (évite la boucle infinie). */
function redirectWithCookies(path: string, request: NextRequest, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
    redirect.cookies.set(name, value);
  });
  return redirect;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
