'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CatalogCategory } from '@/lib/catalog/model';

export function CatalogSidebar({
  categories,
  selectedCategory = '',
  searchTerm = '',
}: {
  categories: CatalogCategory[];
  selectedCategory?: string;
  searchTerm?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const roots = categories.filter((category) => category.parentSlug === null);
  const categoryHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (slug) params.set('category', slug);
    const query = params.toString();
    return query ? `/entdecken?${query}` : '/entdecken';
  };

  return (
    <aside className={`catalog-sidebar${mobileOpen ? ' catalog-sidebar--mobile-open' : ''}`}>
      <button
        className="catalog-sidebar__mobile-toggle"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="category-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        Kategorien <span aria-hidden="true">{mobileOpen ? '−' : '+'}</span>
      </button>
      <nav id="category-navigation" className="catalog-sidebar__content" aria-label="Spirituosenkategorien">
        <p className="catalog-sidebar__label">Kategorien</p>
        <Link
          className={`catalog-sidebar__all${selectedCategory ? '' : ' is-active'}`}
          href={categoryHref()}
          aria-current={selectedCategory ? undefined : 'page'}
        >
          Alle Spirituosen
        </Link>
        {roots.length > 0 ? (
          <ul className="catalog-category-list">
            {roots.map((root) => {
              const children = categories.filter((category) => category.parentSlug === root.slug);
              const active = selectedCategory === root.slug || children.some((item) => item.slug === selectedCategory);
              return (
                <li key={root.slug}>
                  <div className="catalog-category-row">
                    <Link
                      className={selectedCategory === root.slug ? 'is-active' : undefined}
                      href={categoryHref(root.slug)}
                      aria-current={selectedCategory === root.slug ? 'page' : undefined}
                    >
                      {root.name}
                    </Link>
                    {children.length > 0 && (
                      <details className="catalog-category-children" open={active}>
                        <summary aria-label={`Unterkategorien von ${root.name}`}>
                          <span aria-hidden="true">⌄</span>
                        </summary>
                        <ul>
                          {children.map((child) => (
                            <li key={child.slug}>
                              <Link
                                href={categoryHref(child.slug)}
                                aria-current={selectedCategory === child.slug ? 'page' : undefined}
                                className={selectedCategory === child.slug ? 'is-active' : undefined}
                              >
                                {child.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="catalog-sidebar__empty">Kategorien sind derzeit nicht verfügbar.</p>
        )}
      </nav>
    </aside>
  );
}
