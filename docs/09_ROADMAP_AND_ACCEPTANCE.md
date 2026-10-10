# 09 — Roadmap mit Abnahmekriterien und Priorisierung

**Zeitrahmen:** Stand 10.10.2026; Demo Dezember 2026; vollständiger Ausbau Mai 2027. Zeiten sind Planung, keine garantierten Liefertermine.

## Sprint 0 — Foundation / Woche 1
**Ziel:** reproduzierbares Webprojekt, lokale DB, CI, Grunddesign, klare Architektur.

Aufgaben:
- Repository-Audit, klares separates Projekt, Branch/Commitstrategie, Versionscheck.
- Next.js App Router + TypeScript strict + Tailwind, schlanke Projektstruktur.
- Supabase lokal starten oder klaren, isolierten Entwicklungsmodus vorbereiten, `.env.example`/`.gitignore`.
- Grundkomponenten, Themes und typografische Tokens aus `02_UI_DESIGN_SYSTEM.md`.
- SQL-Migration für Kernidentitäten/Quellen/QR, generierte DB-Typen.
- Lint, Typecheck, Vitest, Playwright-Skeleton, CI.

**DoD:** `npm ci`, `npm run dev`, `lint`, `typecheck`, `test`, `build` erfolgreich auf dokumentierter Umgebung; Migration lokal reproduzierbar; kein Secret im Repo.

## Sprint 1 — First vertical slice / Wochen 2–3
**Ziel:** Das zentrale Produktversprechen funktioniert end-to-end.

Aufgaben:
- Startseite, Katalog, Produktdetail, QR-Redirect (mobil/desktop).
- Datengestützte Kategorien und Produkte aus DB (nur geprüfte Quellen) und alternativ klar gekennzeichneter Testfixture-Modus bei realem Blocker.
- Suche nach Namen/Marke inkl. Teacher's und Alias, einfache Kategorie-/Aromafilter.
- Verkostungssektion sauber nur mit Daten füllen, keine Sterne-Dummies.
- Erste erklärbare ähnliche Produkte bzw. ehrlicher Leerzustand.
- Mobile Playwright-Test, QR-Direktlink, Fehl-/Leerseiten.

**DoD:** `/entdecken` → `/p/[slug]` → `/q/[code]` und zurück nachvollziehbar; mindestens ein prüfbarer Produktdatensatz; keine statische Fassade; RLS-/Public-Publish-Test; Visual-Screenshots und QS-Protokoll.

## Sprint 2 — Datenworkflow / Ende Oktober–November
**Ziel:** Legal skalierbarer Katalog statt manuelle Hardcode-Pflege.

Aufgaben:
- `sources`, `import_jobs`, `import_records`, `field_provenance` vollständig.
- CSV/JSONL Import-Adapter mit Dry-Run, Normalize, Dedup, Stage, Review, Publish.
- Admin-Rollen/CRUD/Review/Storage-Quelllizenzen.
- Identifikation der ersten 300–500 Kandidaten als Ziel. Keine unlizenzierte Massenspeicherung.
- Mindestens 20 fachlich geprüfte detaillierte Demoprofile anstreben (Ben liefert Informationen).

**DoD:** Doppelte Importe bleiben idempotent; unfreigegebene Daten öffentlich unlesbar; Produktrichtlinie dokumentiert; Reviewer kann Änderungen nachvollziehen.

## Sprint 3 — Beratungsdemo / November–Dezember
**Ziel:** Präsentationsfähige Nutzung mit physischen Flaschen.

Aufgaben:
- Beratung mit 3–5 Fragen, einfache erklärbare Suchergebnisse.
- Produktvergleich von zwei Produkten, Differenzhinweise und Quellen.
- QR-Etiketten als druckbares, ausreichend kontrastreiches PDF/PNG falls technisch zweckmäßig, jeder Link mit Zielvalidierung.
- Consent-gerechte, optional abschaltbare Events, kleines internes Auswertungsdashboard ohne Umsatzbehauptungen.
- Demo-Skript und Checkliste: Laptop, Smartphone, Internet/Hotspot, Demo-Flaschen, geprüfte QR-Codes, Offline-/Backup-Alternative.
- Generalprobe mit Ben, Fehlerbehebung, Performance/E2E-Screenshots.

**DoD:** Lehrkraft scannt erfolgreich reale Flasche → Produktseite → Geschmacksdaten/Quellen → verwandte Produkte, ohne Login. Ben kann erklären, was gemessen ist und was nicht. Keine falschen Live-Kaufzahlen.

## Sprint 4 — Ausbau / Januar–März 2027
**Ziel:** internationaler Katalog und hochwertige Beratung.
- Weitere lizenzierte Quellen/Herstellerprodukte, Qualitätsprüfungen, erweiterte Filter.
- Erweiterte Geschmacksaggregation mit nachvollziehbaren Methoden und Reviewworkflow.
- Relevanztests für Hidden Gems/Entdeckung; Qualität vor künstlicher Vielfalt.
- Accessibility, SEO, Performance, lokalisierbare Texte.
- PWA falls sinnvoll, nicht zwingend native App.

## Sprint 5 — Wirkungstest und Abschluss / April–Mai 2027
**Ziel:** Stabilität, fachliche Auswertung und Dokumentation.
- Händler-/POS-Partnerschaft nur wenn real verfügbar und datenschutzrechtlich geklärt.
- Pilotexperiment mit Kontrollbedingung planen/umsetzen; sonst ehrlich nur Engagement messen.
- Sicherheitsprüfung, Datenlizenz-/Rechtstexte, Backup/Recovery, finaler QA-Bericht.
- Ben erhält Präsentationsunterlagen und nachvollziehbares Produktziel/KPI-Storytelling.

## Prioritätsentscheidungen bei Verzug
1. Funktionierender QR→Produkt→Empfehlung-Flow (unverzichtbar)
2. Datenqualität und geprüfte Demo-Flaschen
3. Mobile Bedienung und Stabilität
4. Grundlegende Suche/Kategorien/Erfahrungen
5. Importierbarkeit und Adminworkflow
6. Einfacher Advisor/Vergleich/Analytics
7. Breite internationale Abdeckung
8. KI, OCR, native App (kürzbar)

## Nicht als „fertig“ deklarieren, wenn
- nur Mockdaten erscheinen, ohne sichtbare Kennzeichnung;
- QR-Code auf falsche Produktseite führt;
- Geschmacksbeschreibung ohne Quelle fingiert ist;
- Adminroute ohne Rolecheck erreichbar ist;
- Empfehlungsalgorithmus zufällige Karten ohne Begründung zeigt;
- Scriptfehler/Typecheck/Build/Tests fehlschlagen;
- 300–500 Produkte nur Marken, Dubletten oder unfreigegebene Kandidaten sind;
- eine Verkaufssteigerung ohne tatsächliche Messgrundlage behauptet wird.

## Sprintberichtvorlage
```
AROMETRA / Sprint X — Status
Scope umgesetzt:
Geprüfte Nutzungsflüsse:
Daten: X published / Y staged / Z reviewed / Quellen:
Tests: lint / typecheck / unit / integration / E2E / build (Befehl + Ergebnis):
Security: RLS allow/deny, secret scan, Inputs:
UI: Desktop-/Mobil-Screenshots, erkannte Probleme:
Git: lokaler Commit / branch / remote push (nur tatsächlicher Status):
Blocker/Risiken:
Nächster Schritt:
```
