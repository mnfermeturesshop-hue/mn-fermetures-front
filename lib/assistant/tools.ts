/**
 * Outils (lecture seule) de l'assistant IA — exécutés CÔTÉ SERVEUR avec l'ID de
 * l'utilisateur de session. Les outils « commande » sont filtrés/vérifiés par
 * `ctx.userId` : l'agent ne peut voir QUE les commandes du client connecté
 * (même garantie de propriété que /api/orders/mine et /api/orders/[id]).
 *
 * Principe anti-hallucination : l'agent ne dispose d'AUCUNE donnée hors de ces
 * outils. S'ils ne renvoient rien, il n'a rien à inventer → il escalade.
 */
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllProducts, getAllBrands, getAllCategories, getProductBySlugDB } from '@/lib/catalog/db';
import { searchProducts } from '@/lib/catalog/search';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { isUnit, isKit } from '@/lib/catalog/types';

export interface AssistantCtx {
  userId: string;
}

const CONTACT_GENERIQUE = { telephone: '04 67 78 06 63', horaires: 'du lundi au vendredi, 8h–17h' };

const labelType = (t: string): string =>
  t === 'matrix' ? 'sur mesure (configurable)' : t === 'kit' ? 'kit' : "à l'unité";

const labelStatut = (s: string): string => ({
  pending: 'en cours de traitement',
  paid: 'payée — en préparation',
  processing: 'en préparation',
  shipped: 'expédiée',
  delivered: 'livrée',
  cancelled: 'annulée',
  refunded: 'remboursée',
}[s] ?? s);

export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'rechercher_produit',
    description:
      "Recherche des produits du catalogue MN Fermetures par mot-clé, nom, référence ou marque. Renvoie jusqu'à 6 correspondances. À utiliser pour toute question « quel produit », « avez-vous… », « référence… », « prix de… ».",
    input_schema: {
      type: 'object',
      properties: {
        requete: { type: 'string', description: 'Termes de recherche : nom, référence, marque ou catégorie.' },
      },
      required: ['requete'],
    },
  },
  {
    name: 'detail_produit',
    description:
      "Fiche détaillée d'un produit à partir de son `slug` (obtenu via rechercher_produit) : description, catégorie, marque, prix HT à partir de, type. À utiliser pour approfondir un produit précis.",
    input_schema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Identifiant (slug) du produit.' } },
      required: ['slug'],
    },
  },
  {
    name: 'mes_commandes',
    description:
      "Liste les commandes du client connecté (numéro, date, statut, total). À utiliser quand il cherche « ma commande », « mes commandes », un numéro qu'il ne retrouve pas.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'statut_commande',
    description:
      "Statut et documents disponibles d'UNE commande du client connecté, par son numéro. Renvoie le statut et les documents (ARC, facture, suivi) attachés. Ne fournit PAS de position transporteur en temps réel : pour ce détail, escalader vers le commercial.",
    input_schema: {
      type: 'object',
      properties: { numero: { type: 'string', description: 'Numéro de commande (ex. CMD-2026-1234).' } },
      required: ['numero'],
    },
  },
  {
    name: 'contacter_commercial',
    description:
      "Coordonnées du commercial référent du client connecté (nom, téléphone, email). À utiliser dès que tu ne peux pas répondre depuis les autres outils, que la demande sort du périmètre (produit / commande / livraison), ou que l'utilisateur veut un interlocuteur humain.",
    input_schema: { type: 'object', properties: {} },
  },
];

async function toolRechercherProduit(requete: string): Promise<string> {
  if (requete.trim().length < 2) return JSON.stringify({ resultats: [] });
  const [products, brands, categories] = await Promise.all([getAllProducts(), getAllBrands(), getAllCategories()]);
  const results = searchProducts(requete, products, brands, categories, 6);
  return JSON.stringify({
    resultats: results.map((r) => ({
      nom: r.product.name,
      slug: r.product.slug,
      categorie: categories.find((c) => c.slug === r.product.categorySlug)?.name ?? r.product.categorySlug,
      type: labelType(r.product.pricingType),
      prix_ht_a_partir_de: priceFrom(r.product) || null,
      reference: isUnit(r.product)
        ? r.product.variants[0]?.reference
        : isKit(r.product)
          ? r.product.configs[0]?.reference
          : undefined,
    })),
  });
}

