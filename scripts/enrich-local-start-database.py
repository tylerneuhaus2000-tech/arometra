#!/usr/bin/env python3
"""Add audited manufacturer image references and additive tasting fields to the local package."""

import argparse
import json
import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path


CHECKED_ON = "2026-10-10"
RIGHTS_NOTE = "Ungeklärt: keine Bildlizenz oder Freigabe für EDEKA/AROMETRA nachgewiesen; nur lokale Entwicklungsvorschau."
EXPECTED_SLUGS = {
    "teachers-highland-cream", "ardbeg-ten", "laphroaig-10", "glenfiddich-12",
    "glenlivet-12", "jameson-original", "jack-daniels-old-no-7", "bacardi-carta-blanca",
    "diplomatico-reserva-exclusiva", "sipsmith-london-dry", "absolut-vodka-original",
    "patron-silver", "remy-martin-vsop", "baileys-original",
}

# Official manufacturer or retailer product assets. Image files stay outside
# the repository in the local Downloads catalog package.
IMAGES = {
    "teachers-highland-cream": ("teachers-highland-cream.png", "Teacher's / Suntory Global Spirits", "https://www.teacherswhisky.com/sites/default/files/2018-06/highland-cream-bottle-pack.png"),
    "ardbeg-ten": ("ardbeg-ten.webp", "Ardbeg", "https://www.ardbeg.com/cdn/shop/files/TenYearsBottleFrontWithoutReflection.png?v=1787145552&width=1000"),
    "laphroaig-10": ("laphroaig-10.webp", "Laphroaig", "https://www.laphroaig.com/sites/default/files/styles/original/public/2024-12/Laphroaig_10YO-700ml_NewPackaging_Front_4688536.png.webp?itok=au5ZmQez"),
    "glenfiddich-12": ("glenfiddich-12.png", "Glenfiddich", "https://access-sdk-apos.s3.amazonaws.com/attachments/rzxvo4efwccvsq5oo08e9x1d-glenfiddich-12-year-old.full.png"),
    "glenlivet-12": ("glenlivet-12-edeka24.jpg", "EDEKA24 / The Glenlivet", "https://www.edeka24.de/out/pictures/generated/product/1/665_665_90/the_glenlivet_malt_12_jahre_40_gp_07l.jpg"),
    "jameson-original": ("jameson-original.png", "Jameson / Irish Distillers", "https://ik.imagekit.io/cvygf2xse/jamesonwhiskey/wp-content/uploads/2026/03/Jameson-Original-Cropped-1.png?tr=f-png%2Cq-90%2Cw-1200"),
    "jack-daniels-old-no-7": ("jack-daniels-old-no-7.avif", "Jack Daniel's / Brown-Forman", "https://live-jd24-backend.pantheonsite.io/sites/default/files/2026-04/Old%20No.%207%20DOM.png"),
    "bacardi-carta-blanca": ("bacardi-carta-blanca-packshot.png", "BACARDÍ official brand media", "https://d323g1xugy1rkz.cloudfront.net/wp-content/uploads/sites/33/2021/02/09193610/Bacardi_CartaBlanca-1.png"),
    "diplomatico-reserva-exclusiva": ("diplomatico-reserva-exclusiva.avif", "Diplomático", "https://www.rondiplomatico.com/wp-content/uploads/2022/03/ReservaExclusiva_678x1310px.png"),
    "sipsmith-london-dry": ("sipsmith-london-dry-70cl.jpg", "Sipsmith", "https://sipsmith.com/wp-content/uploads/2016/07/05060204343445_C1N1_en-GB0429_s01_CGI_Thumbnail-1036x2048.jpg"),
    "absolut-vodka-original": ("absolut-vodka-original-700ml.jpg", "Absolut / The Absolut Company", "https://www.absolut.com/wp-content/uploads/ABSOLUT_VODKA_700ml_Front_White_Background_LR.jpg"),
    "patron-silver": ("patron-silver-750ml.png", "PATRÓN / Bacardi Limited", "https://www.patrontequila.com/binaries/content/gallery/patrontequila/products/patron-silver/v3/bottle.png"),
    "remy-martin-vsop": ("remy-martin-vsop-70cl.png", "Rémy Martin", "https://static-prod.remymartin.com/app/uploads/2025/10/collection-remy-martin-vsop-2025-light-251029-01-562x800.png"),
    "baileys-original": ("baileys-original.png", "Baileys / Diageo", "https://images.ctfassets.net/p1wk6poseifr/7MqAH3TpYr58PUynz76hxU/dfe82ded5ee3757a0bc698ce5e9553c9/BaileysOriginalIrishCream.png"),
}

