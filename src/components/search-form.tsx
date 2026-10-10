export function SearchForm({
  q = '',
  category = '',
}: {
  q?: string;
  category?: string;
}) {
  return (
    <search>
      <form action="/entdecken" className="global-search">
        <label className="visually-hidden" htmlFor="catalog-search">Spirituose suchen</label>
        <input
          id="catalog-search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder="Produkt oder Marke suchen"
          autoComplete="off"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" aria-label="Suchen">
          <span aria-hidden="true">⌕</span>
        </button>
      </form>
    </search>
  );
}
