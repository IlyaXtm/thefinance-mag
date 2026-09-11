/**
 * Top-level path segments that are ROUTES, not article slugs.
 *
 * Middleware answers "is `/foo` an article that exists?" by asking the app for
 * the published slug list. Everything not on that list would be a 404 — which
 * is correct for a dead article and catastrophic for `/archive`, so the real
 * routes are enumerated here and checked first.
 *
 * THE RISK THIS CARRIES is a route added to `src/app` and forgotten here: the
 * new page would 404 in production while working perfectly in `next dev`,
 * which is the worst shape of bug this project has. `check-invariants` reads
 * `src/app` and fails if anything is missing from this list, so the guard is a
 * test rather than a comment asking people to remember.
 *
 * Metadata files (`sitemap.xml`, `robots.txt`, `manifest.webmanifest`) are here
 * for the same reason even though they are not directories — they are served at
 * a top-level path and must not be mistaken for slugs. `favicon.ico`,
 * `icon.svg` and `apple-icon.png` are already excluded by the matcher.
 */
export const RESERVED_SEGMENTS: ReadonlySet<string> = new Set([
  'archive',
  'author',
  'authors',
  'category',
  'feed',
  'health',
  'market',
  'news',
  'not-found-page',
  'page',
  'search',
  'sitemap.xml',
  'robots.txt',
  'manifest.webmanifest',
]);
