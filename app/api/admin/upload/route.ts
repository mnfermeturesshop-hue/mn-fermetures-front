import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/guards';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// Bucket PUBLIC → whitelist stricte : pas de SVG/HTML (vecteur XSS/phishing).
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/** Assainit le slug avant de l'utiliser comme préfixe de chemin de stockage (anti path-traversal). */
function safeSlug(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const slugRaw = formData.get('slug') as string | null;
    if (!file || !slugRaw) {
      return NextResponse.json({ error: 'file et slug requis' }, { status: 400 });
    }

    // Type + taille vérifiés côté serveur (l'extension vient du MIME, pas du nom de fichier)
    const ext = IMAGE_TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Image invalide (JPG, PNG, WebP, AVIF ou GIF).' }, { status: 400 });
    }
    if (file.size === 0 || file.size > IMAGE_MAX_BYTES) {
      return NextResponse.json({ error: "L'image doit faire au plus 5 Mo." }, { status: 400 });
    }

    const slug = safeSlug(slugRaw);
    if (!slug) {
      return NextResponse.json({ error: 'Slug invalide.' }, { status: 400 });
    }

    const supabase = createAdminClient();
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
