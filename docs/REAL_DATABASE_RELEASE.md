# Real Database Catalog Release — 2026-10-10

## Scope and approval

The authenticated AROMETRA editor approved publication of sourced product facts and category-specific aroma tags in chat. The data import records that operator decision and the authenticated reviewer. This is an operator attestation; it does not claim an independently verified third-party license.

This release excludes product images, manufacturer tasting prose, external ratings, community reviews, numeric taste scores, GTIN/EANs that were not present in the source package, and any unverified field. The live database currently contains 14 published products, 63 approved aroma descriptors, 0 numeric sensory measurements, 0 images, 0 tasting notes, 0 ratings, and 0 active QR aliases. Unknown fields remain `null`.

One submitted aroma tag was not allowed by its product category profile and was dropped with a private import warning: `floral` for Jameson Original's whisky profile. The category filter applies the database taxonomy; it does not force whisky dimensions onto other categories.

## Catalog sources

Each record was marked checked on 2026-10-10 in the supplied catalog file. Product facts and tags are attributed to these manufacturer source pages:

- Teacher's Highland Cream — <https://www.teacherswhisky.com/our-whiskies>
- Ardbeg Ten Years Old — <https://www.ardbeg.de/products/ardbeg-ten-years-old>
- Laphroaig 10 Year Old — <https://www.laphroaig.com/de-de/whiskies/10-jahre-alt>
- Glenfiddich 12 Year Old — <https://shop.us.glenfiddich.com/products/glenfiddich-12-year-old>
- The Glenlivet 12 Year Old — <https://www.theglenlivet.com/de-de/whisky/12-jahre-alt/>
- Jameson Original — <https://www.jamesonwhiskey.com/en-gb/our-whiskey/jameson-irish-whiskey/>
- Jack Daniel's Old No. 7 — <https://static.jackdaniels.com/JD_FlavorWheel_Booklet.pdf>
- BACARDÍ Carta Blanca — <https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/>
- Diplomático Reserva Exclusiva — <https://www.rondiplomatico.com/de/product/reserva-exclusiva/>
- Sipsmith London Dry Gin — <https://sipsmith.com/product/sipsmith-london-dry-gin/>
- Absolut Vodka Original — <https://www.absolut.com/en/products/absolut-vodka/>
- PATRÓN Silver — <https://www.patrontequila.com/en-gb/products/patron-silver.html>
- Rémy Martin VSOP — <https://www.remymartin.com/collection/vsop/>
- Baileys Original Irish Cream — <https://www.baileys.com/de-de/produkte/baileys-original-irish-cream>

## Database and API verification

- Target: linked Supabase development project `arometra-dev` (`htgirmnckkhdnepfmhpm`).
- Migrations `20261010130000` through `20261010130900` are applied. The three new migrations are additive and add explicit operator rights attestation, publication review, and category-rule filtering.
- The 14-row import dry run reported 9 complete, 5 incomplete, 0 invalid, 0 duplicates, and 0 conflicts. Products with incomplete attributes were published only with supported fields; missing attributes remain unknown.
- Live API integration suite passed for Auth reachability, anonymous catalog reads/search/detail/tag RPCs, admin and private-table denials, separate non-admin/editor tokens, source attestation and publication RPC role gates, and safe unknown-record probes.
- The public catalog search returned Teacher's Highland Cream. Public detail returned its brand/category relationship and five category-approved tags.
- Public admin reads and raw sensory descriptor/measurement reads remain denied. Product images, tasting notes, community reviews and numeric scores remain empty.

## Website verification

- Production Next.js build passed and uses the Supabase runtime mode from `.env.local`; no synthetic fixtures were used in the real route check.
- Local production server returned HTTP 200. Catalog pagination rendered 12 products on page 1 and 2 on page 2. Search returned Teacher's Highland Cream; its product route rendered two recommendations based on shared approved tags.
- Product page showed no source block or legal warning banner. A 390 px mobile browser check found no horizontal overflow and no page errors.
- Browser screenshots: `/tmp/arometra-live-product-1440.png` and `/tmp/arometra-live-product-390.png`.
- This Next.js application is server-rendered and dynamic. It cannot be deployed as-is to GitHub Pages, which is not enabled for the private repository. GitHub reports zero deployments. No Vercel/Cloudflare credentials or deployment secrets are configured.

## Quality checks

- `npm run lint` — passed, 52 files.
- `npm run typecheck` — passed.
- `npm test` — passed, 9 files / 61 tests.
- `npm run test:e2e` — passed, 6/6 tests against the isolated synthetic test server; production route proof above used real Supabase data.
- `npm run test:integration:supabase` — passed against the hosted development project.
- `npm run build` — passed.
- `npm audit --audit-level=high` — passed, 0 vulnerabilities.
- `.env.local` is ignored by Git. No environment values or bearer tokens are included in this report.

## Deployment state

The live Supabase-backed website is running locally at `http://127.0.0.1:3118/entdecken`. It is not public on the internet. The GitHub repository is private at <https://github.com/tylerneuhaus2000-tech/arometra>, on `main`, with no configured website hosting or GitHub deployment. A public URL requires a Next.js-capable host account and its authorized deployment connection. No hosting account or credentials were created, and no workflow or push was triggered.
