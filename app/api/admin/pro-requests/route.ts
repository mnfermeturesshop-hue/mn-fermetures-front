import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('pro_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY manquante' }, { status: 500 });
  }
  try {
    const { id, action } = await req.json() as { id: string; action: 'approve' | 'reject' };
    if (!id || !action) return NextResponse.json({ error: 'id et action requis' }, { status: 400 });

    const supabase = createAdminClient();

    if (action === 'reject') {
      await supabase.from('pro_requests').update({ status: 'rejected' }).eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // Récupère la demande
    const { data: proReq, error: fetchErr } = await supabase
      .from('pro_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchErr || !proReq) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    // Crée le compte Supabase Auth et envoie l'invitation par email
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(
      proReq.email,
      { data: { role: 'b2b', name: proReq.name } }
    );
    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    // Met à jour le profil créé automatiquement par le trigger avec les infos pro
    if (invited?.user?.id) {
      await supabase.from('profiles').update({
        name: proReq.name,
        role: 'b2b',
        company: proReq.company,
      }).eq('id', invited.user.id);
    }

    // Marque la demande comme approuvée
    await supabase.from('pro_requests').update({ status: 'approved' }).eq('id', id);

    return NextResponse.json({ ok: true, userId: invited?.user?.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
