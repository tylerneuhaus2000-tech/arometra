# AROMETRA — Implementierungsplan

Stand: 10.10.2026

## Ausgangslage

Der Projektstamm enthielt zunächst nur das bereitgestellte Startpaket in einer Untermappe. Es gab keine Anwendung, kein Git-Repository, keine Migration und keine Paketdatei. Node.js 26.4.0, npm 11.17.0 und Git sind verfügbar. Supabase-Zugangsdaten, Supabase CLI, Docker und PostgreSQL fehlen. Es gibt keine nachweislich lizenzierten Spirituosen- oder Bilddaten.

Die Produktliste in docs/13_SEED_BRANDS.md ist eine Recherchewarteschlange und keine Importquelle. Die UI-Referenz dient ausschließlich als Form- und Farbrichtung.

## Sprint 0 — technische Foundation

1. Startpaketdateien in den Projektstamm verschieben und lokales Git-Repository ohne Remote anlegen.
2. Next.js App Router, React, TypeScript strict, Tailwind, Zod sowie getrennte Lint-, Typecheck-, Unit-, E2E- und Build-Skripte einrichten.
3. Modern-Oak-Tokens, zugängliche Grundnavigation und Seitenrahmen vorbereiten; keine Produktdaten in die Oberfläche übernehmen.
4. Supabase-Konfiguration und versionierte PostgreSQL-Migration mit Rollenrechten, RLS, Provenienz, Quellen, Publikationsprüfung und QR-Links anlegen. Keine Remote-DB verbinden oder zurücksetzen.
5. Fixture- und Supabase-Datenpfade explizit trennen. Fixture-Modus darf nur lokal/testweise laufen und muss jede Seite sichtbar als synthetisch kennzeichnen.
6. CI und QA-Protokoll einrichten. Phase 0 wird mit Lint, Typecheck, Unit-Tests, Build sowie einem Security-Review der Konfiguration abgenommen.

Abnahmekriterien:
- Dokumentierter, reproduzierbarer npm-Install- und Startpfad.
- Keine Secrets im Repository; Supabase-Zugriff nur über Publishable Key mit RLS.
- Migration verhindert öffentliche Schreibrechte und verweigert Veröffentlichung ohne geprüfte Feldquellen.
- Keine erfundenen Produkte oder Quellen in SQL-Seeds.

## Sprint 1 — vertikaler Funktionsnachweis

1. Such- und Kategorieseite mit URL-Zustand, Pagination und ehrlichen Leer-/Fehlerzuständen.
2. Dynamischer Produktsteckbrief mit belegten Feldern, Quellenhinweisen, Verkostungsdaten nur bei Freigabe und ohne Fake-Sterne.
3. QR-Auflösung aus aktivem Datenbanklink zum aktuellen Produkt-Slug; unbekannte Codes liefern 404, deaktivierte 410.
4. Deterministische Empfehlungen nur bei mindestens drei gemeinsamen, geprüften sensorischen Dimensionen. Ohne Daten erscheint der definierte Leerzustand.
5. Lokale synthetische Prüfprofile ausschließlich unter test/fixtures, ausdrücklich eingeschaltet, auf allen betroffenen Seiten sichtbar gekennzeichnet und in Produktion blockiert. Sie enthalten keine realen Markennamen, Barcodes, Preise oder Bewertungen.
6. Playwright-Flows für Suche, Steckbrief, Empfehlung, QR-Redirect, unbekannten QR-Code und Mobilansicht; Screenshots und Security-/A11y-Befunde protokollieren.

Abnahmekriterien:
- /entdecken → /p/[slug] und /q/[code] sind lokal im Fixture-Modus nachweisbar.
- Supabase-Modus führt ausschließlich veröffentlichte, durch Quellenrechte und Feldprovenienz freigegebene Reads aus; fehlende Konfiguration aktiviert niemals stillschweigend Fixtures.
- Lint, Typecheck, Unit, E2E, Accessibility-Smoke und Build sind erfolgreich oder der Blocker ist konkret belegt.

## Bewusste Grenzen

