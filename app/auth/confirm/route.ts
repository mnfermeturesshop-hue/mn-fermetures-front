import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      if (type === 'invite') {
        return NextResponse.redirect(new URL('/pro/definir-mot-de-passe', origin));
      }
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/pro/nouveau-mot-de-passe', origin));
      }
      return NextResponse.redirect(new URL('/', origin));
    }
  }

  return NextResponse.redirect(new URL('/pro?error=lien-invalide', origin));
}
