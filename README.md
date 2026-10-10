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

Die Laufzeit akzeptiert nur Publishable Keys (oder einen Legacy-`anon`-JWT), niemals Secret-/Service-Role-Keys. HTTP ist nur für Loopback-Entwicklung zulässig. Es gibt keine Produkt-Seeds. Öffentliche Reads erfordern RLS, freigegebene Rechte und passende aktuelle Provenienz pro gefülltem Feld.

## Produktdaten importieren

Der Import läuft zunächst lokal im Dry-Run. CSV, JSON-Array/`{"records": [...]}` und JSONL/NDJSON werden unterstützt. Das Format enthält Quelle, Quellenart, Quell-URL, Lizenz-/Terms-Metadaten, Abrufzeit, Marke, Produkt, Kategorie und optionale Variante, Geschmackswerte und getrennte Tasting-Notizen. Ein CSV-Spaltenvertrag und die Statusregeln stehen in `docs/SPRINT_2_IMPORT.md`.

```sh
npm run import:dry-run -- --file /pfad/zum/import.csv
```

Der Dry-Run gibt Zeilenstatus und Fehlercodes aus, aber keine Rohtexte oder Tokens. `import:register-sources` registriert nur Quellenmetadaten und setzt deren Rechte auf ungeprüft. Ein Owner/Reviewer kann Daten-, Text- und Bildrechte anschließend getrennt prüfen. Erst `import:stage` darf Fakten in private Stagingtabellen schreiben; es verlangt eine zuvor freigegebene Datenlizenz und bei Tasting-Texten zusätzlich genehmigte Textrechte. Staging legt nur unveröffentlichte Importrevisionen an, verändert den öffentlichen Produktkatalog nicht und ist idempotent.

Alle schreibenden Importbefehle erfordern `.env.local` mit `AROMETRA_SUPABASE_TARGET=local` plus Loopback-URL oder `AROMETRA_SUPABASE_TARGET=development` plus explizitem `AROMETRA_DEVELOPMENT_PROJECT_REF`. Dazu braucht es einen kurzlebigen Auth-JWT eines berechtigten Supabase-Nutzers (`SUPABASE_IMPORT_ACCESS_TOKEN`). Rechteprüfungen erfordern `owner`/`reviewer`; Quellenregistrierung, Staging und Draft-Upsert erfordern `owner`/`editor`. Der Import nutzt den Publishable Key und gesicherte RPCs, keinen Secret-/Service-Role-Key. Weder Dry-Run noch Staging erzeugt öffentliche Produktdaten.

```sh
npm run import:register-sources -- --file /pfad/zum/import.json
npm run import:review-rights -- --source-id <uuid> --data approved --license-id <gepruefte-lizenz> --terms-url <https-url> --terms-checked-at <iso-datum>
npm run import:stage -- --file /pfad/zum/import.json
```

`approved` darf erst gesetzt werden, wenn die tatsächliche Nutzungsgrundlage geprüft wurde. Importierte Verkostungstexte erfordern eine gesonderte Textfreigabe. Fotos werden von dieser Pipeline nicht importiert. Die initiale Owner-Zuweisung bleibt ein vertrauenswürdiger Bootstrap-Schritt und ist nicht über Self-Service verfügbar.

Nach dem Stage-Schritt kann ein Editor/Owner einen Importjob mit `npm run import:upsert -- --job-id <uuid>` in Produkt-, Marken- und gegebenenfalls Varianten-Drafts übernehmen. Dieser eigene Schritt schreibt nie `published`, lässt alle Feld-, Varianten- und Geschmacksnachweise auf `pending` und überschreibt abweichende vorhandene Fakten nicht. Solche Abweichungen erscheinen als Pfade im Ergebnis und müssen redaktionell geklärt werden.

## Prüfungen

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run import:dry-run -- --file test/fixtures/catalog-import.json` (synthetischer Test-Fixture)
- `npx playwright install chromium` (einmalig)
- `npm run test:e2e`
- `npm run build`
- `npm audit --audit-level=high`
- `npm run test:integration:supabase` (nur mit isoliertem Dev-Projekt sowie getrennten Test-JWTs für Nicht-Admin und Owner/Editor)

Playwright prüft lokale Seiten im ausdrücklich aktivierten Fixture-Modus. SQL-/RLS-Tests über PGlite prüfen PostgreSQL-Verhalten; sie ersetzen keine Prüfung gegen den echten lokalen Supabase-Stack. Das tatsächliche Ergebnis steht in `docs/QA_LOG.md`.
Der Live-API-Sicherheitstest validiert beide Auth-Sitzungen, öffentliche Reads, private Schema-Abschirmung, verweigerte anonyme/nicht-administrative Zugriffe und die Owner/Editor-Berechtigungsgrenze. Sein Admin-Probeaufruf verwendet eine zufällige, nicht vorhandene Job-UUID und erwartet „Unknown import job“; dabei werden keine Daten geschrieben. Der Test läuft nicht in CI und benötigt ein ausdrücklich freigegebenes Entwicklungsprojekt sowie getrennte kurzlebige JWTs für einen Nicht-Admin und einen Owner/Editor.
Falls Chromium bereits über Google Chrome installiert ist, kann die Browserdatei über `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` gesetzt werden; ohne diesen Wert verwendet Playwright seinen heruntergeladenen Chromium-Browser.

## Verzeichnisüberblick

- `src/` — App Router, UI und serverseitige Katalogdienste
- `test/fixtures/` — synthetische Prüfprofile, keine Produktdatenbank-Seeds
- `supabase/migrations/` — versioniertes PostgreSQL-Schema und Zugriffsregeln
- `supabase/seed.sql` — nur Taxonomie und Merkmaldefinitionen
- `scripts/` — Dry-Run-, Quellenregistrierungs-, Rechte-, Staging-, Draft-Upsert- und Live-API-Prüfkommandos
- `docs/SPRINT_2_IMPORT.md` — Importformat, Rechte-Gates und Qualitätsstatus
- `docs/` — Spezifikationen, Implementierungsplan und QA-Protokoll

Produktdaten, Bilder, Bewertungen, Preise, Barcodes und Verkaufsereignisse werden nicht aus dem Designmockup oder der Markenrecherchewarteschlange erzeugt.
