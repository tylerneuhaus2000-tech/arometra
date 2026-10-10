import type { ReactNode } from 'react';
import type { CatalogCategory } from '@/lib/catalog/model';
import { CatalogSidebar } from '@/components/catalog-sidebar';
import { SiteHeader } from '@/components/site-header';

export function SiteFrame({
  categories,
  selectedCategory,
  searchTerm,
  searchCategory,
  searchAction,
  activeItem = 'catalog',
  children,
  footerNote = 'Produktinformationen mit nachvollziehbarer Herkunft.',
}: {
  categories: CatalogCategory[];
  selectedCategory?: string;
  searchTerm?: string;
  searchCategory?: string;
  searchAction?: string;
  activeItem?: 'discover' | 'catalog' | 'category' | 'advice';
  children: ReactNode;
  footerNote?: string;
}) {
  return (
    <>
      <a className="skip-link" href="#main-content">Zum Inhalt springen</a>
      <SiteHeader searchTerm={searchTerm} searchCategory={searchCategory} searchAction={searchAction} />
      <div className="site-layout">
        <CatalogSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          searchTerm={searchTerm}
          activeItem={activeItem}
        />
        <div className="site-layout__main">
          {children}
          <footer className="site-footer">
            <span>AROMETRA</span>
            <span>{footerNote}</span>
          </footer>
        </div>
      </div>
    </>
  );
}
