/**
 * Stabile Test-Fixtures fuer den Visual-QA-Workflow im Fashion-Dev-Store.
 *
 * Alle Werte hier sind im Store `fashion-dev-zekm0nfo` fest angelegt:
 * - Produkt "Essential Tee" mit Handle essential-tee
 * - Collection "Essentials" mit Handle essentials
 * - Page "QA Block Test" mit Handle qa-block-test, Template qa-block-test
 */

export const QA = {
  /** ID des QA-Preview-Themes (Duplikat von Horizon, UNPUBLISHED). */
  themeId: "172338249764",

  /** Bekannte Fixtures im Dev-Store. */
  product: {
    handle: "essential-tee",
    id: "8304935862308",
    firstVariantSku: "TEE-S-BLACK",
    firstVariantId: "44210345017380",
  },
  collection: {
    handle: "essentials",
    id: "480253313060",
  },

  /** Mapping: Template-Typ -> Pfad ohne Query-String. */
  paths: {
    home: "/",
    qaBlock: "/pages/qa-block-test",
    product: "/products/essential-tee",
    collection: "/collections/essentials",
    cart: "/cart",
    search: "/search?q=tee",
    notFound: "/this-page-does-not-exist",
  },
} as const;

export function withTheme(path: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}preview_theme_id=${QA.themeId}`;
}