# Only sourced additions are recorded. Null means the relevant source did not settle the field.
DETAILS = {
    "teachers-highland-cream": {"distillation": "Blend aus Malt- und Grain-Whisky; der Hersteller nennt je 50 % und einen prägenden Anteil getorften Ardmore-Malts."},
    "ardbeg-ten": {"market_country_code": "GB", "maturation": "10 Jahre in Bourbonfässern gereift; laut Hersteller nicht kühlfiltriert."},
    "laphroaig-10": {"volume_ml": 700, "distillation": "Gemälzte Gerste wird nach Herstellerangabe über Torffeuer geräuchert.", "maturation": "10 Jahre in ehemaligen Bourbonfässern gereift."},
    "glenfiddich-12": {"volume_ml": 750, "market_country_code": "US", "distillation": None, "maturation": "12 Jahre in Oloroso-Sherry- und Bourbonfässern gereift und danach in Eichenfässern zusammengeführt."},
    "glenlivet-12": {"market_country_code": "DE", "maturation": "12 Jahre: zunächst traditionelle europäische Eiche, danach amerikanische Eichenfässer."},
    "jameson-original": {"distillation": "Blend aus Pot-Still- und Grain-Whiskeys; dreifach in Kupferbrennblasen destilliert.", "maturation": "Mindestens vier Jahre in Eichenfässern gereift."},
    "jack-daniels-old-no-7": {"volume_ml": 750, "market_country_code": "US", "distillation": "Zweifach destilliert und vor der Reifung durch Holzkohle aus Zuckerahorn gemildert.", "maturation": "In neuen, ausgebrannten Fässern aus amerikanischer Weißeiche gereift."},
    "bacardi-carta-blanca": {"distillation": None, "maturation": "In Fässern aus amerikanischer Weißeiche gereift und anschließend durch Holzkohle gefiltert."},
    "sipsmith-london-dry": {"market_country_code": "GB", "distillation": "In traditionellen Kupfer-Pot-Stills destilliert."},
    "absolut-vodka-original": {"volume_ml": 700, "market_country_code": "DE", "distillation": "Kontinuierlich in Åhus destilliert; der Hersteller nennt Winterweizen und lokales Wasser.", "tags": ["getreidig", "trockenfrucht"]},
    "patron-silver": {"market_country_code": "GB", "distillation": "Aus 100 % Blauer-Weber-Agave in kleinen Chargen hergestellt.", "maturation": "Ungealterter Silver-Tequila."},
    "remy-martin-vsop": {"market_country_code": "FR", "distillation": "Cognac Fine Champagne aus Grande- und Petite-Champagne-Eaux-de-vie.", "maturation": "In französischer Eiche gereift; eine konkrete Reifezeit nennt die geprüfte Produktseite nicht."},
    "diplomatico-reserva-exclusiva": {"volume_ml": 700},
    "baileys-original": {"market_country_code": "DE"},
}

DETAIL_SOURCES = {
    "teachers-highland-cream": "https://www.teacherswhisky.com/our-whiskies",
    "ardbeg-ten": "https://www.ardbeg.com/en-gb/products/ardbeg-ten-years-old",
    "laphroaig-10": "https://www.laphroaig.com/de-de/whiskies/10-jahre-alt",
    "glenfiddich-12": "https://shop.us.glenfiddich.com/products/glenfiddich-12-year-old",
    "glenlivet-12": "https://www.theglenlivet.com/de-de/whisky/12-jahre-alt/",
    "jameson-original": "https://www.jamesonwhiskey.com/en-gb/our-whiskey/jameson-irish-whiskey",
    "jack-daniels-old-no-7": "https://pressroom.jackdaniels.com/wp-content/uploads/2015/01/Old-No.7-Fact-Sheet.pdf",
    "bacardi-carta-blanca": "https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/",
    "sipsmith-london-dry": "https://sipsmith.com/product/sipsmith-london-dry-gin/",
    "absolut-vodka-original": "https://www.absolut.com/de-de/products/absolut-vodka/",
    "patron-silver": "https://www.patrontequila.com/en-gb/products/patron-silver.html",
    "remy-martin-vsop": "https://www.remymartin.com/fr-fr/collection/vsop/",
    "baileys-original": "https://www.baileys.com/de-de/produkte/baileys-original-irish-cream",
    "diplomatico-reserva-exclusiva": "https://www.rondiplomatico.com/wp-content/uploads/2022/03/ReservaExclusiva_678x1310px.png",
}

