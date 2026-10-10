# Supabase Integration Status

Audit date: 2026-10-10

No credential values are recorded in this document.

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

## Required next steps

1. Put the real settings in `/Users/tylerneuhaus/Desktop/AROMETRA/.env.local` locally, without posting them in chat or committing them. Include the project URL, publishable key, `AROMETRA_DATA_MODE=supabase`, development target, and matching development project reference.
2. Provide separate short-lived integration JWTs for a non-admin authenticated user and an owner/editor user before running live Auth/PostgREST/RLS checks. The import CLI needs a separately authorized short-lived import token if staging is to be exercised.
3. Authenticate/link Supabase CLI to that exact development project, read its migration history and schema, run a remote migration dry run, and inspect any existing data/schema conflicts before applying migration files.
4. Only after those checks, test actual public catalog reads and RLS. Keep `.env.local` ignored and use no service-role key in the app or import tools.
