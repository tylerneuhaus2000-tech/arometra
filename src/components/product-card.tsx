import Link from 'next/link';
import type { CatalogProduct } from '@/lib/catalog/model';

export function ProductCard({ product, reason }: { product: CatalogProduct; reason?: string }) {
  const verifiedFlavors = product.dataOrigin === 'verified'
    ? product.flavors.filter((flavor) => flavor.dataOrigin === 'verified').slice(0, 2)
    : [];

  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/p/${product.slug}`}>
        <div className="product-card__image product-card__image--unavailable" aria-hidden="true">
          <span>Kein freigegebenes Produktbild</span>
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.categoryName}</p>
          <h2>{product.name}</h2>
          {verifiedFlavors.length > 0 ? (
            <p className="product-card__flavors">
              {verifiedFlavors.map((flavor) => flavor.label).join(' · ')}
            </p>
          ) : (
            <p className="product-card__flavors product-card__flavors--empty">Geschmacksprofil nicht belegt</p>
          )}
          {product.dataOrigin === 'synthetic' && <p className="synthetic-label">Synthetisches Testprofil</p>}
          {reason && <p className="product-card__reason">{reason}</p>}
        </div>
      </Link>
    </article>
  );
}
