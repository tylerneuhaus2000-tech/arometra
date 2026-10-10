# AROMETRA — Implementierungsplan Sprint 0 und 1

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

## Tatsächlicher Stand am 10.10.2026

- Sprint 0 umgesetzt: installierbare Next.js-Grundlage, TypeScript strict, Biome, Vitest, Playwright, CI-Workflow, Supabase-Konfiguration, Migration, Taxonomie-Seeds und nachvollziehbare QA-Dokumentation.
- Sprint 1 im maximal möglichen lokalen Umfang umgesetzt: Suche/Filter/Pagination, dynamischer Steckbrief, quellengestützte Repository-Abfragen, QR-Redirect mit 404/410, erklärbare Empfehlungen und getrennte synthetische Testprofile.
- Lokale Unit-/PGlite-, Browser-, Accessibility-Smoke-, Produktionssperr-, Build- und Dependency-Audit-Prüfungen sind im QA-Log mit Ergebnissen belegt.
- Supabase-Laufzeit und reale Inhalte sind nicht abgenommen: Docker, Zugangsdaten, konkrete Quellen und Bildrechte fehlen. Der implementierte Supabase-Pfad ist daher bis zu einem echten Supabase-Stack `PARTIAL`, nicht live verifiziert.