TAG_LABELS = {
    "getreidig": "Getreidig",
    "trockenfrucht": "Trockenfrucht",
}

PRODUCT_PAGES = {
    "teachers-highland-cream": "https://www.teacherswhisky.com/our-whiskies",
    "ardbeg-ten": "https://www.ardbeg.com/en-gb/products/ardbeg-ten-years-old",
    "laphroaig-10": "https://www.laphroaig.com/de-de/whiskies/10-jahre-alt",
    "glenfiddich-12": "https://shop.us.glenfiddich.com/products/glenfiddich-12-year-old",
    "glenlivet-12": "https://www.theglenlivet.com/de-de/whisky/12-jahre-alt/",
    "jameson-original": "https://www.jamesonwhiskey.com/en-gb/our-whiskey/jameson-irish-whiskey",
    "jack-daniels-old-no-7": "https://www.jackdaniels.com/en-us/whiskey/old-no-7",
    "bacardi-carta-blanca": "https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/",
    "diplomatico-reserva-exclusiva": "https://www.rondiplomatico.com/product/reserva-exclusiva/",
    "sipsmith-london-dry": "https://sipsmith.com/product/sipsmith-london-dry-gin/",
    "absolut-vodka-original": "https://www.absolut.com/de-de/products/absolut-vodka/",
    "patron-silver": "https://www.patrontequila.com/en-gb/products/patron-silver.html",
    "remy-martin-vsop": "https://www.remymartin.com/fr-fr/collection/vsop/",
    "baileys-original": "https://www.baileys.com/de-de/produkte/baileys-original-irish-cream",
}

# The image page can differ from the primary fact source. The Glenlivet image
# comes from EDEKA24's matching 0.7 L retail listing because the manufacturer's
# current German page uses a lifestyle image instead of a packshot.
IMAGE_SOURCE_PAGES = {
    "glenlivet-12": "https://www.edeka24.de/Wein-Spirituosen/Spirituosen/Whisky/The-Glenlivet-Whisky-12-Jahre-40-GP-0-7L.html",
    "bacardi-carta-blanca": "https://www.bacardi.com/de/de/our-rums/carta-blanca-rum/",
}

IMAGE_ALT_TEXT = {
    "glenlivet-12": "Produktabbildung aus dem EDEKA24-Sortiment: The Glenlivet 12 Year Old.",
    "bacardi-carta-blanca": "Offizieller BACARDÍ Carta Blanca Produkt-Packshot.",
}


