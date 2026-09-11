import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { seeOther } from '@/features/mag/lib/redirect-response';
import { matchesPreviewSecret, previewSecret } from '@/features/mag/lib/preview-secret';
import { getPreviewSlug } from '@/features/mag/api/v1/mag.service';
import { magPath } from '@/features/mag/lib/site';

/**
 * GET /mag/api/draft?secret=…&id=…&status=…
 *
 * Where WordPress's Preview button lands. Validates the secret, resolves the
 * post ID to the slug the article will live at, turns on Draft Mode, and sends
 * the editor there.
 *
 * Node runtime: `timingSafeEqual` is not available on the edge.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unauthorized = () =>
  new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const secret = params.get('secret');
  const id = params.get('id');

  /*
    One generic 401 for every failure, and the secret is never echoed back —
    not in a message, not in a redirect, not in a log line an operator might
    paste into a ticket. A response that distinguishes "wrong secret" from
    "unknown id" tells an attacker which half to keep guessing.
  */
  if (!matchesPreviewSecret(secret) || !id || !/^\d+$/.test(id)) {
    return unauthorized();
  }

  /*
    ── Why the ID is resolved here and not carried in the URL ──────────────

    This used to redirect to `/mag/<id>` and let the article route treat the
    segment as an ID. The handshake was correct — 401 without the secret, 307
    with it — and the editor still landed on a 404, because the article route
    is keyed on slug. A green status code on a broken feature is exactly what
    shipped it (B23).

    Resolving here rather than teaching the route to accept a numeric segment
    keeps ONE URL shape for articles, and means the author previews the exact
    address the piece will publish at — which is the point of a preview.

    This handler is the right place for it because it already holds the secret.
    A draft is invisible to an anonymous GraphQL query, which is why
    `/mag/<slug>` correctly 404s for an unpublished post to everyone else.
  */
  let slug: string | null = null;
  try {
    slug = await getPreviewSlug(id, previewSecret());
  } catch {
    /*
      The CMS is unreachable or the field is missing. Fall through to the same
      401 as a bad secret: there is no address to send the editor to, and a
      redirect to a guess would land them on a 404 that looks like the bug this
      replaced.
    */
    return unauthorized();
  }

  if (!slug) return unauthorized();

  const draft = await draftMode();
  draft.enable();

  /*
    Draft Mode is enabled AFTER the lookup succeeds. Enabling it first would
    leave an editor holding a bypass cookie for a preview that never resolved,
    and every subsequent article they opened would be served uncached for
    nothing.
  */
  return seeOther(magPath(`/${encodeURIComponent(slug)}`));
}
