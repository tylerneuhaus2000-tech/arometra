# Sprint 2 — Quellen- und Lizenzprüfung

Prüfdatum: 2026-10-10. Das ist eine technische Quellenrecherche, keine rechtliche Freigabe.

## Ergebnis

Aktuell gibt es **0 für den AROMETRA-Katalog freigegebene Quellenlizenzen** und **0 reale Produktdatensätze** in Produktkatalog, Import-Staging oder Datenbank. Teacher's Highland Cream ist eine reale, bereits dokumentierte Rechercheaufgabe. Ein dort belegter GTIN-Wert steht ausschließlich im isolierten Prüftest für die GTIN-Prüfziffer und wurde weder als Import-Fixture noch in einer Datenbankzeile gespeichert. Produktbeschreibung, Tasting-Texte, Bilder und weitere Produktfelder wurden nicht übernommen.

Die Supabase-Migration enthält nur Kategorie- und Aromataxonomie. Der Importer-Testbestand unter `test/fixtures/` ist ausdrücklich synthetisch, ohne Produktmarke, Barcode oder Sensorik und wird von Produktionsseiten nicht geladen.

## Geprüfte Quellen

### Open Food Facts

- API-Dokumentation: <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/>
- Lizenzanleitung: <https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/tutorials/license-be-on-the-legal-side/>
- Wiederverwendungsbedingungen: <https://world.openfoodfacts.org/terms-of-use>

Die offizielle Dokumentation unterscheidet Datenbank (ODbL), einzelne Datenbankinhalte (Database Contents License) und Produktbilder (CC BY-SA). Sie verlangt, die Bedingungen zur Weiterverwendung, Attribution und Share-Alike zu beachten; außerdem sind API-User-Agent und Endpunkt-Limits einzuhalten. Beiträge stammen freiwillig von Nutzern; die API-Dokumentation übernimmt keine Gewähr für Genauigkeit und Vollständigkeit.

**Status:** als offene Datenquelle mit konkreten Bedingungen grundsätzlich relevant, aber für den geplanten AROMETRA-Datenbestand `needs_legal_review`. Eine vermischte Datenbank könnte Share-Alike-Pflichten auslösen; Produktbilder haben nochmals eigene Rechte. Vor Import ist zu entscheiden, ob ein abgegrenzter ODbL-Datensatz einschließlich Kennzeichnung und Weitergabepflichten tragbar ist. Es gab keinen API-Abruf und keinen Datenimport.

### Herstellerseiten zu Teacher's Highland Cream

- Offizielle Suntory-Produktinformation: <https://products.suntory.co.jp/d/5010093501815/>
- Offizielle Teacher's-Produktseite: <https://www.suntory.co.jp/whisky/teachers/product/>
- Suntory-Hinweise zur Websitenutzung: <https://www.suntory.co.jp/guide/>
- Suntory Global Spirits Nutzungsbedingungen: <https://www.suntoryglobalspirits.com/terms-conditions>

Die Seiten belegen, dass eine offizielle Herstellerquelle für die Recherche zu Teacher's Highland Cream existiert. Die veröffentlichten Nutzungsbedingungen beanspruchen Rechte an Webinhalten und beschränken deren externe beziehungsweise kommerzielle Wiederverwendung; Bilder, Texte und Marken sind zusätzlich getrennt zu betrachten.

**Status:** geeigneter Recherchekontakt, aber keine nachgewiesene AROMETRA-Datenlizenz. Die Seite wird nicht automatisiert abgerufen und ihre Inhalte werden nicht in eine Produktzeile kopiert. Eine schriftliche Freigabe für konkrete Fakten, Produktabbildungen und Tasting-Inhalte oder eine separat rechtlich geprüfte Erhebungsgrundlage bleibt erforderlich.

## Beschaffungsweg für einen ersten echten Bestand

1. Für die Demo reale Flaschen/Absatzmärkte festlegen.
2. Je Hersteller/Distributor einen Faktenexport oder eine schriftliche Datenfreigabe anfordern: Produktidentität, Varianten, GTIN, ABV, Volumen, Kategorie, Herkunft und zulässige Namensnutzung.
3. Produktabbildungen, Hersteller-Tasting-Text, eigene Verkostungsnotizen und Community-Daten separat lizenzieren/prüfen.
4. Die tatsächliche Lizenz, Bedingungen, Attribution, Abrufweg und Prüfdatum in Quellenregister und Rechteprüfung festhalten.
5. Erste Charge im Dry-Run prüfen, Berechtigte prüfen Rechte und Produktfakten, erst danach privat stagen und später mit fachlicher Freigabe veröffentlichen.
6. Den Katalog erst vergrößern, wenn Feldnachweise, Duplikatquote, Markt-/Variantenlogik und Quellenbedingungen der ersten Charge abgenommen sind.

Ziel 300–500 bleibt eine Planungsgröße, kein erreichter Bestand. Ohne Rechteentscheidung und konkrete Exportfreigaben werden keine Kandidaten hochgezählt.
