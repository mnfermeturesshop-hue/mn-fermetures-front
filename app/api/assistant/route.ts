import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rateLimit';
import { ASSISTANT_TOOLS, executeTool } from '@/lib/assistant/tools';

export const dynamic = 'force-dynamic';

// Modèle : Haiku 4.5 — assistant support « ancré » (routage d'outils + réponse
// factuelle courte), rapide et économe pour un widget à fort volume. Pour des
// réponses plus fines, passer à 'claude-sonnet-5' ou 'claude-opus-5' (une ligne).
const MODEL = 'claude-haiku-4-5';
const MAX_ITERS = 5;
const PRO_ROLES = ['b2b', 'admin', 'commercial'];
const CONTACT = 'votre commercial au 04 67 78 06 63 (du lundi au vendredi, 8h–17h)';

const SYSTEM = `Tu es l'assistant en ligne de MN Fermetures, fournisseur B2B de fermetures (volets roulants, tabliers, motorisations Somfy/MN, kits axes, pièces détachées). Tu assistes des CLIENTS PROFESSIONNELS connectés.

RÈGLES ABSOLUES — à respecter sans exception :
1. Tu réponds UNIQUEMENT à partir des résultats renvoyés par tes outils. Tu n'inventes JAMAIS un prix, une référence, une caractéristique, un délai, une date ou un statut. Si tu n'as pas l'information via un outil, tu ne la donnes pas.
2. Ton périmètre se limite à : (a) renseigner sur un produit du catalogue, (b) aider à retrouver une commande, (c) donner le statut/suivi d'une commande. Toute autre demande (négociation de prix, remise, réclamation, conseil hors catalogue, engagement de délai) → tu invites poliment à contacter le commercial (outil contacter_commercial).
3. Si un outil ne renvoie rien, si tu n'es pas sûr, ou si la demande sort du périmètre → tu le dis honnêtement et tu proposes de contacter le commercial. Ne devine jamais.
4. Livraison : donne le statut connu et les documents disponibles. Tu n'as pas de position transporteur en temps réel : pour une date ou un détail de livraison, oriente vers le commercial. N'invente jamais de date.
5. Tu ne réalises aucune action qui modifie des données.

STYLE : français, vouvoiement, concis et professionnel. Cite toujours le nom exact du produit ou le numéro exact de commande renvoyé par les outils. Propose le lien produit quand il est fourni. Reste bref (quelques phrases).`;

interface Turn { role: 'user' | 'assistant'; text: string }

export async function POST(req: NextRequest) {
  // 1. Auth : réservé aux comptes pros connectés (b2b/admin/commercial)
  const serverClient = createClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !PRO_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Assistant réservé aux comptes professionnels.' }, { status: 403 });
  }

  // 2. Rate-limit par utilisateur
  if (!rateLimit(`assistant:${user.id}`, 20, 5 * 60_000)) {
    return NextResponse.json({ error: 'Trop de messages. Patientez quelques minutes.' }, { status: 429 });
  }

  // 3. Dégradation gracieuse : sans clé API, le widget bascule sur le contact commercial
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      degraded: true,
      reply: `L'assistant est momentanément indisponible. Vous pouvez joindre ${CONTACT}.`,
    });
  }

  // 4. Historique (borné + tronqué) — la dernière entrée doit être un message utilisateur
  const body = await req.json().catch(() => ({})) as { history?: Turn[] };
  const messages: Anthropic.MessageParam[] = (Array.isArray(body.history) ? body.history : [])
    .slice(-20)
    .filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string' && t.text.trim())
    .map((t) => ({ role: t.role, content: t.text.slice(0, 2000) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message utilisateur attendu.' }, { status: 400 });
  }

  // 5. Boucle tool-use (outils exécutés avec l'ID de session → propriété respectée)
  const client = new Anthropic();
  const ctx = { userId: user.id };
  try {
    for (let i = 0; i < MAX_ITERS; i++) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        temperature: 0.2,
        system: SYSTEM,
        tools: ASSISTANT_TOOLS,
        messages,
      });

      if (res.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: res.content });
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of res.content) {
          if (block.type === 'tool_use') {
            const out = await executeTool(block.name, block.input, ctx);
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: out });
          }
        }
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return NextResponse.json({
        reply: text || `Je préfère ne pas répondre au hasard. Contactez ${CONTACT}.`,
      });
    }
    // Boucle épuisée sans réponse finale
    return NextResponse.json({ reply: `Je n'ai pas pu aboutir. Contactez ${CONTACT}.` });
  } catch (e) {
    console.error('[assistant] erreur API', e);
    return NextResponse.json({
      degraded: true,
      reply: `L'assistant est momentanément indisponible. Vous pouvez joindre ${CONTACT}.`,
    });
  }
}
