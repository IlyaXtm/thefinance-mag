import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { matchesPreviewSecret } from '@/features/mag/lib/preview-secret';

/**
 * POST /mag/api/revalidate
 *
 * The mu-plugin calls this on publish and update, hooked to
 * `transition_post_status` rather than `save_post` — the latter fires on
 * autosaves, which would rebuild the frontend continuously while someone is
 * still typing.
 *
 * THIS IS AN OPTIMISATION, NOT A DEPENDENCY. The ISR window stays at five
 * minutes underneath it. The plugin fires this non-blocking, so a call lost to
 * a restart or a network blip must mean "a few minutes later", never "never" —
 * an editor whose article silently fails to appear has no way to diagnose it.
 *
 * Node runtime: `timingSafeEqual` is not available on the edge.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RevalidateBody {
  secret?: string;
  slug?: string;
  market?: string;
}

export async function POST(request: NextRequest) {
  let body: RevalidateBody;

  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  /*
    The secret may arrive in the body or as a header. One generic 401 either
    way, and it is never echoed back.
  */
  const secret = body.secret ?? request.headers.get('x-mag-secret');

  if (!matchesPreviewSecret(secret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const revalidated: string[] = [];

  const paths = [
    /* The article itself. */
    body.slug ? `/${body.slug}` : null,
    /* The index — a publish changes the lead slot and the latest list. */
    '/',
    /* The archive's first page, which is the other listing that changes. */
    '/archive',
    /* The feed, which is a recent-items list by definition. */
    '/feed',
    /* Its market archive, when the post has one. */
    body.market ? `/market/${body.market}` : null,
  ].filter((path): path is string => path !== null);

  for (const path of paths) {
    revalidatePath(path);
    revalidated.push(path);
  }

  /*
    The sitemap too: `lastModified` comes from the article's revision date, and
    a stale sitemap tells Google there is nothing new to crawl.
  */
  revalidatePath('/sitemap.xml');
  revalidated.push('/sitemap.xml');

  return json({ revalidated }, 200);
}

function json(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: { 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
