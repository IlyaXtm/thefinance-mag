import { hasPreviewSecret } from '@/features/mag/lib/preview-secret';
import { probeRedirectSource } from '@/features/mag/lib/redirect-source';

/**
 * Health check at /mag/health (basePath applies).
 * Used by the container healthcheck and by the staging parallel run.
 *
 * It reports CONFIGURATION, not just liveness, because every failure this
 * project has hit looked perfectly healthy from the outside: a container
 * serving mock data, a redirect map that fell back to the compiled floor
 * because the CMS is unreachable, a preview secret that was never set. All
 * three render fine and all three are broken.
 *
 * `previewConfigured` is a boolean and never the secret itself.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const redirects = probeRedirectSource();

  return Response.json(
    {
      status: 'ok',
      source: (process.env.USE_MOCK ?? process.env.NEXT_PUBLIC_USE_MOCK) === 'true' ? 'mock' : 'wpgraphql',
      previewConfigured: hasPreviewSecret(),
      /*
        A probe of WordPress's `magRedirects`, NOT a report of middleware's
        cache — middleware runs in a separate bundle with its own module
        instance and its own copy. `reachable: false` means no new SEO redirect
        is reaching the frontend and middleware is serving the compiled floor.
        Expected briefly after a restart; persistent means the CMS is down.
      */
      redirectSource: {
        reachable: redirects.reachable,
        count: redirects.count,
        ageMs: redirects.ageMs,
        /* Compiled-in rules WordPress is not returning. Must be empty before
           cutover — anything here is a ranked URL about to start 404ing. */
        missingKnown: redirects.missingKnown,
      },
      time: new Date().toISOString(),
    },
    { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
