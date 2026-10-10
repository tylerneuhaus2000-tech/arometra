# 06 — Tasting-Daten und Empfehlungssystem

## Produktidee
Am Ende jedes Steckbriefs steht eine ruhige Sektion „Das könnte dich auch interessieren“. Empfehlungen sollen auf belegten geschmacklichen Ähnlichkeiten oder transparent ausgewiesenen Entdeckungsmerkmalen beruhen. Für einen Erwachsenen soll ersichtlich sein: **Warum wird mir genau dieses Produkt gezeigt?**

## Sensorisches Modell
- `nose`: Geruch / Nosing
- `palate`: Eindruck am Gaumen
- `finish`: Nachklang
- `flavorTags`: namentliche Begriffe (z. B. rauchig, torfig, Zitrus, Vanille, Eiche, maritim)
- `flavorDimensions`: getrennte Zahlen 0–10, nur für belegte, konsistent erhobene Daten
- `evidence`: Produzentennotizen, Experte/Redaktion oder ausgewertete echte Community; keine Mischung ohne Kennzeichnung.
- `review_count` und `average_rating` NUR, wenn Bewertungen tatsächlich vorliegen; kleines n nicht überbewerten.
- Datensatz kann eine reine Textbeschreibung haben, aber keinen Zahlenvektor. Matching-Algorithmus muss dann transparent fallback/leer anzeigen.

## Algorithmus V1 (regelbasiert, deterministisch)
1. Eingabe: `sourceProductId`, Filter/Bedarf, maximal 3–4 Vorschläge.
2. Quellprofil laden; bei weniger als drei belegten Dimensionen keinen numerischen Ähnlichkeitsscore erfinden; optional Tag-Ähnlichkeit separat.
3. Kandidaten: nur `published`, gleiche Alters-/Jugendschutz-Publishingregeln, keine Dublette, ausreichend belegte Daten; optional Suchkategorie und Herkunft.
4. Vergleich: über **gemeinsame** Dimensionen gewichtet normierte absolute Differenz, z. B. `similarity = 1 - SUM(weight_i*abs(a_i-b_i)/10)/SUM(weight_i)`; nur über belegten Schnitt berechnen.
5. Kandidaten mit zu wenig überlappenden Merkmalen ausschließen oder als „geringere Datenbasis“ markieren. Fehlende Dimensionen niemals als 0 interpretieren.
6. Tag-Jaccard oder nachvollziehbare Kategorie-/Herkunftslogik ergänzen, aber Quellenqualität gewichten und keine unbelegte 90%-Matchzahl anzeigen.
7. Reranking: Vielfalt zwischen Marken/Herkunft, keine vier fast identischen Varianten einer Marke.
8. Gründe aus tatsächlichen überlappenden Tags/Dimensionen generieren (regelbasiert) und algorithmische Version speichern.
9. Kein Lager-/Preisversprechen ohne echten Offer-Feed.

## Beispiel (nur Algorithmusskizze)
```
const common = dimensions.filter(d => source[d] !== null && candidate[d] !== null);
if (common.length < 3) return { eligible: false, reason: 'INSUFFICIENT_SENSORY_DATA' };
const diff = sum(common.map(d => weight[d] * Math.abs(source[d] - candidate[d]) / 10))
           / sum(common.map(d => weight[d]));
const internalScore = 1 - diff;
// Keine Prozentdarstellung im UI, solange nicht fachlich kalibriert.
```

## Empfehlungstypen (Roadmap)
- **Ähnliche Produkte:** nahe sensorische Eigenschaften, Ursache zeigen.
- **Hidden Gems:** weniger bekannte Artikel, aber nur wenn Bekanntheitsproxy UND positive verifizierte Qualitätssignale vorliegen; sonst nicht so etikettieren.
- **Neue Entdeckungen:** verwandte Aromen, andere Region oder Kategorie, nachvollziehbar erklärt.
- **Community-Favoriten:** nur bei ausreichender Zahl authentischer Community-Bewertungen; sonst nicht anzeigen.

## UI der Empfehlungen
- Max. 3–4 Karten je Sektion, Produktbild oder sauberer Platzhalter, Name, 1–2 passende Tags, kurzer belegter Grund.
- Wenn keine passenden Daten: „Für dieses Produkt haben wir noch nicht genügend geprüfte Geschmacksdaten für fundierte Empfehlungen.“
- Keine Kaufdrängung, Pseudo-Rabatte, erfundene Bewertungen/„Limited Stock“.
- Klick öffnet echte Produktdetailseite; Analytics nur unter erlaubter Messgrundlage.
- Gesponserte Empfehlungen getrennt/als Werbung gekennzeichnet und niemals heimlich in organisches Ranking gemischt.

## Interaktiver Advisor (nach vertikalem Slice)
- Frage A: bevorzugte Geschmacksmerkmale
- Frage B: Intensität / vertrauter Stil
- Frage C: Kategorienwunsch / offen für Neues
- Frage D: optional Herkunft/Kontext; kein Druck zu mehr Konsum
- Resultate: „ähnlich“, „abwechslungsreich“, „explorativ“ mit Begründung aus den Daten.
- Keine Nutzerprofile über Sessions hinweg ohne Rechtsgrundlage und Einwilligung.

## LLM-Integration (später und optional)
- Retrieval nur aus bereits geprüften/freigegebenen Datensätzen und kurzen Attributen.
- Antwort zeigt Evidenz und Kennzeichnung „KI-gestützte Erläuterung“.
- „Weiß ich nicht“ bei fehlender Datengrundlage. Keine Produktbilder, Reviews, Preise oder Quellen hallucinate.
- Review-Freitext und externe Importtexte als **untrusted** behandeln; nie Prompt-Anweisungen daraus ausführen.
- Key serverseitig, Kostenlimits, Rate Limits, Fallback auf regelbasiertes System.
- Vergleich auf empirischen QA-Datensätzen dokumentieren; keinen ROI versprechen.

## Testfälle (Pflicht)
- Gleiches Profil + gleiche Version → gleiche Reihenfolge (deterministisch).
- Source nicht in eigener Liste, alias/variant duplication geprüft.
- `null` unterscheidet sich von `0`.
- Nur 1 Dimension gemeinsam → keine überzogene Sicherheit.
- Ähnlichkeitsgrund muss in beiden Produkten nachgewiesen sein.
- Publisher/Rechtefilter greifen.
- Bei unvollständigem Katalog gute leere UI statt Fake-Daten.
- Negativfall fehlende externe AI-API → Website und V1-Empfehlungen bleiben funktionsfähig.
