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
