import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Récupérer la session depuis les cookies (Supabase Auth réel)
  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();

  const body = await req.json() as {
    devisNumber: string;
    userId: string;
    email: string;
    customerName: string;
    company?: string;
    lines: unknown[];
    totalHT: number;
    totalTTC: number;
    fraisHT: number;
  };

  // En production : utiliser l'ID de session ; en dev : utiliser le body
  const userId = sessionUser?.id ?? body.userId;
  const email  = sessionUser?.email ?? body.email;

  if (!userId || !email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.from('devis').insert({
    devis_number:  body.devisNumber,
    user_id:       userId,
    email,
    customer_name: body.customerName,
    company:       body.company ?? null,
    lines:         body.lines,
    total_ht:      body.totalHT,
    total_ttc:     body.totalTTC,
    frais_ht:      body.fraisHT,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
