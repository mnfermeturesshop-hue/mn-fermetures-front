import { getAllProducts } from './db';
import { resolveMatrixPrice } from './resolvePrice';
import { isMatrix, isUnit, isKit, type Product, type CartLine, type Uom } from './types';
import { type DiscountMap } from '@/lib/familles';
import { resolveB2BDiscount, applyDiscount, resolveB2BSurcharge, surchargeMapFromNodes, resolveEco, ecoMapFromNodes } from '@/lib/pricing/discount-resolver';
import { getTaxonomy } from '@/lib/catalog/taxonomy-loader';
import { generatorNode } from '@/lib/catalog/taxonomy';
import { laquageForfaitHT } from '@/lib/pricing/shipping';
import { resoudrePrix } from '@/lib/tablier/engine';
import { loadConfiguratorDef } from '@/lib/configurateur/loader';
import { resolvePrice } from '@/lib/configurateur/v2/engine';
import type { Values } from '@/lib/configurateur/v2/types';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Vérification autoritaire du panier côté serveur (audit S2).
 *
 * Recharge le catalogue (Supabase/mock), recalcule le prix unitaire de chaque
 * ligne à partir de la source de vérité (référence unit/kit, ou dimensions
 * matricielles) et applique la remise B2B lue en base — JAMAIS le
 * `unitPriceHT`/`totalHT` envoyés par le client. Rejette toute ligne non
 * vérifiable.
 */

export interface VerifiedLine {
  key: string;
  name: string;
  detail?: string;
  reference?: string;
  /** PU HT catalogue du produit AVANT remise (hors surcharge). */
  grossUnitPriceHT: number;
  /** PU HT net du produit après remise (hors surcharge). */
  unitPriceHT: number;
  /** Surcharge temporaire — sous-ligne dédiée (remise appliquée). */
  surchargePct?: number;
  surchargeGrossUnitHT?: number;
  surchargeUnitHT?: number;
  /** Éco-contribution (€/unité) — fusionnée au total de la ligne, non remisée/surchargée. */
  ecoContribHT?: number;
  /** Descripteur de re-tarification conservé — permet de re-commander un devis
   *  (le panier rechargé reste re-tarifable au taux courant). */
  pricing?: CartLine['pricing'];
  quantity: number;
  uom: Uom;
}

export type VerifyResult =
  | { ok: true; lines: VerifiedLine[]; productsHT: number; laquageHT: number }
  | { ok: false; error: string };

const MAX_QTY = 999;

/** Contexte de vérification — requis pour les lignes issues d'un devis. */
export interface VerifyContext {
  /** Utilisateur de session (propriétaire attendu des devis référencés). */
  userId?: string | null;
}

interface DevisRow {
  user_id: string | null;
  status: string;
  lines: CartLine[];
}