- Keine echte Produkt- oder Verkaufsdatenabdeckung, solange Ben keine konkreten Flaschen, Quellen und Rechtefreigaben liefert.
- Keine Live-Supabase-RLS-Abnahme, solange keine isolierte lokale oder bereitgestellte Entwicklungsdatenbank existiert.
- Kein öffentlicher Launch, Auth/Admin, Analytics, Preisfeed, Review-System oder Bildimport in Sprint 1.
- GitHub-Remote, Supabase-Projekt und Hosting bleiben unberührt; vorhandene Anmeldung ist keine Erlaubnis, externe Ressourcen anzulegen.

## Sprint 2 — Datenbank- und Kataloggrundlage

### Lokal umgesetzt

1. Additive Migrationen für Quellenrechte und unveränderliche Rechteprüfungen, private Importjobs/-revisionen, pro Importzeile gespeicherte Abrufzeit, Community-Reviews mit Einwilligungs-/Moderationsstatus sowie kontrollierte Draft-Upserts ergänzt.
2. CSV-, JSON-Array-, JSON-Envelope- und JSONL/NDJSON-Dry-Runs mit Größen-/Zeilenlimits, Schema- und Zahlenvalidierung, NFKC-/Identitätsnormalisierung, GTIN-Prüfziffernprüfung, Variantenidentität, Duplikat-/Konfliktbericht und SHA-256-Idempotenz implementiert.
3. Rechteprozess getrennt: Owner/Reviewer registrieren bzw. prüfen Daten-, Text- und Bildrechte; Owner/Editor können nur bei aktueller Datenfreigabe privat stagen und explizit als unveröffentlichte Entwürfe upserten. Quellen-, Feld-, Varianten- und Sensorikprovenienz bleibt ungeprüft/pending, Abweichungen überschreiben keine nichtleeren Werte.
4. Anonyme und nicht administrative Zugriffe auf Import-RPCs, private Stagingtabellen und Community-Schreibzugriffe verweigert. Öffentliche Community-Lesezugriffe erfordern Einwilligung, Moderation und ein weiterhin belegtes Produkt.
5. Direkte Such-RPC-Aufrufe begrenzt, Wildcards escaped, inaktive Kategorien für Suche/QR gesperrt; der Empfehlungskandidatensatz deckt die geplante Kataloggröße bis 500 Produkte ab.
6. GitHub-Actions-Workflow um Dry-Run-Prüfung und parallelen Laufabbruch ergänzt. Playwright nutzt einen eigenen Next-Ausgabeordner und startet keinen fremden, bereits laufenden Dev-Server.

### Nicht freigegeben oder nicht erreichbar

- Es gibt **0 echte, im AROMETRA-Katalog verifizierte Produktdatensätze** und **0 für AROMETRA freigegebene Datenquellen**. Die 300–500 Produkte sind weiterhin Zielbestand, kein erreichter Umfang.
- Import-Staging, Draft-Upserts und Policy-Änderungen liefen nur in einer wegwerfbaren PGlite-Testdatenbank. Ein gehostetes Supabase-Projekt, URL/Publishable-Key sowie getrennte kurzlebige Auth-JWTs für Nicht-Admin, Owner/Editor und Import-/Review-Zugänge fehlen. Gegen kein Remote wurde eine Migration ausgeführt.
- Ein Quellenaudit findet offizielle Herstellerseiten, aber noch keine Datennutzungsfreigabe. Open Food Facts wurde nicht abgerufen oder importiert; ODbL-/Datenlizenz-/Attributions- und Share-Alike-Folgen benötigen eine Entscheidung.
- Der CI-Workflow ist lokal konfiguriert, aber mangels bestätigtem Remote nicht auf GitHub gelaufen. `gh` kennt das Repository `arometra` nicht unter dem aktiven Konto. Es wurde kein Remote, Repository oder Push erstellt.

Die Prüfergebnisse zu Tests, Datenquellen, Konfiguration und Blockern stehen in `docs/QA_LOG.md` und `docs/SPRINT_2_SOURCE_AUDIT.md`.

## Sprint 2.5 — Real Data Integration & Infrastructure

### Lokal umgesetzt

