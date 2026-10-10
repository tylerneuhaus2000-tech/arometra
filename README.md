# AROMETRA

AROMETRA ist eine datengetriebene Produktberatung. Der öffentliche Katalog soll nur nachweislich freigegebene Produktinformationen anzeigen. Dieses Repository enthält die erste lokale Next.js Foundation und einen klar getrennten synthetischen Testmodus.

## Lokal starten

Voraussetzung: Node.js 20.9 oder neuer und npm.

1. Abhängigkeiten installieren: `npm ci`
2. Lokale Variablen vorbereiten: `cp .env.example .env.local`
3. App starten: `npm run dev`
4. Im Browser `http://localhost:3000` öffnen.

Die Beispielkonfiguration aktiviert ausdrücklich `AROMETRA_DATA_MODE=fixtures`. Alle betroffenen Seiten zeigen dann einen Hinweis, dass es synthetische Prüfprofile und keine realen Produktangaben sind. Dieser Modus wird in Produktionsumgebungen verweigert.

## Supabase verbinden

Ein eigenes Entwicklungsprojekt oder ein lokaler Supabase-Stack kann verwendet werden. Es sind keine Zugangsdaten im Repository abgelegt.

1. Einen lokalen Stack mit Docker-kompatiblem Containerdienst starten: `npm run db:start`.
2. Migration und reine Taxonomie-Seeds lokal anwenden: `npm run db:reset:local`.
3. `AROMETRA_DATA_MODE=supabase`, `SUPABASE_URL` und `SUPABASE_PUBLISHABLE_KEY` in `.env.local` setzen.
4. Datenbanktypen bei erreichbarer lokaler Datenbank generieren: `npm run db:types`.

Es gibt keine Produkt-Seeds. Öffentliche Reads erfordern RLS, freigegebene Rechte und passende aktuelle Provenienz pro gefülltem Feld. `SUPABASE_SERVICE_ROLE_KEY` wird von der App nicht verwendet.

## Prüfungen

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npx playwright install chromium` (einmalig)
- `npm run test:e2e`
- `npm run build`
- `npm audit --audit-level=high`

Playwright prüft lokale Seiten im ausdrücklich aktivierten Fixture-Modus. SQL-/RLS-Tests über PGlite prüfen PostgreSQL-Verhalten; sie ersetzen keine Prüfung gegen den echten lokalen Supabase-Stack. Das tatsächliche Ergebnis steht in `docs/QA_LOG.md`.
Falls Chromium bereits über Google Chrome installiert ist, kann die Browserdatei über `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` gesetzt werden; ohne diesen Wert verwendet Playwright seinen heruntergeladenen Chromium-Browser.

## Verzeichnisüberblick

- `src/` — App Router, UI und serverseitige Katalogdienste
- `test/fixtures/` — synthetische Prüfprofile, keine Produktdatenbank-Seeds
- `supabase/migrations/` — versioniertes PostgreSQL-Schema und Zugriffsregeln
- `supabase/seed.sql` — nur Taxonomie und Merkmaldefinitionen
- `docs/` — Spezifikationen, Implementierungsplan und QA-Protokoll

Produktdaten, Bilder, Bewertungen, Preise, Barcodes und Verkaufsereignisse werden nicht aus dem Designmockup oder der Markenrecherchewarteschlange erzeugt.
