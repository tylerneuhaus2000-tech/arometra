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

## 2026-10-10 — Sprint 2: Real Database & Catalog Foundation

### Auditbasis und externe Zugänge

- Ausgangscommit/Branch: `35b4345` auf `main`; Working Tree zu Beginn sauber, kein Git-Remote oder Upstream.
- Node.js 26.4.0, npm 11.17.0, Supabase CLI 2.120.0. Docker/Podman und `psql` fehlen.
- Umgebungsvariablen wurden ohne Ausgabe ihrer Inhalte auf Supabase-URL, Publishable-Key und Test-JWT geprüft: nicht konfiguriert. Es wurde keine Remote-Migration ausgeführt.
- `gh auth status` zeigte ein aktives Konto; `gh repo view arometra` fand unter diesem Konto kein Repository. Es wurde kein Repository angelegt, kein Remote gesetzt und nichts gepusht.

### Tatsächlich ausgeführt

- `npm test` — 5 Testdateien, 36 Tests bestanden. PGlite führte alle versionierten Migrationen in einer isolierten PostgreSQL-Instanz aus. Geprüft wurden bestehende Katalog-/QR-/Provenienzregeln, Suchlimits und Literal-Wildcards, inaktive Kategorien, Importquellen-Rechte, private Staging-RLS, anonym/nicht-admin verweigerte RPCs, Rollen-Trennung für Rechteprüfungen, idempotentes Staging und Draft-Upsert ohne Veröffentlichung. Zwei verschieden große `TEST ONLY`-Varianten bleiben getrennt; anonyme Rollen sehen die Drafts nicht. Community-Testdaten sind ausdrücklich `TEST ONLY`, pending, danach nur mit Einwilligung und Moderation öffentlich lesbar.
- `npm run lint` — Biome prüfte `src`, `test` und `scripts` ohne Befund.
- `npm run typecheck` — erfolgreich (`tsc --noEmit`).
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e` — 4/4 Flows bestanden. Die erste Ausführung traf einen bereits laufenden Dev-Server auf Port 3000; Playwright startet jetzt isoliert auf einem eigenen Port und Next-Ausgabeordner. Die erfolgreiche Wiederholung deckte Home/Discovery, Detail/Empfehlung, QR und Mobilansicht ab.
- `AROMETRA_NEXT_DIST_DIR=.next-build npm run build` — Next.js 16.4.0 Produktionsbuild erfolgreich; `/`, `/entdecken`, `/p/[slug]` und `/q/[code]` erzeugt. Von Next generierte Änderungen an `next-env.d.ts` und `tsconfig.json` wurden danach auf den Repository-Stand zurückgesetzt.
- Produktionsserver mit ausdrücklich gesetztem Fixture-Modus auf isoliertem Build gestartet und per HTTP angefragt — `HTTP 200`, Sperrhinweis „Synthetische Testdaten sind in der Produktionsumgebung gesperrt“ vorhanden, synthetisches Prüfprodukt im HTML nicht vorhanden.
- `npm run import:dry-run -- --file test/fixtures/catalog-import.json` — ein ausdrücklich markierter Fixture-Kandidat, `incomplete=1`, `invalid=0`; es wurden keine Rohfakten ausgegeben.
- `npm run test:integration:supabase` — `BLOCKED`, Exit-Code 1 mit sicherem Konfigurationshinweis. URL, sicherer Publishable Key und kurzlebiger nicht-administrativer JWT fehlen. Deshalb gab es keine echten PostgREST-/Supabase-API- oder Live-RLS-Ergebnisse.
- `npm audit --audit-level=high` — 0 Schwachstellen. Prüfung des Worktrees auf JWT-/`sb_secret_`-artige feste Zugangswerte — keine Treffer. Geänderte Dateien bestehen `git diff --check`.

### Daten- und Integrationsstatus

- Reale verifizierte Produktdatensätze im Katalog/Seed/Importbestand: **0**. Für AROMETRA freigegebene Datenquellen: **0**. Der PGlite-Testbestand enthält nur klar markierte synthetische Werte und wird verworfen.
- Teacher's Highland Cream wurde als zu bearbeitende Produktidentität berücksichtigt. Ein verifizierter Hersteller-GTIN erscheint nur als checksum-only Unit-Testvektor mit offiziellem Herstellerlink; es gibt keine Produktzuordnung oder Datenbankzeile dafür.
- Open Food Facts wurde nicht abgefragt/importiert; die offizielle Dokumentation weist auf ODbL/Datenlizenz-, Attribution- und Share-Alike-Bedingungen hin. Herstellerseiten von Suntory/Teacher's sind Recherchequellen, aber die geprüften Nutzungsbedingungen belegen keine AROMETRA-Datenlizenz. Details und Abruflinks: `docs/SPRINT_2_SOURCE_AUDIT.md`.
- Supabase ist lokal auf Schema-/SQL-Ebene in PGlite geprüft, aber live `BLOCKED`. Es gibt kein bestätigtes Entwicklungsprojekt oder echte API-Integrationsergebnisse.
- `.github/workflows/ci.yml` ist lokal konfiguriert (Lint, Typecheck, Vitest, Import-Dry-Run, E2E, Produktionsbuild, Audit). GitHub Actions lief mangels bestätigtem Repository nicht.

### Re-Audit vor dem Sprint-2-Commit am 2026-10-10

- Verifizierter Sprint-2-Implementierungscommit auf `main`: `916499063a01e623d5187cbc7f6abf020c2bf05d`; Ausgangscommit: `35b4345`.
- Secret-Musterprüfung über 75 getrackte und nicht ignorierte Dateien: keine Treffer; `.env.local` fehlt. `gitleaks`/`trufflehog` sind in der Umgebung nicht installiert. Die Prüfung gibt keine möglichen Geheimniswerte aus.
- `npm run lint` und `npm run typecheck` — erfolgreich; `npm test` — 5 Dateien, 36 Tests bestanden, einschließlich der SQL-Sperre gegen abweichende Lizenz-/Terms-Metadaten im Quellen-Snapshot.
- `AROMETRA_NEXT_DIST_DIR=.next-build npm run build` — erfolgreich. Next.js änderte generierte Pfade in `next-env.d.ts` und `tsconfig.json`; diese Build-/Dev-Artefakte wurden auf den eingecheckten Stand zurückgesetzt.
- E2E: erster Gesamtlauf nach dem Build 3/4, ein Produktprofil-Klick navigierte nicht. Der fokussierte Flow bestand nach Bereinigung generierter Next-Dateien; der erneute vollständige Lauf bestand mit 4/4 (Home/Accessibility, Produktsuche/Steckbrief/Empfehlung, QR, Mobilansicht). Der einzelne Erstfehler ist damit als transient dokumentiert, nicht als bestanden gezählt.
- `npm audit --audit-level=high` — 0 Schwachstellen; `git diff --check` — erfolgreich.
- `npm run test:integration:supabase` — `BLOCKED`, weil Entwicklungsprojekt-URL, Publishable Key sowie getrennte kurzlebige Nicht-Admin- und Owner/Editor-JWTs fehlen. Keine Live-API-Anfrage und keine Remote-Migration.
- Supabase-SQL wurde weiterhin ausschließlich mit der wegwerfbaren PGlite-Instanz getestet; der Snapshot-Review-Abgleich ist SQL-seitig abgedeckt, eine echte Supabase/Auth/PostgREST-Integration bleibt offen.

## 2026-10-10 — Sprint 2.5: Real Data Integration & Infrastructure

### Auditbasis und Konfiguration

- Basis-Commits: Sprint 2 `916499063a01e623d5187cbc7f6abf020c2bf05d`, QA-Nachtrag `becb2f7e84b73bcefbd960acc022fce2099b367d`; Start-Working-Tree war sauber.
- Repository-/Umgebungsprüfung wurde wiederholt; es gibt weiterhin keinen Supabase-Projektzugang und keinen bestätigten GitHub-Remote. Der Supabase-Integrationstest hat sicher `BLOCKED` gemeldet, ohne API-Anfrage oder Datenbankänderung.
- Migrationen wurden nur durch die isolierten PGlite-Tests ausgeführt. Keine Migration ging an ein Remoteprojekt; keine produktiven/destruktiven Datenbankbefehle wurden gestartet.

### Tatsächlich ausgeführt

- `npm run lint` — Biome prüfte 34 Dateien ohne Befund.
- `npm run typecheck` — erfolgreich (`tsc --noEmit`).
- `npm test` — 6 Testdateien, 40 Tests bestanden. PGlite führte alle vier Migrationen und Taxonomie-Seeds aus. Die Tests prüfen 47 Kategorien, null Seed-Produkte, geprüfte Quellenansichten mit `verified_at`, aktive Unterkategorien in der anonymen Suche sowie die vorhandenen Import-, QR-, Rechte- und RLS-Regeln. Ein zwischenzeitlicher DB-Testfehler wurde auf den erweiterten `TEST ONLY`-Brand-Provenienzhash im Testhelfer zurückgeführt und korrigiert; der Endlauf bestand.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e` — letzter Gesamtlauf 5/5. Geprüft: Startseite samt Axe/WCAG-2.2-AA-Smoke, global sichtbare Suche, Kategorie-Auf-/Zuklappen, Query-State beim Kategorienwechsel, Steckbrief/Empfehlungs-Test, QR-Redirect/404/410 sowie 390- und 320-px-Ansichten ohne horizontalen Überlauf.
- `AROMETRA_NEXT_DIST_DIR=.next-build npm run build` — erfolgreich mit Next.js 16.4.0; Home, Entdecken, dynamischer Steckbrief, QR-Route und Not-found wurden gebaut. Von Next geänderte `next-env.d.ts`-/`tsconfig.json`-Dateien wurden danach zurückgesetzt.
- Production-Server ohne `AROMETRA_DATA_MODE` gestartet. Home, Entdecken und unbekannter Steckbrief lieferten HTTP 200 mit dem jeweiligen unkonfigurierten Leer-/Fehlerzustand; synthetische Profile waren nicht im HTML. Eine Browserprüfung bestätigte außerdem die mobile Suche. Screenshots: `artifacts/qa/sprint-2-5/unconfigured/`.
- Fixture-E2E-Screenshots wurden getrennt und vollständig als synthetisch gekennzeichnet in `artifacts/qa/sprint-2-5/` gespeichert. Ältere referenzierte QA-Bilder wurden nicht überschrieben. Alle acht Bilder wurden visuell geprüft.
- `npm run import:dry-run -- --file test/fixtures/catalog-import.json` — eine ausdrücklich synthetische Zeile, `incomplete=1`, `invalid=0`; keine Übernahme in App oder Datenbank.
- `npm run test:integration:supabase` — `BLOCKED` mit dem sicheren Hinweis, dass Projekt-URL, Publishable Key und getrennte kurzlebige Nicht-Admin-/Owner-Editor-Test-JWTs fehlen. Eine Variablen-Namensprüfung bestätigte außerdem: `AROMETRA_SUPABASE_TARGET` und `AROMETRA_DEVELOPMENT_PROJECT_REF` fehlen. Keine Live-RLS-, Auth- oder PostgREST-Ergebnisse.
- `npm audit --audit-level=high` — 0 Schwachstellen. Secret-Musterprüfung über 73 versionierte und nicht ignorierte Textdateien — keine Credential-Muster. `git diff --check` — erfolgreich.

