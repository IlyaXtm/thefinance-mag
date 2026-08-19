import type { MetadataRoute } from 'next';
import { magUrl, SITE_ORIGIN } from '@/features/mag/lib/site';

/**
 * robots.txt for the /mag app.
 *
 * NOTE ON SCOPE: with basePath '/mag' this is served at /mag/robots.txt, which
 * is NOT the file crawlers read — they read thefinance.ir/robots.txt, served by
 * the main site. This exists so the Mag app states its own intent explicitly
 * and so nothing here silently contradicts the main file.
 *
 * The main site's robots.txt currently has three defects found during Phase 0
 * and they must be fixed in the frontend repo:
 *
 *   - `Disallow: *.xml$` blocks the sitemap declared in the same file
 *   - `Disallow: *.thefinance.ir/` is inert — robots.txt matches paths, not hosts
 *   - `Disallow: /map/wp-content/plugins/` is a typo for /mag/
 *
 * The first one is costing indexation today.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          /* Thin, infinitely variable, and duplicating content that already
             exists on the pages themselves. */
          '/search',
          '/api/',
        ],
      },
    ],
    sitemap: magUrl('/sitemap.xml'),
    host: SITE_ORIGIN,
  };
}
