import Link from 'next/link';
import Image from 'next/image';
import { type Product, isUnit, isMatrix, isKit } from '@/lib/catalog/types';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { getBrand } from '@/lib/catalog/mock';
import { CardPriceFooter } from './CardPriceFooter';

const GLYPHS: Record<string, string> = {
  tabliers: '▤', 'kits-axes': '⚙', motorisations: '⊙', commandes: '⎚',
  profils: '▬', consoles: '◳', embouts: '◖', verrouillages: '⛓',
};

/** Pastille du modèle de prix. */
function pill(p: Product): { cls: string; label: string } {
  if (isMatrix(p)) return { cls: 'matrix', label: 'Sur mesure' };
  if (isKit(p)) return { cls: 'kit', label: 'Kit monté' };
  if (isUnit(p) && p.uom === 'ml') return { cls: 'ml', label: 'Au mètre' };
  if (isUnit(p) && p.uom === 'paire') return { cls: 'paire', label: 'À la paire' };
  return { cls: 'unit', label: "À l'unité" };
}

/** CTA contextuel (logique inspirée de Servistores). */
function cta(p: Product): string {
  if (isMatrix(p)) return 'Personnaliser';
  if (isKit(p)) return 'Configurer';
  if (isUnit(p) && p.uom === 'ml') return 'Personnaliser';
  return 'Ajouter';
}

export function ProductCard({ product }: { product: Product }) {
  const brand = getBrand(product.brandSlug);
  const { cls, label } = pill(product);
  const isMade = isMatrix(product) || isKit(product);
  const ref = isUnit(product) ? product.variants[0]?.reference : isKit(product) ? product.configs[0]?.reference : undefined;
  const stock = isUnit(product) ? product.variants[0] : undefined;
  const colors = isUnit(product)
    ? product.variants.filter((v) => v.color).map((v) => v.color!)
    : isMatrix(product) ? product.colors ?? [] : [];

  // Ajout direct depuis la carte : uniquement unitaire, 1 seule variante, non-pro.
  // Exclu au mètre (ml) : la longueur doit être saisie sur la fiche produit.
  const canAddDirect =
    !product.proOnly &&
    isUnit(product) &&
    product.uom !== 'ml' &&
    product.variants.length === 1 &&
    product.variants[0].inStock;
  const directVariant = canAddDirect && isUnit(product) ? product.variants[0] : undefined;

  return (
    <div className="card">
      <Link href={`/produit/${product.slug}`} className="thumb" aria-label={product.name} tabIndex={-1}>
        <span className={`pill ${cls}`}>{label}</span>
        {brand && <span className="brandchip">{brand.name.toUpperCase()}</span>}
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width:600px) 50vw, 220px"
            style={{ objectFit: 'contain', padding: '8px' }}
          />
        ) : (
          <span className="glyph">{GLYPHS[product.categorySlug] ?? '▣'}</span>
        )}
      </Link>
      <div className="info">
        {ref && <div className="ref">{ref}</div>}
        <h4>{product.name}</h4>

        {!product.proOnly && (
          isMade ? (
            <div className="stock ok">Fabrication sur mesure</div>
          ) : stock && stock.inStock ? (
            <div className="stock ok">{stock.stockQty ?? ''} en stock</div>
          ) : (
            <div className="stock no">Sur commande</div>
          )
        )}

        {colors.length > 0 && (
          <div className="swatches">
            {colors.map((c) => (
              <span className="sw" key={c.code} title={c.label} style={{ background: c.hex }} />
            ))}
          </div>
        )}

        <CardPriceFooter
          name={product.name}
          node={product.taxonomySlug ?? product.famille}
          categorySlug={product.categorySlug}
          proOnly={!!product.proOnly}
          kind={isMade ? 'made' : isUnit(product) && product.uom === 'ml' ? 'ml' : 'unit'}
          uom={isUnit(product) ? product.uom : 'unite'}
          grossFrom={priceFrom(product)}
          detailHref={`/produit/${product.slug}`}
          ctaLabel={cta(product)}
          directVariant={
            directVariant && isUnit(product)
              ? { reference: directVariant.reference, priceHT: directVariant.priceHT, label: directVariant.label }
              : undefined
          }
        />
      </div>
    </div>
  );
}
