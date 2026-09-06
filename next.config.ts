import type { NextConfig } from 'next';

/**
 * A stable identifier for this build, readable at runtime from /mag/health.
 *
 * Two problems it answers, both of which have already cost this project time:
 *
 *  - The container on the frontend server was three weeks stale and nothing on
 *    the running site said so. Pages are generated at build time, so a stale
 *    image silently serves stale content and a restart does not fix it.
 *  - A report shipped with its two halves measured against two different
 *    servers, one of them running an older build, and the contradiction was
 *    only caught in review.
 *
 * `generateBuildId` and `env` are fed from the same constant, so the value
 * Next uses internally and the value the app reports can never disagree. Set
 * BUILD_ID to pin it — the Dockerfile does, since the image has no .git.
 */
function resolveBuildId(): string {
  if (process.env.BUILD_ID) return process.env.BUILD_ID;

  /*
    The git SHA, NOT a timestamp. next.config is evaluated twice — once by
    `next build` and again by the server at startup — so a timestamp produces
    two different values and the build the server reports never matches the one
    on disk. It was off by exactly one second, which is the kind of "nearly
    right" that a comparison must reject and a human would wave through.

    The SHA also answers the more useful question: which commit is deployed.
    In the container there is no .git, so the Dockerfile passes BUILD_ID above.
  */
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('node:child_process')
      .execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

const BUILD_ID = resolveBuildId();

const nextConfig: NextConfig = {
  generateBuildId: () => BUILD_ID,

  /* Inlined at build time. Not a secret — it is a build identifier, and the
     point of it is to be visible. */
  env: { MAG_BUILD_ID: BUILD_ID },

  /**
   * The app is served at thefinance.ir/mag.
   *
   * basePath is inlined at build time and cannot be changed without a rebuild,
   * so it is set from the start — retrofitting it means touching every link
   * and route.
   */
  basePath: '/mag',

  /*
   * Standalone output: `next build` emits `.next/standalone` containing a
   * minimal server plus only the node_modules actually reached. That is what
   * the container runs — it keeps the runtime image small and means the image
   * has no npm install step and no dev dependencies in it.
   */
  output: 'standalone',

  /*
   * Next's automatic trailing-slash 308 runs BEFORE middleware, which turned
   * every legacy redirect arriving with a trailing slash into TWO hops:
   *
   *   /mag/what-is-the-mfi-indicator/  →308→  /mag/what-is-the-mfi-indicator
   *                                    →301→  /mag/mfi-indicator
   *
   * That is not an edge case here. WordPress's permalink structure is
   * `/%postname%/`, so the historical URLs Google actually ranks END IN A
   * SLASH — the two-hop path was the common one.
   *
   * Turning the automatic redirect off hands normalisation to middleware,
   * which can then answer a legacy slug in a single 301 and still 308
   * everything else exactly as Next did. See src/middleware.ts.
   */
  skipTrailingSlashRedirect: true,

  reactStrictMode: true,

  images: {
    /**
     * Both hosts are allowed.
     *
     * Existing media lives at thefinance.ir/wp-content/uploads/... and those
     * URLs must never change — moving them would break Google Images indexing
     * and every external hotlink. nginx proxies that path to the CMS host.
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'thefinance.ir', pathname: '/mag/wp-content/uploads/**' },
      { protocol: 'https', hostname: 'wp.thefinance.ir', pathname: '/mag/wp-content/uploads/**' },
    ],
  },

  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  /*
   * `X-Powered-By: Next.js` names the stack and the framework version range to
   * anyone scanning. It buys nothing.
   */
  poweredByHeader: false,

  /**
   * Security headers.
   *
   * Set here rather than only in nginx so they survive a proxy misconfiguration
   * and so the guarantee lives with the code that depends on it.
   *
   * NOT set here: Strict-Transport-Security. HSTS applies to the whole host,
   * so declaring it from a sub-path would commit `thefinance.ir` on behalf of
   * the main site. That belongs at the edge, as a domain-wide decision.
   */
  async headers() {
    /*
     * The CSP earns its place because of ONE line in this codebase:
     * `ArticleBody` renders WordPress HTML through `dangerouslySetInnerHTML`.
     * `sanitizeArticleHtml` strips inline styles — it is not an XSS sanitiser
     * and does not remove scripts. That is a deliberate trust decision about
     * editors, but a compromised WordPress account or plugin would otherwise
     * run arbitrary JavaScript on the main domain. `script-src 'self'` means
     * injected markup cannot pull in an external payload.
     *
     * It also enforces "no third-party scripts" — a documented product
     * constraint and a Core Web Vitals one — in the browser rather than in
     * review.
     *
     * `'unsafe-inline'` on script-src is required by Next's inline bootstrap;
     * removing it needs nonces via middleware, which is a larger change. The
     * directives that block the common attack shapes — object-src, base-uri,
     * form-action, frame-ancestors — are all strict regardless.
     */
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      /* Media stays on our own hosts. `data:` covers next/image blur
         placeholders. */
      "img-src 'self' data: https://thefinance.ir https://wp.thefinance.ir",
      /* Self-hosted IRANYekanX only — no Google Fonts, no foreign CDN. */
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