### Daten und Quellen

- Reale, im AROMETRA-Katalog verifizierte Produktdatensätze: **0**. Die PGlite-Seed-Prüfung bestätigt `products=0`; eine Live-Datenbank ist nicht erreichbar, ihr dortiger Bestand ist daher unbekannt.
- Zehn Recherchekandidaten wurden anhand verlinkter Herstellerseiten geprüft, darunter Teacher's Highland Cream sowie die neun Kandidaten aus dem Sprintauftrag. Markt-/Abfüllungsdetails bleiben teilweise offen. Keiner wurde gestaged oder importiert; verifizierte Sensorikwerte, GTINs, Community-Bewertungen und Bilder: **0**.
- Rechte-/Lizenzstatus: **0 freigegebene Datenquellen**, **0 lizenzierte Produktbilder**. Herstellerseiten sind Faktenquellen zur Recherche, aber die gesichteten Nutzungsbedingungen gewähren AROMETRA keine Wiederverwendungsrechte. Open Food Facts wurde nicht abgefragt. Detailfakten, Marktgrenzen, Abrufdatum und Lizenzentscheidung stehen in `docs/SPRINT_2_5_PRODUCT_RESEARCH.md`.
- Seed enthält nur 14 Kategorie-Wurzeln plus 33 Unterkategorien; keine Marken-, Produkt-, GTIN-, Preis-, Sensorik-, Bewertungs- oder Verkaufsdaten.

