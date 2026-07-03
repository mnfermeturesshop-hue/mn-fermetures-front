import { getAllProducts } from './db';
import { resolveMatrixPrice } from './resolvePrice';
import { isMatrix, isUnit, isKit, type Product, type CartLine, type Uom } from './types';
import { applyDiscount, getDiscount, type DiscountMap, type FamilleSlug } from '@/lib/familles';
import { resoudrePrix } from '@/lib/tablier/engine';

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
  unitPriceHT: number;
  quantity: number;
  uom: Uom;
}

export type VerifyResult =
  | { ok: true; lines: VerifiedLine[]; productsHT: number }
  | { ok: false; error: string };

const MAX_QTY = 999;

export async function verifyCartLines(
  clientLines: unknown,
  discounts: DiscountMap,
): Promise<VerifyResult> {
  if (!Array.isArray(clientLines) || clientLines.length === 0) {
    return { ok: false, error: 'Panier vide ou invalide.' };
  }

  const products = await getAllProducts();
  const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));

  // Index référence → prix de base (unit variants + kit configs)
  const byRef = new Map<string, { product: Product; base: number }>();
  for (const p of products) {
    if (isUnit(p)) for (const v of p.variants) byRef.set(v.reference, { product: p, base: v.priceHT });
    if (isKit(p)) for (const c of p.configs) byRef.set(c.reference, { product: p, base: c.priceHT });
  }

  const verified: VerifiedLine[] = [];
  let productsHT = 0;

  for (const raw of clientLines as CartLine[]) {
    const qty = Number(raw?.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: 'Quantité invalide.' };
    }

    let base: number | null = null;
    let name = String(raw?.name ?? '');
    let famille: FamilleSlug | undefined;

    if (raw?.pricing?.kind === 'matrix') {
      const pr = raw.pricing;
      const product = bySlug.get(pr.slug);
      if (!product || !isMatrix(product)) {
        return { ok: false, error: `Produit introuvable : ${pr.slug}` };
      }
      base = resolveMatrixPrice(product, Number(pr.height), Number(pr.width), Array.isArray(pr.options) ? pr.options : []);
      name = product.name;
      famille = product.famille;
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
    } else if (raw?.reference) {
      const hit = byRef.get(raw.reference);
      if (!hit) return { ok: false, error: `Référence introuvable : ${raw.reference}` };
      base = hit.base;
      name = hit.product.name;
      famille = hit.product.famille;
    } else {
      return { ok: false, error: 'Ligne non vérifiable (référence ou dimensions manquantes).' };
    }

    if (base == null) {
      return { ok: false, error: 'Prix indisponible pour un article (hors abaque ?).' };
    }

    const unitPriceHT = applyDiscount(base, getDiscount(discounts, famille));
    productsHT += unitPriceHT * qty;

    verified.push({
      key: String(raw.key ?? name),
      name,                            // libellé autoritaire
      detail: raw.detail,              // affichage seulement
      reference: raw.reference,
      unitPriceHT,
      quantity: qty,
      uom: raw.uom,
    });
  }

  return { ok: true, lines: verified, productsHT: Math.round(productsHT * 100) / 100 };
}