1. Die Taxonomie um 33 hierarchische Unterkategorien ergänzt. Kategoriesuche unter einer Wurzel umfasst nun direkte, aktive Unterkategorien; das Seed bleibt frei von Produkten.
2. Eine Modern-Oak-Seitenstruktur mit linker Navigationsleiste, nativen Auf-/Zuklappkontrollen, globaler Suche und drei Desktop-Spalten umgesetzt. Such- und Kategorien-URL-Zustände bleiben beim Navigieren erhalten.
3. Produktdetailabfragen um Provenienz- und Prüfzeit, Herstellung/Reifung, öffentlich freigegebene Varianten/GTINs, Herkunfts- und Sensorikquellen sowie Verkostungsdatum ergänzt. Das Schema liefert Varianten und Aromen weiterhin ausschließlich nach den vorhandenen Public-RLS-/Provenienzregeln.
4. Eine additive Migration erweitert die öffentliche Quellenansicht um das geprüfte Zeitfeld. PGlite führt sämtliche Migrationen aus; echter Supabase-Auth-/PostgREST-Betrieb wurde nicht simuliert.
5. Zehn Produktkandidaten anhand offizieller Herstellerquellen recherchiert und Markt-/Rechteunsicherheiten in `docs/SPRINT_2_5_PRODUCT_RESEARCH.md` festgehalten. Kein Kandidat wurde ohne Rechtefreigabe importiert.
6. Browser-Screenshots für Test- und unkonfigurierte Produktionsmodi erzeugt und visuell geprüft.

### Nicht erreichbar oder nicht freigegeben

- Es gibt **0 echte, im AROMETRA-Katalog verifizierte Produktdatensätze**, **0 freigegebene Datenquellen** und **0 lizenzierte Produktbilder**. Tatsächlicher Produktbestand eines Liveprojekts ist mangels Verbindung unbekannt.
- Supabase-URL, Publishable Key, Entwicklungs-Projekt-Ref und getrennte kurzlebige Auth-JWTs für Nicht-Admin und Owner/Editor fehlen. Deshalb sind Remote-Migrationen und Live-RLS-/Auth-/PostgREST-Integrationstests nicht ausgeführt.
- Open Food Facts wurde nicht abgefragt/importiert; Entscheidung zu ODbL, Attribution, Share-Alike und Bildlizenzen offen. Herstellerseiten erteilen in der Recherche keine AROMETRA-Nutzungsrechte.
- Das private Repository `tylerneuhaus2000-tech/arometra` wurde unter dem im Masterprompt vorgesehenen, aktiv authentifizierten Konto angelegt; `origin` ist gesetzt. Der Branch ist noch nicht gepusht, GitHub Actions daher noch nicht gelaufen. GitHub berechnet private Actions-Nutzung oberhalb des Kontingents; das aktuelle Kontingent/Ausgabenlimit wurde nicht geprüft. Ein CI-auslösender Push wartet auf Klärung dieser Abrechnungsfreigabe.
- CI/Sicherheitsprüfungen und die genaue Evidenz stehen in `docs/QA_LOG.md`.

## Tatsächlicher Stand am 10.10.2026

- Sprint 0 umgesetzt: installierbare Next.js-Grundlage, TypeScript strict, Biome, Vitest, Playwright, CI-Workflow, Supabase-Konfiguration, Migration, Taxonomie-Seeds und nachvollziehbare QA-Dokumentation.
- Sprint 1 im maximal möglichen lokalen Umfang umgesetzt: Suche/Filter/Pagination, dynamischer Steckbrief, quellengestützte Repository-Abfragen, QR-Redirect mit 404/410, erklärbare Empfehlungen und getrennte synthetische Testprofile.
- Lokale Unit-/PGlite-, Browser-, Accessibility-Smoke-, Produktionssperr-, Build- und Dependency-Audit-Prüfungen sind im QA-Log mit Ergebnissen belegt.
- Supabase-Laufzeit und reale Inhalte sind nicht abgenommen: Docker, Zugangsdaten, konkrete Quellen und Bildrechte fehlen. Der implementierte Supabase-Pfad ist daher bis zu einem echten Supabase-Stack `PARTIAL`, nicht live verifiziert.
- Sprint 2.5 liefert Datenbankabfrage- und UI-Vorbereitung, Unterkategorien und Quellenprüfzeit. Live-Datenbank, Produktimport, lizenzierte Bilder und reale sensorische Empfehlungen bleiben bis zu Zugang und Rechtefreigabe offen.
