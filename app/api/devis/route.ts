import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // user_id/email issus EXCLUSIVEMENT de la session (audit S5) — jamais du body
  const serverClient = createClient();
  const { data: { user: sessionUser } } = await serverClient.auth.getUser();

  if (!sessionUser?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const userId = sessionUser.id;
  const email = sessionUser.email;

  const body = await req.json() as {
    devisNumber: string;
    customerName: string;
    company?: string;
    lines: unknown[];
    totalHT: number;
    totalTTC: number;
    fraisHT: number;
  };

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

const ALLOWED_DEVIS_STATUS = ['draft', 'converted', 'expired'] as const;

export async function PATCH(req: NextRequest) {
  // Changement de statut : réservé au propriétaire du devis ou à un admin (audit S6)
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { devisNumber, status } = await req.json() as { devisNumber: string; status: string };
  if (!devisNumber || !status) {
    return NextResponse.json({ error: 'devisNumber et status requis' }, { status: 400 });
  }
  if (!(ALLOWED_DEVIS_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Vérifie la propriété (ou le rôle admin) avant toute écriture
  const { data: devis } = await adminClient
    .from('devis')
    .select('user_id')
    .eq('devis_number', devisNumber)
    .single();
  if (!devis) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });

  if (devis.user_id !== user.id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }
  }

  const { error } = await adminClient
    .from('devis')
    .update({ status })
    .eq('devis_number', devisNumber);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
