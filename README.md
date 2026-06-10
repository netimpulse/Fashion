# Statik — Streetwear Shopify Theme

Verkaufsfertiges Online Store 2.0 Theme im „Quiet Hype"-Streetwear-Look:
monochrome Basis (Paper/Ink) mit Volt-Akzent, Anton/Work-Sans-Typografie,
Spec-Sheet-Labels, Marquee-Ticker, Drop-Countdown und Lookbook-Hotspots.

## Features

- **5 Farbschemata** (Dawn-kompatibles `color_scheme_group`), Heading/Body-Font-Picker, Skalierung, Radius-/Border-Settings
- **Header:** Sticky-Option, Mega-Menü mit Bild-Promos, Such-Panel, Mobile-Drawer
- **Announcement-Marquee** + eigenständiger Marquee-Block (Outline-Type, Geschwindigkeit/Richtung)
- **Cart:** Drawer und/oder Seite, AJAX (Section Rendering API), Gratisversand-Fortschrittsbalken, Bestellnotiz
- **Product detail page:** Block-basiert (Vendor/SKU, Preis, Variant-Picker mit Größen-Buttons, Swatches & Größentabellen-Dialog, Buy-Buttons inkl. Dynamic Checkout, Beschreibung, Akkordeons, **Spec Sheet**, Trust-Icons, Share, Custom Liquid, App-Blocks), Sticky Add-to-Cart, Galerie mit Video/3D-Support
- **Collection:** Filter-Drawer (Storefront Filtering inkl. Preis), Sortierung, Filter-Chips, Banner
- **Lookbook / Shop the Look** mit Produkt-Hotspots (funktioniert ohne JS)
- **Baukasten:** Theme-Blocks (Hero, Marquee, Featured Collection, Collection-Liste, Bild+Text, Drop-Countdown, Newsletter, Quote, Button, Bild, Spacer) — einzeln über „Custom section"-Presets ODER als fertige **Landing page** / **About us page**-Section
- Komplette Templates: Suche, 404 (Ghost-Type), Blog/Artikel (inkl. Kommentare), Kontakt, FAQ, Legal, Größentabelle, Geschenkgutschein, Passwortseite mit Mini-Game
- **Lokalisierung:** Englisch (Basis) + Deutsch vollständig; Länder-/Sprachwähler im Footer
- Performance & A11y: Vanilla JS Custom Elements (kleine, geteilte Bundles), `prefers-reduced-motion`, Skip-Link, Labels überall, lazy Images über die Shopify-Bildpipeline

## Entwicklung

```bash
npm install
npx playwright install chromium
export SHOPIFY_CLI_THEME_TOKEN=shptka_xxx   # Theme Access App

npm run theme:push:dev   # pusht ins unpublished Dev-Theme (shopify.theme.toml)
npm run qa:full          # theme check + Playwright Visual-QA
```

- Dev-Store/Theme-ID: `shopify.theme.toml`
- Visual-QA: `playwright.config.ts`, `tests/`, QA-Page-Template `templates/page.qa-block-test.json`
- Projekt-Memory & Abhängigkeits-Log: `CLAUDE.md` (inkl. Admin-Checkliste für den Launch)

## Setup im Shop (Kurzfassung)

Menüs (`main-menu`, Footer), Collections, Policies, Pages mit den
mitgelieferten Templates (`page.about`, `page.contact`, `page.faq`,
`page.legal`, `page.size-guide`), Filter über die „Search & Discovery"-App,
Logo/Favicon in den Theme-Settings. Vollständige Checkliste: `CLAUDE.md` →
„Admin-Aufgaben".
