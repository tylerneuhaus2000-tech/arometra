# 08 — Security, Privacy, Rechtsrisiken und Launch-Gate

**Dieses Dokument ist eine technische Risiko-/Prüfliste, keine abschließende Rechtsberatung.** Juristische Freigaben sind vor öffentlichem Produktivbetrieb durch den tatsächlichen Betreiber einzuholen.

## Security by default
- Next.js/Cookie-/Session-Konfiguration nach aktuellen offiziellen Dokumentationen.
- Supabase `anon`/Publishable Key ist nicht gleichbedeutend mit Adminzugriff; RLS + GRANT + serverseitige Rollenprüfung sind zwingend.
- Secret/service-role Key nur auf Trusted Server/CLI. Niemals in Bundle, `NEXT_PUBLIC_`, Screenshots, Git oder Logs.
- Schutz vor IDOR: Produktstati, Freigabe, Admin-Scope und Import-Jobs auf DB- und Serviceebene prüfen.
- Kein Self-Service-Gewähren von Adminrechten; separate vertrauenswürdige Bootstrap-Prozedur für initialen Owner.
- Zod an jeder externen Eingabegrenze; length/range limits; SQL nur parametrisiert; keine gefährliche dynamische Query-Konstruktion.
- Sichere Bild/Dateiuploads: MIME, Größe, Name, sichere URLs, nur erlaubte Storage-Folder, kein `svg`-HTML untrusted.
- XSS: Review- und Importtexte nicht ungeprüft als HTML rendern, niemals `dangerouslySetInnerHTML` mit fremden Texten.
- Kein SSRF beim Quellfetching: erlaubte Hosts, Block privater Adressen/Redirects, Timeout, Size-Limit, MIME, Redirect-Limit.
- Rate-Limits, Abuse-Protection auf Suche, Events, Admin/Auth, öffentlich erreichbaren APIs.
- Sicheres Fehlerlogging ohne personenbezogene Inhalte/Token.
- Dependencies monatlich/ausschlaggebend prüfen, keine automatischen Major-Updates ohne Tests.
- Backups und Restore-Probe für produktive DB später vorbereiten; niemals remote destruktives `db reset`.
- Security-Header/CSP in geeignetem Umfang, HTTPS und Cookieattribute (HttpOnly/Secure/SameSite).

## Rechtliche Pflichtprüfungen
### Alkohol / Jugendschutz
- § 9 JuSchG: Spirituosenabgabe an Kinder/Jugendliche untersagt; bei späterem Verkauf sichere Alters-/Bestellprüfung sowie Logistikprüfung rechtlich planen.
- § 6 JMStV: Alkoholwerbung darf sich nicht an Kinder/Jugendliche richten oder diese beim Genuss zeigen; Website-Copy, Produktbilder, SEO, Influencermaßnahmen entsprechend prüfen.
- Kein Kaufdruck, keine spielerische Belohnung für erhöhten Alkoholkonsum, keine unzutreffenden gesundheitsbezogenen Aussagen.
- Altersadressierung und Maßnahmen für öffentliche Online-Werbung im konkreten Nutzungskontext fachjuristisch prüfen; eine bloße 18+-Schaltfläche ist keine generelle Rechtserfüllung.

### Datenschutz/Tracking
- DSGVO: Datenminimierung, Rechtsgrundlage, transparente Information, Betroffenenrechte, Lösch- und Aufbewahrungskonzept, Auftragsverarbeitungsverträge soweit nötig.
- § 25 TDDDG: nicht unbedingt erforderliches Speichern/Auslesen am Endgerät in der Regel erst nach wirksamer Einwilligung. Tracking-SDKs nicht vor erforderlicher Zustimmung laden.
- Cookie-/Consent-Lösung nicht ornamental: Ablehnung so praktikabel wie Zustimmung, Widerruf möglich, echte Blockierung.
- QR-/Analytics-Ereignisse sind nicht automatisch anonym oder frei von Anforderungen, nur weil keine Klarnamen erhoben werden. Rechtsgrundlage im Einzelfall prüfen.
- Google Analytics nicht einfach ungefragt integrieren. MVP kann mit nicht-personenbezogener aggregierter Messung beginnen, wenn konkrete Rechtsprüfung dies trägt; im Zweifel Tracking deaktivieren.

### Website-Betreiber
- Impressum nach DDG ggf. Pflicht und tatsächliche rechtliche verantwortliche Person/Organisation ermitteln.
- Datenschutzerklärung und Auftragsverarbeiter/Rechenzentrumsregionen prüfen.
- Marken-/Domainrecherche für `AROMETRA` rechtlich/geschäftlich erforderlich, noch nicht bestätigt.
- Produktbild-, Fotografie-, Marken-/Text-, Review-, Datenbank- und API-Nutzungsrechte getrennt prüfen.
- Sponsored/paid product placements eindeutig als Werbung kennzeichnen. Keine versteckte Vermischung mit organischen Empfehlungen.
- Preis-/Bestandsangaben nur mit Quelle/Stand und passenden Informationspflichten, falls später Commerce.

## Abuse Cases und Testideen
1. Unangemeldeter Browser versucht `POST /admin/product` → 401/403.
2. Neu registrierter User versucht Adminrolle zuzuweisen → verboten.
3. Public User sendet `service_role`-abhängigen Request oder liest private Import-/Analytics-Tabelle → verboten.
4. Quellimport liefert `<script>`/HTML → als Text escaped, keine Ausführung.
5. Quell-URL zeigt auf `127.0.0.1` / Cloud Metadata → Importer blockiert.
6. Kein Consent → keine einwilligungsbedürftigen Trackingrequests.
7. Einwilligung widerrufen → entsprechende künftige Erfassung stoppt.
8. QR für nicht publiziertes Produkt → keine Exposition des internen Datensatzes.
9. Nicht freigegebenes Bild → nur Placeholder, keine unrechtmäßige Public-URL.
10. Empfehlung für geblockte/unpublizierte Produkte → ausgeschlossen.

## Launch-Freigabeliste
- [ ] Betreiber-/Verantwortlichkeitsangaben vollständig
- [ ] Impressum und Datenschutz fachlich bestätigt
- [ ] Alkoholwerbung / Jugendschutz geprüft
- [ ] Marke/Domain-Nutzung geprüft
- [ ] Bild-/Review-/Datenlizenzen dokumentiert
- [ ] Supabase RLS/GRANT, Storage, API-Routen getestet
- [ ] Tracking-Freigabe/Consent rechtskonform umgesetzt oder deaktiviert
- [ ] E2E und Accessibility-Smoke bestanden
- [ ] Backup-/Rollback und Fehlerüberwachung eingerichtet
- [ ] Ben hat physische QR-Codes, Netz-/Offline-Backup und Demo-Profil geprüft

## Quellen (Stand 2026-10-10)
- https://www.gesetze-im-internet.de/juschg/__9.html
- https://www.gesetze-bayern.de/Content/Document/JMStV-6
- https://www.gesetze-im-internet.de/ttdsg/__25.html
- https://www.medienanstalt-hessen.de/aufsicht/telemedien-digitale-dienste-internetaufsicht/werbung/
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/secure-data
