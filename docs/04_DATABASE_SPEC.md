# 04 — PostgreSQL-Datenbankspezifikation

## Grundsätze
Relational, gut indexiert, auditierbar. Schlüsselfelder mit UUID, `created_at timestamptz`, `updated_at timestamptz`, `status`, Constraints. Versionierte SQL-Migrationen via Supabase CLI. **Nicht** jede optionale Tabelle sofort bauen, aber schon jetzt Modell-Entscheidungen dokumentieren. Kein Remote-Reset.

## Kernobjekte

### `categories`
`id uuid PK`, `parent_id uuid FK nullable`, `slug text unique`, `name_de text`, `name_en text nullable`, `description_de text nullable`, `sort_order int`, `active bool`. Hierarchie: Whisky > Scotch Whisky > Single Malt etc.; Zyklen vermeiden. Fachlich geeignete Mehrfachklassifikation über Verknüpfungstabelle.

### `brands`
`id uuid PK`, `slug unique`, `name`, `normalized_name`, `country_code nullable`, `description nullable`, `verified_at nullable`, `status`, `created_at/updated_at`. Eine Marke ist kein einzelnes Produkt. Namens-/Eigennamen-Aliasse über `brand_aliases` optional.

### `products`
`id uuid PK`, `brand_id FK brands`, `primary_category_id FK categories`, `slug unique`, `name`, `normalized_name`, `kind`/`product_family`, `origin_country_code nullable`, `origin_region nullable`, `age_years numeric nullable`, `distillation_details text nullable`, `maturation_details text nullable`, `description text nullable`, `abv_percent numeric(5,2) nullable`, `product_status enum (draft, review, published, archived)`, `editorial_reviewed_at nullable`, timestamps. Checks `0 <= abv_percent <= 100`, age >=0, bounded string lengths. Herkunft, Alter und ABV nur wenn belegt. `products` beschreibt eine konkrete erkennbare Spirituose/Edition, keine fiktive Variante.

### `product_variants`
`id uuid PK`, `product_id FK`, `gtin text nullable`, `volume_ml int nullable`, `market_country_code nullable`, `abv_percent_override numeric nullable`, `edition_label nullable`, `variant_code text unique`, `status`, timestamps. GTIN normalized, length/check digit validated if provided; unique partial index auf `gtin where gtin is not null` **nur wenn fachlich plausibel** (manche Mehrfachzuordnungen/Datensatzqualität prüfen). Volume >0. Gilt nur für belegte Flaschengrößen, keine erfundenen 700ml/1000ml-Ausgaben.

### `product_categories`
`product_id FK`, `category_id FK`, composite PK. Kann neben primärer Kategorie zusätzliche fachlich valide Unterkategorien abbilden.

### `flavor_dimensions`
`id PK`, `code unique`, `label_de`, `scale_min=0`, `scale_max=10`, `description`. Vorgeschlagene Codes: `smoky`, `peaty`, `sweet`, `fruity`, `spicy`, `woody`, optional `floral`, `herbal`, `maritime`, `dry` nach fachlicher Review. Skalen sind subjektiv und mit Erhebungsmethode zu kennzeichnen.

### `product_flavor_values`
`product_id FK`, `dimension_id FK`, `value numeric nullable check 0..10`, `source_id FK sources`, `method enum (expert, editorial, manufacturer, community_aggregated)`, `confidence nullable`, `verified_at`, `review_status`, `sample_size nullable`; PK z. B. `(product_id, dimension_id, source_id, method)` plus abgeleitete publizierte Aggregate separat. **NULL = unbekannt, 0 = geprüfte Abwesenheit.** Werte nicht ohne Grundlage von frei formulierten Beschreibungen raten.

### `tasting_notes`
`id uuid PK`, `product_id FK`, `author_label`, `author_type enum(manufacturer, expert, editorial, consumer)`, `nose_text`, `palate_text`, `finish_text`, `overall_text`, `source_id FK`, `license_status`, `review_status enum(draft, pending, approved, rejected)`, `tasted_at nullable`, `language`, timestamps. Kundenbewertungen brauchen Authentizität, Einwilligung, Anti-Missbrauch und Moderation; **nicht in MVP öffentlich freischalten**, wenn diese Grundlagen fehlen.

### `sources`
`id uuid PK`, `source_name`, `source_type enum(official_manufacturer, licensed_database, open_dataset, editorial, authorized_review, operator_entry)`, `canonical_url nullable`, `license_id nullable`, `terms_checked_at nullable`, `rights_review_status enum(unreviewed, approved, blocked)`, `attribution_text`, `retrieved_at`, `content_hash nullable`, `notes`, timestamps. Gleiche Quelle kann mehrere Produkte/Felder stützen. Nicht nur nackten URL-Link speichern: genaue Herkunft und Lizenzregeln dokumentieren.

