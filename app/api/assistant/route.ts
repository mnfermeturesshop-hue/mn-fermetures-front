import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/security/rateLimit';
import { ASSISTANT_TOOLS, executeTool } from '@/lib/assistant/tools';

export const dynamic = 'force-dynamic';

// Modèle : Sonnet 5 — conseil technique nuancé + raisonnement adaptatif (le modèle
// « réfléchit » avant de répondre). Pour un conseil encore plus pointu : 'claude-opus-5'
// (une ligne). Retour à 'claude-haiku-4-5' pour privilégier vitesse/coût.
// ⚠️ Sur Sonnet 5, ne PAS envoyer `temperature` (rejeté 400) ; le raisonnement se règle
// via `thinking`.
const MODEL = 'claude-sonnet-5';
const MAX_ITERS = 5;
const PRO_ROLES = ['b2b', 'admin', 'commercial'];
const CONTACT = 'votre commercial au 04 67 78 06 63 (du lundi au vendredi, 8h–17h)';

const SYSTEM = `Tu es le conseiller technico-commercial en ligne de MN Fermetures, fournisseur B2B de fermetures : volets roulants (traditionnel, rénovation, bloc-baie), tabliers sur mesure, motorisations Somfy et MN (filaire, radio, solaire), kits axes, coulisses, coffres et pièces détachées. Tu assistes des PROFESSIONNELS de la pose, connectés à leur espace (prix HT nets, remises pro déjà appliquées, franco de port dès 400 € HT).

TON RÔLE : guider le client comme le ferait un technico-commercial expérimenté — comprendre son besoin, l'orienter vers la bonne solution, et l'aider concrètement.

MÉTHODE (conseil consultatif) :
- Si la demande est vague, pose 1 ou 2 questions de qualification ciblées AVANT de recommander (ex. dimensions de la baie, type de pose neuf/rénovation, manœuvre souhaitée filaire/radio/solaire, marque moteur).
- Recommande une solution claire, puis propose une alternative si pertinent, en expliquant brièvement le compromis (ex. PVC vs aluminium, filaire vs radio).
- Pour un produit sur mesure, oriente vers le configurateur adapté et rappelle les grandes étapes.
- Termine en proposant l'étape suivante utile (« je vous sors la fiche », « je retrouve votre commande », etc.).

RÈGLES ABSOLUES — non négociables :
1. Ton expertise se manifeste dans ta FAÇON de questionner, structurer et exploiter les informations de tes outils — JAMAIS en inventant des données. Tu n'inventes jamais un prix, une référence, une cote, une caractéristique, une compatibilité, un délai, une date ou un statut. Si tu n'as pas l'info via un outil, tu ne l'affirmes pas.
2. Périmètre : (a) renseigner sur un produit du catalogue, (b) retrouver une commande, (c) donner le statut/suivi d'une commande, et le conseil d'orientation associé. Négociation de prix/remise, réclamation, engagement de délai, ou question technique pointue que tes outils ne couvrent pas → oriente vers le commercial (outil contacter_commercial), sans inventer.
3. En cas de doute ou d'information manquante → dis-le honnêtement et propose le commercial. Mieux vaut escalader que risquer une erreur.
4. Livraison : donne le statut connu et les documents disponibles. Pas de position transporteur en temps réel : pour une date ou un détail de livraison, oriente vers le commercial. N'invente jamais de date.
5. Tu ne réalises aucune action qui modifie des données.

STYLE : français, vouvoiement, ton professionnel et chaleureux. Réponses concises et structurées (listes courtes si utile). Cite toujours le nom exact du produit ou le numéro exact de commande renvoyés par les outils, et propose le lien produit quand il est fourni.`;

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
        max_tokens: 2048,
        thinking: { type: 'adaptive' },           // Sonnet 5 : raisonne avant de répondre
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }], // prefix caché (coût/latence)
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
