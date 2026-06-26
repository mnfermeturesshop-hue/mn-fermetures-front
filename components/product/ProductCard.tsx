import Link from 'next/link';
import { type Product, isUnit, isMatrix, isKit } from '@/lib/catalog/types';
import { ZoomableImage } from '@/components/ui/ZoomableImage';
import { priceFrom } from '@/lib/catalog/resolvePrice';
import { getBrand } from '@/lib/catalog/mock';

const euro = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

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

  return (
    <div className="card">
      <div className="thumb">
        <span className={`pill ${cls}`}>{label}</span>
        {brand && <span className="brandchip">{brand.name.toUpperCase()}</span>}
        {product.imageUrl ? (
          <ZoomableImage
            src={product.imageUrl}
            alt={product.name}
            sizes="(max-width:600px) 50vw, 220px"
          />
        ) : (
          <span className="glyph">{GLYPHS[product.categorySlug] ?? '▣'}</span>
        )}
      </div>
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

        <div className="foot">
          {product.proOnly ? (
            <div className="proonly">Prix réservé aux pros</div>
          ) : isMade ? (
            <div className="pr">
              <span className="from">à partir de</span>
              {priceFrom(product).toFixed(0)},00 <small>€ HT</small>
            </div>
          ) : isUnit(product) && product.uom === 'ml' ? (
            <div className="pr">
              <span className="from">à partir de</span>
              {euro(priceFrom(product))}
              <small> /ml</small>
            </div>
          ) : (
            <div className="pr">
              {euro(priceFrom(product))}
              <small> /{isUnit(product) ? product.uom : 'unité'}</small>
            </div>
          )}

          {product.proOnly ? (
            <Link className="add" href="/pro">Se connecter</Link>
          ) : (
            <Link className={`add ${isMade || (isUnit(product) && product.uom === 'ml') ? 'config' : ''}`} href={`/produit/${product.slug}`}>
              {cta(product)}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
