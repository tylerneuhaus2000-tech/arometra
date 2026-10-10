import type { ReactNode } from 'react';
import type { CatalogCategory } from '@/lib/catalog/model';
import { CatalogSidebar } from '@/components/catalog-sidebar';
import { SiteHeader } from '@/components/site-header';

export function SiteFrame({
  categories,
  selectedCategory,
  searchTerm,
  searchCategory,
  children,
  footerNote = 'Produktinformationen mit nachvollziehbarer Herkunft.',
}: {
  categories: CatalogCategory[];
  selectedCategory?: string;
  searchTerm?: string;
  searchCategory?: string;
  children: ReactNode;
  footerNote?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
      <SiteHeader searchTerm={searchTerm} searchCategory={searchCategory} />
      <div className="site-layout">
        <CatalogSidebar categories={categories} selectedCategory={selectedCategory} searchTerm={searchTerm} />
        <div className="site-layout__main">{children}</div>
      </div>
      <footer className="site-footer content-wrap">
        <span>AROMETRA</span>
        <span>{footerNote}</span>
      </footer>
    </>
  );
}