### Integrationsstatus und Grenzen

- Supabase-Konfiguration und Datenpfad sind vorbereitet. Schema-/SQL-/RLS-Tests in PGlite bestanden, echte Supabase-Auth-/PostgREST-RLS-Integration: **BLOCKED / nicht verifiziert**. PGlite simuliert diese Dienste nicht.
- `.github/workflows/ci.yml` ist vorhanden. `gh api user` bestätigte das Free-Konto `tylerneuhaus2000-tech`, wie im Masterprompt vorgesehen; `gh auth status` zeigte aktive `repo`-/`workflow`-Scopes. Vorherige Repo-Abfrage war leer; das private Repository `tylerneuhaus2000-tech/arometra` wurde erstellt und `origin` zeigt auf dieses Ziel. Es wurde noch kein Branch/Commit gepusht, daher lief GitHub Actions nicht.
- GitHub dokumentiert für private Repositories ein planabhängiges Actions-Minutenkontingent (Free: 2.000 Minuten/Monat) und Abrechnung bei Überschreitung ([GitHub Actions Billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)). Das aktuelle Kontingent bzw. Ausgabenlimit des Kontos wurde nicht gelesen oder verändert. Ein Push, der den CI-Workflow auslösen könnte, bleibt bis zur Klärung der Abrechnungsfreigabe offen.
- Lokaler Sprint-2.5-Code-/Screenshot-Commit auf `main`: `965c7c4b09705fa303ecdb4236001e2343ea46dd`.
- `gitleaks` und `trufflehog` sind nicht installiert. Der Secret-Scan ist ein dokumentierter Muster-Scan und kein Ersatz für einen späteren CI-/GitHub-Secret-Scanning-Lauf.

## 2026-10-10 — Modern Oak UI Redesign

### Änderungen und Preview-Grenze

- Überarbeitet wurden Sidebar, globaler Header, Start-/Katalog-/Detaildarstellung, Produktkarten, Responsive-CSS und der derzeit noch nicht verfügbare Beratungsbereich. Die Katalogseiten behalten den vorhandenen serverseitigen Katalogdienst bei; Datenbank-, Import- und RLS-Architektur wurden nicht verändert.
- Die Designvorschau ist mit `AROMETRA_UI_PREVIEW=true` opt-in, läuft über `npm run ui-preview` auf `127.0.0.1:3130` und verwendet ein separates Next-Ausgabeverzeichnis. Produktionsrouten und Bildendpunkt liefern trotz gesetztem Flag 404. Die Bilder liegen nur in `test/fixtures/ui-preview/`, sind neutral und unbranded. Keine Preview-Fixture wurde importiert.
- Screenshots und visuelle Review: `artifacts/qa/ui-redesign/`. Die responsive Vorschau wurde bei 1440/1280/768/390/320 px geprüft; Spaltenzahl 3/3/2/1/1 und kein horizontaler Überlauf. Sidebar-Aufklappen, Drawer/Escape, Suche, normale Detailansicht und QR-Testfälle wurden im Browser geprüft.

### Verifikation

- `npm run lint` — 42 Dateien geprüft, erfolgreich. `npm run typecheck` — erfolgreich. `npm test` — 6 Dateien / 40 Tests erfolgreich.
- `AROMETRA_NEXT_DIST_DIR=.next-ui-redesign AROMETRA_DATA_MODE=fixtures AROMETRA_UI_PREVIEW=true npm run build` — Next.js 16.4.0 Production-Build erfolgreich.
- `npm audit --audit-level=high` — 0 Schwachstellen.
- Axe-Prüfungen der Home-, Preview- und mobilen Drawer-Zustände — keine gemeldeten WCAG 2.2 AA-Tag-Verstöße.
- Alle sechs Browser-Testfälle haben mindestens einen erfolgreichen Playwright-Lauf. Der komplette Suite-Lauf war zweimal instabil: das installierte System-Chrome wurde nach vier bestandenen Fällen geschlossen, einmal beim `page`-Setup des QR-Falls und einmal beim `newContext`. QR bestand anschließend isoliert und mit dem mobilen Fall zusammen (2/2); die aktualisierte lokale Preview/Screenshot-Prüfung bestand separat (1/1). Ein durchgängiger 6/6-Lauf wird daher nicht behauptet.
- Der dedizierte Preview-Launcher wurde gestartet; `lsof` bestätigte `127.0.0.1:3130`. Lokale Vorschau: 200, nicht-lokaler Host: 404.
- Produktions-Smoke-Test mit `AROMETRA_UI_PREVIEW=true`: `/ui-preview`, `/ui-preview/designprofil-a` und `/api/ui-preview/bottle-amber.jpg` jeweils 404; `/` 200 mit Produktions-Fixture-Sperre und ohne Design-Fixture.
- `docs/UI_REDESIGN_REPORT.md` enthält Screenshots, Implementierungsgrenzen und die vollständigen Browser-Ergebnisse.

### Offene Grenzen

