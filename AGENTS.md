# AGENTS.md — AROMETRA

## Mission
Baue AROMETRA als datengetriebenes, verantwortungsvoll gestaltetes, minimalistisches Premium-Beratungssystem für Spirituosen. Zuerst Website, später PWA. Priorität: demonstrierbarer, echter QR→Produkt→Erfahrung→Empfehlung-Ablauf bis Dezember 2026.

## Pflichtlektüre
- `00_CODEX_MASTER_PROMPT.md`
- `docs/01_PROJECT_BRIEF.md` bis `docs/13_SEED_BRANDS.md`
- `design-reference/last_ui_concept.png` (visuelle Referenz; schriftliche Clean-Vorgaben haben Vorrang)

## Regeln der Wahrheit
1. Keine erfundenen Produkteigenschaften, Ratings, Preise, Bilder, Barcodes, Aromen, Kundenbewertungen oder Kaufabschlüsse.
2. Jede externe Tatsache über ein konkretes Produkt braucht eine nachvollziehbare Quelle; Vorhandensein einer Marke allein beweist nicht die Eigenschaften einer Abfüllung.
3. Synthetische Test-Fixures nur unter `test/fixtures` oder `dev-seed`, sichtbar und technisch von Produktivdaten getrennt.
4. Fehlende Attribute = `null`/unknown; nicht 0, nicht leere 5-Sterne-Wertung.
5. Keine unerlaubte Übernahme von API-/Website-Inhalten, Kundenbewertungen oder Bildern.

## Technische Prioritäten
- V1: Next.js App Router + TypeScript strict + Tailwind + Supabase PostgreSQL, Teststack.
- Migrationen sind versioniert; keine ungeprüften ad-hoc Schemaänderungen.
- Primäre Felder normalisiert; Brand, Product, Variant, Source getrennt.
- Public Reads nur veröffentlichte Datensätze; Public Writes grundsätzlich verboten.
- Server/Authz/RLS durch Tests abgesichert. Kein Service-Role-Key im Frontend.
- Minimaler, verständlicher Code. Keine unnötigen Packages, Agenten-Infrastruktur oder Mock-Welten.
- REST-/Serveraction-Grenzen klar, Validierung serverseitig und clientseitig nur UX.
- Doppelte Datenimporte idempotent, jede Quelle auditierbar.

## Design-Qualität
- Modern Oak – Minimal, editorial, ruhig, reaktionsschnell.
- Navigation einfach; Schwerpunkt Produktwissen und ähnlichen Spirituosen.
- Dekorative Holzoptik selten, keine Effektüberladung, keine Verkaufsdruck-UI.
- Mobile QR-Detailseite ist kritisch, muss ohne Login direkt rendern.
- Respektiere WCAG 2.2 AA möglichst durchgängig.

## Arbeitsweise
- Erst Repo/Tools/Spezifikationen lesen, dann kleine überprüfbare Slices implementieren.
- Wenn möglich bis zu drei Agenten gleichzeitig, niemals dieselben Dateien parallel editieren.
- Beim Sprintende: `lint`, `typecheck`, `unit`, `build`, relevanter E2E-Test. Fehlschläge fixen oder detailliert dokumentieren.
- QA_LOG führt echten Ausführungsnachweis, keine behaupteten Tests.
- Keine Remote-Resets; jeder destruktive DB-Befehl auf Produktion ist untersagt.
- Keine Geheimnisse loggen oder committen.
- Nach jedem Sprint knapper Bericht mit Status, Testbelegen, Risiken, nächstem Schritt.

## Grenzen
- Kein automatischer öffentlich erreichbarer Launch ohne echte Betreiberangaben und Freigabe von Datenschutz/Alkoholwerbung/Inhalten.
- Keine Zahlungsintegration oder echten Alkoholbestellungen in Sprint 1.
- Kein bewusst manipulierendes Design zur Steigerung individuellen Alkoholkonsums; relevante Produktentdeckung und informierte Auswahl stehen im Fokus.
- Kostenpflichtige APIs/Hosting nur nach ausdrücklicher Freigabe.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
