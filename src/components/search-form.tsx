import type { CatalogCategory } from '@/lib/catalog/model';

export function SearchForm({
  categories,
  q = '',
  category = '',
}: {
  categories: CatalogCategory[];
  q?: string;
  category?: string;
}) {
  return (
    <search>
      <form action="/entdecken" className="search-form">
      <label className="visually-hidden" htmlFor="catalog-search">Spirituose suchen</label>
      <input
        id="catalog-search"
        type="search"
        name="q"
        defaultValue={q}
        maxLength={80}
        placeholder="Name, Marke oder Kategorie"
        autoComplete="off"
      />
      {categories.length > 0 && (
        <>
          <label className="visually-hidden" htmlFor="catalog-category">Kategorie auswählen</label>
          <select id="catalog-category" name="category" defaultValue={category}>
            <option value="">Alle Kategorien</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className="button button--primary">
        Suchen <span aria-hidden="true">→</span>
      </button>
      </form>
    </search>
  );
}