- Keine Supabase-Entwicklungszugangsdaten. Live-Abfragen, Supabase-Auth, PostgREST, RLS und ein echter Produkt-/QR-Ablauf sind weiterhin ungeprüft. Der Datenbankbestand eines nicht erreichbaren Projekts ist unbekannt; Screenshots verwenden ausschließlich markierte Design-Fixtures.
- Keine produktiv nutzbaren Produktbilder oder realen Produktdatensätze neu hinzugefügt.
- Push bleibt gemäß Nutzeranweisung bis zur Freigabe und Klärung möglicher GitHub-Actions-Kosten zurückgestellt.

## 2026-10-10 — Supabase-Konfigurationsaudit

- `.env.local` war am erwarteten Projektpfad nicht vorhanden. Weder `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` noch die bisherigen `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`-Aliases waren geladen. Auch der explizite Development-Project-Ref und die getrennten Nicht-Admin-/Owner-Editor-JWTs fehlten. Es wurden keine geheimen Werte ausgegeben.
- `git check-ignore -v .env.local` bestätigt die `.env.*`-Ignore-Regel; `git ls-files --error-unmatch .env.local` bestätigt, dass die Datei nicht versioniert ist.
- Secret-Musterscan der geänderten/neuen Textdateien traf ausschließlich den bestehenden synthetischen Negativtest `https://user:pass@dev.supabase.co` in `test/unit/supabase-configuration.test.ts`; das ist ein absichtlich falscher Parser-Testwert, kein Zugang. Keine Credential-Werte aus Konfiguration oder Laufzeit gefunden.
- Die Laufzeit, Import-CLI und Supabase-Integrationstest akzeptieren nun beide Variablennamenspaare; widersprüchliche Aliaswerte werden abgelehnt. `.env.example` und README dokumentieren die `NEXT_PUBLIC_…`-Namen. Publishable-Key-only-Prüfung bleibt bestehen.
- `npm run lint` — 42 Dateien, bestanden. `npm run typecheck` — bestanden. `npm test` — 6 Dateien / 41 Tests bestanden (einschließlich neuem Alias-/Konflikttest). `AROMETRA_NEXT_DIST_DIR=.next-ui-redesign AROMETRA_DATA_MODE=supabase npm run build` — bestanden.
- Der Produktionsserver wurde ohne Supabase-Konfiguration im `supabase`-Modus abgefragt: Home HTTP 200 mit dem sicheren Konfigurationsfehler, kein synthetisches Prüfprodukt im HTML.
- `npm run test:integration:supabase` — `BLOCKED` vor jeder Netzwerkanfrage; URL, Publishable Key und getrennte Auth-JWTs fehlen. Keine tatsächlichen Datenbankabfragen, Auth-, PostgREST- oder RLS-Ergebnisse.
- `supabase migration list --linked` — `ProjectRefNotLinkedError`. Lokale CLI 2.120.0 ist installiert, aber es existiert kein verbundenes Hosted-Projekt. Die vier lokalen Migrationen sind im PGlite-Testlauf geprüft. Ein Remote-Pending-Set lässt sich nicht bestimmen.
- Migrationen statisch geprüft: keine direkten `DROP TABLE`, `TRUNCATE` oder `DELETE`-Statements; Migration 2 ersetzt eine Provenienz-Constraint. Es wurde kein Remote-Link, Dry-Run, Seed, Reset oder Schreibzugriff ausgeführt. Der vorhandene Remote-Schema-/Datenzustand bleibt unbekannt.
- Detaillierter Status und notwendige Zugangsdaten: `docs/SUPABASE_INTEGRATION_STATUS.md`.

## 2026-10-10 — Live Supabase-Verbindung und Migrationen

- `.env.local` wurde lokal mit Projekt-URL, Publishable Key, Entwicklungsziel, passender Projekt-Referenz und `AROMETRA_DATA_MODE=supabase` konfiguriert. Datei bleibt ignoriert und wurde nicht committed.
- Supabase CLI login/link für das bestätigte Entwicklungsprojekt erfolgreich. Remote-Migrationsliste zeigte vier lokale Migrationen pending; `db push --dry-run` listete dieselben vier und keine Seeds. Nach read-only Prüfung, dass keine bestehenden Tabellen/Views/Sequenzen in `public` oder `private` vorhanden waren, `npx supabase db push` erfolgreich ausgeführt. Alle vier Versionen sind in der Remote-Historie bestätigt.
- Vorherige Risikoanalyse: keine Tabellen-/Schema-Drops, Truncates oder direkten Datenlöschungen. Eine Constraint-Ersetzung betrifft eine unmittelbar zuvor angelegte Tabelle. Es wurden keine Seeddaten oder Produkte importiert.
- Remote DB liefert `0` Kategorien und `0` Produkte. PostgREST GETs für die öffentlichen Katalogtabellen liefern HTTP 200. Auth health/settings liefern HTTP 200. Anonymer `admin_members`-Zugriff wird mit HTTP 401 verweigert; Zugriff auf das private Importschema antwortet HTTP 406. RLS ist laut `pg_class.relrowsecurity` für alle 22 public/private Basistabellen aktiviert.
- Read-only Zählung: `admin_members=0`, `community_reviews=0`; noch kein initialer Test-Owner/Editor zugewiesen.
- Produkt-Flavors-Abfrage korrigiert: `product_flavor_values` hat keinen `id`-Schlüssel, sondern zusammengesetzten Schlüssel; gültiger anonymer Read über `product_id` liefert HTTP 200. Der Live-Integrationstest verwendet jetzt je Tabelle eine existierende Spalte.
- Next.js-Smoke-Test mit `.env.local`/Supabase-Modus: `/` und `/entdecken` HTTP 200, keine synthetischen Preview-Bezeichnungen. Mangels Datensätzen sind Produktdetail, Suche, QR und Empfehlungen noch kein realer Datenablauf.
- Nach Korrektur: `npm run lint` (42 Dateien), `npm run typecheck` und `npm test` (6 Dateien/41 Tests) erfolgreich. `npm run test:integration:supabase` bleibt sicher `BLOCKED` vor Netzwerkzugriff, da getrennte kurzlebige Nicht-Admin- und Owner/Editor-Test-JWTs fehlen. Authentifizierte RLS- und Admin-RPC-Ergebnisse sind damit noch nicht verifiziert.

