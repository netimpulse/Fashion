/**
 * Test-Fixtures fuer den Visual-QA-Workflow im Fashion-Store.
 *
 * Tests laufen gegen das UNPUBLISHED-Theme "Test" (ID 148871282774).
 * Das MAIN-Theme (Horizon) bleibt unberuehrt — Customer sehen
 * Test-Aenderungen nie.
 *
 * Default-Test-URL ist die Homepage. Bei produktspezifischen Tests
 * wird das Test-Produkt "essential-tee" verwendet (siehe paths).
 */

export const QA = {
  /** ID des UNPUBLISHED Test-Themes (Duplikat von Fashion/main). */
  themeId: "148871282774",

  /** Bekannte Fixtures im Shop. */
  product: {
    handle: "essential-tee",
  },
  collection: {
    handle: "essentials",
  },

  /** Mapping: Template-Typ -> Pfad ohne Query-String. */
  paths: {
    home: "/",
    qaBlock: "/",
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
