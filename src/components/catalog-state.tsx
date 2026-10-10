import Link from 'next/link';

export function CatalogEmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Keine Treffer</p>
      <h2>{searching ? 'Zu dieser Suche ist nichts freigegeben.' : 'Noch keine Produkte freigegeben.'}</h2>
      <p>
        {searching
          ? 'Passe den Suchbegriff oder die Kategorie an.'
          : 'Der öffentliche Katalog zeigt erst Produkte, wenn Angaben und Quellen geprüft wurden.'}
      </p>
    </div>
  );
}

export function PageErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state empty-state--error" role="status">
      <p className="eyebrow">Derzeit nicht verfügbar</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <Link className="text-link" href="/entdecken">Zur Suche <span aria-hidden="true">→</span></Link>
    </div>
  );
}