### `field_provenance`
`id uuid PK`, `entity_type`, `entity_id`, `field_path`, `source_id FK`, `raw_value_hash nullable`, `retrieved_at`, `verified_by nullable`, `verification_status`, `verification_note`. Technisch verhindern, dass Public-API ungeprüfte Felder publiziert. Alternative schema-nähere Verknüpfung ist erlaubt, falls sauberer.

### `product_images`
`id uuid PK`, `product_id FK`, `storage_path nullable`, `source_url nullable`, `source_id FK`, `alt_text`, `license_status`, `license_code`, `attribution`, `photographer nullable`, `review_status`, `sort_order`, timestamps. Nur Bilder mit gesicherten Rechten public ausliefern; wenn Rechte ungeklärt: neutraler Placeholder.

### `qr_links`
`id uuid PK`, `public_code unique`, `product_id FK`, `variant_id FK nullable`, `placement_id nullable`, `status (active, disabled)`, `created_at`, `expires_at nullable`, `label`. Eine URL bleibt stabil, auch wenn Slug/Name geändert wird. `placement_id` für späteren Händler-/Regalvergleich optional und anonymisiert.

### `admin_members`
`user_id uuid PK FK auth.users`, `role enum(owner, editor, reviewer, analyst)`, `is_active`, timestamps. Rolle ausschließlich von privilegierten vertrauenswürdigen Wegen veränderbar; Signup führt nie zu admin. DB-RLS und serverseitige Role-Gates.

## Spätere Tabellen
- `import_jobs`: job id, source, started/completed, item counts, status, audit context.
- `import_records`: raw normalized/staged JSONB with source, hash, match decision, error codes, quality score, reviewer; private schema.
- `recommendation_explanations`: cached reasons + algorithm version/feature provenance, optional.
- `analytics_events`: möglichst aggregiertes/privates Event-Schema mit Consent-Metadaten; kein direkter Public Write.
- `retailer_offers`: realer Preis, Währung, Händler, Filiale, Lagerstand optional, `observed_at`, Offer-Sources. Nicht vor echter Datenpartnerschaft.
- `product_aliases`, `brand_aliases`, `editorial_revisions`, `experiment_assignments` nach Bedarf.

## Zugriffsmodell
- Public `SELECT` nur auf `published` und rights-approved Inhalte; Datenbankviews nur mit `security_invoker = true` oder sichere serverseitige DTOs.
- `anon` / `authenticated` erhalten keinerlei direkte `INSERT/UPDATE/DELETE`-Rechte auf Produkt-/Admin-/Import-/Analytics-Rohdaten.
- `admin_members` darf nicht durch selbst registrierte Accounts oder über eine normale Public-Route modifiziert werden.
- Admin-CRUD nur serverseitig mit Benutzerrolle und RLS nach least privilege.
- Secret/service-role Keys nie im Client, nie in `NEXT_PUBLIC_` Variablen.
- Jede exponierte Tabelle RLS + explizite `GRANT`-Prüfung. Auch Storage Policies testen.

## Datenqualität / Identität
- `name`/`normalized_name` nicht allein als Unique-Key: verschiedene Marken können gleiche Produktnamen, Editionen unterschiedliche Namen haben.
- `product_id`/`variant_id` bleiben stabil, Slugs können sich ändern.
- Soft archival statt ungeprüftem Delete.
- Bei Import weder eine neue Variante mit bestehender Abfüllung noch Editionen mit Standardprodukt verwechseln.
- `Teacher's Highland Cream` ist ein Recherchekandidat; vor Insert korrekten Produktnamen, ABV, Varianten, Herkunft, Geschmacksdetails belegen.

## Performance und Index-Beispiele
- Indexe auf `(product_status, primary_category_id)`, `brand_id`, `slug`, `normalized_name` und ggf. `(product_id, dimension_id)`.
- Bei passender Extension `pg_trgm` für fuzzy names; Ergebnisse paginieren, Filter serverseitig.
- QR `public_code` unique indexed, zufällige Codes mit genügend Entropie gegen Masse-Enumerationen.

## Migration-/Testdisziplin
- Migrationen in `supabase/migrations/`, lokale Seeds in `supabase/seed.sql` oder klar getrennten Fixtures.
- `supabase db reset` **nur lokal** testen; `--linked`/`--db-url` mit unbekannten/produktiven Daten streng untersagt.
- Nach Schemaänderung TypeScript DB-Typen regenerieren und prüfen.
- DB-Tests müssen negative Berechtigungsfälle sowie Integritätsconstraints abdecken.
