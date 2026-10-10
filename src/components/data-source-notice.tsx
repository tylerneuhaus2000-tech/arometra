import type { DataMode } from '@/lib/catalog/model';
import { fixtureModeNotice } from '@test/fixtures/catalog';

export function DataSourceNotice({ mode, message }: { mode: DataMode; message?: string | null }) {
  if (mode === 'fixtures') {
    return (
      <aside className="data-notice data-notice--synthetic" aria-label="Hinweis zu synthetischen Testdaten">
        <span className="data-notice__label">Testmodus</span>
        <span>{fixtureModeNotice}</span>
      </aside>
    );
  }

  if (mode === 'local-start-database') {
    return (
      <aside className="data-notice data-notice--local-test" aria-label="Lokale Testdatenbank, nicht freigegeben">
        <span className="data-notice__label">Lokale Testdatenbank</span>
        <span>Reale Produktdaten aus Herstellerquellen; noch nicht redaktionell freigegeben. Bildrechte ungeklärt, Bilder nur lokal sichtbar.</span>
      </aside>
    );
  }

  if (mode === 'unconfigured') {
    return (
      <aside className="data-notice data-notice--neutral" role="status">
        {message ?? 'Die Datenquelle ist nicht verbunden. Es werden keine Beispieldaten angezeigt.'}
      </aside>
    );
  }

  if (message) {
    return (
      <aside className="data-notice data-notice--error" role="alert">
        {message}
      </aside>
    );
  }

  return null;
}