## 2026-10-10 — Lokale Startdatenbank in der Website

- Die bereitgestellte `catalog_data.json` wird im expliziten Modus `AROMETRA_DATA_MODE=local-start-database` serverseitig gelesen. `.env.local` zeigt auf die Datei in Downloads; die Datei selbst wurde weder kopiert noch in Supabase importiert. Der Next.js-Devserver bindet an `127.0.0.1`.
- Lokale Vorschauseiten: `/` und `/entdecken` zeigen die Testdatenbank mit sichtbarem Hinweis zu ungeprüften Angaben/Rechten; `/p/ardbeg-ten` zeigt Steckbrief, Quelllink, getrennte Hersteller-Notizen und qualitative Tags ohne Zahlenwerte. Interne QR-Aliase wie `/q/AR-0002` sind nur im lokalen Modus auflösbar.
- Browserprüfung in Google Chrome bei 1440/1280/768/390/320 px: drei/zwei/eine Spalten wie vorgesehen und kein horizontaler Überlauf. Sidebar-Unterkategorie aufklappbar, Rum-Filter lieferte 2 Produkte, globale Suche nach `Teachers` lieferte 1 Produkt, Ardbeg-Detailseite zeigte 2 Empfehlungen anhand gemeinsamer Tags.
- Screenshots liegen lokal unter `/tmp/arometra-local-1440.png`, `/tmp/arometra-local-390.png`, `/tmp/arometra-local-sidebar-open.png` und `/tmp/arometra-local-product.png`.
- Production build `AROMETRA_NEXT_DIST_DIR=.next-build npm run build` erfolgreich. Mit dem lokalen Modus im Productionserver waren Produkttitel/Datensätze in `/`, `/entdecken` und `/p/ardbeg-ten` nicht enthalten; `/q/AR-0002` antwortete HTTP 404. Der lokale Katalogmodus ist damit in Produktion gesperrt.
- `npm run lint` (45 Dateien), `npm run typecheck` und `npm test` (6 Dateien/41 Tests) erfolgreich. Die Download-SQLite-Prüfungen hatten zuvor 5/5 bestanden; der Import-Dry-Run ergab 14 Kandidaten, 5 vollständig, 9 unvollständig, 0 ungültig/dupliziert/konfligiert.
- Supabase blieb unverändert bei 0 Kategorien, 0 Produkten und 0 Quellen. Es wurden keine Testkandidaten registriert oder importiert, weil die Quellenrechte laut Paket ungeklärt sind. Einzelheiten: `docs/START_DATABASE_IMPORT_REVIEW.md`.

## 2026-10-10 — Offizielle Produkt-Packshots

### Korrektur und Datenbestand

- Die beiden inszenierten Kartenbilder für BACARDÍ Carta Blanca und The Glenlivet 12 wurden durch Flaschen-Packshots ersetzt. BACARDÍ verwendet ein freigestelltes Herstellerbild aus dem offiziellen Marken-CDN; Glenlivet nutzt den passenden 0,7-l-Artikel-Packshot der EDEKA24-Produktseite. Quellen und Bildrechte stehen in `docs/OFFICIAL_PRODUCT_IMAGES_AND_TASTE_AUDIT.md`.
- Der Quellenlink auf Produktseiten heißt jetzt neutral „Produktseite“, damit EDEKA24 als Händlerquelle nicht fälschlich als Herstellerseite bezeichnet wird.
- Die restlichen 12 Katalogbilder wurden visuell geprüft; alle 14 Karten zeigen jetzt die Flasche oder deren Verkaufspackung. Es sind keine Privatpersonen-, UGC-, Stock- oder synthetischen Produktbilder im Katalog.
- Die lokale SQLite-Testdatenbank und `catalog_data.json` unter `~/Downloads/AROMETRA_STARTDATENBANK/` wurden aktualisiert. Vor der SQLite-Änderung wurde `arometra.sqlite.pre-enrichment-20261010T190221Z.bak` erstellt; auch `catalog_data.json` wurde separat gesichert. Ergebnis: 14 Produkte, 14 Bilder, 0 veröffentlichte Produkte, 0 freigegebene Bilder, 0 numerische Geschmackswerte, 14 Hersteller-Verkostungsnotizen.
- Supabase wurde nicht geändert. Die Bilddateien und QA-Screenshots liegen außerhalb des Git-Arbeitsbaums. Bildwiederverwendungsrechte sind weiter ungeklärt; die Fotos sind nur in der ausdrücklich lokalen Entwicklungsdatenbank sichtbar.

### Verifikation

- `python3 -m py_compile scripts/enrich-local-start-database.py` — erfolgreich. Der lokale Import-/Enrichment-Dry-Run meldete `dry_run_ok`; die Änderung wurde ausschließlich auf das geprüfte, unveröffentlichte Downloads-Testpaket angewandt.
- Browserprüfung der lokalen Datenbank: alle 12 Bilder auf Katalogseite 1 und beide Bilder auf Seite 2 geladen; Glenlivet- und BACARDÍ-Steckbriefbilder ebenfalls HTTP 200 und natürliche Bildabmessungen erkannt. Keine Browser-JavaScript-Fehler.
- Responsive Prüfung bei 1440/1280/768/390/320 px: drei/drei/zwei/eine/eine Spalte, kein horizontaler Überlauf; sichtbare Bilder geladen. Zusätzlich wurden alle 14 Kartenbilder beim Durchlaufen beider Katalogseiten geladen geprüft. Axe/WCAG 2.2 AA auf Katalog, Glenlivet- und BACARDÍ-Detailseiten: 0 Verstöße.
- Produktionsbuild `AROMETRA_NEXT_DIST_DIR=.next-packshot-build npm run build` — erfolgreich. Mit lokalem Datenmodus gegen den Produktionsserver: Bildroute 404, QR-Route 404, Katalog HTTP 200 ohne lokale Produktdaten, nicht vorhandenes lokales Produkt ohne Testdateninhalt.
- `npm run lint` — Biome prüfte 47 Dateien, erfolgreich. `npm run typecheck` — erfolgreich. `npm test -- --reporter=dot` — 6 Dateien / 44 Tests bestanden. `npm run test:e2e` auf dem isolierten synthetischen Fixture-Server mit dem projektspezifischen Playwright-Chromium — 6/6 bestanden.
- Screenshots der echten lokalen Testdatenbank liegen außerhalb des Repositories in `~/Downloads/AROMETRA_PACKSHOT_QA_2026-10-10/` (Home, Katalogseite 1/2, aufgeklappte Navigation, Produktdetails, Empfehlungen und Mobilansichten).

