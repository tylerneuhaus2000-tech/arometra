import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="content-wrap page-content">
        <div className="empty-state">
          <p className="eyebrow">404</p>
          <h1>Dieses Produkt wurde nicht gefunden.</h1>
          <p>Der Link ist möglicherweise veraltet oder das Produkt ist nicht öffentlich freigegeben.</p>
          <Link className="button button--primary" href="/entdecken">Zum Katalog <span aria-hidden="true">→</span></Link>
        </div>
      </main>
    </>
  );
}
