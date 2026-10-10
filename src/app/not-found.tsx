import Link from 'next/link';
import { SiteFrame } from '@/components/site-frame';
import { getNavigationCategories } from '@/lib/catalog/repository';

export default async function NotFound() {
  const categories = await getNavigationCategories();
  return (
    <SiteFrame categories={categories}>
      <main id="main-content" className="content-wrap page-content">
        <div className="empty-state">
          <p className="eyebrow">404</p>
          <h1>Dieses Produkt wurde nicht gefunden.</h1>
          <p>Der Link ist möglicherweise veraltet oder das Produkt ist nicht öffentlich freigegeben.</p>
          <Link className="button button--primary" href="/entdecken">Zum Katalog <span aria-hidden="true">→</span></Link>
        </div>
      </main>
    </SiteFrame>
  );
}
