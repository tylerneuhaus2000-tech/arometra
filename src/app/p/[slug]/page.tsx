import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageErrorState } from '@/components/catalog-state';
import { DataSourceNotice } from '@/components/data-source-notice';
import { ProductCard } from '@/components/product-card';
import { SiteHeader } from '@/components/site-header';
import { getModeStatus, getProductBySlug, getSimilarProducts } from '@/lib/catalog/repository';
import type { CatalogProduct, ProductSource } from '@/lib/catalog/model';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (result.status === 'ready' && !result.product) notFound();
  if (!result.product) {
    return (
      <>
        <SiteHeader />
        <main className="content-wrap page-content">
          <DataSourceNotice mode={result.mode} message={result.message} />
          <PageErrorState title="Produktdaten sind gerade nicht verfügbar." message="Versuche es über den Katalog erneut." />
        </main>
      </>
    );
  }

  const product = result.product;
  const recommendations = await getSimilarProducts(product);
  const modeStatus = getModeStatus(result.mode);

  return (
    <>
      <SiteHeader />
      <main id="main-content" className="content-wrap page-content product-page">
        <DataSourceNotice mode={result.mode} message={result.message} />
        <nav aria-label="Brotkrumennavigation" className="breadcrumbs">
          <Link href="/entdecken">Entdecken</Link>
          <span aria-hidden="true">/</span>
          <span>{product.categoryName}</span>
        </nav>

        <section className="product-intro" aria-labelledby="product-title">
          <div className="product-visual">
            <div className="product-visual__shape" aria-hidden="true" />
            <span>Kein freigegebenes Bild</span>
          </div>
          <div className="product-intro__copy">
            <p className="eyebrow">{product.brandName ?? product.categoryName}</p>
            <h1 id="product-title">{product.name}</h1>
            {product.brandName && <p className="product-brand">{product.brandName}</p>}
            {result.mode === 'fixtures' ? (
              <p className="product-summary">Dieses synthetische Prüfprofil enthält keine realen Produktangaben.</p>
            ) : (
              <p className="product-summary">{product.description ?? 'Für dieses Produkt liegt noch keine freigegebene Beschreibung vor.'}</p>
            )}
            <Link className="text-link" href="/entdecken">Zurück zum Katalog <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        {result.mode === 'fixtures' ? (
          <section className="detail-section" aria-labelledby="test-data-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Nur für Funktionstests</p>
                <h2 id="test-data-title">Synthetische Testmerkmale</h2>
              </div>
            </div>
            <ul className="test-feature-list">
              {product.flavors.map((flavor) => <li key={flavor.code}>{flavor.label}</li>)}
            </ul>
            <p className="muted-copy">Die Werte werden nur intern für den Empfehlungs-Test genutzt und nicht als Geschmack oder Qualität dargestellt.</p>
          </section>
        ) : (
          <ProductFacts product={product} />
        )}

        <section className="detail-section" aria-labelledby="notes-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Quelle und Autor getrennt</p>
              <h2 id="notes-title">Verkostungsnotizen</h2>
            </div>
          </div>
          {product.tastingNotes.length > 0 ? (
            <div className="notes-list">
              {product.tastingNotes.map((note) => (
                <article className="tasting-note" key={note.id}>
                  <p className="tasting-note__byline">
                    {authorTypeLabel(note.authorType)}{note.authorLabel ? ` · ${note.authorLabel}` : ''}
                  </p>
                  <NoteField label="Nase" value={note.nose} />
                  <NoteField label="Gaumen" value={note.palate} />
                  <NoteField label="Nachklang" value={note.finish} />
                  <NoteField label="Zusammenfassung" value={note.overall} />
                  <p className="source-line">
                    Quelle: <SourceAnchor source={{ id: note.id, name: note.sourceName, url: note.sourceUrl, attribution: note.attribution, fields: [] }} />
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">
              {result.mode === 'fixtures'
                ? 'Für synthetische Prüfprofile gibt es keine Verkostungsnotizen.'
                : 'Für dieses Produkt liegen derzeit keine freigegebenen Verkostungsnotizen vor.'}
            </p>
          )}
        </section>

        <section className="detail-section source-section" aria-labelledby="sources-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Nachvollziehbarkeit</p>
              <h2 id="sources-title">Datenquellen</h2>
            </div>
          </div>
          {product.sources.length > 0 ? (
            <ul className="source-list">
              {product.sources.map((source) => (
                <li key={source.id}>
                  <div>
                    <strong><SourceAnchor source={source} /></strong>
                    <p>{source.fields.map(fieldLabel).join(', ')}</p>
                    {source.attribution && <p>{source.attribution}</p>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-copy">
              {result.mode === 'fixtures'
                ? 'Synthetische Testprofile haben keine externen Produktquellen.'
                : 'Für diese Produktseite sind noch keine öffentlichen Quellen hinterlegt.'}
            </p>
          )}
        </section>

        <section className="detail-section recommendations-section" aria-labelledby="recommendations-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Begründet aus vorhandenen Merkmalen</p>
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
              <p>Für dieses Produkt liegen noch nicht genügend geprüfte Geschmacksdaten für fundierte Empfehlungen vor.</p>
            </div>
          )}
          {modeStatus.isSynthetic && <p className="muted-copy">Die Übereinstimmungen hier prüfen nur die Empfehlungslogik mit Testmerkmalen.</p>}
        </section>
      </main>
      <footer className="site-footer content-wrap">
        <span>AROMETRA</span>
        <span>Produktinformationen mit nachvollziehbarer Herkunft.</span>
      </footer>
    </>
  );
}

function ProductFacts({ product }: { product: CatalogProduct }) {
  return (
    <section className="detail-section" aria-labelledby="facts-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Belegte Angaben</p>
          <h2 id="facts-title">Steckbrief</h2>
        </div>
      </div>
      <dl className="facts-grid">
        <Fact label="Kategorie" value={product.categoryName} />
        <Fact label="Herkunft" value={product.region ?? product.countryCode ?? 'Nicht belegt'} />
        <Fact label="Alkoholgehalt" value={product.abvPercent === null ? 'Nicht belegt' : `${product.abvPercent.toFixed(1)} % vol.`} />
        <Fact label="Alter" value={product.ageYears === null ? 'Nicht belegt' : `${product.ageYears} Jahre`} />
      </dl>
      <div className="flavor-section">
        <h3>Geschmacksprofil</h3>
        {product.flavors.length > 0 ? (
          <ul className="flavor-list">
            {product.flavors.map((flavor) => (
              <li key={flavor.code}>
                <span>{flavor.label}</span>
                <span className="flavor-meter" role="img" aria-label={`${flavor.label}: ${flavor.value} von 10`}>
                  <span style={{ width: `${Math.max(0, Math.min(100, flavor.value * 10))}%` }} />
                </span>
                <span className="flavor-value">{flavor.value}/10</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-copy">Für dieses Produkt sind noch keine geprüften Geschmacksdimensionen hinterlegt.</p>
        )}
      </div>
    </section>
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

function NoteField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <p className="note-field"><strong>{label}</strong><span>{value}</span></p>;
}

function SourceAnchor({ source }: { source: ProductSource }) {
  const externalUrl = safeHttpUrl(source.url);
  return externalUrl
    ? <a href={externalUrl} target="_blank" rel="noreferrer">{source.name}<span className="visually-hidden"> (öffnet externe Quelle)</span></a>
    : <span>{source.name}</span>;
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    name: 'Produktname',
    brand_id: 'Marke',
    primary_category_id: 'Kategorie',
    product_family: 'Produkttyp',
    origin_country_code: 'Herkunft',
    origin_region: 'Region',
    age_years: 'Alter',
    distillation_details: 'Destillation',
    maturation_details: 'Reifung',
    description: 'Beschreibung',
    abv_percent: 'Alkoholgehalt',
  };
  return labels[field] ?? 'Produktangabe';
}

function authorTypeLabel(authorType: 'manufacturer' | 'expert' | 'editorial'): string {
  const labels = { manufacturer: 'Herstellerangabe', expert: 'Fachverkostung', editorial: 'Redaktionelle Notiz' };
  return labels[authorType];
}
