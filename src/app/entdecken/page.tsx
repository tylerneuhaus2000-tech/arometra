import Link from 'next/link';
import { CatalogEmptyState, PageErrorState } from '@/components/catalog-state';
import { DataSourceNotice } from '@/components/data-source-notice';
import { ProductCard } from '@/components/product-card';
import { SearchForm } from '@/components/search-form';
import { SiteHeader } from '@/components/site-header';
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
    <>
      <SiteHeader />
      <main id="main-content" className="content-wrap page-content">
        <DataSourceNotice mode={result.mode} message={result.message} />
        {parsed.invalid && (
          <p className="inline-message" role="status">Ein Suchfilter war ungültig und wurde zurückgesetzt.</p>
        )}
        <header className="page-heading">
          <p className="eyebrow">Der Katalog</p>
          <h1>Entdecken</h1>
          <p>Suche nach Produkt oder Marke. Angezeigt werden nur freigegebene Einträge.</p>
        </header>

        <SearchForm categories={result.categories} q={parsed.query.q} category={parsed.query.category} />

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
      <footer className="site-footer content-wrap">
        <span>AROMETRA</span>
        <span>Keine Produktangabe ohne geprüfte Grundlage.</span>
      </footer>
    </>
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
