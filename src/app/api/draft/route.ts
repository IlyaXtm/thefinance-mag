import { draftMode } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { matchesPreviewSecret } from '@/features/mag/lib/preview-secret';
import { magPath } from '@/features/mag/lib/site';

/**
 * GET /mag/api/draft?secret=…&id=…&status=…
 *
 * Where WordPress's Preview button lands. Validates the secret, turns on Draft
 * Mode, and sends the editor to the article route — which then fetches through
 * `magPreview` instead of by slug.
 *
 * Node runtime: `timingSafeEqual` is not available on the edge.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  if (!matchesPreviewSecret(secret) || !id) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const draft = await draftMode();
  draft.enable();

  /*
    Straight to the article route, with the POST ID in the slug position.

    The slug is deliberately not used. A draft may not have one yet, and an
    editor renaming a slug is exactly when preview matters most — resolving by
    slug would 404 on the case the feature exists for.

    The article page reads Draft Mode and, when it is on, treats this segment
    as an ID and fetches through `magPreview`. There is no ambiguity to
    resolve: in draft mode it is always an ID.
  */
  const target = new URL(magPath(`/${encodeURIComponent(id)}`), request.url);

  const response = NextResponse.redirect(target, 307);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
