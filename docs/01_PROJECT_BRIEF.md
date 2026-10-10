# 01 — Product Brief / Scope

## Kontext
Ben führt das Produkt im Rahmen einer schulischen/beruflichen Prüfung vor. Auf dem Tisch stehen einige physische Spirituosenflaschen, die mit QR-Codes versehen sind. Scan führt auf den eindeutig zugeordneten Produktsteckbrief. Die Lehrkräfte erleben einen funktionierenden, hochwertigen Beratungsvorgang: Produktinformationen → Geschmack und echte Erfahrungswerte → alternative Produkte mit sachlichen Gründen. Zusätzlich kann Ben Kategorien, Suche und eine Daten-/Messübersicht demonstrieren.

## Leitfrage
„Kann eine verständliche, individualisierte digitale Spirituosenberatung erwachsene Interessierte dabei unterstützen, neue Produkte zu entdecken, die sie vorher nicht berücksichtigt hätten, und lässt sich die Veränderung des Auswahl- bzw. Kaufverhaltens messen?“

## Outcome-Hierarchie
1. **Verlässlich informieren:** eindeutiges Produkt, belegte Eigenschaften, klare Quellen.
2. **Entdeckung ermöglichen:** relevante ähnliche/andere Produkte erklären, keine irrelevanten Lockvögel.
3. **Beratung erleichtern:** Suche, Filter, Geschmackspräferenzen, Vergleich.
4. **Wirtschaftliche Wirkung prüfen:** Auswahlinteresse messen; tatsächliche Käufe nur mit verifizierter Transaktionsgrundlage.

## Zielgruppen und Jobs-to-be-done
- Erwachsene Interessierte: „Ich kenne Produkt A, will sein Geschmacksprofil verstehen und mögliche Alternativen entdecken.“
- Verkaufspersonal: „Ich will mit zwei bis vier Fragen zu objektiv passenden Produkten beraten.“
- Betreiber/Prüfling: „Ich will produktbezogene Informationen verlässlich pflegen, die Funktion vorführen und legitime KPIs erläutern.“

## Prioritäten
### P0 – Pflicht für Dezember-Demo
- Öffentliche mobile Produktseite ohne Anmeldung; QR-Direktlinks.
- Startseite, Katalog, Produktsuche, Filter auf wesentliche Kategorien.
- Mindestens ein vollständiger, **aus der DB geladener**, überprüfter Produktsteckbrief mit Herkunft, Eigenschaften, belegten Verkostungsnotizen; ideal 20–50 hochwertige Profile, je nach Datenverfügbarkeit.
- Ähnliche Produkte mit erklärbarer Herleitung, sauberer „keine Daten“-Zustand.
- Demonstration mit mehreren physischen QR-Etiketten; ein überprüfter Offline-Fallback/Backup-Szenario für Präsentation.
- Messkonzept und funktionsfähige, datenschutzkonforme Ereignisinstrumentierung, soweit rechtlich freigegeben.
- Sehr gute mobile Bedienbarkeit und reproduzierbare Tests.

### P1 – Bis Mai
- Katalogausbau 300–500 bekannte Produkte als erstes Ziel und darüber hinaus, soweit legal/technisch möglich.
- Fachliche Review-Pipeline, Admin-CRUD, Importer, Quellen- und Bilderverwaltung.
- Geschmacksberater, Produktvergleich, differenzierte Empfehlungsarten.
- Besseres Reporting; Studie/Integration von POS-Daten nur mit Einwilligung/Partner.
- Installierbare PWA nach echter Notwendigkeit.

### P2 – Optional
- Etikett-/Bild-Erkennung, Barcode-Kamera, umfassende Multi-Language-Lokalisierung.
- AI für *sprachliche Erklärungen auf vorhandenen Fakten*, nicht freies Halluzinieren.
- Native App (nur mit begründeten Anforderungen).
- Händlerverfügbarkeit und echte, lizenzierte Preisfeeds.

## Nichtziele
- Kein reiner Spirituosen-Onlineshop in MVP.
- Keine vollautomatische Behauptung aller weltweit verfügbaren Getränke.
- Keine Rezensionen-/Scoring-Fabrik, kein erfundenes Sozialfeedback.
- Kein Tracking von Trinkmengen, keine Anreize zum höheren Alkoholkonsum.
- Keine Werbung an Minderjährige, keine verhaltensmanipulierenden Dark Patterns.

## Beteiligte
- Projektinhaber/technischer Leiter: Nutzer (Tech, Architektur, Web, Codex).
- Fachlicher Verantwortlicher und Präsentator: Ben (Produktexpertise, Flaschenauswahl, Quellennachweise, Review von Beschreibungen, Prüfungsstory).
- Betreiberrechtliche Verantwortlichkeit, Freigaben von Rechtstexten und Bilderrechten: **noch zu benennen**.

## Definition der Prüfungsdemo
Eine Lehrkraft kann mit einem gewöhnlichen Smartphone ohne App-Download eine Flasche scannen; Produktprofil und weiterführende Empfehlungen laden. Die Fachinformationen lassen sich mit Quellen belegen. Die Nutzungs-/Auswertungsansicht macht keine unberechtigten Aussagen über zusätzliche Verkäufe. Die Demo funktioniert mit eigenem Hotspot oder vorher getesteter Netzwerkverbindung; die nötigen QR-Ziele sind vorab geprüft. Bewertet wird die echte Funktion, nicht nur ein Video oder Figma-Layout.

## Annahmen und Risiken
- Demoproduktliste ist noch nicht endgültig; Importumfang hängt von Rechtelagen ab.
- Domain/Markenrechte nicht bestätigt; `AROMETRA` vorerst Arbeitstitel.
- Kein bestätigter Partner für POS- oder Verkaufsdaten.
- Keine rechtliche Freigabe der öffentlichen Alkoholwerbung.
