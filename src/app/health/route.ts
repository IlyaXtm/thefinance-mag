import { hasPreviewSecret } from '@/features/mag/lib/preview-secret';
import { magArchiveOverflowed } from '@/features/mag/api/v1/mag.service';
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
      /*
        Which build is actually running. Pages are generated at build time, so
        a stale image serves stale content indefinitely and a restart does not
        fix it — this is how you tell without guessing. Matches .next/BUILD_ID
        on the machine that produced the image.
      */
      buildId: process.env.MAG_BUILD_ID ?? 'unknown',
      /*
        True when the archive has outgrown the single fetch the market pages
        derive their list and counts from. At that point markets under-report
        instead of erroring, so it has to be visible somewhere — this is where.
      */
      archiveOverflowed: magArchiveOverflowed(),
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
        /* The compiled fallback's size, beside the live count. If these differ
           the fallback is not a fallback — see missingCompiled below. */
        compiledCount: redirects.compiledCount,
        ageMs: redirects.ageMs,
        /*
          Compiled-in rules WordPress is not returning. Anything here is a
          ranked URL about to start 404ing.

          READ IT TOGETHER WITH `reachable`, NEVER ALONE. Until a fetch has
          succeeded, the cache IS the compiled-in table, so every known rule is
          trivially present and this list is empty — an empty `missingKnown`
          with `reachable: false` means "not measured yet", not "verified".
          The cutover gate is `reachable === true && missingKnown.length === 0`.
        */
        missingKnown: redirects.missingKnown,
        /*
          Live rules with no compiled floor under them. Empty is required
          before cutover for the same reason missingKnown is — but this is the
          direction that fails during a CMS blip rather than after one, and it
          was invisible until now.
        */
        missingCompiled: redirects.missingCompiled,
      },
      time: new Date().toISOString(),
    },
    { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
