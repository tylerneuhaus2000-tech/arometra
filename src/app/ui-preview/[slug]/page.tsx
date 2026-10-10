import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { SiteFrame } from '@/components/site-frame';
import { UiPreviewCard } from '@/components/ui-preview-card';
import { isLocalUiPreviewEnabled, uiPreviewFixtures } from '@/lib/ui-preview/fixtures';
import { navigationTaxonomy } from '@/lib/catalog/taxonomy';

export const dynamic = 'force-dynamic';

export default async function UiPreviewProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const requestHeaders = await headers();
  if (!isLocalUiPreviewEnabled(requestHeaders.get('host'))) notFound();
  const { slug } = await params;
  const product = uiPreviewFixtures.find((item) => item.slug === slug);
  if (!product) notFound();
  const similarDesigns = uiPreviewFixtures.filter((item) => item.slug !== product.slug).slice(0, 2);

  return (
    <SiteFrame
      categories={navigationTaxonomy}
      selectedCategory={product.categorySlug}
      activeItem="category"
      searchAction="/ui-preview"
      footerNote="Lokale UI-Vorschau · keine Produktdaten."
    >
      <main id="main-content" className="content-wrap page-content product-page ui-preview-page">
        <div className="ui-preview-banner" role="status">
          <span>Lokale UI-Vorschau</span>
          <p>Synthetische Design-Fixture. Diese Ansicht enthält keine echten Produkt- oder Verkostungsangaben.</p>
        </div>
        <nav aria-label="Brotkrumennavigation" className="breadcrumbs">
          <Link href="/ui-preview">Vorschau-Katalog</Link>
          <span aria-hidden="true">/</span>
          <span>{product.category}</span>
        </nav>

        <section className="product-intro ui-preview-product-intro" aria-labelledby="product-title">
          <div className="product-visual product-visual--photo">
            <Image
              src={`/api/ui-preview/${product.image}`}
              alt=""
              width={1122}
              height={1402}
              sizes="(max-width: 680px) 100vw, 38vw"
              loading="eager"
              unoptimized
            />
          </div>
          <div className="product-intro__copy">
            <p className="eyebrow">{product.category} · Design-Fixture</p>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-summary">Platzhalter für einen dynamischen Produktsteckbrief. Alle realen Angaben bleiben hier bewusst unbekannt.</p>
            <Link className="text-link" href="/ui-preview">Zurück zum Vorschau-Katalog <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="detail-section" aria-labelledby="preview-facts-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Strukturvorschau</p>
              <h2 id="preview-facts-title">Steckbrief</h2>
            </div>
          </div>
          <dl className="facts-grid">
            <div><dt>Kategorie</dt><dd>{product.category} · synthetische Zuordnung</dd></div>
            <div><dt>Herkunft</dt><dd>Unbekannt</dd></div>
            <div><dt>Alkoholgehalt</dt><dd>Unbekannt</dd></div>
            <div><dt>Verkostungsprofil</dt><dd>Nicht vorhanden</dd></div>
          </dl>
          <p className="muted-copy">Die sichtbaren Beispielmerkmale testen nur die Tag-Darstellung: {product.tags.join(' · ')}.</p>
        </section>

        <section className="detail-section recommendations-section" aria-labelledby="recommendations-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Layout-Demo · keine berechneten Empfehlungen</p>
              <h2 id="recommendations-title">Ähnliche Produkte</h2>
            </div>
          </div>
          <div className="product-grid product-grid--recommendations">
            {similarDesigns.map((item) => <UiPreviewCard key={item.slug} product={item} />)}
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
