import Image from 'next/image';
import Link from 'next/link';
import type { UiPreviewFixture } from '@/lib/ui-preview/fixtures';

export function UiPreviewCard({ product }: { product: UiPreviewFixture }) {
  return (
    <article className="product-card ui-preview-card">
      <Link className="product-card__link" href={`/ui-preview/${product.slug}`}>
        <div className="product-card__image product-card__image--photo">
          <Image
            src={`/api/ui-preview/${product.image}`}
            alt=""
            width={1122}
            height={1402}
            sizes="(max-width: 680px) 100vw, (max-width: 900px) 50vw, 33vw"
            loading="eager"
            unoptimized
          />
        </div>
        <div className="product-card__body">
          <p className="eyebrow">{product.category} · Vorschau</p>
          <h2>{product.name}</h2>
          <p className="product-card__flavors">{product.tags.join(' · ')}</p>
          <p className="ui-fixture-label">Synthetische Design-Fixture</p>
        </div>
      </Link>
    </article>
  );
}
