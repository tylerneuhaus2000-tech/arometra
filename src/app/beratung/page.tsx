import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { navigationTaxonomy } from '@/lib/catalog/taxonomy';

export default function AdvicePage() {
  return (
    <SiteFrame categories={navigationTaxonomy} activeItem="advice" footerNote="Beratung ist derzeit noch nicht verfügbar.">
      <main id="main-content" className="content-wrap page-content advice-page">
        <header className="page-heading">
          <p className="eyebrow">Beratung</p>
          <h1>Orientierung mit belegten Produktdaten</h1>
          <p>Dieser Bereich ist vorbereitet. Eine individuelle Beratung wird erst angeboten, wenn sie auf verfügbaren und geprüften Angaben aufbauen kann.</p>
        </header>
        <section className="empty-state" aria-labelledby="advice-status-title">
          <p className="eyebrow">In Vorbereitung</p>
          <h2 id="advice-status-title">Noch keine Beratung verfügbar</h2>
          <p>Es werden keine automatischen Geschmacksprofile oder Empfehlungen erfunden. Entdecke stattdessen den freigegebenen Katalog.</p>
          <Link className="text-link" href="/entdecken">Zum Katalog <span aria-hidden="true">→</span></Link>
        </section>
      </main>
    </SiteFrame>
  );
}
