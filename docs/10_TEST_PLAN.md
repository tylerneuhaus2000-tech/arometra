# 10 — Tests und QA-Matrix

## Qualitätskonzept
Unit-, DB-, Integration-, E2E-, Visual-Smoke- und Security-Tests als überprüfbare Gatechecks. Verzeichnis und Skripte müssen echt existieren; niemals Reports ohne Ausführung generieren. Bei fehlender Toolunterstützung Grund/Alternative dokumentieren.

## Scripts (Soll-Vertrag)
- `npm run lint`
- `npm run typecheck`
- `npm run test` (Vitest)
- `npm run test:coverage` (optional)
- `npm run test:e2e` (Playwright)
- `npm run build`
- `npm run db:test` / `npm run db:reset:local` (nur lokale DB)
- `npm run import:dry-run` und `npm run import:validate` sobald vorhanden

## Unit-Tests
- Normalisierung von Markennamen, Unikode/Diakritika, `Teacher's`/`Teachers` Alias.
- Kategoriehierarchie, Sortier-/Filterparameter mit Zod.
- Volumen `0.7 L → 700 ml`, Alkoholangabe `46 % vol → 46`; ungültige Werte blockieren.
- GTIN/Barcode-Länge und Check-Digit, null erlaubt.
- Empfehlungsscore deterministisch, Sensory-Null ≠ Zero, Ranking-/Diversitätsregeln.
- Quellstatus `blocked` erzwingt Nichteignung für Publishing/Images.

## Datenbank-/RLS-Integration
- Reproduzierbare Migration auf sauberer **lokaler** Instanz.
- Ungültige Fremdschlüssel/Checks/Uniqueness scheitern.
- `anon`: published products lesen möglich, draft/under-review NICHT.
- `anon`: INSERT/UPDATE/DELETE auf catalog, raw imports, events, admin verweigert.
- Nutzer ohne Adminrolle: Adminzugriffe selbst bei bekannter URL verweigert.
- Owner/Editor/Reviewer nur jeweilige berechtigte Aktionen, Rechtegrenzen getrennt.
- View/RPC-RLS-Leakage verhindert, Storage private Bilder nicht öffentlich.
- Rollback/Idempotenz bei fehlerhaftem Import.

## End-to-End (Playwright)
### E2E-01 Public discovery
- `/` lädt, Suche fokussierbar, URL-Suchparameter gesetzt.
- Suche nach bekannter Marke liefert veröffentlichte Ergebnisse.
- Klick Produktkarte führt zu `/p/[slug]`; Name/Marke stimmen mit DB-Datensatz überein.
- Filter ändern sichtbare Trefferzahl und URL zuverlässig.

### E2E-02 Product experience
- Steckbrief zeigt nur belegte Felder, Herkunft/Alkoholgehalt korrekt oder eindeutig unbekannt.
- Kundenrezension ohne Daten zeigt kein Fake-Star-Rating.
- Ähnliche Produkte haben valide DB-Verknüpfung und nachvollziehbare Reasons.
- Klick Empfehlung öffnet anderes reales/freigegebenes Produkt.

### E2E-03 QR
- `/q/[code]` redirect zu korrektem Produkt.
- Codes bleiben bei geändertem Slug gültig.
- Invalid/disabled QR-Code → guter 404/410 Zustand.
- Auf Mobile 390px keine Scrollbalken/Überdeckung, keine Login-Schranke.

### E2E-04 Admin / Security
- Anonym `GET /admin` → Login/Denied; POST unter Loginblocker verboten.
- Public sieht niemals Raw-import, private source licenses oder Eventdaten.
- Fehlgeschlagener Import hinterlässt keinen halbfertigen publizierten Record.
- Einwilligungsbedürftiges Tracking startet nicht vor Consent bzw. bleibt aus bei Opt-out.

### E2E-05 Responsive/A11y
- Breiten: 320, 375/390, 768, 1024, 1440 px.
- Tastatur allein: Header, Suche, Filter, Produktlinks und Dialoge bedienbar.
- WCAG-kontraststarke Texte und klar sichtbarer Fokus.
- Verfügbarkeit von Alternativtexten, Error States, `prefers-reduced-motion`.
- Hero und Produktbilder sorgen nicht für auffälliges CLS.

## Import-Tests
- Gleiches Bundle zweimal → keine Dublette.
- Zwei Editionen gleicher Marke bleiben getrennt.
- 700ml/1000ml bilden Varianten nur bei belegter Quelle.
- Ungültige Source-Lizenz → staged/blocked statt published.
- API 429/503 → Backoff, Abbruch oder verzögerter Retry; keine unendlichen Loops.
- Timeouts/Netzausfall/ungültiges JSON/HTML-Escape/SSRF-Domain-Prüfung.
- Importänderung überschreibt redaktionell geprüfte Felder nicht ohne Review.

## Performance-Tests
- Pagination bei großen Trefferzahlen (50/500/5.000 Fixture Records) und DB-Indexanalyse.
- Suchantwortzeit, SSR-Ladezeit, PWA optional.
- Echte Messungen dokumentieren, p75-LCP-/CLS-Richtwerte als Ziel.

## Testevidenz
In `docs/QA_LOG.md` pro Testlauf: Datum/Umgebung/Commit, Kommandos, Anzahl bestanden/fehlgeschlagen, Evidenzpfade, echte bekannte Probleme. Screenshots unter `artifacts/qa/` oder dem im Repo gewählten Verzeichnis; keine gefälschten Logs.
