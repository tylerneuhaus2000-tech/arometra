import Link from 'next/link';
import type { CatalogProduct } from '@/lib/catalog/model';

export function ProductCard({
  product,
  reason,
}: {
  product: CatalogProduct;
  reason?: string;
}) {
  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/p/${product.slug}`}>
        <div className="product-card__image" aria-hidden="true">
          <span>Bild nicht freigegeben</span>
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.categoryName}</p>
          <h2>{product.name}</h2>
          {product.brandName && <p className="product-card__brand">{product.brandName}</p>}
          {product.abvPercent !== null && (
            <p className="product-card__fact">{product.abvPercent.toFixed(1)} % vol.</p>
          )}
          {product.dataOrigin === 'synthetic' && <p className="synthetic-label">Synthetisches Testprofil</p>}
          {reason && <p className="product-card__reason">{reason}</p>}
        </div>
      </Link>
    </article>
  );
}
