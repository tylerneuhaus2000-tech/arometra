# 02 — Modern Oak: Minimal UI/UX-Spezifikation

## Designprinzip
**Clean editorial luxury, nicht Whisky-Shop-Kitsch.** AROMETRA muss aufgeräumt sein, nicht exklusiv durch Masse an Gold/Holz/Animation wirken. Vertrauenswürdige Beratung ist wichtiger als Verkaufseffekte.

## Design-Tokens (Startwerte; nach Screenshottest leicht anpassbar)
```
--bg: #151311;
--surface: #211D19;
--surface-raised: #30251E;
--accent: #C79B67;
--text: #F0E8DD;
--text-muted: #C3B7A8; /* AA-Kontrast gegen konkrete Flächen prüfen */
--border: #40352D;
--danger: #D68B79;
--success: #9EBC99;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--content-max: 1280px;
```
Fonts: elegante, **gut lesbare** Serif für Headline (max. 2 Schriftfamilien gesamt), klare Sans für alle UX-Labels und Inhalte. Schrift via datenschutzbewusste lokale Assets, Lizenz beachten. Fließtext mind. ca. 16 px. Headlines sparsam.

## Layoutregeln
- 8-pt-Spacingsystem (4 px als Unterteilung); Sektionen 48–96 px vertikal, je nach Viewport.
- 1 Haupt-CTA pro Oberbereich; secondaire Aktionen zurückhaltend.
- Keine 6-up-Karten, keine verschachtelten Kartengruppen, keine großen Tabellen im Public-Frontend.
- Ein Produktbild + Beschreibung + Aromen visuell priorisieren; Kundenbewertungen als belegte Sektion, nicht als Fake-Sterne.
- Holz punktuell: subtiler Hero-Gradient oder Hintergrund einer Produktfotografie, nie vollflächige Holzmaserung hinter Lesetext.
- Dünne Separatoren nur wenn notwendig. Glas-/Glow-/Blur-/Goldrahmen-Effekte vermeiden.
- Animationen nur dezent und abschaltbar; keine Auto-Slider.

## Navigation / Seiten
### Startseite `/`
- Header: AROMETRA, `Entdecken`, `Beratung`, Suche. Mobile: kompakter Header, Suche sichtbar.
- Hero: eine klare Headline („Spirituosen. Verstehen. Entdecken.“ als Copy-Vorschlag), ein Satz Erklärung, zentrale Suche/CTA; großräumig, ohne Produktwand.
- Darunter kleine Kategorieauswahl (max. 4–6 sichtbar + „Alle“), kurzer Abschnitt „So funktioniert’s“ (QR → Geschmack → Alternativen) und optional 3 fachlich kuratierte Highlights.
- Kein überladenes Marketing-Carousel, keine unechten Statistiken.

### Katalog `/entdecken`
- Desktop: schmale einklappbare linke Kategorie-/Filterspalte oder kompaktes Filterpanel; Hauptbereich mit Suchleiste und gut luftiger 3-Spalten-Ansicht bei großer Breite. Auf 1280px ggf. drei, auf Tablet zwei, Mobil eine oder zwei, je nach Lesbarkeit.
- Eindeutige Suche (Name, Marke, Kategorie), Filter Herkunft/Typ, Aroma nur wenn vorhanden, Sortieren (Relevanz/Alphabet); Katalog ist per URL query-state teilbar.
- Produktkarte: lizenzierter Crop oder neutraler Platzhalter; Name, Marke, 1–2 belegte Geschmackswörter, ggf. ABV. Keine dauerhaften „Kaufen!“-Buttons überall.
- Loading/Skeleton, Empty/Error, Pagination/„Mehr laden“, klare Datenverfügbarkeit.

### Steckbrief `/p/[slug]`
- Oben: Breadcrumb, Produktname, Untertitel, große bildliche Präsenz, harte Fakten (Herkunft, Kategorie, ABV, Alter falls belegt).
- Sektion `Charakter & Geschmack`: Geruch, Geschmack, Finish und nachvollziehbare Aromatags, Skalen nur wenn tatsächlich erhoben und markiert.
- Sektion `Erfahrungen`: Autor/Quelle/Datum/Review-Status unterscheiden; ohne echte Reviews eine ehrliche Leermeldung.
- Sektion `Ähnliche Spirituosen`: 3–4 Karten (nicht 20), klare textliche Begründung, Unterschiede sichtbar; ein echter Link pro Karte.
- Produktvergleich als dezenter CTA. Quellen und Stand klar kennzeichnen.
- Scannen landet direkt hier ohne vorgeschaltete Homepage, Cookiewall oder Registrierung.

### Beratung `/beratung`
- Maximal 3–5 schlichte Fragen zu Geschmackspräferenzen, vorhandener Erfahrung und Kategorie; Preise nur wenn reale Preisquelle.
- Erklärung der Auswahlgrundlage, keine „KI weiß genau, was du willst“-Behauptungen.
- Ergebnisse: drei differenzierte Vorschläge plus Gründe; Fehlende Eignung ehrlich anzeigen.

### Admin `/admin`
- Funktional vor ästhetisch: Sidebar, Produkttabelle, Validierungsbadges, Quelllinks, Reviewworkflow, Importvorschau, Analytics; keine Public-Style-Spielereien.

## Mobile Anforderungen
- Mobile-first an 320, 375, 390, 768, 1024, 1440 px prüfen.
- Tap-Ziele ausreichend groß; sticky Header nur bei echter Hilfe; QR-Einstieg ohne sichtbare Verzögerung.
- Karten nicht auf eine enge 3-Spalten-Mobilansicht pressen.
- Keine horizontale Scrollbar; Modals nicht als einzige Darstellung wichtiger Fakten.
- Hoher Kontrast, sichtbarer Fokus, respektiere `prefers-reduced-motion`.

## Copy / Tone
- Klar, elegant, ruhig; sachliche Begriffe statt aggressiver Verkaufsrhetorik.
- `Ähnliche Spirituosen`, `Warum diese Empfehlung?`, `Geschmacksprofil`, `Entdecke Alternativen`.
- Keine Fake-Badges wie „95 % Match“, wenn Algorithmus nicht kalibriert.
- Keine unbewiesene „Bestseller“- oder „Geheimtipp“-Kennzeichnung.

## Screenshot-Review (Pflicht für Codex)
1. Öffne Startseite/Katalog/Steckbrief Desktop und Mobil per Browser/Screenshot.
2. Prüfe Clutter, Headerhöhe, Scrolltiefe, Lesbarkeit, Kontraste, Bildqualität, CTA-Dichte.
3. Verbessere visuelle Probleme, bevor du neue Seiten anfängst.
4. `design-reference/last_ui_concept.png` als Richtung; Anti-Clutter-Regeln haben Priorität.
