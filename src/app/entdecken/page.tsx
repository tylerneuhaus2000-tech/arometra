import Link from 'next/link';
import { CatalogEmptyState, PageErrorState } from '@/components/catalog-state';
import { DataSourceNotice } from '@/components/data-source-notice';
import { ProductCard } from '@/components/product-card';
import { SiteFrame } from '@/components/site-frame';
import { getCatalog } from '@/lib/catalog/repository';
import { parseCatalogQuery, type RawSearchParams } from '@/lib/catalog/search';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const parsed = parseCatalogQuery(params);
  const result = await getCatalog(parsed.query);
  const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <SiteFrame
      categories={result.categories}
      selectedCategory={parsed.query.category}
      searchTerm={parsed.query.q}
      searchCategory={parsed.query.category}
      activeItem={parsed.query.category ? 'category' : 'catalog'}
      footerNote="Keine Produktangabe ohne geprüfte Grundlage."
    >
      <main id="main-content" className="content-wrap page-content discover-page">
        <DataSourceNotice mode={result.mode} message={result.message} />
        {parsed.invalid && (
          <p className="inline-message" role="status">Ein Suchfilter war ungültig und wurde zurückgesetzt.</p>
        )}
        <header className="page-heading">
          <p className="eyebrow">Der Katalog</p>
          <h1>Alle Spirituosen</h1>
          <p>Freigegebene Produkte und belegte Angaben entdecken.</p>
        </header>

        {result.status === 'error' ? (
          <PageErrorState title="Der Katalog ist gerade nicht erreichbar." message="Bitte versuche es später erneut." />
        ) : result.status === 'unconfigured' ? (
          <PageErrorState title="Noch keine Datenquelle verbunden." message="Sobald die Datenbank eingerichtet ist, erscheinen hier freigegebene Produkte." />
        ) : result.products.length === 0 ? (
          <CatalogEmptyState searching={Boolean(parsed.query.q || parsed.query.category || parsed.query.flavor)} />
        ) : (
          <>
            <div className="results-heading" aria-live="polite">
              <p>{result.total} {result.mode === 'fixtures' ? 'synthetische Testprofile' : 'freigegebene Produkte'}</p>
              {parsed.query.q && <p>Suche: <strong>{parsed.query.q}</strong></p>}
            </div>
            <div className="product-grid">
              {result.products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {lastPage > 1 && (
              <nav className="pagination" aria-label="Katalogseiten">
                {result.page > 1 && (
                  <Link href={pageHref(params, result.page - 1)}>← Zurück</Link>
                )}
                <span>Seite {result.page} von {lastPage}</span>
                {result.page < lastPage && (
                  <Link href={pageHref(params, result.page + 1)}>Weiter →</Link>
                )}
              </nav>
            )}
          </>
        )}
      </main>
    </SiteFrame>
  );
}

function pageHref(params: RawSearchParams, page: number): string {
  const next = new URLSearchParams();
  for (const key of ['q', 'category', 'flavor', 'country', 'brand']) {
    const value = params[key];
    if (typeof value === 'string' && value) next.set(key, value);
  }
  next.set('page', String(page));
  return `/entdecken?${next.toString()}`;
}
