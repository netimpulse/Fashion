# CLAUDE.md – Shopify Theme „Statik"

> Diese Datei wird bei jeder Claude-Code-Session automatisch geladen.
> Sie ist das Gedächtnis des Projekts: Architektur, Konventionen und vor allem
> der Abhängigkeits-Log, damit Claude beim Bauen eines Teils weiß, was später
> daran hängt.

---

## ⚠️ MEMORY-PFLEGE – IMMER BEFOLGEN

Diese Regel hat hohe Priorität. Befolge sie bei JEDER Code-Änderung.

**Nach jedem implementierten oder geänderten Feature gilt:**

1. Prüfe, ob das Feature mit anderen Theme-Teilen zusammenhängt
   (Kundenkonto, Metafields, Header, Cart, Checkout, Routes, globale JS/CSS).
2. Falls ja: trage es SOFORT unter `## Architektur & Abhängigkeiten` ein –
   bevor du die Aufgabe als erledigt meldest.
3. Aktualisiere bestehende Einträge, wenn sich eine Abhängigkeit ändert.
   Lösche nichts, was noch im Code aktiv ist.
4. Pro Eintrag dokumentierst du AUSFÜHRLICH:
   - **Feature** – Name
   - **Dateien** – betroffene Sections/Snippets/Assets (mit Pfad)
   - **Hängt an** – Objekte, Metafields, Routes, globale Funktionen
   - **Wird genutzt von** – welche anderen Teile darauf zugreifen (müssen)
   - **Offen / To-do** – noch fehlende Anbindungen oder Risiken
   - **Stand** – Datum der letzten Änderung
5. Wenn etwas eine spätere Anbindung erfordert, die noch nicht existiert,
   notiere sie unter `## Offene Abhängigkeiten (To-do)`, damit sie nicht
   vergessen wird.

Bei Unsicherheit, ob etwas eingetragen werden soll: lieber eintragen.

---

## Projekt-Überblick

