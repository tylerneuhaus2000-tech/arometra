# Downloaded start catalog: integration review

Checked on 2026-10-10. The package remains in `~/Downloads/AROMETRA_STARTDATENBANK`; its SQLite file and product text were not copied into the application or Supabase.

## Package audit

- SQLite integrity check: `ok`; foreign-key check: no errors.
- Contents: 14 products, 14 brands, 23 categories, 14 source records, 10 packaging variants and 64 qualitative flavor-tag links.
- The package marks all 14 products `source_checked` and unpublished. This package label was not treated as independent verification by AROMETRA.
- All 14 source records say the license is unresolved. The package does not supply a terms URL or a license/permission identifier.
- The package contains 14 manufacturer-origin tasting-note records. No product images, community reviews, or analytics events are present.
- GTIN/EAN values are absent. Qualitative tags were not converted to numeric flavor scores.
- The package's own five tests passed, including the read-only product search, QR resolution and explainable recommendation checks against its local SQLite data.

## Adapter and dry-run

`npm run import:adapt-start-database` maps the package's JSON catalog into the existing AROMETRA import contract. It preserves per-product source URLs, marks tasting-note origin as manufacturer, leaves GTINs and numeric flavors empty, and maps detailed source categories to the existing catalog taxonomy. Its date-only check date is represented at midnight UTC for the import schema; this is a storage normalization, not a claim about the time of retrieval.

The generated candidate file was kept under `/tmp` and passed the existing import dry-run:

- 14 rows inspected
- 5 complete and 9 incomplete profiles
- 0 invalid rows, duplicates, or conflicts
- 14 rows flagged for separate tasting-text rights review
- No Supabase rows were written

The confirmed hosted development database now contains 47 categories, including the category taxonomy added by migration `20261010130400_category_sensory_profiles.sql`. No product rows are present. The staging RPC still validates every imported category slug against this live taxonomy.

## Source and rights review queue

These are source URLs recorded by the downloaded package. They were not independently checked for current content or reuse terms during this integration pass. All rights statuses remain unresolved; no source rights were approved.

| Package record | Recorded source |
|---|---|
| `teachers-highland-cream` | https://www.teacherswhisky.com/our-whiskies |
| `ardbeg-ten` | https://www.ardbeg.de/products/ardbeg-ten-years-old |
| `laphroaig-10` | https://www.laphroaig.com/de-de/whiskies/10-jahre-alt |
| `glenfiddich-12` | https://shop.us.glenfiddich.com/products/glenfiddich-12-year-old |
| `glenlivet-12` | https://www.theglenlivet.com/de-de/whisky/12-jahre-alt/ |
| `jameson-original` | https://www.jamesonwhiskey.com/en-gb/our-whiskey/jameson-irish-whiskey/ |
| `jack-daniels-old-no-7` | https://static.jackdaniels.com/JD_FlavorWheel_Booklet.pdf |
| `bacardi-carta-blanca` | https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/ |
| `diplomatico-reserva-exclusiva` | https://www.rondiplomatico.com/de/product/reserva-exclusiva/ |
| `sipsmith-london-dry` | https://sipsmith.com/product/sipsmith-london-dry-gin/ |
| `absolut-vodka-original` | https://www.absolut.com/en/products/absolut-vodka/ |
| `patron-silver` | https://www.patrontequila.com/en-gb/products/patron-silver.html |
| `remy-martin-vsop` | https://www.remymartin.com/collection/vsop/ |
| `baileys-original` | https://www.baileys.com/de-de/produkte/baileys-original-irish-cream |

## Import gate

Do not register these sources or stage/upsert/publish their records until a reviewer has checked the source terms and recorded separate data-rights and text-rights decisions in the existing review flow. Product drafts remain private and unpublished after a permitted import. Images, ratings, reviews, sales, and fabricated identifiers are excluded.

The data adapter is ready for this review flow; the actual hosted catalog import is **blocked on source-rights review**. The catalog remains empty.

The CSV/JSON adapter also supports separately sourced image candidates and mouthfeel notes. Images enter the catalog only as pending, unreviewed records; source image rights and the image itself need a separate review before public RLS can expose them. This does not change the unresolved status of the 14 local image candidates.

## Local website preview

The Next.js development server can display the supplied JSON catalog through `AROMETRA_DATA_MODE=local-start-database` and an absolute `AROMETRA_START_CATALOG_PATH`. This mode is accepted only with `NODE_ENV=development`; the `dev` command binds to `127.0.0.1`. It is separate from both Supabase and the synthetic layout fixtures. The site shows an unresolved-review banner, source links, unknown fields, and qualitative tags without numeric scores. Package QR aliases work only in this local mode.

This mode lets the team inspect the data and page flow locally. It does not publish the records, mark them verified, or replace the required source-rights review.

The current site configuration uses Supabase mode. The local start-database mode is not being used for the shared website URL; the hosted project currently has 0 products and 0 image rows.
