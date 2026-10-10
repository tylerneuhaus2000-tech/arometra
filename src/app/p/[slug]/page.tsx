import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageErrorState } from '@/components/catalog-state';
import { DataSourceNotice } from '@/components/data-source-notice';
import { ProductCard } from '@/components/product-card';
import { SiteFrame } from '@/components/site-frame';
import { TasteProfile } from '@/components/taste-profile';
import type { CatalogProduct, CommunityReview, TastingNote } from '@/lib/catalog/model';
import { getModeStatus, getNavigationCategories, getProductBySlug, getSimilarProducts } from '@/lib/catalog/repository';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, categories] = await Promise.all([getProductBySlug(slug), getNavigationCategories()]);

  if (result.status === 'ready' && !result.product) notFound();
  if (!result.product) {
    return (
      <SiteFrame categories={categories}>
        <main id="main-content" className="content-wrap page-content">
          <DataSourceNotice mode={result.mode} message={result.message} />
          <PageErrorState title="Produktdaten sind gerade nicht verfügbar." message="Versuche es über den Katalog erneut." />
        </main>
      </SiteFrame>
    );
  }

  const product = result.product;
  const recommendations = await getSimilarProducts(product);
  const modeStatus = getModeStatus(result.mode);
  const manufacturerNotes = product.tastingNotes.filter((note) => note.authorType === 'manufacturer');
  const expertNotes = product.tastingNotes.filter((note) => note.authorType === 'expert' || note.authorType === 'editorial');
  const hasProductionDetails = Boolean(
    product.region || product.countryCode || product.distillationDetails || product.maturationDetails,
  );
  const hasTechnicalDetails = Boolean(
    product.abvPercent !== null || product.ageYears !== null || product.variants.length > 0,
  );

  return (
    <SiteFrame categories={categories} selectedCategory={product.categorySlug} activeItem="category">
      <main id="main-content" className="content-wrap page-content product-page">
        <DataSourceNotice mode={result.mode} message={result.message} />
        <nav aria-label="Brotkrumennavigation" className="breadcrumbs">
          <Link href="/entdecken">Entdecken</Link>
          <span aria-hidden="true">/</span>
          <span>{product.categoryName}</span>
        </nav>

        <section className="product-intro" aria-labelledby="product-title">
          <div className="product-visual-wrap">
            <div className={`product-visual${product.image ? ' product-visual--photo' : ' product-visual--unavailable'}`}>
              {product.image ? (
                <Image
                  src={product.image.src}
                  alt={product.image.altText}
                  fill
                  sizes="(max-width: 700px) 92vw, (max-width: 1100px) 46vw, 34vw"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="product-visual__shape" aria-hidden="true" />
              )}
            </div>
          </div>
          <div className="product-intro__copy">
            <p className="eyebrow">{product.categoryName}</p>
            <h1 id="product-title">{product.name}</h1>
            {product.family && <p className="product-brand">{product.family}</p>}
            {product.description && <p className="product-summary">{product.description}</p>}
          </div>
        </section>

        {(product.sensoryProfile.length > 0 || result.mode === 'fixtures') && <section className="detail-section" aria-labelledby="taste-title">
          <div className="section-heading">
            <div>
              <h2 id="taste-title">Geschmack &amp; Aroma</h2>
            </div>
          </div>
          {result.mode === 'fixtures' ? (
            <>
              <p className="empty-copy">Synthetische Prüfmerkmale sind nur für interne Funktionstests bestimmt.</p>
              <ul className="test-feature-list">
                {product.flavors.map((flavor) => <li key={flavor.code}>{flavor.label}</li>)}
              </ul>
            </>
          ) : (
            <>
              <TasteProfile product={product} />
              {result.mode === 'local-start-database' && product.qualitativeFlavors && product.qualitativeFlavors.length > 0 && (
                <p className="muted-copy">Lokale, ungeprüfte Testmerkmale: {product.qualitativeFlavors.map((flavor) => flavor.label).join(' · ')}</p>
              )}
            </>
          )}
        </section>}

        {manufacturerNotes.length > 0 && <section className="detail-section" aria-labelledby="tasting-title">
          <div className="section-heading">
            <div>
              <h2 id="tasting-title">Geruch, Gaumen, Mundgefühl &amp; Nachklang</h2>
            </div>
          </div>
          <div className="notes-list">
            {manufacturerNotes.map((note) => <TastingNoteCard key={note.id} note={note} />)}
          </div>
        </section>}

        {hasProductionDetails && <section className="detail-section" aria-labelledby="production-title">
          <div className="section-heading">
            <div>
              <h2 id="production-title">Herstellung &amp; Herkunft</h2>
            </div>
          </div>
          <dl className="facts-grid facts-grid--process">
            {product.region && <Fact label="Herkunftsregion" value={product.region} />}
            {product.countryCode && <Fact label="Herkunftsland" value={formatCountry(product.countryCode)} />}
            {product.distillationDetails && <Fact label="Herstellung" value={product.distillationDetails} />}
            {product.maturationDetails && <Fact label="Reifung" value={product.maturationDetails} />}
          </dl>
        </section>}

        <section className="detail-section recommendations-section" aria-labelledby="recommendations-title">
          <div className="section-heading">
            <div>
              <h2 id="recommendations-title">Ähnliche Produkte</h2>
            </div>
          </div>
          {recommendations.length > 0 ? (
            <div className="product-grid product-grid--recommendations">
              {recommendations.map((recommendation) => (
                <ProductCard
                  key={recommendation.product.id}
                  product={recommendation.product}
                  reason={recommendation.reason}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="eyebrow">Noch keine fundierte Alternative</p>
              <h3>Ähnliche Produkte</h3>
              <p>{result.mode === 'local-start-database'
                ? 'In der Testdatenbank wurden nicht mindestens zwei gemeinsame qualitative Merkmale gefunden.'
                : 'Für dieses Produkt liegen noch nicht genügend geprüfte Geschmacksdaten für fundierte Empfehlungen vor.'}</p>
            </div>
          )}
          {modeStatus.isSynthetic && <p className="muted-copy">Die Übereinstimmungen hier prüfen nur die Empfehlungslogik mit Testmerkmalen.</p>}
          {result.mode === 'local-start-database' && <p className="muted-copy">Diese Vorschläge beruhen auf gemeinsamen, ungeprüften qualitativen Tags aus der lokalen Testdatenbank.</p>}
        </section>

        {product.communityReviews.length > 0 && <section className="detail-section" aria-labelledby="community-title">
          <div className="section-heading">
            <div>
              <h2 id="community-title">Erfahrungen echter Nutzer</h2>
            </div>
          </div>
          <div className="notes-list">
            {product.communityReviews.map((review) => <CommunityReviewCard key={review.id} review={review} />)}
          </div>
        </section>}

        {expertNotes.length > 0 && <section className="detail-section" aria-labelledby="expert-title">
          <div className="section-heading">
            <div>
              <h2 id="expert-title">Expertenmeinungen &amp; Auszeichnungen</h2>
            </div>
          </div>
          <div className="notes-list">
            {expertNotes.map((note) => <TastingNoteCard key={note.id} note={note} />)}
          </div>
        </section>}

        {hasTechnicalDetails && <section className="detail-section" aria-labelledby="technical-title">
          <div className="section-heading">
            <div>
              <h2 id="technical-title">Technische Angaben</h2>
            </div>
          </div>
          <TechnicalDetails product={product} localPreview={result.mode === 'local-start-database'} />
        </section>}

      </main>
    </SiteFrame>
  );
}

function TechnicalDetails({ product, localPreview }: { product: CatalogProduct; localPreview: boolean }) {
  return (
    <>
      {(product.abvPercent !== null || product.ageYears !== null) && (
        <dl className="facts-grid">
          {product.abvPercent !== null && <Fact label="Alkoholgehalt" value={`${product.abvPercent.toFixed(1)} % vol.`} />}
          {product.ageYears !== null && <Fact label="Alter" value={`${product.ageYears} Jahre`} />}
        </dl>
      )}
      {product.variants.length > 0 && <div className="variant-section">
        <h3>Abfüllungen</h3>
          <ul className="variant-list">
            {product.variants.map((variant) => (
              <li key={variant.id}>
                <div>
                    <strong>{variant.editionLabel ?? (localPreview ? 'Abfüllung aus Testdatenbank' : 'Freigegebene Abfüllung')}</strong>
                  <p>
                    {variant.volumeMl ? `${variant.volumeMl} ml` : 'Flaschengröße nicht belegt'}
                    {variant.marketCountryCode ? ` · Markt ${variant.marketCountryCode}` : ''}
                    {variant.abvPercentOverride !== null ? ` · ${variant.abvPercentOverride.toFixed(1)} % vol.` : ''}
                  </p>
                  {variant.gtin && <p>GTIN: {variant.gtin}</p>}
                </div>
              </li>
            ))}
          </ul>
      </div>}
    </>
  );
}

function TastingNoteCard({ note }: { note: TastingNote }) {
  return (
    <article className="tasting-note">
      <p className="tasting-note__byline">
        {authorTypeLabel(note.authorType)}{note.authorLabel ? ` · ${note.authorLabel}` : ''}
        {note.tastedAt ? ` · Verkostet am ${formatDate(note.tastedAt)}` : ''}
      </p>
      <NoteField label="Geruch" value={note.nose} />
      <NoteField label="Gaumen" value={note.palate} />
      <NoteField label="Mundgefühl" value={note.mouthfeel} />
      <NoteField label="Nachklang" value={note.finish} />
      {note.overall && <NoteField label="Einordnung" value={note.overall} />}
    </article>
  );
}

function CommunityReviewCard({ review }: { review: CommunityReview }) {
  return (
    <article className="tasting-note community-review">
      <p className="tasting-note__byline">
        {review.displayName ?? 'Nutzerbeitrag'} · {formatDate(review.createdAt)}
        {review.verifiedPurchase && <span className="review-badge">Kaufbeleg geprüft</span>}
      </p>
      <p className="community-review__rating">Bewertung: {review.rating} von 5</p>
      <NoteField label="Geruch" value={review.nose} />
      <NoteField label="Gaumen" value={review.palate} />
      <NoteField label="Nachklang" value={review.finish} />
      <NoteField label="Erfahrung" value={review.overall} />
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatCountry(countryCode: string | null): string {
  return countryCode ? new Intl.DisplayNames(['de'], { type: 'region' }).of(countryCode) ?? countryCode : 'Nicht belegt';
}

function NoteField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <p className="note-field"><strong>{label}</strong><span>{value}</span></p>;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed);
}

function authorTypeLabel(authorType: 'manufacturer' | 'expert' | 'editorial' | 'consumer'): string {
  const labels = {
    manufacturer: 'Herstellerangabe',
    expert: 'Fachverkostung',
    editorial: 'Redaktionelle Notiz',
    consumer: 'Community-Erfahrung',
  };
  return labels[authorType];
}