- **Plattform:** Shopify (Online Store 2.0 / Liquid)
- **Theme-Name:** **Statik** (v1.0.0) — verkaufsfertiges Streetwear-Fashion-Theme
- **Theme-Basis:** Ursprünglich Skeleton, inzwischen vollständig ausgebaut.
  Design-Richtung „Quiet Hype": Off-White/Ink-Monochrom + Volt-Akzent,
  Anton (Headings, Uppercase) + Work Sans (Body), Spec-Sheet-Look
  (Eyebrow-Labels „01 / NEW IN"), Marquees, Outline-Type, Drop-Countdown.
- **Referenz-Shops:** lucid-club.com, sevenheavens.de, gate194.berlin,
  doverstreetmarket.com, projectxparis.com, shineandglory.com, moremoneymorelove.de

## Konventionen

- CSS pro Section gescoped (BEM, `assets/section-*.css` bzw. `{% stylesheet %}`).
- Geteilte Komponenten: `assets/component-*.css` (product-card, collection-card, cart).
- Keine Inline-Styles, keine Inline-Event-Handler; Custom Elements für JS.
- **Farbsystem:** Dawn-Style `color_scheme_group` (`config/settings_schema.json`,
  Schemes in `config/settings_data.json`: scheme-1 Paper, scheme-2 White,
  scheme-3 Ink, scheme-4 Volt, scheme-5 Concrete). Jede Section hat ein
  `color_scheme`-Setting; Klassen `.color-scheme .color-{id}` kommen aus
  `snippets/css-variables.liquid`. `--color-foreground/-background` sind
  ECHTE Farbwerte (kein RGB-Triplet!), Alpha über `--color-foreground-rgb`.
- **Layout:** `.shopify-section` ist nur `position: relative` (KEIN Grid mehr!).
  Inhalt über `.page-width` / `.page-width--narrow`; Section-Padding über
  `.section-pad` + `--section-pt/--section-pb` (px-Ranges im Schema).
- Alle Storefront-Texte über `{{ 'key' | t }}` (en.default = Basis, de komplett),
  alle Schema-Labels über `t:`-Keys (en.default.schema + de.schema).
- Bilder IMMER `image_url | image_tag` mit widths/sizes/loading.
- Templates-JSON: alle wichtigen Settings (v. a. `color_scheme`) EXPLIZIT setzen;
  in Template-JSON KEINE `t:`-Keys (werden nicht aufgelöst) — nur Literale.
- Validierung vor jedem Commit: JSON/Liquid-Tag-Balance/CSS-Klammern/`node --check`
  (Python-Snippet siehe Git-History) + Theme Check läuft in CI (`.github/workflows/ci.yml`).

---

## Architektur & Abhängigkeiten

### Globales Fundament (Schemes, Typo, CSS, JS)
- **Dateien:** `config/settings_schema.json`, `config/settings_data.json`,
  `snippets/css-variables.liquid`, `assets/critical.css`,
  `assets/global.js`, `layout/theme.liquid`, `layout/password.liquid`,
  `snippets/icon.liquid`, `snippets/meta-tags.liquid`
- **Hängt an:** `settings.*` (Fonts, Schemes, Radii, Badges, Cards, Cart-Typ, Social)
- **Wird genutzt von:** ALLEN Sections/Blocks. `global.js` liefert:
  `<quantity-input>`, `<details-disclosure>`, `<localization-form>`,
  Scroll-Reveal (`[data-reveal]` + body.anim-reveal), Share-Buttons
  (`[data-share]`), generische Dialog-Opener (`[data-dialog-open/close]`).
- **Achtung:** `charset/viewport/title` liegen in den Layouts, NICHT in
  `meta-tags.liquid`. `password-game.css` nutzt weiterhin die Legacy-Variablen
  `--color-foreground/-background` als Farbwerte — nicht auf Triplets umstellen.
- **Stand:** 2026-06-10

### Cart-System (Drawer + Seite + AJAX)
- **Dateien:** `sections/cart-drawer.liquid` (statisch in theme.liquid via
  `{% section %}`), `sections/cart.liquid`, `snippets/cart-line-item.liquid`,
  `snippets/free-shipping-bar.liquid`, `assets/cart.js`,
  `assets/component-cart.css`, `assets/section-cart.css`
- **Hängt an:** Cart AJAX API (`/cart/add.js`, `/cart/change.js`,
  `/cart/update.js`, `/cart.js`), Section Rendering API (Elemente mit
  `[data-cart-section]` werden per Section-ID neu gerendert),
  `settings.cart_type` (drawer/page), `settings.show_shipping_bar` +
  `settings.shipping_bar_threshold` (Basiswährung!), `window.themeStrings`
  (in theme.liquid definiert).
- **Wird genutzt von:** Header-Cart-Icon (`[data-cart-drawer-open]`,
  `[data-cart-count]`), `<product-form>` (PDP + Quick-Add der Produktkarte).
- **Offen / To-do:** Upsell-Slot im Drawer; Markets: Schwelle gilt nur in
  Basiswährung.
- **Stand:** 2026-06-10

### Produkt-Detailseite („Product detail page")
- **Dateien:** `sections/product.liquid` (Blocks: vendor, title, price,
  variant_picker, quantity, buy_buttons, description, collapsible, spec_sheet,
  usp, share, custom_liquid, @app), `snippets/product-media-gallery.liquid`,
  `snippets/price.liquid`, `assets/product.js`, `assets/section-product.css`,
  `sections/product-recommendations.liquid`, `templates/product.json` +
  `product.fashion.json`
- **Hängt an:** `product`-Objekt (mit Nil-Guards für Editor-Preview!),
  `product.variants | json` (Variant-Resolution client-seitig),
  Section Rendering (`?variant=&section_id=` für Preis/SKU-Refresh),
  Swatches über `value.swatch` (Taxonomie-Metafelder), Größentabelle über
  Page-Picker im variant_picker-Block, `<product-form>` aus `assets/cart.js`.
- **Wird genutzt von:** Quick-Add der Produktkarten nutzt dieselbe
  `<product-form>`-Logik; Sticky-ATC submitted das Hauptformular.
- **Offen / To-do:** Zoom/Lightbox für Galerie; Gift-Card-Recipient-Formular;
  Pickup Availability; „Notify me"-Back-in-Stock (extern/App).
- **Stand:** 2026-06-10

### Collection & Filter
- **Dateien:** `sections/collection.liquid` (Banner, Filter-Drawer, Sort,
  Chips, Grid, Pagination), `assets/section-collection.css`,
  `snippets/product-card.liquid`, `assets/component-product-card.css`,
  `snippets/pagination.liquid`, `sections/collections.liquid`,
  `snippets/collection-card.liquid`, `assets/component-collection-card.css`
- **Hängt an:** Storefront Filtering (`collection.filters` — Filter müssen im
  Admin unter Suche & Discovery konfiguriert werden!), `settings.card_*`
  (Ratio, Hover-Bild, Vendor, Quick-Add), Badge-Settings.
- **Wird genutzt von:** Produktkarte wird auch von Suche, Recommendations und
  featured-collection-Block gerendert; Collection-Card auch vom
  collection-list-Block.
- **Stand:** 2026-06-10

### Header-Gruppe (Announcement + Header)
- **Dateien:** `sections/announcement-bar.liquid` (Marquee/Statisch),
  `sections/header.liquid`, `assets/section-header.css`, `assets/header.js`,
  `sections/header-group.json`, `snippets/social-icons.liquid`
- **Hängt an:** `section.settings.menu` (Default `main-menu`), Mega-Menü-Blocks
  matchen über `nav_title` == Menüpunkt-Titel (case-insensitive),
  `settings.logo`/`logo_width`, `routes.account_url`, Cart-Icon →
  `[data-cart-drawer-open]` + `[data-cart-count]` (von cart.js gepflegt).
- **Offen / To-do:** Transparenter Header über Hero; Predictive Search.
- **Stand:** 2026-06-10

### Footer
- **Dateien:** `sections/footer.liquid` (Blocks: brand/links/text/newsletter),
  `assets/section-footer.css`, `sections/footer-group.json`
- **Hängt an:** `shop.policies` (müssen im Admin gepflegt sein!),
  `shop.enabled_payment_types`, `localization` (Länder/Sprachen via
  `{% form 'localization' %}` + `<localization-form>`), Newsletter über
  `{% form 'customer' %}` (Tag `newsletter`), Social-Links aus Settings.
- **Stand:** 2026-06-10

### Theme-Blocks & Page-Sections (Baukasten)
- **Dateien:** `blocks/hero.liquid`, `blocks/marquee.liquid`,
  `blocks/featured-collection.liquid`, `blocks/collection-list.liquid`,
  `blocks/image-with-text.liquid`, `blocks/countdown.liquid` (+
  `assets/countdown.js`), `blocks/newsletter.liquid`, `blocks/button.liquid`,
  `blocks/image.liquid`, `blocks/spacer.liquid`, `blocks/quote.liquid`,
  `blocks/text.liquid`, `blocks/group.liquid`;
  Wrapper: `sections/custom-section.liquid` (Presets je Block!),
  `sections/page-landing.liquid` („Landing page"),
  `sections/page-about.liquid` („About us page")
- **Hängt an:** `{% content_for 'blocks' %}` (@theme), Presets der Wrapper
  befüllen komplette Seiten; Blocks bringen ihre eigene `.page-width` mit
  (Wrapper sind full-bleed).
- **Wird genutzt von:** `templates/index.json` (komplette Homepage),
  `templates/page.about.json`. Neue Blocks sind automatisch überall verfügbar,
  wo `@theme` akzeptiert wird.
- **Offen / To-do:** Video-Block (standalone), UGC/Instagram-Grid,
  „Floorguide"-Navigation (DSM-Idee), Testimonial-Slider.
- **Stand:** 2026-06-10

### Lookbook / Shop the Look
- **Dateien:** `sections/lookbook.liquid` (Hotspot-Blocks: product + pos_x/pos_y)
- **Hängt an:** Produkt-Picker pro Hotspot, `<details-disclosure>` aus global.js,
  `snippets/price.liquid`.
- **Wird genutzt von:** Homepage (`templates/index.json`, Section „lookbook").
- **Stand:** 2026-06-10

### Templates & Locales
- **Templates:** index, product(+.fashion), collection(+.fashion),
  list-collections, search, cart, 404, blog, article, gift_card (gestylt),
  page, page.about, page.contact, page.faq, page.legal, page.size-guide,
  page.qa-block-test, password.
- **Locales:** `en.default(.schema).json` (Basis, vollständig gegen Code
  validiert), `de(.schema).json` (komplett). Bei neuen Keys IMMER beide Sprachen
  pflegen — Validator-Snippet prüft en gegen Verwendung.
- **Stand:** 2026-06-10

### Wishlist / Favoriten (GEPLANT — aktuell NICHT im Code)
- Der früher dokumentierte `snippets/wishlist-button.liquid` existiert (noch)
  nicht im Repo. Konzept bleibt: `customer.metafields.custom.wishlist`,
  Header-Counter, Account-Ansicht.
- **Stand:** 2026-06-10

### Passwortseiten-Spiel (Coming-Soon Game + E-Mail-Eintragung)
- **Dateien:** `sections/password.liquid`, `assets/password-game.js`,
  `assets/password-game.css`, `templates/password.json`, `layout/password.liquid`
- **Hängt an:** `{% form 'storefront_password' %}`, `{% form 'customer' %}`
  (Tags `newsletter, fashion-game`), Legacy-Farbvariablen aus
  `css-variables.liquid`, `localStorage` (`fashion-runner-<domain>`).
- **Änderung 2026-06-10:** Skeleton-Grid auf `.shopify-section` wurde entfernt →
  `.pwd-game` hat jetzt eigenes `padding-inline`; `layout/password.liquid` hat
  Skip-Link + `<main id="MainContent">`.
- **Offen / To-do:** unverändert (Leaderboard-Backend, Score↔E-Mail,
  Manipulationsschutz, Gewinner-Flow, DSGVO) — siehe unten.
- **Stand:** 2026-06-10

---

## Offene Abhängigkeiten (To-do)

> Geplante Verbindungen, die noch nicht im Code existieren.

- [ ] Wishlist: Button-Snippet + Header-Counter an `customer.metafields.custom.wishlist` anbinden
- [ ] Passwortseiten-Spiel: Leaderboard-Backend (Serverless + DB oder Shopify-App/Metaobjects); `game:over`-Event in `assets/password-game.js` liefert den Score
- [ ] Passwortseiten-Spiel: Score ↔ E-Mail verknüpfen + serverseitiger Manipulationsschutz
- [ ] Passwortseiten-Spiel: Drop-Gewinner-Flow — Top 3 ermitteln, Rabattcodes erzeugen, Mails senden
- [ ] Passwortseiten-Spiel: DSGVO — Teilnahmebedingungen + Datenschutzhinweis, Consent serverseitig
- [ ] PDP: Galerie-Zoom/Lightbox, Back-in-Stock („Notify me"), Gift-Card-Recipient-Formular, Pickup Availability
- [ ] Cart-Drawer: Upsell-/Cross-Sell-Slot
- [ ] Header: transparente Variante über Hero, Predictive Search (Section Rendering API)
- [ ] Recently-Viewed-Section (localStorage)
- [ ] UGC/Instagram-Grid-Block, Video-Block, „Floorguide"-Navigation (DSM-Prinzip)
- [ ] „Drop-Modus"-Theme-Setting (globaler Schalter: Dark Scheme + Countdown-Hero + Ticker)

## ✅ Admin-Aufgaben (sobald MCP mit dem RICHTIGEN Shop verbunden ist)

> Claude ist aktuell NICHT mit dem Ziel-Shop verbunden. KEINE Admin-Änderungen
> im aktuell verbundenen MCP-Shop! Diese Liste abarbeiten, wenn der User die
> Verbindung zum richtigen Shop herstellt:

- [ ] **Navigation:** `main-menu` mit Struktur anlegen (z. B. New In / Hoodies /
  Tees / Accessoires / Sale + Unterpunkte für Mega-Menü); Footer-Menüs
  („Shop", „Hilfe") anlegen und im Footer-Block zuweisen
- [ ] **Collections** anlegen (New In, Bestseller, Kategorien) und in
  `templates/index.json` verknüpfen: featured-collection-Block
  (`collection`), collection-list-Block (`collection_1..4`) — aktuell leer
  → zeigen Platzhalter
- [ ] **Lookbook:** Bild in Section hochladen + Hotspot-Produkte zuweisen
- [ ] **Pages** anlegen und Templates zuweisen: Über uns (`page.about`),
  Kontakt (`page.contact`), FAQ (`page.faq`), Größentabelle
  (`page.size-guide`), AGB/Impressum/Datenschutz/Widerruf (`page.legal`)
- [ ] **Policies** im Admin pflegen (AGB, Datenschutz, Impressum, Widerruf,
  Versand) → erscheinen automatisch im Footer (`shop.policies`)
- [ ] **Theme-Settings:** Logo + Favicon hochladen; Gratisversand-Schwelle
  (Settings → Cart) an die echte Versandregel anpassen
- [ ] **Suche & Discovery App:** Filter konfigurieren (Größe, Farbe, Preis,
  Verfügbarkeit) — sonst ist der Filter-Drawer leer
- [ ] **Produkte:** mind. 2 Bilder pro Produkt (Hover-Effekt), Farb-Swatches
  über Shopify-Taxonomie/Kategorie-Metafelder pflegen (variant_picker zeigt
  `value.swatch`), Spec-Sheet-Werte (Material/Fit/Gewicht) — Blocks
  unterstützen Dynamic Sources/Metafelder
- [ ] **Blog** „Journal" anlegen (Template blog/article ist fertig)
- [ ] **Markets/Sprachen:** Deutsch als Shop-Sprache aktivieren, damit
  `locales/de.json` greift; Länder/Währungen für Selectors im Footer
- [ ] **Customer Accounts** aktivieren (Header-Icon + Cart-Login-Hinweis)
- [ ] **Geschenkgutschein-Produkt** testen (templates/gift_card.liquid)
- [ ] Test-Checkout + Lighthouse-Run (Theme-Store-Minimum: Perf 60 / A11y 90)

## Metafields & Namespaces (Referenz)

| Namespace.Key | Typ | Verwendung |
|---|---|---|
| `custom.wishlist` | list / json | Gespeicherte Favoriten pro Kunde (geplant) |
| Shopify-Taxonomie „Farbe" | swatch | Farb-Swatches im Variant-Picker (`value.swatch`) |