## 2026-10-10 — Supabase-Packshot-Lesepfad und Mundgefühl

- Der Produktbild-Lesepfad wurde in `src/lib/catalog/repository.ts` angeschlossen: Katalog, Produktsteckbrief und Empfehlungen lesen `product_images` über das öffentliche RLS. Nur die erste sichere HTTPS-Bildquelle je Produkt wird verwendet; unsichere URLs werden verworfen. Karten und Steckbrief setzen `referrerPolicy="no-referrer"`.
- Migration `20261010130500_public_product_images_and_mouthfeel.sql` wurde nach Dry-Run ausschließlich auf das verknüpfte Entwicklungsprojekt angewandt (`--skip-vault`). `npx supabase migration list --linked` bestätigt Version 130500 lokal und remote. Sie ergänzt die öffentliche Leseberechtigung für `product_images.source_url`, HTTPS-Constraint und `tasting_notes.mouthfeel_text`; bestehende Rechteprüfungen bleiben aktiv.
- Live PostgREST/Supabase: anonyme Leseabfragen für `product_images(id,source_url)` und `tasting_notes(id,mouthfeel_text)` antworten HTTP 200. Roh-Sensoriktabellen antworten HTTP 401; `admin_members` antwortet HTTP 401. Die 80 Kategorieachsen werden öffentlich gelesen. `npm run test:integration:supabase` endet mit `partial`/Exit 2, weil getrennte gültige Nicht-Admin- und Owner/Editor-JWTs fehlen; Authentifizierung und angemeldete Rollen wurden nicht bestätigt.
- Öffentliche Live-Zählung: `categories=47`, `products=0`, `product_images=0`. Die V3-SQLite-Datei enthält 14 Produktzeilen und 0 Bildzeilen; das separate Startpaket enthält 14 lokale, weiterhin nicht freigegebene Bildkandidaten. Es wurden keine Produkt- oder Bilddatensätze in Supabase importiert.
- Die bestehende Next.js-Laufzeit verwendet `.env.local` im `supabase`-Modus. `/entdecken` antwortet lokal HTTP 200 und zeigt den leeren Supabase-Katalog ohne lokale Produktnamen. Der bekannte lokale Produktpfad `/p/ardbeg-ten` enthält weder eine Produktüberschrift noch den lokalen Testdatenbankhinweis. Damit wurde für diesen Lauf kein lokaler Produktdatensatz auf der Website angezeigt.
- `npm run lint` — erfolgreich, 50 Dateien. `npm run typecheck` — erfolgreich. `npm test -- --reporter=dot` — 8 Dateien / 57 Tests bestanden. `npm run test:e2e` — 6/6 bestanden. `AROMETRA_NEXT_DIST_DIR=.next-image-supabase-build npm run build` — erfolgreich.
- Der erste E2E-Lauf scheiterte an zwei nicht mehr aktuellen Textassertionen aus dem bestehenden UI-Redesign. Sie wurden an die sichtbaren Abschnittsüberschriften und den aktuellen Leerzustand angepasst; die anschließende E2E-Ausführung bestand 6/6.
- Offen: Auth-Rollen benötigen neue, nicht abgelaufene getrennte Testzugänge. Für öffentliche Bilder fehlen freigegebene Nutzungsrechte und Datensätze; die Website unterstützt derzeit HTTPS-Quell-URLs, aber keinen Supabase-Storage-Upload. Die V3-Produkte bleiben lokal und unveröffentlicht. Git-Account/Push nicht geändert: die gewünschte Kennung `tylerneuhaus2000tech` ist nicht bestätigt (Antwort „idk“); daher kein Commit oder Push.

## 2026-10-10 — Importkandidaten, Bildreview und Live-Prüfung