export async function verifyCartLines(
  clientLines: unknown,
  discounts: DiscountMap,
  ctx: VerifyContext = {},
): Promise<VerifyResult> {
  if (!Array.isArray(clientLines) || clientLines.length === 0) {
    return { ok: false, error: 'Panier vide ou invalide.' };
  }

  // Cache des devis référencés par les lignes (chargés une seule fois chacun)
  const devisCache = new Map<string, DevisRow | null>();
  async function loadDevis(devisNumber: string): Promise<DevisRow | null> {
    if (devisCache.has(devisNumber)) return devisCache.get(devisNumber) ?? null;
    let row: DevisRow | null = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data } = await admin
        .from('devis')
        .select('user_id, status, lines')
        .eq('devis_number', devisNumber)
        .single<DevisRow>();
      row = data ?? null;
    }
    devisCache.set(devisNumber, row);
    return row;
  }

  const products = await getAllProducts();
  const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));
  const taxonomy = await getTaxonomy();   // remises B2B héritées (Gamme › Famille › Sous‑famille)
  const surcharges = surchargeMapFromNodes(taxonomy);   // surcharge temporaire (nœud exact)
  const ecoMap = ecoMapFromNodes(taxonomy);             // éco-contribution € (nœud exact)

  // Index référence → prix de base (unit variants + kit configs)
  const byRef = new Map<string, { product: Product; base: number }>();
  for (const p of products) {
    if (isUnit(p)) for (const v of p.variants) byRef.set(v.reference, { product: p, base: v.priceHT });
    if (isKit(p)) for (const c of p.configs) byRef.set(c.reference, { product: p, base: c.priceHT });
  }

  const verified: VerifiedLine[] = [];
  let productsHT = 0;
  let hasLaque = false;   // ≥1 ligne configurateur en coloris laqué RAL

  for (const raw of clientLines as CartLine[]) {
    const qty = Number(raw?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: 'Quantité invalide.' };
    }

    let base: number | null = null;
    let name = String(raw?.name ?? '');
    let node: string | undefined;   // nœud de nomenclature (ou ancienne famille)
    // Les prix de devis sont négociés : ni re-tarification ni remise en plus.
    let isNegotiated = false;

    if (raw?.pricing?.kind === 'devis') {
      // Ligne issue d'un devis stocké en base (site ou ERP) — le serveur
      // vérifie la propriété et reprend le prix négocié tel qu'enregistré.
      const pr = raw.pricing;
      if (!ctx.userId) {
        return { ok: false, error: 'Connexion requise pour commander un devis.' };
      }
      const devis = await loadDevis(String(pr.devisNumber));
      if (!devis) return { ok: false, error: `Devis introuvable : ${pr.devisNumber}` };
      if (devis.user_id !== ctx.userId) {
        return { ok: false, error: 'Ce devis ne vous appartient pas.' };
      }
      const src = devis.lines?.[Number(pr.line)];
      if (!src || typeof src.unitPriceHT !== 'number') {
        return { ok: false, error: `Ligne de devis invalide : ${pr.devisNumber}#${pr.line}` };
      }
      base = src.unitPriceHT;
      name = src.name;
      isNegotiated = true;
    } else if (raw?.pricing?.kind === 'matrix') {
      const pr = raw.pricing;
      const product = bySlug.get(pr.slug);
      if (!product || !isMatrix(product)) {
        return { ok: false, error: `Produit introuvable : ${pr.slug}` };
      }
      base = resolveMatrixPrice(product, Number(pr.height), Number(pr.width), Array.isArray(pr.options) ? pr.options : []);
      name = product.name;
      node = product.taxonomySlug ?? product.famille;
    } else if (raw?.pricing?.kind === 'tablier') {
      // Générateur de tablier sur mesure (moteur lib/tablier) — le serveur
      // ré-résout le prix à partir des dimensions brutes (avec snap au barème).
      const pr = raw.pricing;
      const res = resoudrePrix({
        slug: pr.slug,
        colorisCode: pr.colorisCode,
        largeur: Number(pr.largeur),
        hauteur: Number(pr.hauteur),
        avecAttacheRigide: !!pr.avecAttache,
        avecVerrou: !!pr.avecVerrou,
      });
      if (!res) return { ok: false, error: `Tablier hors abaque : ${pr.slug}` };
      base = res.total;
      name = res.lame.nom;
      // Le générateur n'applique pas de remise famille → parité avec l'affichage.
    } else if (raw?.pricing?.kind === 'configurateur') {
      // Moteur de configuration universel (v2) — le serveur recharge la
      // définition et recalcule le prix depuis les valeurs de champs brutes.
      const pr = raw.pricing;
      const def = await loadConfiguratorDef(String(pr.slug));
      if (!def) return { ok: false, error: `Configurateur introuvable : ${pr.slug}` };
      const values: Values = (pr.values && typeof pr.values === 'object') ? pr.values as Values : {};
      const res = resolvePrice(def, values);
      if (!res.ok) return { ok: false, error: `Configuration hors barème : ${def.name}` };
      base = res.total;
      name = raw.name ? String(raw.name) : def.name;
      // Nœud de rattachement : la valeur du champ `nodeField` (ex. sous-famille
      // sélectionnée) prime — sinon le nœud portant le générateur, sinon def.famille.
      const selNode = def.nodeField ? values[def.nodeField] : undefined;
      node = (typeof selNode === 'string' && selNode) ? selNode : (generatorNode(taxonomy, def.slug) ?? def.famille);
      // Coloris laqué (RAL) → forfait laquage par commande (recalcul autoritaire) :
      // détecté par la présence du supplément coloris dans le résultat.
      if (res.lineItems.some((li) => li.code.startsWith('color_') && li.code.endsWith('_pv'))) hasLaque = true;
    } else if (raw?.reference) {
      const hit = byRef.get(raw.reference);
      if (!hit) return { ok: false, error: `Référence introuvable : ${raw.reference}` };
      base = hit.base;
      name = hit.product.name;
      node = hit.product.taxonomySlug ?? hit.product.famille;
    } else {
      return { ok: false, error: `La ligne « ${String(raw?.name ?? '?')} » n'est plus re-tarifable (article ou devis ancien). Retirez-la du panier et re-configurez-la.` };
    }

    if (base == null) {
      return { ok: false, error: 'Prix indisponible pour un article (hors abaque ?).' };
    }

    // Produit tarifé à sa base (remise appliquée). La surcharge temporaire est
    // une SOUS-LIGNE dédiée (remise appliquée dessus aussi) ; jamais sur un négocié.
    const surchargePct = isNegotiated ? 0 : resolveB2BSurcharge(surcharges, node, taxonomy);
    const discountPct = isNegotiated ? 0 : resolveB2BDiscount(discounts as Record<string, number>, node, taxonomy);
    const unitPriceHT = isNegotiated ? base : applyDiscount(base, discountPct);
    const surchargeGrossUnitHT = surchargePct > 0 ? Math.round(base * surchargePct) / 100 : 0;
    const surchargeUnitHT = surchargeGrossUnitHT > 0 ? applyDiscount(surchargeGrossUnitHT, discountPct) : 0;
    // Éco-contribution : montant fixe du nœud exact, ajouté une fois par produit
    // (× quantité), JAMAIS remisé ni surchargé. Pas sur les lignes négociées.
    const ecoContribHT = isNegotiated ? 0 : resolveEco(ecoMap, node);
    productsHT += (unitPriceHT + surchargeUnitHT + ecoContribHT) * qty;

    verified.push({
      key: String(raw.key ?? name),
      name,                            // libellé autoritaire
      detail: raw.detail,              // affichage seulement
      reference: raw.reference,
      grossUnitPriceHT: base,          // PU HT produit (avant remise, hors surcharge)
      unitPriceHT,                     // PU HT produit net
      ...(surchargeUnitHT > 0 ? { surchargePct, surchargeGrossUnitHT, surchargeUnitHT } : {}),
      ...(ecoContribHT > 0 ? { ecoContribHT } : {}),
      ...(raw.pricing ? { pricing: raw.pricing } : {}),   // conservé pour re-commander
      quantity: qty,
      uom: raw.uom,
    });
  }

  const roundedProductsHT = Math.round(productsHT * 100) / 100;
  return {
    ok: true,
    lines: verified,
    productsHT: roundedProductsHT,
    laquageHT: laquageForfaitHT(roundedProductsHT, hasLaque),
  };
}
