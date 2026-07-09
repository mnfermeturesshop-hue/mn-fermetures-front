import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const REMINDER_DAYS = 15;

interface DevisRecord {
  user_id: string | null;
  status: string;
  valid_until: string;
}

/**
 * Active/annule le rappel automatique d'un devis (opt-in client).
 * `enable: true` → email envoyé par le cron quotidien dans 15 jours pour
 * penser à convertir le devis en bon de commande / relancer le client final.
 * Réservé au propriétaire du devis.
 */
export async function POST(req: NextRequest, { params }: { params: { number: string } }) {
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { enable } = await req.json() as { enable?: boolean };
  if (typeof enable !== 'boolean') {
    return NextResponse.json({ error: 'enable (boolean) requis' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: devis, error } = await admin
    .from('devis')
    .select('user_id, status, valid_until')
    .eq('devis_number', params.number)
    .single<DevisRecord>();

  if (error || !devis) {
    return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 });
  }
  if (devis.user_id !== user.id) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  if (enable) {
    if (devis.status === 'converted') {
      return NextResponse.json({ error: 'Ce devis est déjà converti en bon de commande.' }, { status: 409 });
    }
    if (new Date(devis.valid_until) < new Date()) {
      return NextResponse.json({ error: 'Ce devis a expiré.' }, { status: 409 });
    }
  }

  const reminderAt = enable
    ? new Date(Date.now() + REMINDER_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { error: upErr } = await admin
    .from('devis')
    .update({ reminder_at: reminderAt, reminder_sent_at: null })
    .eq('devis_number', params.number);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, reminderAt });
}