- Der CSV-/JSON-Import akzeptiert jetzt optional separat belegte Bildkandidaten und `mouthfeel`. Produktquelle und Bildquelle bleiben getrennte Quellenangaben. Der Upsert speichert Bildkandidaten standardmäßig als `pending`/`unreviewed`; ein Bild wird erst öffentlich, wenn Bildquellenrechte und eine eigene Bildprüfung durch einen aktiven Owner oder Reviewer freigegeben sind.
- Migration `20261010130600_catalog_image_import_and_review.sql` wurde nach lokalem PGlite-Lauf, Remote-Dry-Run und read-only Preflight auf das bestätigte Development-Projekt angewandt. Der Dry-Run zeigte nur diese Migration. Vorher waren `products=0`, `product_images=0`, `tasting_notes=0` und doppelte Bildidentitäten `0`. Die Migration enthält keine Produktimporte oder Seed-Daten. Remote-Migrationsliste bestätigt 130600 lokal und remote.
- Live-Datenbank nach Migration: `categories=47`, `products=0`, `product_images=0`, `tasting_notes=0`; `mouthfeel_hash` ist vorhanden. `anon` kann `review_product_image` nicht ausführen und die private Bildreview-Historie nicht lesen; `authenticated` hat nur die RPC-Berechtigung, deren Funktion zusätzlich Owner/Reviewer-Mitgliedschaft verlangt.
- Live Supabase Auth settings endpoint HTTP 200 (nur Erreichbarkeit, keine angemeldete Sitzung bestätigt). Live PostgREST: anonyme Leseabfragen und Bildquellen-Join HTTP 200; Suche HTTP 200 mit 0 Treffern für einen eindeutigen Nichttreffer; die exakte Produktdetail-Beziehungsabfrage liefert HTTP 200/0 Treffer; QR-RPC HTTP 200 mit 0 Treffern für einen zufälligen unbekannten Code. Rohsensorik und `admin_members` HTTP 401; anonyme Bildfreigabe HTTP 401. Keine Schreibabfrage wurde im Live-Test ausgeführt.
- `npm run test:integration:supabase` bleibt `partial`/Exit 2: die vollständigen anonymen Live-Prüfungen sind bestanden, aber die getrennten Nicht-Admin- und Owner/Editor-JWTs sind abgelaufen oder fehlen. Authentifizierte Sitzungen, angemessene Rollen und positive Admin-RPCs sind live nicht geprüft.
- Import- und Datenbanktests: 8 Dateien / 59 Tests bestanden, darunter CSV-/JSON-Normalisierung, getrennte Bildquellen, unverifizierte Bildkandidaten, Mundgefühl-Hash, Bildrechtefreigabe und Rollen-RLS. `npm run lint` (50 Dateien), `npm run typecheck`, `npm run test:e2e` (6/6) und isolierter Production-Build bestanden. Der E2E-Lauf verwendet ausdrücklich lokale synthetische Design-Fixtures; keine davon wurde importiert.
- Next.js-Smoke-Test gegen die konfigurierte Live-Datenquelle: `/entdecken` HTTP 200 mit dem leeren Supabase-Zustand und eine Suche nach Ardbeg mit dem korrekten leeren Suchzustand; `/p/ardbeg-ten` HTTP 404. HTML-Ausgaben enthielten keine lokale Testdatenbank oder synthetischen Produktnamen. Dabei wurde ein echter Detailabfragefehler `PGRST201` (mehrere Kategoriebeziehungen) gefunden und mit einem Fremdschlüssel-Hinweis auf `products_primary_category_id_fkey` in Detail- und Empfehlungskandidat-Abfragen behoben. Die Live-Detailbeziehungsabfrage liefert danach HTTP 200 und 0 Treffer. Ein positiver Produkt-/QR-/Empfehlungsablauf bleibt mangels öffentlicher Datensätze ungeprüft.
- `.env.local` wird von Git ignoriert. `gitleaks`/`trufflehog` sind nicht installiert; eine gezielte Musterprüfung über versionierte und nicht ignorierte Dateien meldete keine Credential-Muster. Kein Credential wurde ausgegeben.
- Quellen- und Bildrechte des Downloads-Pakets sind weiterhin nicht freigegeben. Deshalb: **0 tatsächliche Produktdatensätze in Supabase**, **0 öffentlich sichtbare Packshots** und **0 veröffentlichte numerische Geschmackswerte**. Die bekannten 14 Bilddateien im lokalen Paket sind Kandidaten ohne bestätigte AROMETRA-Nutzungsrechte.
- GitHub-Konto bleibt nach Antwort „idk“ uneindeutig. Remote, Git-Autor, Commit und Push wurden nicht verändert.

## 2026-10-10 — Sichtbare lokale Startdaten-Vorschau und Hosting-Status

