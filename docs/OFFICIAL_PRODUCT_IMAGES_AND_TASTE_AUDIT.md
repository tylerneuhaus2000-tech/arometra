# Product images and taste data

Checked on 2026-10-10. The local start catalog references one visually checked bottle or sales-pack shot for each of its 14 products. The image files are in `~/Downloads/AROMETRA_STARTDATENBANK/official-images/`; none is committed to this repository or uploaded to Supabase.

Thirteen assets come from manufacturer media pages/CDNs. The Glenlivet 12 image uses the matching 0.7 L EDEKA24 product listing because the current manufacturer page uses a staged scene rather than a pack shot. Every current card now shows the bottle or its sales packaging directly. No portraits, private-user photos, stock photos, retailer reviews, or synthetic product renders are used. The original staged BACARDÍ and Glenlivet images were replaced.

| Product | Local asset | Official image source | Product/source page |
|---|---|---|---|
| Teacher's Highland Cream | `teachers-highland-cream.png` | [Manufacturer image](https://www.teacherswhisky.com/sites/default/files/2018-06/highland-cream-bottle-pack.png) | [Teacher's product page](https://www.teacherswhisky.com/our-whiskies) |
| Ardbeg Ten | `ardbeg-ten.webp` | [Manufacturer image](https://www.ardbeg.com/cdn/shop/files/TenYearsBottleFrontWithoutReflection.png?v=1787145552&width=1000) | [Ardbeg Ten](https://www.ardbeg.com/en-gb/products/ardbeg-ten-years-old) |
| Laphroaig 10 | `laphroaig-10.webp` | [Manufacturer image](https://www.laphroaig.com/sites/default/files/styles/original/public/2024-12/Laphroaig_10YO-700ml_NewPackaging_Front_4688536.png.webp?itok=au5ZmQez) | [Laphroaig 10](https://www.laphroaig.com/de-de/whiskies/10-jahre-alt) |
| Glenfiddich 12 | `glenfiddich-12.png` | [Manufacturer media asset](https://access-sdk-apos.s3.amazonaws.com/attachments/rzxvo4efwccvsq5oo08e9x1d-glenfiddich-12-year-old.full.png) | [Glenfiddich 12](https://shop.us.glenfiddich.com/products/glenfiddich-12-year-old) |
| The Glenlivet 12 | `glenlivet-12-edeka24.jpg` | [EDEKA24 665 px product image](https://www.edeka24.de/out/pictures/generated/product/1/665_665_90/the_glenlivet_malt_12_jahre_40_gp_07l.jpg) | [EDEKA24 0.7 L product listing](https://www.edeka24.de/Wein-Spirituosen/Spirituosen/Whisky/The-Glenlivet-Whisky-12-Jahre-40-GP-0-7L.html) |
| Jameson Original | `jameson-original.png` | [Manufacturer media asset](https://ik.imagekit.io/cvygf2xse/jamesonwhiskey/wp-content/uploads/2026/03/Jameson-Original-Cropped-1.png?tr=f-png%2Cq-90%2Cw-1200) | [Jameson Original](https://www.jamesonwhiskey.com/en-gb/our-whiskey/jameson-irish-whiskey) |
| Jack Daniel's Old No. 7 | `jack-daniels-old-no-7.avif` | [Manufacturer image](https://live-jd24-backend.pantheonsite.io/sites/default/files/2026-04/Old%20No.%207%20DOM.png) | [Old No. 7](https://www.jackdaniels.com/en-us/whiskey/old-no-7) |
| BACARDÍ Carta Blanca | `bacardi-carta-blanca-packshot.png` | [Official BACARDÍ pack shot](https://d323g1xugy1rkz.cloudfront.net/wp-content/uploads/sites/33/2021/02/09193610/Bacardi_CartaBlanca-1.png) | [BACARDÍ Carta Blanca](https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/) |
| Diplomático Reserva Exclusiva | `diplomatico-reserva-exclusiva.avif` | [Manufacturer image](https://www.rondiplomatico.com/wp-content/uploads/2022/03/ReservaExclusiva_678x1310px.png) | [Reserva Exclusiva](https://www.rondiplomatico.com/product/reserva-exclusiva/) |
| Sipsmith London Dry | `sipsmith-london-dry-70cl.jpg` | [Manufacturer image](https://sipsmith.com/wp-content/uploads/2016/07/05060204343445_C1N1_en-GB0429_s01_CGI_Thumbnail-1036x2048.jpg) | [Sipsmith London Dry](https://sipsmith.com/product/sipsmith-london-dry-gin/) |
| Absolut Vodka Original | `absolut-vodka-original-700ml.jpg` | [Manufacturer image](https://www.absolut.com/wp-content/uploads/ABSOLUT_VODKA_700ml_Front_White_Background_LR.jpg) | [Absolut Vodka](https://www.absolut.com/de-de/products/absolut-vodka/) |
| PATRÓN Silver | `patron-silver-750ml.png` | [Manufacturer image](https://www.patrontequila.com/binaries/content/gallery/patrontequila/products/patron-silver/v3/bottle.png) | [PATRÓN Silver](https://www.patrontequila.com/en-gb/products/patron-silver.html) |
| Rémy Martin VSOP | `remy-martin-vsop-70cl.png` | [Manufacturer image](https://static-prod.remymartin.com/app/uploads/2025/10/collection-remy-martin-vsop-2025-light-251029-01-562x800.png) | [Rémy Martin VSOP](https://www.remymartin.com/fr-fr/collection/vsop/) |
| Baileys Original Irish Cream | `baileys-original.png` | [Manufacturer image](https://images.ctfassets.net/p1wk6poseifr/7MqAH3TpYr58PUynz76hxU/dfe82ded5ee3757a0bc698ce5e9553c9/BaileysOriginalIrishCream.png) | [Baileys Original](https://www.baileys.com/de-de/produkte/baileys-original-irish-cream) |

## Use and rights

- Manufacturer origin identifies the image source; it does not grant EDEKA or AROMETRA reuse rights.
- The Glenlivet image is from the EDEKA24 sales listing and is a retailer pack shot; permission to reuse it outside that listing has not been verified.
- Every SQLite image row remains `approved=0`, and the JSON records `unverified_local_development_preview`.
- The Next.js image endpoint only serves these local files when `NODE_ENV=development` and the runtime is explicitly in `local-start-database` mode. Production requests return 404.
- These assets have not been transferred to Supabase Storage and must not be deployed publicly until the responsible rights holder confirms the required display, cropping, and caching rights.

## Taste profile and recommendations

The local database now contains six standardized dimensions and a `product_flavor_values` table, but **zero numeric intensity values**. The 0–10 scale in the supplied screenshot is a design reference, not product evidence. Product pages show sourced qualitative mentions per axis (for example, smoke or fruit) and leave intensity open. Manufacturer words are not converted into a score.

The 14 products remain unpublished. No GTINs, consumer reviews, ratings, purchase figures, or unsupported tasting details were added. Recommendations use only shared qualitative tags from the local manufacturer-source records. Cross-category suggestions require at least four shared traits, including three traits outside the generic flavor list; otherwise the page shows its insufficient-data state.

## Supabase image delivery update — 2026-10-10

- The website now queries `public.product_images` for catalog cards, product details, and recommendation cards. It uses the approved HTTPS `source_url` and source-page metadata returned by the existing image RLS policy.
- Public visibility still requires a published product, approved image review, a current image hash, and separately approved image rights for that image's source. `source_url` is constrained to HTTPS. Browser requests omit the page referrer.
- The website does not read product records or image files from Downloads. The local image route remains restricted to the explicitly selected development-only local database mode.
- The V3 SQLite file contains 14 product records but 0 `product_images` rows. The separate start-data package has 14 image candidates, all still marked unapproved; these have not been copied to Supabase.
- Current hosted development counts are 47 categories, 0 public products, and 0 public product images. Therefore no product photograph is visible from the shared website URL yet.
- This first delivery path supports public HTTPS image URLs. It does not yet upload or serve objects from Supabase Storage. Storage-backed images remain a separate implementation task.
- Image approval remains an operator decision. Manufacturer-origin URLs alone do not establish a reuse license. GS1 notes that product-image reuse can carry image-specific usage restrictions: [GS1 Product Image Sharing Guideline](https://www.gs1.org/standards/product-image-sharing-guideline/current-standard).

## Category sensorics and mouthfeel update — 2026-10-10

- Product pages continue to load category-specific dimensions and sourced qualitative descriptors from Supabase; no numeric scores were added.
- Migration `20261010130500_public_product_images_and_mouthfeel.sql` adds the separate `mouthfeel_text` field and read permission while preserving the original note-hash format for existing data. The hosted development project has no tasting-note rows, so compatibility is covered by isolated PGlite tests.

## Image candidate import and review update — 2026-10-10

- CSV and JSON records can now carry an image URL, alt text, attribution, and a separately registered image source. Manufacturer image origin alone does not approve its license.
- The import upsert inserts image rows as pending and unreviewed. `review_product_image` requires an active owner or reviewer; approval also requires current image-source permission metadata. The public RLS policy still requires a published product and matching image hash. Import does not approve rights or publish products.
- Migration `20261010130600_catalog_image_import_and_review.sql` is applied to the confirmed Development project. Preflight recorded 0 products, 0 image rows, 0 tasting notes, and 0 duplicate image identities. After application: 47 categories, 0 products, 0 public images, and 0 tasting notes.
- Live anonymous PostgREST verified image reads and the image/source join return HTTP 200; anonymous calls to the reviewer RPC return HTTP 401. The authenticated review role path is covered in PGlite. Live positive role checks are still pending fresh separate JWTs.
- No local image candidate or synthetic UI fixture was imported. Current public catalog cards therefore have no packshot until a rights-cleared image and published, reviewed product exist.
