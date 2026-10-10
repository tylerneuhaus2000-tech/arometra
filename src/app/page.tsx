import Link from 'next/link';
import { CatalogEmptyState, PageErrorState } from '@/components/catalog-state';
import { DataSourceNotice } from '@/components/data-source-notice';
import { ProductCard } from '@/components/product-card';
import { SiteFrame } from '@/components/site-frame';
import { getCatalog } from '@/lib/catalog/repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getCatalog({ q: '', category: '', flavor: '', country: '', brand: '', page: 1 });

  return (
    <SiteFrame categories={catalog.categories} activeItem="discover" footerNote="Produktinformationen mit nachvollziehbarer Herkunft.">
      <main id="main-content" className="content-wrap page-content home-page">
        <DataSourceNotice mode={catalog.mode} message={catalog.message} />
        <header className="page-heading">
          <p className="eyebrow">Produktwissen mit Herkunft</p>
          <h1>Entdecke besondere Spirituosen</h1>
          <p>{catalog.mode === 'local-start-database'
            ? 'Sieh dir die bereitgestellten Testdatensätze mit Quellen und vorläufigen Merkmalen an.'
            : 'Finde Produkte, ihre belegten Angaben und nachvollziehbare Alternativen.'}</p>
        </header>

        {catalog.status === 'error' ? (
          <PageErrorState title="Der Katalog ist gerade nicht erreichbar." message="Bitte versuche es später erneut." />
        ) : catalog.status === 'unconfigured' ? (
          <PageErrorState title="Noch keine Datenquelle verbunden." message="Produkte erscheinen hier, sobald die Datenbank eingerichtet ist." />
        ) : catalog.products.length === 0 ? (
          <CatalogEmptyState searching={false} />
        ) : (
          <>
            <div className="results-heading" aria-live="polite">
              <p>{catalog.total} {catalog.mode === 'fixtures'
                ? 'synthetische Testprofile'
                : catalog.mode === 'local-start-database' ? 'Produkte in der lokalen Testdatenbank' : 'freigegebene Produkte'}</p>
              <Link href="/entdecken">Alle Spirituosen <span aria-hidden="true">→</span></Link>
            </div>
            <div className="product-grid">
              {catalog.products.slice(0, 6).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </>
        )}
      </main>
    </SiteFrame>
  );
}
