import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

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
  const { data: { user } } = await supabase.auth.getUser();

  // Protège /compte
  if (pathname.startsWith('/compte') && !user) {
    return NextResponse.redirect(new URL('/pro', request.url));
  }

  // Protège /admin — réservé au rôle admin
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!user) {
      return redirectWithCookies('/admin/login', request, supabaseResponse);
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
      const allowed = ['/admin/clients', '/admin/devis', '/admin/commandes'];
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