async function toolDetailProduit(slug: string): Promise<string> {
  const p = await getProductBySlugDB(slug.trim());
  if (!p) return JSON.stringify({ trouve: false });
  return JSON.stringify({
    trouve: true,
    nom: p.name,
    description: p.description ?? null,
    categorie: p.categorySlug,
    famille: p.famille ?? null,
    marque: p.brandSlug ?? null,
    type: labelType(p.pricingType),
    prix_ht_a_partir_de: priceFrom(p) || null,
    lien: `/produit/${p.slug}`,
    specs: p.specs ?? null,
  });
}

async function toolMesCommandes(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('orders')
    .select('order_number, created_at, status, total_ht, payment_method')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(15);
  return JSON.stringify({
    commandes: (data ?? []).map((o) => ({
      numero: o.order_number,
      date: o.created_at,
      statut: labelStatut(o.status),
      total_ht: o.total_ht,
      mode: o.payment_method,
    })),
  });
}

async function toolStatutCommande(numero: string, userId: string): Promise<string> {
  if (!numero.trim()) return JSON.stringify({ trouve: false });
  const admin = createAdminClient();
  const { data: o } = await admin
    .from('orders')
    .select('order_number, status, created_at, shipping_method, user_id, documents')
    .eq('order_number', numero.trim())
    .single();
  // Propriété : une commande d'un autre utilisateur = « introuvable » (pas de fuite / IDOR).
  if (!o || o.user_id !== userId) return JSON.stringify({ trouve: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docs = Array.isArray(o.documents) ? (o.documents as any[]) : [];
  return JSON.stringify({
    trouve: true,
    numero: o.order_number,
    statut: labelStatut(o.status),
    date: o.created_at,
    livraison: o.shipping_method,
    documents_disponibles: docs.map((d) => d?.type ?? d?.label).filter(Boolean),
    note_livraison:
      "Pas de position transporteur en temps réel disponible ici. Pour le détail précis de la livraison ou une date, escalader vers le commercial (ne pas inventer de date).",
  });
}

async function toolContacterCommercial(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: me } = await admin.from('profiles').select('commercial_id').eq('id', userId).single();
  if (!me?.commercial_id) {
    return JSON.stringify({ commercial_assigne: false, contact: CONTACT_GENERIQUE });
  }
  const [{ data: prof }, { data: u }] = await Promise.all([
    admin.from('profiles').select('name, phone').eq('id', me.commercial_id).single(),
    admin.auth.admin.getUserById(me.commercial_id),
  ]);
  return JSON.stringify({
    commercial_assigne: true,
    nom: prof?.name ?? null,
    telephone: prof?.phone ?? CONTACT_GENERIQUE.telephone,
    email: u?.user?.email ?? null,
    horaires: CONTACT_GENERIQUE.horaires,
  });
}

/** Exécute un outil par nom. Toute erreur est capturée → message d'escalade (jamais de crash). */
export async function executeTool(name: string, input: unknown, ctx: AssistantCtx): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const arg = (input ?? {}) as any;
  try {
    switch (name) {
      case 'rechercher_produit': return await toolRechercherProduit(String(arg.requete ?? ''));
      case 'detail_produit': return await toolDetailProduit(String(arg.slug ?? ''));
      case 'mes_commandes': return await toolMesCommandes(ctx.userId);
      case 'statut_commande': return await toolStatutCommande(String(arg.numero ?? ''), ctx.userId);
      case 'contacter_commercial': return await toolContacterCommercial(ctx.userId);
      default: return JSON.stringify({ erreur: 'Outil inconnu.' });
    }
  } catch (e) {
    console.error('[assistant] outil', name, e);
    return JSON.stringify({
      erreur: "Donnée momentanément indisponible. Invite l'utilisateur à contacter le commercial (ne rien inventer).",
    });
  }
}
