import Link from 'next/link';
import Image from 'next/image';
import type { CatalogProduct } from '@/lib/catalog/model';

export function ProductCard({ product, reason }: { product: CatalogProduct; reason?: string }) {
  const verifiedFlavors = product.dataOrigin === 'verified'
    ? product.flavors.filter((flavor) => flavor.dataOrigin === 'verified').slice(0, 2)
    : [];
  const documentedSensoryTags = product.dataOrigin === 'verified'
    ? product.sensoryTags.slice(0, 2)
    : [];
  const qualitativeFlavors = product.dataOrigin === 'unreviewed'
    ? (product.qualitativeFlavors ?? []).slice(0, 2)
    : [];

  return (
    <article className="product-card">
      <Link className="product-card__link" href={`/p/${product.slug}`}>
        <div className={`product-card__image${product.image ? ' product-card__image--photo' : ' product-card__image--unavailable'}`}>
          {product.image ? (
            <Image
              src={product.image.src}
              alt=""
              fill
              sizes="(max-width: 600px) 92vw, (max-width: 900px) 46vw, (max-width: 1200px) 29vw, 22vw"
              unoptimized
              referrerPolicy="no-referrer"
            />
          ) : null}
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.categoryName}</p>
          <h2>{product.name}</h2>
          {documentedSensoryTags.length > 0 ? (
            <p className="product-card__flavors">
              {documentedSensoryTags.map((tag) => tag.label).join(' · ')}
            </p>
          ) : verifiedFlavors.length > 0 ? (
            <p className="product-card__flavors">
              {verifiedFlavors.map((flavor) => flavor.label).join(' · ')}
            </p>
          ) : qualitativeFlavors.length > 0 ? (
            <p className="product-card__flavors">{qualitativeFlavors.map((flavor) => flavor.label).join(' · ')}</p>
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
