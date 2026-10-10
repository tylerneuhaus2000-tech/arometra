# 05 — Datenquellen, Import, Qualität und Provenienz

## Ziel
Baue eine wiederholbare Pipeline zum Aufbau eines großen internationalen Katalogs. **Nicht** behaupten, dass „alle Spirituosen im Internet“ legal/einfach importierbar sind. Startziel 300–500 bekannte, identifizierte Einzelprodukte; Veröffentlichung nur nach Qualität-/Rechteprüfung. Mehrere tausend langfristig möglich, nicht zugesichert.

## Datenklassen – getrennte Freigaben
1. **Fakten:** Name, Marke, Herkunft, Kategorie, ABV, Volumen, Alter, Edition, EAN. Pro Feld Quelle + Prüfstatus.
2. **Redaktionelle Inhalte:** selbst verfasste Texte auf Basis nachweisbarer Fakten, fachlich durch Ben überprüft. Keine unzulässige Übernahme fremder Texte.
3. **Sensorische Aussagen:** Hersteller-Tasting-Notes vs. unabhängige professionelle Reviews vs. echte Kundenberichte strikt unterscheiden.
4. **Fotos:** eigenständige Bild-Lizenz-Prüfung und Attribution. Nicht allein durch einen API-Datensatz freigegeben.
5. **Bewertungen:** Mittelwert und Anzahl nur bei tatsächlich vorhandenen, rechtmäßig nutzbaren Bewertungen; Originaltexte nur mit Rechtebasis.
6. **Verkaufsangebote:** zeitbezogene, überprüfbare echte Händlerinformationen, falls später verbunden.

## Quellenregister (vor Import)
Für jeden Connector in `sources` bzw. `data-sources.yaml`:
- Source-ID, Eigentümer, Homepage/API-URL
- Lizenz/Nutzungsrecht für Datenbank, Einzelfakten, Texte und Fotos **getrennt**
- API-/Export-Zugang, ToS, robots-Regeln, Rate-Limits, Attribution
- Zugriffsmethode, Updatefrequenz, Ansprechpartner/Freigabe
- Kopier- und Ableitungsrechte, Share-Alike/Weitergabe-Anforderungen
- Rechtlicher Reviewstatus (`approved`, `needs_legal_review`, `rejected`)
- Zeitpunkt des Checks und Evidenz-URL
- Qualitätsrisiko und Abdeckungsbereiche

## Quellenkandidaten
- Offizielle Herstellerseiten: legitime Recherche einzelner Fakten, Nutzungsrechte an Texten/Bildern separat prüfen.
- Open Food Facts: API und Bulk Export; ODbL für DB, gesonderte Bildrechte, mögliche Share-Alike-Pflichten. Vor Produktionsimport Lizenzberatung/Entscheid treffen; Daten nicht unkontrolliert in private proprietäre Gesamt-DB mischen.
- Offizielle Lizenzanbieter/Distributoren oder Händlerkooperationen: Verträge, Nutzungszweck klären.
- Whiskybase u. ä.: nur wenn API und Lizenz für den konkreten Anwendungsfall zulässig; keine Scrapes ohne Erlaubnis.
- Von Ben selbst geprüfte Produktinformationen, eigene lizenzierte Fotos und eigene redaktionelle Verkostungsnotizen.

## Adaptervertrag (TypeScript-Skizze)
```
type ImportCandidate = {
  provider: string;
  providerItemId: string;
  raw: unknown;
  sourceUrl?: string;
  retrievedAt: string;
  rightsStatus: 'approved' | 'needs_review' | 'blocked';
};
interface CatalogSourceAdapter {
  discover(cursor?: string): Promise<ImportCandidate[]>;
  normalize(candidate: ImportCandidate): Promise<NormalizedCandidate>;
}
```
`NormalizedCandidate` getrennt von Domain-Entitäten mit unveränderter Quellenreferenz. Nur Server-/CLI-Code. Keine Secrets im Frontend.

