# 07 — Analytics, Kennzahlen und Prüfung des Verkaufseffekts

## Geschäftslogik
AROMETRA soll erklären und messbar machen, ob digitale Produktinformationen dazu beitragen, dass Erwachsene zusätzliche bislang unberücksichtigte Produkte in ihre Auswahl aufnehmen. **Ein Scroll, Scan oder Klick ist kein nachgewiesener Kauf.**

## Messschichten
1. **Nutzung:** Seitenaufrufe, Suchanfragen, Produktinformationen, Beratungsstarts.
2. **Entdeckung:** Klick auf Alternative, Wechsel zu zuvor nicht gesuchter Marke/Kategorie, Produktvergleich.
3. **Kaufabsicht:** Merklisten/Vormerkungen oder freiwillige Umfrage; Proxy, kein Verkauf.
4. **Tatsächlicher Kauf:** nur echte POS-/Order-Daten mit belegbarer Produktkennung.
5. **Inkrementeller Effekt:** Pilot mit passender Kontrollbedingung und statistischer Vorsicht.

## Ereignisschema (erste Version, im Zweifel Consent-gated/off)
Einheitliches `event_id` (dedup), `schema_version`, `event_name`, `timestamp`, `product_id nullable`, `source_product_id nullable`, `recommendation_id nullable`, `qr_code_id nullable`, `placement_id nullable`, `algorithm_version nullable`, `ui_surface`, `consent_state/version`, `source_context` (interne, nicht personifizierende Kennzeichnung). Keine Roh-IP/Geolocation/Device fingerprint ohne separate rechtliche Grundlage.

Vorgeschlagene Eventnamen:
- `product_view`
- `qr_landing` (nicht zwingend echter QR-Scan!)
- `catalog_search`
- `filter_used`
- `advisor_started`
- `advisor_completed`
- `recommendation_impression`
- `recommendation_clicked`
- `comparison_started`
- `product_saved`
- `purchase_confirmed` (nur echte, vertrauenswürdig nachgewiesene Transaktion)

## Wichtig für QR-Attribution
Aufruf über `/q/code` lässt erkennen, dass ein spezifischer QR-Link verwendet wurde; derselbe Link kann aber geteilt/abgetippt sein. Benenne Kennzahl deswegen „QR-Landing-Aufrufe“; nicht automatisch „physische Scans“. Wiederholte Views sind nicht eindeutige Besucher. Stelle Exponierung und Engagement getrennt dar.

## Funnel (mit korrekten Nennern)
`QR landing sessions → Produktdetail geöffnet → Empfehlungen tatsächlich sichtbar → Empfehlung geklickt → alternatives Produkt angesehen → optional Kauf bestätigt`.
- Denominator jeder Übergangsrate definieren.
- Events serverseitig/consent-konform deduplizieren; während Demo keine fiktiven Ereignisse ohne Demo-Flag.
- Immer „Beispieldaten“ oder „Echte Daten“ unterscheiden.

## Beispiel-KPIs und Formeln
- **Recommendation CTR** = Empfehlungsklicks / tatsächlich erfasste Empfehlungseinblendungen.
- **Discovery share** = Sitzungen mit alternativer Produktansicht / betrachtete Sitzungen, Definition eindeutig.
- **QR engagement rate** = Sessions mit sinnvoller Interaktion / qualifizierte QR-Landings.
- **Conversion rate** = bestätigte Käufe / klar definierte geeignete Besucher-/Transaktionsbasis, nur wenn Tracking rechtmäßig und Zuordnung tragfähig.
- **Uplift im Test** = (ConversionTest - ConversionControl) / ConversionControl, unter Vorbehalt von Auswahlverzerrung, Saison, Sonderaktionen und Stichprobengröße.

## Studienvorschlag für Ben
- Ein kooperierender Einzelhändler mit geeigneten Produktgruppen/Filialen/Zeiträumen ist ideal.
- Pilotgruppe: ausgewählte Regalplätze/Filialen/Zeiten mit QR-Beratung.
- Kontrolle: vergleichbare Bereiche/Zeiten ohne Intervention oder randomisiert, wenn realistisch.
- Preise/Promotions/Verfügbarkeit/Positionierung möglichst konstant halten; Störfaktoren dokumentieren.
- Vorab Erfolgskriterien, Studiendauer, Stichprobengröße und passende Messmethode definieren.
- Ethik, Datenschutz und zulässige POS-Datenübermittlung prüfen.
- Falls keine Verkaufsdaten verfügbar: **nur Interesse/Engagement belegen**, niemals Verkaufssteigerung behaupten.

## Admin-Dashboard
- Start nur 4–6 wirklich wichtige Kennzahlen (Katalogaufrufe, QR-Landings, Advisor-Abschlüsse, Empfehlungsklicks, Top-Alternativen, validierte Käufe nur wenn vorhanden).
- Filter nach Zeitraum/Produkt/Placement, klare Null- und Nichtverfügbarkeitszustände.
- Demo-Modus ausdrücklich als Demo markieren und technisch von realen Analytics trennen.
- Diagramme müssen Quelle und Datenzeitraum ausweisen.

## Privacy by design
- Zunächst datensparsame technische Telemetrie und Consent-/Rechtsgrundlagenprüfung; keine unnötigen Ad-Tracking-SDKs.
- Möglichst Aggregation und begrenzte Aufbewahrung; genaue Fristen dokumentieren.
- Einwilligungsbedürftige Drittanbieter-/Client-Messung standardmäßig deaktiviert, bis eine geeignete Consent-Lösung vorhanden ist.
- Sensible Cookies/Identifikatoren nicht in URLs/Events, keine Roh-Transaktions-Personenprofile.
- Testcases überprüfen Ablehnung/Widerruf/keine Ereignisse vor erforderlicher Einwilligung.
