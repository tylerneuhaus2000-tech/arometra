# 11 — Offene Entscheidungen / bewusst nicht erfunden

## Vom Auftraggeber oder Ben zu klären
1. **Betreiber und Rechtsverantwortung:** Wer steht im Impressum, wer ist Datenverantwortlicher? (vor Live-Veröffentlichung)
2. **AROMETRA-Domain und Markenrecht:** Welche Domain wird offiziell genutzt? Verfügbarkeit und Kennzeichenrechte sind NICHT bestätigt.
3. **Prüfungsmodus:** Konkretes Datum, Bewertungskriterien, Internetzugang, Live- vs. lokale Demo, technische Infrastruktur.
4. **Demo-Produkte:** Welche echten Flaschen bringt Ben mit? Marken, konkrete Edition, GTIN, Menge und rechtmäßig verwendbare Fotos.
5. **Sensorische Quellen:** Wer verkostet und bestätigt Produktinformationen? Erlaubte Hersteller-/Expertenreviewquellen?
6. **Datenlizenzen:** Können Open Food Facts-Daten in der vorgesehenen DB-Lizenzform genutzt werden? Welche kommerziellen Lizenz-/Attributionspflichten?
7. **Budget:** Supabase-Plan/Hosting/Domain/KI-Lizenzen; vor gebührenpflichtiger Aktivierung freigeben.
8. **Verkaufspartner:** Gibt es echte Kassendaten/Testfiliale? Falls nein: keine behaupteten Verkäufe.
9. **Public Launch:** Reicht private Demo bis Dezember oder öffentliche Production-URL mit rechtlichen Anforderungen?
10. **Preis-/Bestandsdaten:** Noch kein Händler, kein verlässlicher Preisfeed. Funktion deaktiviert.
11. **Review-Community:** Kein offenes Bewertungssystem ohne Missbrauchs- und Datenschutzkonzept.
12. **App-Store:** Native iOS-/Android-App ausdrücklich **nicht** Teil der Startentwicklung.
13. **Mehrsprachigkeit:** Deutsch zuerst; Englisch/i18n-fähiges Datenmodell anlegen, aber keine maschinell erfundenen Produkttexte.
14. **AI-Provider:** Später nach Bedarf; keine API-Keys bereitgestellt, regelbasierte Empfehlungen müssen alleine funktionieren.
15. **Quellenfreigaben:** Zeitlich und rechtlich aktueller Stand muss vor produktivem Massenimport geprüft werden.

## Was Codex ohne Rückfrage sinnvoll entscheiden darf
- Technische kleine Implementierungsdetails und reversible Ordnerstruktur.
- Auswahl einer gut unterstützten Testbibliothek/Komponente im festgelegten Stack.
- Sichtbare, klar gekennzeichnete Demofallbacks/Empty-States.
- Pagination/Default-Suchsortierung, konservative Suchindexe.
- Versionierte Dateistruktur und lokale Buildskripte.

## Wobei Codex nicht improvisieren darf
- Rechtliche Zusicherung zu Bild-/Review-/Datenlizenzen.
- Veröffentlichung fremder Inhalte ungeprüft.
- Kaufdaten, ROI, verfügbare Händlerpreise.
- Nutzer- und Betreiberidentität im Rechtstext.
- Gebührenpflichtige Cloudzugänge ohne Freigabe.
- Kundenbewertungen und Geschmacksprofile ohne nachprüfbare Basis.

## Statusmodell
`UNKNOWN → RESEARCHED → APPROVED/REJECTED`; für jedes ungelöste Thema Eigentümer, Datum, nächster Prüfschritt. Darauf technische Feature-Flags und Blocking-Gates aufsetzen, statt unauffällig Annahmen als Wahrheit auszugeben.
