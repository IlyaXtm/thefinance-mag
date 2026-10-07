import { CMS_ORIGIN } from '@/features/mag/lib/site';

/**
 * /mag/media/<yyyy>/<mm>/<file> — in-body article images, served by this app.
 *
 * WHY THIS EXISTS (2026-10-07). Body images at
 * `thefinance.ir/mag/wp-content/uploads/…` are proxied by the HOST's nginx to
 * the CMS server, and from that host roughly half of all NEW connections to
 * 87.247.170.20:443 are never answered. nginx gives up at its 3 s connect
 * timeout, the CDN passes on an uncached 504, and the reader sees a broken
 * image that a reload often fixes. The cause is outside this container, and
 * nginx is not ours to change.
 *
 * This container is not affected: Node keeps its connection to the CMS open
 * and reuses it, so it opens almost no new ones — 20 of 20 fetches succeeded
 * where host curl managed about half. `fixBodyImageUrls` points body images
 * here, which keeps them on `thefinance.ir` (the CMS host is de-indexed).
 *
 * Images only, by extension AND by the upstream content type. Never SVG: an
 * SVG served from this origin can run script in it.
 */

export const dynamic = 'force-dynamic';

const IMAGE_FILE = /\.(?:png|jpe?g|webp|gif|avif)$/i;

/** 30 days, like the nginx uploads location: an upload never changes in place. */
const CACHE_OK = 'public, max-age=2592000, immutable';

const FETCH_TIMEOUT_MS = 10_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const segments = path.map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });

  const unsafe = segments.some((s) => s === '' || s === '.' || s === '..' || s.includes('/'));
  if (unsafe || !IMAGE_FILE.test(segments[segments.length - 1] ?? '')) {
    return new Response(null, { status: 404 });
  }

  const url = `${CMS_ORIGIN}/wp-content/uploads/${segments.map(encodeURIComponent).join('/')}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return new Response(null, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }

  const type = upstream.headers.get('content-type') ?? '';
  if (!upstream.ok || !type.startsWith('image/') || type.includes('svg')) {
    await upstream.body?.cancel();
    const status = upstream.status === 404 ? 404 : 502;
    return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  }

  const headers = new Headers({
    'Content-Type': type,
    'Cache-Control': CACHE_OK,
    'X-Content-Type-Options': 'nosniff',
  });
  /* Only when the body is passed through as-is: fetch decodes a compressed
     body, and the encoded length would then be wrong. */
  const length = upstream.headers.get('content-length');
  if (length && !upstream.headers.has('content-encoding')) headers.set('Content-Length', length);

  return new Response(upstream.body, { status: 200, headers });
}