- Der leere Devserver auf `127.0.0.1:3000` wurde durch die ausdrücklich lokale Vorschau der bereitgestellten Startdaten ersetzt. Der Prozess verwendet `AROMETRA_DATA_MODE=local-start-database` und die JSON-Datei unter Downloads; `.env.local` blieb auf `AROMETRA_DATA_MODE=supabase`, und es gab keine Datenbank-Schreibzugriffe.
- Browserprüfung mit Chromium/Playwright: `/` HTTP 200 mit sechs Produktkarten; `/entdecken` HTTP 200 mit 14 Kandidaten insgesamt (12 auf Seite 1, 2 auf Seite 2); Suche nach `Ardbeg` liefert einen Treffer; Whisky-Filter liefert sieben; `/p/ardbeg-ten` HTTP 200 mit Kategorienotiz, belegten Herstellerangaben, Quellen und zwei tagbasierten Vorschlägen. `/q/AR-0001` antwortet lokal mit HTTP 307 zum Teacher's-Steckbrief. Keine synthetischen Bewertungen oder numerischen Geschmackswerte.
- Die lokale Vorschau zeigt den Hinweis „nicht redaktionell freigegeben“ und „Bildrechte ungeklärt“. Alle 14 lokalen Bildendpunkte antworten HTTP 200 mit einem Bildinhalt; die 12 Bilder auf Seite 1 wurden nach Scrollen im Browser geladen. Diese Bilddateien sind weiterhin nur lokal sichtbar; keine Bild- oder Textrechte wurden damit freigegeben. Sensorik und Empfehlungen der Vorschau beruhen auf ungeprüften Quellenangaben und sind nicht der öffentliche Supabase-Katalog.
- Mobile Browser-Smokes bei 390 px und 320 px: HTTP 200, kein horizontaler Überlauf, keine Browserfehler. `/entdecken` und `/p/ardbeg-ten` wurden auch bei 1440 px geprüft. Screenshots dieser lokalen Vorschau liegen außerhalb des Repositories in `/tmp` und werden nicht mit den Produktbildern verteilt.
- Importadapter/Dry-Run: 14 Zeilen konvertiert; 9 vollständig, 5 unvollständig; 0 ungültig, Duplikate oder Konflikte. Alle 14 Textquellen lösen den separaten Rechtehinweis aus. Es erfolgte keine Registrierung, Staging, Upsert oder Veröffentlichung.
- Live Development-Supabase, anonyme Zählung: `products=0`, `product_images=0`, `tasting_notes=0` (je HTTP 200). `npm run test:integration:supabase` besteht die öffentlichen API-/Ablehnungstests, bleibt insgesamt `partial`, weil die getrennten Auth-Tokens nicht mehr gültig sind; Authentifizierung und positive Admin-Rollen sind live nicht nachgewiesen.
- `npm run lint` — 50 Dateien, bestanden; `npm run typecheck` — bestanden; `npm test` — 8 Dateien / 59 Tests bestanden.
- GitHub-Audit: privates Repo `tylerneuhaus2000-tech/arometra`, Branch `main`; GitHub Pages ist nicht eingerichtet und es gibt 0 Deployments. `github.dev` ist laut GitHub-Dokumentation der Browser-Editor, kein Website-Hosting. Eine statische GitHub-Pages-Auslieferung passt nicht ohne Umbau zur dynamischen Next.js-Laufzeit. Kein Hosting wurde angelegt und kein Push ausgeführt.
- Secret-Scan: `.env.local` wird von Git ignoriert; 101 versionierte/nicht ignorierte Textdateien mit gezielten Secret-Mustern geprüft, 0 Treffer. `gitleaks` und `trufflehog` sind nicht installiert. Der lokale Next-Buildordner ist in `.git/info/exclude` ausgeschlossen.
- Das authentifizierte GitHub-Konto hat den Free-Plan. GitHub-Dokumentation nennt für private Repositories 2.000 Actions-Minuten/Monat im Free-Plan; Mehrverbrauch kann kostenpflichtig sein. Der aktuelle Verbrauch war über die verfügbare API nicht abrufbar. Daher wurde kein neuer Workflow-Lauf durch Push ausgelöst. Quellen: [GitHub Pages-Verfügbarkeit](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll), [Actions-Billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [github.dev-Editor](https://docs.github.com/en/codespaces/the-githubdev-web-based-editor).

## 2026-10-10 — Aufgeräumte Produktseite und Kategorie-Skalen

- Produktkopf gekürzt: Kategorie, Produkttyp, Name und vorhandene Beschreibung; doppelte Links/Angaben und leere Hintergrund-, Review- und Expertenabschnitte entfernt. Quellen, Geschmacksangaben, Verkostungsnotizen und Bildnachweise bleiben gespeichert; sichtbare Nachweise sind standardmäßig eingeklappt.
- Lokale Vorschau erhält unbewertete Skalenmerkmale aus derselben Kategorie-Taxonomie wie `20261010130400_category_sensory_profiles.sql`. Es werden keine Intensitäten oder Produktaromen ergänzt. Verifizierte Werte werden weiterhin als Messbalken dargestellt; unbekannte Werte bleiben leer und mit „Unbewertet“ markiert.
- Browserprüfung der lokalen Teacher's-Seite: 8 Whisky-Dimensionen, 8 leere Skalen; Quellenbereich anfangs geschlossen und per Klick aufklappbar; 1440/390/320 px ohne Überlauf; keine Browserfehler. Axe WCAG 2.2 AA: 0 Verstöße bei 1440 und 390 px. Screenshots liegen außerhalb des Repositories unter `/tmp/arometra-product-clean-final-1440.png`, `/tmp/arometra-product-clean-final-390.png` und `/tmp/arometra-product-clean-final-320.png`.
- `npm run lint` — 52 Dateien, bestanden; `npm run typecheck` — bestanden; `npm test` — 9 Dateien/61 Tests, bestanden; fokussierter Playwright-E2E-Test — 1/1 bestanden (Trace-Aufzeichnung wegen knappem Speicherplatz deaktiviert); `git diff --check` — bestanden.
- Production-Build nicht erneut ausgeführt: Zum Prüfzeitpunkt meldete das Arbeitsvolume nur 626 MiB frei und 100 % Belegung. E2E- und Browserprüfungen liefen erfolgreich.

## 2026-10-10 — Live-Supabase-Katalog und lokaler Production-Run

- Der Editor gab belegte Produktfakten und Aroma-Tags frei. Nur diese Daten wurden importiert. 14 echte Produktdatensätze sind in `arometra-dev` veröffentlicht; dazu 63 freigegebene Kategorie-Aroma-Tags. 1 nicht zulässiges Whisky-Tag wurde aus dem Profil gefiltert und im privaten Importbericht vermerkt. Bilder, Hersteller-Verkostungstexte, Rezensionen, Bewertungen und numerische Skalen bleiben bei 0. Einzelheiten und Quellen: `docs/REAL_DATABASE_RELEASE.md`.
- Supabase-Migrationen `20261010130700` bis `20261010130900` wurden nach jeweiligem Dry-Run ausschließlich auf dem bestätigten Entwicklungsprojekt angewandt. `.env.local` ist weiterhin ignoriert.
- Live-Supabase-Integration: bestanden. Anonyme Suche, Teacher-Produktdetail, Kategorien und fünf Teacher-Aroma-Tags erfolgreich; Auth, nicht-Admin, Editor, private Tabellen und Review-RPCs mit getrennten Rollen geprüft. Admin-/Rohdatenzugriffe blieben abgewiesen.
- Produktionbuild: bestanden. Echte Browserprüfung auf lokalem Next.js-Produktivserver: 12 + 2 Produktkarten über zwei Seiten, Teacher-Suche und Produktsteckbrief erfolgreich, zwei tagbasierte Empfehlungen, keine sichtbaren Quellenblöcke oder rechtlichen Hinweisbanner, 390 px ohne Überlauf, keine Browserfehler. Screenshots: `/tmp/arometra-live-product-1440.png`, `/tmp/arometra-live-product-390.png`.
- `npm run lint`, `npm run typecheck`, `npm test` (9 Dateien / 61 Tests), `npm run test:e2e` (6/6 synthetische Isolationsprüfungen), `npm run test:integration:supabase`, `npm run build` und `npm audit --audit-level=high` (0 Schwachstellen) bestanden.
- Externe Bereitstellung bleibt offen: privates GitHub-Repo, Pages nicht eingerichtet, null Deployments und keine Next.js-Hosting-Zugangsdaten. Die dynamische Next.js-App ist kein GitHub-Pages-Static-Site-Build. Wegen fehlender Host-Autorisierung und offener Actions-Kostenfreigabe wurden kein Push und kein Workflow-Lauf ausgelöst. Der lokale Production-Server läuft unter `http://127.0.0.1:3118/entdecken`.
