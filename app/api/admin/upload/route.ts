import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slug = formData.get('slug') as string | null;
    if (!file || !slug) {
      return NextResponse.json({ error: 'file et slug requis' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${slug}/${Date.now()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
