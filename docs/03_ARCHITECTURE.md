# 03 — Architektur und Integrationsverträge

## Entscheidung (initial)
Next.js App Router + React + TypeScript (strict) + Tailwind CSS; Supabase PostgreSQL, Auth und Storage; serverseitige Katalogservices, migrationsbasiert. Kein zusätzlicher Express-Server und keine vorzeitige Microservice-Trennung.

## Grobe Laufzeitarchitektur
```
Public Browser/PWA
   ├── Server-rendered Next.js routes: /, /entdecken, /p/[slug], /q/[code]
   ├── Client-Filter, Suche, Vergleichsinteraktion
   └── Consent-aware, rate-limited event endpoint (optional)
                 │
             Next.js server
   ├── CatalogService       ──> PostgreSQL public published reads
   ├── RecommendationEngine ──> geprüfte Geschmacksmerkmale
   ├── QrResolutionService  ──> qr_links → Produkt / Variante
   ├── AdminService         ──> auth + role check + RLS
   └── ImportService        ──> staging, audit, publisher (server-only)
                 │
           Supabase PostgreSQL
        + Auth + lizensierter Storage
```

## Routen (vorgeschlagener Vertrag)
- `GET /` – Startseite
- `GET /entdecken?q=&category=&brand=&country=&flavor=&sort=&page=` – paginierter Katalog, Filter serverseitig validiert.
- `GET /p/[slug]` – veröffentlichter Produktsteckbrief, Eindeutigkeit via slug + UUID stabiler PK.
- `GET /q/[code]` – Lookup, Redirect zur aktuellen kanonischen Produkt-URL, no-cache falls nötig; 404/410 mit ehrlicher Meldung.
- `GET /beratung` – beratende UI, keine anonyme Profilerstellung.
- `GET /vergleich?ids=...` – 2 ids, geordnet/validiert.
- `GET /admin/...` – Zugriff serverseitig durch Rolle und RLS gesichert.
- API `GET /api/products`, `GET /api/products/[id]/similar` nur falls für Client-Ladevorgänge erforderlich, konsistente JSON-Schemas. Kein sinnloses Duplizieren von Routen und Services.
- Events: `POST /api/events` nur bei zulässigem Tracking, mit Schema-Validierung, Rate-Limit und Consent-Schutz; niemals direkte Schreibberechtigung für `anon` in Analytics-Tabellen.

## vorgeschlagene Modulorganisation
```
src/
  app/
    (public)/
      page.tsx
      entdecken/page.tsx
      p/[slug]/page.tsx
      q/[code]/route.ts
      beratung/page.tsx
      vergleich/page.tsx
    admin/
    api/
  components/
    ui/
    catalog/
    product/
    recommendations/
    layout/
  lib/
    supabase/
    catalog/
    recommendations/
    qr/
    analytics/
    validation/
  styles/
  test/
    fixtures/
    e2e/
    integration/
supabase/
  migrations/
  seed.sql              # ausschließlich klar markierte DEV-Beispiele
scripts/
  imports/
  data-review/
```
Wichtig: Verzeichnisnamen an aktuelle offizielle Next.js-Version anpassen; keine unnötige Abstraktionsflut. Frontend-Komponenten greifen nicht mit Service-Role-Zugang auf DB zu.

## Server-/Client-Verantwortung
- Server Components bevorzugt bei Erstladung und SEO; Client Components nur für interaktives Verhalten.
- Public Lesezugriffe über sichere Queries; Admin-Schreibzugriffe nur serverseitig mit Session-Rollenprüfung plus DB Policy.
- Alle Input-Parameter mit Zod validieren. Server-Actions brauchen Authz, nicht nur UI-Guard.
- Return DTOs mit erlaubten Feldern, keine rohen internen Importdaten im Public-Response.
- Fehler-/Loadinggrenzen sowie Umleitung bei Slugänderung.

## Suche
- MVP: case-insensitive normalisierte Suche auf `name`, `brand`, Alias (später `pg_trgm`/FTS), serverseitige Pagination.
- Indexe auf status, Kategorie, Marke, normalisierte Namen und relevante Filter.
- Kein anfänglicher SaaS-Suchdienst nötig.
- Insbesondere `Teacher's`, `Teachers`, diakritische Namen und verschiedene Whiskey-/Whisky-Schreibweisen testen.

## Bilder
- lizenzierte Assets nur, Quelle/Attribution separat; Next Image/Supabase Storage passend konfigurieren.
- Keine Cloud-Hotlinks ohne Rechte und zuverlässige Verfügbarkeit.
- Fallback für fehlende Bilder ist **neutral**, keine gefälschte Markenflasche.

## Performance und Betrieb
- Mobile First, Core Web Vitals auf tatsächlichen Testgeräten prüfen; p75 LCP Ziel <2,5s, CLS <0,1 als Richtwerte, keine ungemessenen Versprechen.
- Pagination und Indizes statt 500 Produkte ungefiltert in den Browser laden.
- Server-only Cache mit dokumentierter Invalidierung nach Admin-Publish.
- Lokale Entwicklung mit Supabase CLI/Docker oder isolierter Entwicklungsdatenbank; CI darf keine Produktionsdaten sehen.
- Logging minimiert, keine Secrets/PII, eindeutige technische Error-IDs.
- Versionen dokumentieren und lockfile committen; aktuelle offiziellen Docs vor Copy/Paste prüfen.

## Deployment-Gates
- Staging zuerst; Produktion erst nach überprüfter Domain, Betreiberrechtstexten, Bildlizenzen, Jugendschutz- und Tracking-Freigabe, funktionierenden Tests sowie gesicherter Konfiguration.
- Backup-/Restore-Konzept für Datenbank und importierten Katalog; Importrollback getrennt von DB-Reset.
