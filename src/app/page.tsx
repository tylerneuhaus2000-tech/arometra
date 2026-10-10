import Link from 'next/link';
import { DataSourceNotice } from '@/components/data-source-notice';
import { SiteFrame } from '@/components/site-frame';
import { getCatalog } from '@/lib/catalog/repository';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getCatalog({ q: '', category: '', flavor: '', country: '', brand: '', page: 1 });

  return (
    <SiteFrame categories={catalog.categories} footerNote="Produktinformationen mit nachvollziehbarer Herkunft.">
      <main id="main-content">
        <div className="content-wrap page-notices">
          <DataSourceNotice mode={catalog.mode} message={catalog.message} />
        </div>
        <section className="hero content-wrap" aria-labelledby="home-title">
          <div className="hero__copy">
            <p className="eyebrow">Produktwissen mit Herkunft</p>
            <h1 id="home-title">Spirituosen verstehen. Neues entdecken.</h1>
            <p className="hero__lede">
              Finde geprüfte Produktangaben, ihre Quellen und nachvollziehbare Alternativen.
            </p>
            <Link className="text-link hero__secondary" href="/entdecken">
              Katalog öffnen <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="section content-wrap category-section" aria-labelledby="category-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ein klarer Einstieg</p>
              <h2 id="category-title">Nach Kategorie entdecken</h2>
            </div>
            <Link className="text-link" href="/entdecken">Alle ansehen <span aria-hidden="true">→</span></Link>
          </div>
          {catalog.categories.some((category) => category.parentSlug === null) ? (
            <ul className="category-list">
              {catalog.categories.filter((category) => category.parentSlug === null).slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link href={`/entdecken?category=${encodeURIComponent(category.slug)}`}>
                    <span>{category.name}</span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              ))}
              <li><Link href="/entdecken"><span>Alle Kategorien</span><span aria-hidden="true">↗</span></Link></li>
            </ul>
          ) : (
            <p className="muted-copy">Kategorien erscheinen, sobald eine Datenquelle verbunden ist.</p>
          )}
        </section>

        <section className="section section--quiet" id="ablauf" aria-labelledby="flow-title">
          <div className="content-wrap">
            <p className="eyebrow">Orientierung statt Verkaufsdruck</p>
            <h2 id="flow-title">Vom Produkt zur fundierten Entdeckung.</h2>
            <div className="flow-list">
              <article>
                <span className="flow-list__number">01</span>
                <h3>Finden</h3>
                <p>Suche nach Name, Marke oder Kategorie — oder öffne einen Produktlink direkt.</p>
              </article>
              <article>
                <span className="flow-list__number">02</span>
                <h3>Einordnen</h3>
                <p>Sieh belegte Angaben, freigegebene Notizen und ihre jeweiligen Quellen.</p>
              </article>
              <article>
                <span className="flow-list__number">03</span>
                <h3>Weiterdenken</h3>
                <p>Entdecke Alternativen nur dann, wenn geprüfte Merkmale einen Grund dafür liefern.</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </SiteFrame>
  );
}
