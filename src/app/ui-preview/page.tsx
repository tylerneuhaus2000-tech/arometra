import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { SiteFrame } from '@/components/site-frame';
import { UiPreviewCard } from '@/components/ui-preview-card';
import { isLocalUiPreviewEnabled, uiPreviewFixtures } from '@/lib/ui-preview/fixtures';
import { navigationTaxonomy } from '@/lib/catalog/taxonomy';

export const dynamic = 'force-dynamic';

export default async function UiPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const requestHeaders = await headers();
  if (!isLocalUiPreviewEnabled(requestHeaders.get('host'))) notFound();
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.trim().toLocaleLowerCase('de') : '';
  const products = query
    ? uiPreviewFixtures.filter((product) => `${product.name} ${product.category}`.toLocaleLowerCase('de').includes(query))
    : uiPreviewFixtures;

  return (
    <SiteFrame
      categories={navigationTaxonomy}
      searchTerm={typeof params.q === 'string' ? params.q : ''}
      searchAction="/ui-preview"
      activeItem="catalog"
      footerNote="Lokale UI-Vorschau · keine Produktdaten."
    >
      <main id="main-content" className="content-wrap page-content ui-preview-page">
        <div className="ui-preview-banner" role="status">
          <span>Lokale UI-Vorschau</span>
          <p>Alle Karten und Merkmale auf dieser Seite sind synthetische Design-Fixtures. Es sind keine realen Produkte oder Bewertungen.</p>
        </div>
        <header className="page-heading">
          <p className="eyebrow">AROMETRA · Produktentdeckung</p>
          <h1>Entdecke besondere Spirituosen</h1>
          <p>Eine visuelle Vorschau auf Katalog, Steckbrief und Navigation.</p>
        </header>

        <div className="results-heading" aria-live="polite">
          <p>{products.length} synthetische Design-Fixtures</p>
          {query && <p>Vorschau-Suche: <strong>{params.q}</strong></p>}
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => <UiPreviewCard key={product.slug} product={product} />)}
          </div>
        ) : (
          <div className="empty-state">
            <p className="eyebrow">Lokale Vorschau</p>
            <h2>Kein passendes Designprofil</h2>
            <p>Diese Vorschau enthält nur drei ausdrücklich synthetische Layout-Fixtures.</p>
          </div>
        )}
      </main>
    </SiteFrame>
  );
}
