export function SearchForm({
  q = '',
  category = '',
  action = '/entdecken',
}: {
  q?: string;
  category?: string;
  action?: string;
}) {
  return (
    <search>
      <form action={action} className="global-search">
        <label className="visually-hidden" htmlFor="catalog-search">Spirituose suchen</label>
        <input
          id="catalog-search"
          type="search"
          name="q"
          defaultValue={q}
          maxLength={80}
          placeholder="Spirituosen suchen …"
          autoComplete="off"
        />
        {category && <input type="hidden" name="category" value={category} />}
        <button type="submit" aria-label="Suchen">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="10.8" cy="10.8" r="6.8" />
            <path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </form>
    </search>
  );
}
