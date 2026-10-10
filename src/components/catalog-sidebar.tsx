'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CatalogCategory } from '@/lib/catalog/model';

export function CatalogSidebar({
  categories,
  selectedCategory = '',
  searchTerm = '',
  activeItem = 'catalog',
}: {
  categories: CatalogCategory[];
  selectedCategory?: string;
  searchTerm?: string;
  activeItem?: 'discover' | 'catalog' | 'category' | 'advice';
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const roots = categories.filter((category) => category.parentSlug === null);
  const categoryHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (slug) params.set('category', slug);
    const query = params.toString();
    return query ? `/entdecken?${query}` : '/entdecken';
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  const closeMobile = () => setMobileOpen(false);
  const active = (item: typeof activeItem) => activeItem === item;

  return (
    <>
      <button
        className="sidebar-mobile-trigger"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="category-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <MenuIcon />
        <span>Kategorien</span>
      </button>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Kategorien schließen"
          onClick={closeMobile}
        />
      )}
      <aside
        className={`catalog-sidebar${collapsed ? ' catalog-sidebar--collapsed' : ''}${mobileOpen ? ' catalog-sidebar--mobile-open' : ''}`}
        aria-label="Seitennavigation"
      >
        <div className="catalog-sidebar__topline">
          <p className="catalog-sidebar__label">Übersicht</p>
          <button
            className="catalog-sidebar__collapse"
            type="button"
            aria-label={collapsed ? 'Navigation ausklappen' : 'Navigation einklappen'}
            aria-pressed={collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <CollapseIcon collapsed={collapsed} />
          </button>
          <button className="catalog-sidebar__close" type="button" onClick={closeMobile}>
            Schließen
          </button>
        </div>

        <nav id="category-navigation" className="catalog-sidebar__content" aria-label="Spirituosenkategorien">
          <Link
            className={`catalog-sidebar__primary${active('discover') ? ' is-active' : ''}`}
            href="/"
            aria-current={active('discover') ? 'page' : undefined}
            onClick={closeMobile}
            title="Entdecken"
          >
            <CompassIcon />
            <span className="nav-copy">Entdecken</span>
          </Link>
          <Link
            className={`catalog-sidebar__primary${active('catalog') ? ' is-active' : ''}`}
            href={categoryHref()}
            aria-current={active('catalog') ? 'page' : undefined}
            onClick={closeMobile}
            title="Alle Spirituosen"
          >
            <GridIcon />
            <span className="nav-copy">Alle Spirituosen</span>
          </Link>

          <p className="catalog-sidebar__label catalog-sidebar__label--categories">Kategorien</p>
          {roots.length > 0 ? (
            <ul className="catalog-category-list">
              {roots.map((root) => {
                const children = categories.filter((category) => category.parentSlug === root.slug);
                const selected = selectedCategory === root.slug || children.some((item) => item.slug === selectedCategory);
                const rootSelected = selectedCategory === root.slug;
                const expanded = openCategories[root.slug] ?? selected;
                const subcategoryListId = `subcategory-list-${root.slug}`;
                return (
                  <li key={root.slug}>
                    <div className={`catalog-category-row${selected ? ' is-selected' : ''}`}>
                      <Link
                        href={categoryHref(root.slug)}
                        aria-current={rootSelected ? 'page' : undefined}
                        onClick={closeMobile}
                        title={root.name}
                      >
                        <CategoryIcon />
                        <span className="nav-copy">{root.name}</span>
                      </Link>
                      {children.length > 0 && (
                        <button
                          className="catalog-category-expand"
                          type="button"
                          aria-label={`Unterkategorien von ${root.name}`}
                          aria-expanded={expanded}
                          aria-controls={subcategoryListId}
                          title={`Unterkategorien von ${root.name}`}
                          onClick={() => setOpenCategories((current) => ({ ...current, [root.slug]: !expanded }))}
                        >
                          <ChevronIcon />
                        </button>
                      )}
                    </div>
                    {children.length > 0 && (
                      <ul id={subcategoryListId} className="catalog-category-sublist" hidden={!expanded}>
                        {children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={categoryHref(child.slug)}
                              aria-current={selectedCategory === child.slug ? 'page' : undefined}
                              className={selectedCategory === child.slug ? 'is-active' : undefined}
                              onClick={closeMobile}
                              title={child.name}
                            >
                              <span className="nav-copy">{child.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="catalog-sidebar__empty">Kategorien sind derzeit nicht verfügbar.</p>
          )}
        </nav>

        <div className="catalog-sidebar__advice">
          <p className="catalog-sidebar__label">Beratung</p>
          <Link
            className={`catalog-sidebar__primary${active('advice') ? ' is-active' : ''}`}
            href="/beratung"
            aria-current={active('advice') ? 'page' : undefined}
            onClick={closeMobile}
            title="Beratung"
          >
            <SparkleIcon />
            <span className="nav-copy">Beratung</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

function CompassIcon() {
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.25" /><path d="m14.9 9.1-1.8 4-4 1.8 1.8-4 4-1.8Z" /></svg>;
}

function GridIcon() {
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="4.5" width="6" height="6" rx="1" /><rect x="13.5" y="4.5" width="6" height="6" rx="1" /><rect x="4.5" y="13.5" width="6" height="6" rx="1" /><rect x="13.5" y="13.5" width="6" height="6" rx="1" /></svg>;
}

function CategoryIcon() {
  return <svg className="nav-icon nav-icon--small" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M7 4.5h10l-.8 6.1a4.2 4.2 0 0 1-8.4 0L7 4.5Z" /><path d="M12 15v4.5m-3 0h6M9.2 8.3h5.6" /></svg>;
}

function SparkleIcon() {
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3.5 13.7 9l5.3 2-5.3 2L12 18.5 10.3 13 5 11l5.3-2L12 3.5Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></svg>;
}

function ChevronIcon() {
  return <svg className="nav-chevron" aria-hidden="true" viewBox="0 0 20 20" fill="none"><path d="m7 4 6 6-6 6" /></svg>;
}

function MenuIcon() {
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return <svg className="nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d={collapsed ? 'm9 5 7 7-7 7' : 'm15 5-7 7 7 7'} /><path d="M4 4v16" /></svg>;
}
