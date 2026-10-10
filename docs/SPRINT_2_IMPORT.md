# Sprint 2 — Importformat und Rechte-Gates

## Status

Die Pipeline nimmt CSV, JSON-Array, JSON-Objekt mit `records`-Array sowie JSONL/NDJSON an. Der Standardbefehl ist ein Dry-Run. Ein Importdatensatz bezeichnet genau eine Quellseite; Werte aus unterschiedlichen Seiten werden als getrennte Staging-Kandidaten eingelesen und später manuell zusammengeführt. Damit erbt kein Feld stillschweigend die Quelle eines anderen Datensatzes.

Der Stage-Schritt schreibt ausschließlich in nicht exponierte Tabellen unter `private`. Er upsertet den aktuellen Kandidatenkopf anhand `(source_id, record_key)` und hängt pro Importlauf eine unveränderliche Importrevision an.

## Formate

JSON-Beispiel mit Schema-Platzhaltern, keine Produktdaten:

```json
{
  "sourceRecordId": "<provider-id-or-null>",
  "source": {
    "name": "<publisher>",
    "type": "official_manufacturer",
    "url": "https://<source-page>",
    "termsUrl": "https://<reuse-terms>",
    "licenseId": "<license-or-permission-reference>",
    "attribution": "<required-attribution-or-null>"
  },
  "retrievedAt": "<ISO-8601 timestamp with timezone>",
  "brand": { "name": "<brand>", "countryCode": null },
  "product": {
    "name": "<bottling>", "categorySlug": "<seeded-category>",
    "family": null, "originCountryCode": null, "originRegion": null,
    "ageYears": null, "abvPercent": null
  },
  "variant": {
    "gtin": null, "volumeMl": null, "marketCountryCode": null,
    "abvPercentOverride": null, "editionLabel": null, "variantCode": null
  },
  "flavors": []
}
```

CSV uses snake_case versions of these fields: `source_record_id`, `source_name`, `source_type`, `source_url`, `source_terms_url`, `source_license_id`, `source_attribution`, `retrieved_at`, `brand_name`, `brand_country_code`, `product_name`, `category_slug`, `product_family`, `origin_country_code`, `origin_region`, `age_years`, `abv_percent`, `variant_gtin`, `variant_volume_ml`, `variant_market_country_code`, `variant_abv_percent_override`, `variant_edition_label`, `variant_code`, `flavors_json`, `tasting_author_type`, `tasting_author_label`, `tasting_nose`, `tasting_palate`, `tasting_finish`, `tasting_overall`, `tasting_language`, `tasting_date`. Required columns are source name/type/URL, retrieval timestamp, brand name, product name, category slug. Quoted CSV cells support commas, doubled quotes, and CRLF.

Limits: 10 MiB per file, 5,000 input rows for validation, 500 rows per database RPC. JSON keys are strict; unknown keys, invalid dates, unsafe/non-HTTPS source links, malformed GTINs, invalid country-code format, out-of-range ABV/volume/age, invalid sensory method and malformed CSV are reported. CSV separators for decimals may be either dot or comma; ambiguous thousands grouping is not accepted.

## Identity and status

- Brand, product and variant remain distinct. A product name does not imply a volume, market SKU or barcode.
- A valid GTIN is normalized by removing spaces/hyphens and checking GTIN-8/12/13/14 checksum. Missing GTIN is `null`.
- Exact source IDs have priority for stable source identity. Otherwise the idempotency key is a SHA-256 hash of canonical source URL, normalized brand/product/edition and variant identity (GTIN, volume, market, ABV override and variant code).
- Exact repeated records in a batch are reported as duplicates. Conflicting values for one source ID or a GTIN reused across different identities are blocked for review. Different volumes remain different variants.
- Missing evidence is not filled in. Missing core identity is invalid; missing origin, ABV, volume or sensory inputs marks a valid row `incomplete`.
- External data never sets `verification_status=approved`. Staging candidates remain in the non-exposed `private` schema. An explicit upsert may create public-schema draft rows, but RLS hides them and all imported provenance remains pending until a separate future field-review/publish workflow.
- Numeric flavor dimensions require a documented source and method. Community aggregates are rejected by this pipeline until consent and moderation are implemented.
- Nose, palate, finish and overall tasting text are stored separately in staging. Database staging requires source `text_rights_status=approved`; data rights approval alone is insufficient.

## Commands

```sh
npm run import:dry-run -- --file <path.csv|path.json|path.jsonl>
npm run import:register-sources -- --file <path>
npm run import:review-rights -- --source-id <uuid> --data approved --license-id <reference> --terms-url <https-url> --terms-checked-at <iso-timestamp>
npm run import:stage -- --file <path>
npm run import:upsert -- --job-id <uuid> [--limit 1..5000]
```

The dry-run is local and read-only. It emits only counts, row numbers, issue codes and explanations; it does not emit raw source text or authentication values. Source registration stores only source metadata and starts with all rights unreviewed. Rights review is a separate authenticated `owner`/`reviewer` RPC. Staging is an authenticated `owner`/`editor` RPC and checks the reviewed data rights again in PostgreSQL. The user token must be a short-lived Supabase Auth JWT; the app's publishable key is used as the API key. The importer never accepts a secret/service-role key.

Staging requires an explicitly allowlisted target. `development` requires HTTPS and the configured Supabase URL host exactly matching `AROMETRA_DEVELOPMENT_PROJECT_REF.supabase.co`; `local` requires HTTP loopback. The tools accept either `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the previous unprefixed aliases, and reject conflicting values. Production and unknown targets are not supported. The SQL RPC rechecks active administrator membership, source review state, text rights, array/record limits and batch identity. A malformed or partially unauthorized batch is rolled back as one database transaction. Replaying the same digest + normalizer version returns the existing job; later changes append a new import revision and move the private head pointer.

The separate draft-upsert RPC consumes only staged row ids from one import job. It rechecks current source-data rights and, when notes are present, text rights. It upserts brands by normalized identity, products by brand and normalized product name, and variants by product/GTIN/packaging identity. It fills empty product fields but does not replace conflicting non-empty facts. Conflicts are returned as field paths. New fact, GTIN, and flavor provenance remains pending; imported tasting notes remain text-rights-approved but review-pending. All created catalog entities remain drafts with no editorial publication timestamp. Replaying a job is idempotent.

`review_import_source_rights` writes an append-only review event and requires license/permission reference, HTTPS terms URL and a non-future terms-check time before any right becomes approved. The RPC records the authenticated reviewer. Initial owner membership must be provisioned through a separately trusted bootstrap action; self-registration cannot grant admin roles.

## Boundaries not yet implemented

- Admin screens, field-level review/merge, publishing, cache invalidation, and manual review UX remain follow-up work.
- Product facts with differing source pages are not auto-merged; each remains independently attributable in private staging.
- No images, prices, offers, ratings, review counts, community tasting data or sales fields are imported.
- No live Supabase/PostgREST integration result is claimed until a dedicated development project and short-lived test/admin JWT are configured.
