# AROMETRA – Codex-Startpaket

**Stand:** 10. Oktober 2026  
**Projekt:** AROMETRA – internationale, datenbasierte Spirituosen-Beratung und Produktentdeckung  
**Prüfungsdemo:** Dezember 2026 · **Projektabschluss:** Mai 2027

## So verwendest du dieses Paket

1. Lege einen neuen, leeren lokalen Ordner `AROMETRA` an. **Nicht in Project One arbeiten.**
2. Entpacke den gesamten Inhalt dieses Pakets in den neuen Projektordner. `AGENTS.md` muss im Projekt-Stammverzeichnis liegen.
3. Öffne genau diesen Ordner mit Codex. Stelle den bisherigen finalen UI-Entwurf unter `design-reference/last_ui_concept.png` bereit (ist im Paket enthalten). Dieser Entwurf ist nur eine visuelle Referenz; die geschriebenen Clean-Design-Regeln haben Vorrang bei Konflikten.
4. Kopiere den gesamten Text aus `00_CODEX_MASTER_PROMPT.md` in die erste Codex-Nachricht.
5. Codex soll **erst Bestandsaufnahme und Planung**, dann **den ersten vertikalen End-to-End-Durchlauf** implementieren; keine 500 erfundenen Produktprofile erzeugen.
6. Wenn Codex Zugangsdaten benötigt, lege ein **eigenes** Supabase-Projekt für AROMETRA an und verwende lokal `.env.local`. Geheimnisse niemals in Chat, GitHub oder Markdown-Dateien schreiben.
7. Lies nach jedem Sprint `docs/09_ROADMAP_AND_ACCEPTANCE.md` und den echten QA-Bericht. Bei fehlenden Zugängen muss Codex einen funktionierenden lokalen Pfad mit klar als Demo gekennzeichneten Testdaten liefern.

## Dateien

- `00_CODEX_MASTER_PROMPT.md` – ausführlicher Startauftrag, direkt in Codex einfügen
- `AGENTS.md` – verbindliche Regeln für Codex und Unteragenten
- `docs/01_PROJECT_BRIEF.md` – Ziel, Zielgruppe, Scope, Termine
- `docs/02_UI_DESIGN_SYSTEM.md` – visuelle Regeln und Seitenarchitektur
- `docs/03_ARCHITECTURE.md` – Tech-Stack, Module, Routen, Deployment
- `docs/04_DATABASE_SPEC.md` – Datenmodell, Beziehungen, Constraints, RLS
- `docs/05_IMPORT_AND_PROVENANCE.md` – Katalogquellen, Imports und Rechte
- `docs/06_RECOMMENDATIONS_AND_TASTING.md` – Geschmacksdaten, Empfehlungsalgorithmus
- `docs/07_ANALYTICS_EXPERIMENT.md` – Events, KPIs, Studienplanung
- `docs/08_SECURITY_PRIVACY_LEGAL.md` – Sicherheit, Datenschutz, Jugendschutz
- `docs/09_ROADMAP_AND_ACCEPTANCE.md` – Sprintfolge und Abnahmekriterien
- `docs/10_TEST_PLAN.md` – Unit-, Integration-, DB- und E2E-Tests
- `docs/11_OPEN_DECISIONS.md` – bewusst noch ungeklärte Dinge
- `docs/12_REFERENCES.md` – aktuelle Quellen und Dokumentationen
- `docs/13_SEED_BRANDS.md` – Marken als Recherchekandidaten, KEINE verifizierten Produkte
- `design-reference/last_ui_concept.png` – zuletzt erstellte Designrichtung

## Wesentliche Spielregeln

- AROMETRA zuerst als **responsive Website**, später installierbare PWA, native App nur bei begründetem Mehrwert.
- Keine erfundenen Bewertungen, Preise, Lieferbarkeiten, Verkostungsnotizen oder Produktfotos.
- „Alle weltweit bekannten Spirituosen“ ist ein **Ausbauziel**, keine Zusage einer vollständigen Datenbank.
- Der erste Nutzungsablauf muss echt funktionieren: Katalog → Produktsteckbrief → ähnliche Produkte → QR-Direktlink.
- Verkäufe werden nie aus bloßen Aufrufen oder Klicks abgeleitet.
- Alkoholbezogene Werbung richtet sich ausschließlich an Erwachsene. Keine Aufforderung zu erhöhtem Konsum und keine manipulative Dringlichkeit.

## Hinweis zu den Ressourcen

Das Paket enthält Spezifikationen und Designreferenzen, **keinen bereits fertig entwickelten Web-App-Code**. Codex soll den Code gemäß den Dokumenten implementieren. Die Rechtsabschnitte sind Planungsanforderungen, keine abschließende Rechtsberatung.
