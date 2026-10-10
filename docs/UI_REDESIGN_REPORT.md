# Modern Oak UI Redesign

Date: 2026-10-10

## Delivered

- Reworked the catalog shell to a dark, restrained Modern Oak layout with a fixed 264 px desktop sidebar, collapsible desktop navigation, a mobile category drawer, vertically nested category links, an active state, and a separate Beratung area.
- Kept one global search field in the top bar. Reduced heading scale and vertical gaps, and made the available catalog width responsive: three cards above 900 px, two above 680 px, and one on narrow screens.
- Updated the home, catalog, and product detail routes to use the existing catalog service and product records. Cards show at most two evidenced flavor descriptors; absent flavor/image information remains absent or is called out as unverified.
- Added a Beratung placeholder without fabricated advice. Production product cards do not use the design fixture imagery.

## Local-only visual preview

The preview at `/ui-preview` uses three explicit synthetic design fixtures and generic unbranded images stored under `test/fixtures/ui-preview/`. The preview states that its cards and attributes are synthetic. Facts such as origin, ABV, and tasting profile are marked unknown; it does not claim reviews, scores, or computed recommendations. Fixtures are not added to Supabase and are not used by the product catalog service.

Run it with `npm run ui-preview`; the launcher binds Next.js to `127.0.0.1`, uses port `3130` (override with `AROMETRA_UI_PREVIEW_PORT`), and isolates build output in `.next-ui-preview/`. The routes also require the explicit preview flag and a loopback Host. `NODE_ENV=production` is a hard deny, independent of the preview flag. The image endpoint serves only the three allowlisted files and sends `no-store`/`nosniff` headers.

## Screenshot set

All screenshots are Playwright captures from the local synthetic test environment. The preview and its product page are visibly marked as synthetic.

- `artifacts/qa/ui-redesign/home-1440.png` — application home at 1440 px.
- `artifacts/qa/ui-redesign/catalog-1440.png` — preview catalog with three cards at 1440 px.
- `artifacts/qa/ui-redesign/category-expanded-1440.png` — three-card catalog with Whisky subcategories expanded.
- `artifacts/qa/ui-redesign/catalog-1280.png`, `catalog-768.png`, `catalog-390.png`, `catalog-320.png` — responsive catalog widths.
- `artifacts/qa/ui-redesign/product-similar-1440.png` — synthetic product-detail layout and non-computed similar-design cards.
- `artifacts/qa/ui-redesign/catalog-real-route-mobile-390.png` — mobile view of the normal catalog route.

The set was visually compared with the supplied Modern Oak reference: compact heading hierarchy, one search control, a vertical Project-One-style category tree, warm restrained accents, and large portrait cards are present. The design preview has three equally sized desktop cards and remains single-column at 390/320 px. No real product photography was available or introduced.

## Verification

- `npm run lint` — passed; Biome checked 42 files.
- `npm run typecheck` — passed.
- `npm test` — passed; 6 files and 40 tests.
- `AROMETRA_NEXT_DIST_DIR=.next-ui-redesign AROMETRA_DATA_MODE=fixtures AROMETRA_UI_PREVIEW=true npm run build` — passed on Next.js 16.4.0.
- `npm audit --audit-level=high` — passed; 0 vulnerabilities.
- Browser checks used installed Google Chrome. The home/accessibility, product detail, category expand/collapse, local preview/search, QR, and narrow viewport cases each passed across the full-run and focused reruns. The preview was checked at 1440, 1280, 768, 390, and 320 px for overflow and the expected 3/3/2/1/1 card columns. Axe checks found no WCAG 2.2 AA-tagged violations on the tested home, preview, and mobile drawer states.
- The full six-test Playwright command was attempted twice. Both runs passed the first four cases, then the system Chrome process closed before creating the QR test page; one run timed out during page setup and another reported `Target page, context or browser has been closed`. The QR case then passed alone and with the mobile case (2/2); the updated preview/screenshot case passed alone. Therefore, every case has a successful browser run, but a single uninterrupted 6/6 suite run is not claimed.
- `npm run ui-preview` was exercised on port 3130; `lsof` confirmed listener `127.0.0.1:3130`. Local preview returned 200; a non-loopback Host returned 404.
- Production smoke used the successful build with both `AROMETRA_UI_PREVIEW=true` and fixture mode set: `/ui-preview`, `/ui-preview/designprofil-a`, and the preview image endpoint all returned 404. `/` returned 200 with the production fixture block and without `Designprofil A` in the HTML.

## Current backend follow-up — 2026-10-10

- The Modern Oak shell continues to read its catalog through the existing Supabase repository. The confirmed development project now has 47 categories, 0 products, and 0 product images. The normal `/entdecken` route has been checked against that live empty catalog; no design-fixture product appears there.
- Live anonymous PostgREST checks passed for catalog/category/image reads, the product-image source join, catalog search, the exact product detail relationship, the sensory profile RPC, and an unknown QR lookup. Raw sensory tables, admin membership, and anonymous image review remain denied. A live detail query ambiguity was fixed by naming `products_primary_category_id_fkey` explicitly.
- The authenticated owner/editor and non-admin integration cases remain pending fresh, separate JWTs. Until a real product and licensed packshot are reviewed and published, the screenshot set below remains a synthetic layout preview and is not evidence of a real product page.

## Boundaries and blockers at the time of the UI pass

- Supabase credentials/project configuration are still absent. No live Supabase, Auth, PostgREST, RLS, or real-product query was executed as part of this UI work. The live catalog count remains unknown; the repository research audit last verified zero imported real products.
- Screenshots demonstrate layout with explicitly synthetic fixtures, not a production data flow. A live card/search/detail/QR acceptance run still requires a real, rights-cleared product record in the development database.
- The private GitHub push remains pending the user's requested approval and Actions-cost clarification. No remote push was performed.
