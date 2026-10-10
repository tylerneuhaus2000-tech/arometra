# Supabase Integration Status

Audit date: 2026-10-10

No credential values are recorded in this document.

## Latest live integration update — 2026-10-10

- The local `.env.local` now has the supplied project URL, publishable key, explicit development target, matching project reference, and `AROMETRA_DATA_MODE=supabase`. It remains ignored by Git; no credential values are recorded here.
- The Supabase CLI is authenticated and linked to the confirmed development project. Read-only inspection found no existing base tables, views, materialized views, sequences, or foreign tables in `public`/`private` before migration.
- `supabase migration list --linked` showed all four local migrations as pending. `supabase db push --dry-run` listed exactly those four migrations and no seeds. After review, `supabase db push` applied them successfully. A subsequent migration list confirmed all four versions remotely.
- The migrations create schema and security objects; no `DROP TABLE`, `DROP SCHEMA`, `TRUNCATE`, or direct data-deletion statements were found. One constraint is replaced on a table created by the immediately preceding migration. No seed or product import was run.
- Remote read-only count query returned `0` categories and `0` products. The database is connected but has no catalog records yet.
- Live PostgREST reads returned HTTP 200 for categories, products, brands, variants, flavor values, tasting notes, and community reviews. Auth health/settings returned HTTP 200. Anonymous `admin_members` read returned HTTP 401; the `private` import schema returned HTTP 406.
- A direct catalog query initially selected a nonexistent `id` field from `product_flavor_values`; the table uses a composite key. The live check now selects `product_id`, and the anonymous read returns HTTP 200. `scripts/test-supabase-integration.ts` was corrected to use valid per-table columns.
- A read-only catalog smoke check against the Next.js dev server in Supabase mode returned HTTP 200 for `/` and `/entdecken`, with no synthetic-preview labels. No actual product exists for a complete product/QR journey.
- Catalog table RLS is enabled on all 22 public/private base tables. HTTP checks verified anonymous public reads, denial of anonymous `admin_members`, and non-exposure of the private import schema. Authenticated role checks remain blocked until two short-lived test-user JWTs are configured; no authenticated RLS result is claimed.
- Read-only count query returned `0` rows in `admin_members` and `community_reviews`; no owner/editor test membership or community review exists. A trusted initial test-admin membership must be established before the positive admin-RPC permission probe can pass.
- `npm run lint`, `npm run typecheck`, and `npm test` passed after the integration-check correction (42 files linted; 41 unit tests). `npm run test:integration:supabase` safely exits `BLOCKED` before network calls because the separate non-admin and owner/editor JWTs are absent.

## Configuration audit

The expected project-root `.env.local` was absent during this audit. The following names were not available either in that file or in the process environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `AROMETRA_SUPABASE_TARGET`, `AROMETRA_DEVELOPMENT_PROJECT_REF`, `SUPABASE_INTEGRATION_NON_ADMIN_ACCESS_TOKEN`, and `SUPABASE_INTEGRATION_ADMIN_ACCESS_TOKEN`. No Supabase URL or key was emitted to logs.

`.gitignore` matches `.env.local` through `.env.*`, and `.env.local` is not tracked. The compatibility update accepts either the `NEXT_PUBLIC_` variable names or the established unprefixed aliases for server-side tools. If both are supplied with different values, configuration fails closed. The parser still rejects service-role/secret keys, non-HTTPS hosted URLs, URL credentials and malformed endpoints.

For the catalog server, set `AROMETRA_DATA_MODE=supabase`. For any remote write tool, also set `AROMETRA_SUPABASE_TARGET=development` and the exact `AROMETRA_DEVELOPMENT_PROJECT_REF` matching the Supabase host. The migration list and integration tests require this explicit project reference.

## Migration audit

Four versioned migrations are present:

1. `20261010130000_initial_catalog.sql` — catalog schema, types, tables, indexes, policies and read/query functions.
2. `20261010130100_catalog_import_foundation.sql` — provenance extension, private import tables, source-rights and staging RPCs, search and public-read policies.
3. `20261010130200_catalog_upsert.sql` — private draft-upsert function and authenticated RPC.
4. `20261010130300_public_source_verification_dates.sql` — replacement public source view with verification timestamps.

Static review found no `DROP TABLE`, `TRUNCATE`, or direct `DELETE` statements. Migration 2 replaces one provenance constraint; the upsert statements are inside function definitions and run only when an authorized RPC is called. Migration 1 creates the initial schema objects without being generally idempotent, so the remote migration history and existing schema must be inspected before deciding which migrations are pending.

`supabase migration list --linked` returned `ProjectRefNotLinkedError`; the repo's `supabase/config.toml` contains a local project label, not the hosted project reference. Thus the pending remote migration set and remote data impact are **unknown**. No link, dry run against a remote, migration, seed, reset, or other write was performed. `npm test` passed the PGlite migration suite (41 tests), which is local SQL evidence only and does not establish remote compatibility or migration history.

## Live integration checks

`npm run test:integration:supabase` exited with the safe `BLOCKED` message before making a network request because the URL, safe publishable key, and separate authenticated non-admin and owner/editor JWTs were unavailable. No live Auth, PostgREST, RLS or database query result is claimed.

A production build with `AROMETRA_DATA_MODE=supabase` and no connection settings was started locally. The home route returned the unconfigured/invalid configuration message and did not render synthetic fixture products. This confirms fail-closed rendering, not a Supabase connection.

## Required next steps at initial audit (superseded in part by the live update)

1. Put the real settings in `/Users/tylerneuhaus/Desktop/AROMETRA/.env.local` locally, without posting them in chat or committing them. Include the project URL, publishable key, `AROMETRA_DATA_MODE=supabase`, development target, and matching development project reference.
2. Provide separate short-lived integration JWTs for a non-admin authenticated user and an owner/editor user before running live Auth/PostgREST/RLS checks. The import CLI needs a separately authorized short-lived import token if staging is to be exercised.
3. Authenticate/link Supabase CLI to that exact development project, read its migration history and schema, run a remote migration dry run, and inspect any existing data/schema conflicts before applying migration files.
4. Only after those checks, test actual public catalog reads and RLS. Keep `.env.local` ignored and use no service-role key in the app or import tools.