def add_column(db, table, name, declaration):
    existing = {row[1] for row in db.execute(f"PRAGMA table_info({table})")}
    if name not in existing:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {name} {declaration}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-dir", required=True, help="Directory containing the local start database package")
    parser.add_argument("--dry-run", action="store_true", help="Validate the expected package and report changes without writing")
    args = parser.parse_args()
    directory = Path(args.catalog_dir).expanduser().resolve(strict=True)
    json_path = directory / "catalog_data.json"
    db_path = directory / "arometra.sqlite"
    images_path = directory / "official-images"
    if not json_path.is_file() or not db_path.is_file() or not images_path.is_dir():
        raise SystemExit("Expected catalog_data.json, arometra.sqlite and official-images/ in catalog directory")

    catalog = json.loads(json_path.read_text(encoding="utf-8"))
    products = catalog.get("products")
    if not isinstance(products, list) or {p.get("slug") for p in products} != EXPECTED_SLUGS:
        raise SystemExit("Catalog product set differs from the audited 14-product package; refusing changes")
    for slug, (filename, _publisher, url) in IMAGES.items():
        asset = images_path / filename
        if not asset.is_file() or asset.is_symlink() or asset.stat().st_size <= 0 or asset.stat().st_size > 8 * 1024 * 1024:
            raise SystemExit(f"Image asset missing or unsafe: {filename}")
        if not url.startswith("https://") or not PRODUCT_PAGES[slug].startswith("https://"):
            raise SystemExit(f"Image provenance must use HTTPS: {slug}")

    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok" or db.execute("PRAGMA foreign_key_check").fetchall():
        raise SystemExit("Database integrity check failed; refusing changes")
    rows = db.execute("SELECT slug, published FROM products").fetchall()
    if {row["slug"] for row in rows} != EXPECTED_SLUGS or any(row["published"] != 0 for row in rows):
        raise SystemExit("Database products differ or any product is published; refusing changes")
    if args.dry_run:
        print(json.dumps({
            "status": "dry_run_ok",
            "products": len(products),
            "product_image_assets": len(IMAGES),
            "images_will_remain_unapproved": True,
            "products_will_remain_unpublished": True,
            "numeric_flavor_values_to_add": 0,
        }, ensure_ascii=False, indent=2))
        db.close()
        return

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = directory / f"arometra.sqlite.pre-enrichment-{stamp}.bak"
    backup = sqlite3.connect(backup_path)
    db.backup(backup)
    backup.close()

    for product in products:
        slug = product["slug"]
        original = dict(product)
        filename, publisher, image_url = IMAGES[slug]
        product["image"] = {
            "filename": filename,
            "alt_text": IMAGE_ALT_TEXT.get(slug, f"Offizielle Produktabbildung: {product['name']}."),
            "source_name": publisher,
            "source_url": image_url,
            "source_page_url": IMAGE_SOURCE_PAGES.get(slug, PRODUCT_PAGES[slug]),
            "rights_status": "unverified_local_development_preview",
            "retrieved_on": CHECKED_ON,
            "usage_note": RIGHTS_NOTE,
        }
        product["verified_on"] = CHECKED_ON
        detail = DETAILS.get(slug, {})
        for key in ("abv", "volume_ml", "market_country_code", "distillation", "maturation", "tags"):
            if key in detail:
                product[key] = detail[key]
        base_fields = [
            "name", "brand", "category", "style", "description", "origin_country_code", "origin_region", "age_years",
            "abv_percent", "variant:volume_ml", "variant:market_country_code", "nose", "palate", "finish",
            "distillation_details", "maturation_details", "qualitative_flavors",
        ]
        field_aliases = {"description": "summary", "origin_country_code": "country", "origin_region": "region", "age_years": "age",
                         "abv_percent": "abv", "variant:volume_ml": "volume_ml",
                         "variant:market_country_code": "market_country_code",
                         "distillation_details": "distillation", "maturation_details": "maturation",
                         "qualitative_flavors": "tags"}
        fields = []
        for field in base_fields:
            value = original.get(field_aliases.get(field, field))
            if field == "qualitative_flavors" and "tags" in detail:
                value = None
            if value is not None and value != [] and value != "":
                fields.append(field)
        source_records = [{
            "url": product["source"], "checked_on": CHECKED_ON, "fields": fields,
            "attribution": "Herstellerquelle; kurze deutsche Zusammenfassung, keine wörtliche Übernahme.",
        }]
        extra_fields = []
        extra_map = {"distillation": "distillation_details", "maturation": "maturation_details",
                     "abv": "abv_percent", "volume_ml": "variant:volume_ml",
                     "market_country_code": "variant:market_country_code", "tags": "qualitative_flavors"}
        for key, field in extra_map.items():
            if detail.get(key) is not None:
                extra_fields.append(field)
        extra_source = DETAIL_SOURCES.get(slug)
        if extra_fields and extra_source:
            if extra_source == product["source"]:
                source_records[0]["fields"] = list(dict.fromkeys(source_records[0]["fields"] + extra_fields))
            else:
                source_records.append({
                    "url": extra_source, "checked_on": CHECKED_ON, "fields": extra_fields,
                    "attribution": "Herstellerquelle; zusätzlich dokumentierte Produkt- oder Abfüllungsangaben.",
                })
        product["source_records"] = source_records

    meta = catalog.setdefault("meta", {})
    meta["checked_on"] = CHECKED_ON
    meta["images"] = "14 Produktabbildungen aus offiziellen Hersteller- oder EDEKA24-Quellen lokal zugeordnet; Wiederverwendungsrechte für AROMETRA ungeklärt; keine Freigabe für Produktion."
    meta["flavor_strength"] = "Keine standardisiert erhobenen Intensitätswerte vorhanden; fehlende Werte bleiben unbekannt und werden nicht aus Herstellerworten abgeleitet."

    temp_fd, temp_name = tempfile.mkstemp(prefix="catalog_data.", suffix=".tmp", dir=directory)
    with os.fdopen(temp_fd, "w", encoding="utf-8") as out:
        json.dump(catalog, out, ensure_ascii=False, indent=2)
        out.write("\n")
        out.flush()
        os.fsync(out.fileno())

    try:
        db.execute("BEGIN IMMEDIATE")
        add_column(db, "products", "distillation_details", "TEXT")
        add_column(db, "products", "maturation_details", "TEXT")
        add_column(db, "tasting_notes", "overall_de", "TEXT")
        add_column(db, "product_images", "source_url", "TEXT")
        add_column(db, "product_images", "source_page_url", "TEXT")
        add_column(db, "product_images", "rights_status", "TEXT NOT NULL DEFAULT 'unverified'")
        add_column(db, "product_images", "retrieved_on", "TEXT")
        add_column(db, "product_images", "alt_text", "TEXT")
        db.execute("""CREATE TABLE IF NOT EXISTS flavor_dimensions (
            code TEXT PRIMARY KEY,
            label_de TEXT NOT NULL UNIQUE,
            minimum_value REAL NOT NULL DEFAULT 0 CHECK(minimum_value = 0),
            maximum_value REAL NOT NULL DEFAULT 10 CHECK(maximum_value = 10),
            measurement_method TEXT NOT NULL
          )""")
        db.execute("""CREATE TABLE IF NOT EXISTS product_flavor_values (
            product_slug TEXT NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
            dimension_code TEXT NOT NULL REFERENCES flavor_dimensions(code),
            value REAL NOT NULL CHECK(value >= 0 AND value <= 10),
            method TEXT NOT NULL,
            source_url TEXT NOT NULL REFERENCES sources(url),
            checked_on TEXT NOT NULL,
            PRIMARY KEY(product_slug, dimension_code)
          )""")
        db.execute("""CREATE TABLE IF NOT EXISTS local_enrichment_migrations (
            version TEXT PRIMARY KEY,
            applied_on TEXT NOT NULL
          )""")
        dimensions = [
            ("smoky", "Rauch", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
            ("sweet", "Süße", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
            ("spicy", "Würze", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
            ("fruity", "Fruchtigkeit", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
            ("peaty", "Torf", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
            ("woody", "Holz", "Standardisierte Verkostung mit dokumentierter Methode erforderlich; derzeit nicht erhoben."),
        ]
        for code, label, method in dimensions:
            db.execute("INSERT INTO flavor_dimensions(code,label_de,measurement_method) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET label_de=excluded.label_de, measurement_method=excluded.measurement_method", (code, label, method))

        for product in products:
            slug = product["slug"]
            image = product["image"]
            detail = DETAILS.get(slug, {})
            db.execute("UPDATE products SET distillation_details=?, maturation_details=?, updated_at=CURRENT_TIMESTAMP WHERE slug=?",
                       (detail.get("distillation"), detail.get("maturation"), slug))
            market = product.get("market_country_code")
            variant_values = (product.get("volume_ml"), product.get("abv"), market, slug)
            existing = db.execute("SELECT sku FROM bottlings WHERE product_slug=? ORDER BY sku LIMIT 1", (slug,)).fetchone()
            if existing:
                db.execute("UPDATE bottlings SET volume_ml=COALESCE(?,volume_ml), abv=COALESCE(?,abv), market=COALESCE(?,market) WHERE sku=?",
                           (*variant_values[:3], existing["sku"]))
            else:
                db.execute("INSERT INTO bottlings(sku,product_slug,volume_ml,abv,market,gtin) VALUES(?,?,?,?,?,NULL)",
                           (f"LOCAL-{slug}", slug, *variant_values[:3]))

            for source_record in product["source_records"]:
                source_url = source_record["url"]
                host = source_url.split("/", 3)[2]
                db.execute("INSERT INTO sources(url,publisher,source_type,checked_on,use_scope,license_status) VALUES(?,?,?,?,?,?) "
                           "ON CONFLICT(url) DO UPDATE SET publisher=excluded.publisher, checked_on=excluded.checked_on, "
                           "use_scope=excluded.use_scope, license_status='nicht geklaert'",
                           (source_url, host, "manufacturer", CHECKED_ON, "Nur manuell geprüfte Fakten; keine Rechte an Text- oder Bildübernahme", "nicht geklaert"))
                db.execute("INSERT INTO product_sources(product_slug,source_url,verified_fields) VALUES(?,?,?) "
                           "ON CONFLICT(product_slug,source_url) DO UPDATE SET verified_fields=excluded.verified_fields",
                           (slug, source_url, json.dumps(source_record["fields"], ensure_ascii=False)))
            source_url = product["source"]
            db.execute("INSERT INTO tasting_notes(product_slug,source_url,note_origin,nose_de,palate_de,finish_de,overall_de) VALUES(?,?,?,?,?,?,?) "
                       "ON CONFLICT(product_slug,source_url) DO UPDATE SET note_origin='manufacturer', nose_de=excluded.nose_de, "
                       "palate_de=excluded.palate_de, finish_de=excluded.finish_de, overall_de=excluded.overall_de",
                       (slug, source_url, "manufacturer", product.get("nose"), product.get("palate"), product.get("finish"), product.get("overall")))

            asset_url = f"official-images/{image['filename']}"
            found = db.execute("SELECT id FROM product_images WHERE product_slug=? ORDER BY id", (slug,)).fetchall()
            if len(found) > 1:
                raise RuntimeError(f"Multiple existing image rows for {slug}; refusing to guess")
            values = (asset_url, image["source_name"], RIGHTS_NOTE, 0, image["source_url"],
                      image["source_page_url"], "unverified", CHECKED_ON, image["alt_text"])
            if found:
                db.execute("UPDATE product_images SET asset_url=?, attribution=?, license_reference=?, approved=?, source_url=?, source_page_url=?, rights_status=?, retrieved_on=?, alt_text=? WHERE id=?",
                           (*values, found[0]["id"]))
            else:
                db.execute("INSERT INTO product_images(product_slug,asset_url,attribution,license_reference,approved,source_url,source_page_url,rights_status,retrieved_on,alt_text) VALUES(?,?,?,?,?,?,?,?,?,?)",
                           (slug, *values))

            # These source-backed verbal tags remain separate from the empty 0–10 measurement table.
            for tag in product.get("tags", []):
                if tag in {"rauchig", "torfig", "malzig", "fruchtig", "honig", "maritim", "zitrus", "salzig", "suess", "birne", "holzig", "vanille", "karamell", "floral", "wuerzig", "nussig", "lakritz", "wacholder", "agave", "schokolade", "cremig", "getreidig", "trockenfrucht"}:
                    label = TAG_LABELS.get(tag)
                    if not label:
                        label = db.execute("SELECT label_de FROM flavor_tags WHERE slug=?", (tag,)).fetchone()
                        label = label[0] if label else tag.capitalize()
                    db.execute("INSERT INTO flavor_tags(slug,label_de) VALUES(?,?) ON CONFLICT(slug) DO NOTHING", (tag, label))
                    db.execute("INSERT INTO product_flavor_tags(product_slug,tag_slug,source_url) VALUES(?,?,?) ON CONFLICT(product_slug,tag_slug) DO UPDATE SET source_url=excluded.source_url", (slug, tag, source_url))

        db.execute("INSERT INTO local_enrichment_migrations(version,applied_on) VALUES(?,?) ON CONFLICT(version) DO NOTHING",
                   ("20261010_official_product_assets_and_flavor_foundation", CHECKED_ON))
        if db.execute("SELECT COUNT(*) FROM products WHERE published<>0").fetchone()[0] != 0:
            raise RuntimeError("A product became published; rolling back")
        if db.execute("SELECT COUNT(*) FROM product_flavor_values").fetchone()[0] != 0:
            raise RuntimeError("Numeric flavor scores appeared unexpectedly; rolling back")
        if db.execute("SELECT COUNT(*) FROM product_images WHERE approved<>0").fetchone()[0] != 0:
            raise RuntimeError("An image became approved unexpectedly; rolling back")
        db.commit()
        os.replace(temp_name, json_path)
    except Exception:
        db.rollback()
        Path(temp_name).unlink(missing_ok=True)
        raise
    finally:
        db.close()

    check = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    counts = {
        "products": check.execute("SELECT COUNT(*) FROM products").fetchone()[0],
        "published_products": check.execute("SELECT COUNT(*) FROM products WHERE published=1").fetchone()[0],
        "product_image_records": check.execute("SELECT COUNT(*) FROM product_images").fetchone()[0],
        "approved_images": check.execute("SELECT COUNT(*) FROM product_images WHERE approved=1").fetchone()[0],
        "numeric_flavor_values": check.execute("SELECT COUNT(*) FROM product_flavor_values").fetchone()[0],
        "tasting_notes": check.execute("SELECT COUNT(*) FROM tasting_notes").fetchone()[0],
    }
    check.close()
    print(json.dumps({"status": "updated_local_only", "backup": str(backup_path), "counts": counts}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
