import { NextResponse } from 'next/server';

/**
 * A redirect with a RELATIVE `Location`.
 *
 * WHY NOT `NextResponse.redirect(new URL(path, request.url))`.
 *
 * In the standalone server a route handler's `request.url` is built from the
 * address the process is bound to, not from the `Host` header nginx forwarded.
 * Behind a proxy that produced:
 *
 *     Location: https://0.0.0.0:3100/mag/a7
 *
 * — the container's internal bind address. An editor clicking Preview in
 * wp-admin would be sent somewhere their browser cannot reach. It works
 * perfectly on localhost, because there the internal address IS the public
 * one, which is exactly why it survived testing until the config was put
 * behind nginx.
 *
 * Reconstructing the public origin from `X-Forwarded-Host` and
 * `X-Forwarded-Proto` would work, but it makes every redirect depend on proxy
 * headers being right. A relative `Location` is valid per RFC 7231, every
 * browser resolves it against the request URL, and it cannot name the wrong
 * host because it names no host at all.
 *
 * 307, not 302: the method must be preserved, and these are not permanent.
 */
export function seeOther(path: string): NextResponse {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: path,
      /* Nothing in the preview flow is ever indexable. */
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