## Pipeline in sieben Stufen
1. **Discover** – Quellen/Marken/Abfüllungen sammeln; Seed-Brands sind nur Kandidaten.
2. **Fetch** – Batch/Export mit Limits, Backoff, Request-ID, optional ETag/Caching.
3. **Normalize** – Unicode, Dezimaltrennzeichen, Maßeinheiten, Sprachvarianten; ml/vol%, ISO-Ländercodes.
4. **Validate** – Pflichtfelder, plausibles ABV, echte URLs, GTIN-Validierung, Quell-/Bild-Lizenzen.
5. **Match** – Existing brand/Product/Variant erkennen, konservativ bei Edition/ABV/Volume-Konflikt. Konflikte in Review Queue statt falsche Merge.
6. **Stage** – unveröffentlichte Kandidaten mit Diff, Qualitätsstatus, Fehlern, Quellen.
7. **Approve/Publish** – Reviewer bestätigt; Public-Read/Index, cache invalidation, Auditrevision.

## Deduplikation – keine verlustreiche Automatik
- Priorität eindeutige vertrauenswürdige GTIN auf Variante, dann Provider-ID, fachlich kontrollierter Fuzzy Match aus Marke + Produkt + Edition + ABV + Volume + Markt.
- Groß-/Kleinschreibung/Unicode normalisieren. „Teacher's“ und „Teachers“ Suchaliase, nicht separate Marken.
- Nie Edition 10 Jahre mit 12 Jahre zusammenführen; nie limitierte Edition mit Standard.
- Gleiche Spirituose in 700ml und 1l als unterschiedliche Varianten, wenn belegt.
- Entgegenstehende ABV-Angaben nicht still überschreiben; Marktabhängigkeit/Quelle prüfen.

## Verifizierungs-/Qualitätsstufen
- `catalog_candidate` – recherchierter Name ohne geprüfte Detaildaten.
- `basic_verified` – Identität + Kategorie + Hersteller/Herkunft anhand Quelle belegt.
- `sensory_verified` – echte, lizenzrechtlich zulässige Notizen, dokumentierte Methode.
- `editorial_approved` – Fachprüfung und öffentlich freigegeben.
- `needs_review` – Konflikt, unklare Lizenz oder mangelnde Qualität; bleibt privat.

## Import-Kommandos (von Codex zu implementieren)
```
npm run import:dry-run -- --source=<id> --limit=50
npm run import:stage -- --source=<id> --limit=50
npm run import:validate
npm run import:report
# publish ausschließlich im admin-review mit Berechtigung
```
CLI muss echte Optionen unterstützen; diese sind **Soll-Verträge**, keine Behauptung, dass bereits existierende Scripts vorliegen.

## Logging und Fehler
- Job-ID, Quelle, Anzahl entdeckt/verarbeitet/dupliziert/rejected/published, Laufzeit.
- Kein Ausdrucken großer geschützter Rohdatensätze oder Tokens.
- Retries mit Exponential Backoff + Jitter und HTTP Statusbehandlung; Block-Status bei 403/429/ToS-Konflikt.
- Import jederzeit idempotent wiederholbar. Versionierung der Normalisierung.
- Debug/QA kann Staged Items ohne direkten Publikationszwang prüfen.

## Beschaffung der ersten Produktdaten
- Ben und Team liefern die realen Demo-Flaschen/GTIN und erlaubte Fotos, Quelle + Fachprüfung.
- Redaktionell kuratierte, bekannte Marken nach `docs/13_SEED_BRANDS.md` systematisch recherchieren.
- **Nicht** auf gut Glück Hunderte Seed-Einträge mit generischen „rauchig, fruchtig“ erzeugen.
- Wenn Datenrechte ungeklärt: Import-Connector + Staging + offene Aufgabe liefern, keine rechtsunsichere öffentliche Veröffentlichung.

## Prüfbericht
Codex soll pro Importlauf Anzahl je Qualitätsstufe mit Ursprung zeigen und behauptete 300–500 Produkte nur zählen, wenn es **eindeutig identifizierte Einzelprodukte mit auditierbarer Quelle** sind. Markenanzahl und Produktanzahl separat.
