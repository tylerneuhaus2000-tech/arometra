# AROMETRA QA-Log

Alle Einträge dokumentieren tatsächlich ausgeführte Prüfungen. Ein nicht gestarteter lokaler Datenbankstack gilt nicht als bestandener Datenbanktest.

## 2026-10-10 — Initialaudit

Projektpfad: /Users/tylerneuhaus/Desktop/AROMETRA
Branch/Commit: noch kein Repository zu Auditbeginn; danach lokales Repository auf Branch main initialisiert.
Commitstatus: lokaler Commit auf `main` nach Abschluss der hier dokumentierten Gates; kein Remote/Push.
Änderungen vor diesem Eintrag: keine App-Dateien.

### Ausgeführt

- Vollständig gelesen: 00_CODEX_MASTER_PROMPT.md, AGENTS.md, README_BENUTZUNG.md und docs/01 bis docs/13.
- Visuell geprüft: design-reference/last_ui_concept.png. Produktnamen, Geschmackswerte und Rezensionen im Mockup werden nicht als Datenquelle verwendet.
- pwd, ls -la, rg --files, node --version, npm --version, git --version.
- Verfügbare Tools geprüft: gh vorhanden und authentifiziert (Kontodetails nicht protokolliert); supabase, Docker, PostgreSQL-CLI und Playwright vor Projektinstallation nicht vorhanden.
- Supabase-URL-/Key-Umgebungsvariablen geprüft, Werte nicht ausgegeben: nicht konfiguriert.
- Git-Autoridentität ist konfiguriert; kein Git-Remote vorhanden.
- npm-Registry-Abfrage: next 16.4.0, React 19.3.0, @supabase/supabase-js 2.117.3, Zod 4.6.5. Die Installation ist noch kein Kompatibilitätsnachweis.

### Ergebnisse

- Tests: nicht ausgeführt; zu diesem Zeitpunkt gab es noch keine App.
- Datenbank: kein lokaler PostgreSQL-/Supabase-Dienst und keine Zugangsdaten; daher kein Migrationstest.
- Sicherheit: kein Secret in Ausgaben offengelegt. Es existierten noch keine App-Secrets oder API-Routen.
- Browser/UI: Referenzbild geprüft; noch keine Anwendung und keine Laufzeitscreenshots.
- Reale Produkte/Quellen: 0 geprüfte Produkte, 0 freigegebene Quellen, 0 lizenzierte Bilder.

### Blocker

- Supabase-Projekt/Entwicklungszugang und lokaler Docker-kompatibler Containerdienst fehlen.
- Produktquellen, konkrete Demo-Flaschen, Verkostungsbelege und Bildrechte fehlen.

## Implementierungsphasen

## 2026-10-10 — Sprint 0 und maximal lokaler Umfang Sprint 1

### Tatsächlich ausgeführt

- `npm ci --fetch-retries=5 --fetch-timeout=120000` — erfolgreich; 163 Pakete installiert, 0 npm-Audit-Funde. npm meldet das nicht freigegebene Install-Script des optionalen Dev-Pakets `fsevents@2.3.3`. Das native Script wurde nicht ausgeführt; Build, Entwicklung und Tests liefen trotzdem erfolgreich.
- `npm run lint` — erfolgreich, Biome prüfte 23 Dateien ohne Befund.
- `npm run typecheck` — erfolgreich (`tsc --noEmit`).
- `npm test` — 3 Testdateien, 15 Tests erfolgreich. PGlite führte die vollständige Migration und Taxonomie-Seeds in einer isolierten PostgreSQL-Instanz aus. Geprüft wurden unter anderem Veröffentlichung ohne aktuelle Provenienz, anonyme RLS-Leserechte, verbotene Schreib-/Privatdatenzugriffe, stale Quellenzuordnung, veränderte freigegebene Werte, Variantenbelege und QR-Auflösung.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e` — 4 von 4 Flows erfolgreich mit installiertem Chrome 155. Suche, Detailseite, erklärbare Testempfehlung, aktive/unbekannte/deaktivierte QR-Fälle (Redirect/404/410), 390-px- und 320-px-Mobilansicht sowie `prefers-reduced-motion` geprüft. Die Axe-Prüfung der Startseite fand keine WCAG-2.2-AA-Verstöße.
- Playwright-Screenshots erzeugt und visuell geprüft: `artifacts/qa/home-desktop.png`, `artifacts/qa/product-desktop.png`, `artifacts/qa/catalog-mobile.png`.
- `npm run build` — erfolgreich mit Next.js 16.4.0; App-Routen `/`, `/entdecken`, `/p/[slug]`, `/q/[code]` gebaut.
- Production-Server mit `AROMETRA_DATA_MODE=fixtures` gestartet und per HTTP geprüft: Status 200, kein synthetisches Profil im HTML, stattdessen sichtbare Produktionssperre.
- `npm audit --audit-level=high` — 0 Schwachstellen. Die zuerst gemeldeten High-Funde stammten aus der optionalen ESLint-Konfigurationskette; das Projekt nutzt jetzt Biome und der Audit nach `npm ci` ist sauber.
- `npx supabase --version` — CLI 2.120.0 installiert. `docker` und `psql` sind nicht vorhanden; es gibt keine Supabase-URL und keinen Publishable Key.
- Geprüfte Dateien außerhalb des Paketbaums enthalten keinen Service-Role-Key oder API-Key. Der einzige Suchtreffer für `SUPABASE_SERVICE_ROLE_KEY` ist die README-Aussage, dass die App ihn nicht verwendet.

### Abgrenzung des Nachweises

- Die Anwendung, Such-/Detail-/QR-Routen, Fixture-Trennung und Empfehlungen wurden lokal im Testmodus geprüft. Das beweist keine Live-Produktabdeckung.
- Die Migration lief in PGlite; es lief kein Supabase-Stack. Supabase Auth, PostgREST-RLS, lokale Storage-Rechte und generierte Supabase-Datenbanktypen bleiben bis zur verfügbaren Docker-Laufzeit ungeprüft.
- Supabase-Projekt, URL/Key, konkrete Produktquellen, lizenzierte Bilder und reale Spirituosendatensätze fehlen weiterhin. Seed enthält nur Kategorien und sensorische Taxonomie; es gibt 0 echte Produkt- und Quellenzeilen.
- E2E nutzt synthetische Prüfprofile aus `test/fixtures/`; die Produktionssperre wurde separat geprüft. Es wurden keine Marken, Produktmerkmale, Verkostungstexte, Bewertungen, GTINs, Preise oder Verkaufszahlen erfunden.
- GitHub Actions wurde konfiguriert, aber mangels Remote nicht ausgeführt. Es gibt keinen Remote und keinen Push.
