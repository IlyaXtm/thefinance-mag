import { NextResponse } from 'next/server';
import { submitComment } from '@/features/mag/api/v1/mag.comments.service';

/**
 * POST /mag/api/comments
 *
 * Every comment submission goes through here rather than the browser talking
 * to WordPress directly. That matters for three reasons:
 *
 *   - the WPGraphQL endpoint stays off the public browser surface, so it can't
 *     be hammered from a page
 *   - rate limiting and the honeypot check are enforced server-side, where the
 *     submitter can't skip them
 *   - fields are validated and clamped before anything reaches WordPress
 *
 * Comments are held for moderation by WordPress regardless. This layer stops
 * the obvious junk before it becomes moderation work.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * In-memory rate limit: 3 submissions per IP per 10 minutes.
 *
 * Deliberately simple. This is one instance behind nginx on a single VPS, so a
 * Map is sufficient and adds no dependency. If Mag is ever load-balanced this
 * must move to Redis — noted here rather than discovered later, because the
 * failure mode is silent: each instance would allow its own quota.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long-running process.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return false;
}

/**
 * The client IP, taken from what our OWN proxy wrote — never from what the
 * client sent.
 *
 * This used to read the FIRST entry of `X-Forwarded-For`. nginx builds that
 * header with `$proxy_add_x_forwarded_for`, which APPENDS the real peer to
 * whatever the client supplied, so the first entry is attacker-controlled:
 * sending `X-Forwarded-For: 1.2.3.4` produced `1.2.3.4, <real ip>` and the
 * rate limit keyed on `1.2.3.4`. Rotating that header defeated the limit
 * entirely, one request at a time.
 *
 * `X-Real-IP` is set with `proxy_set_header X-Real-IP $remote_addr`, which
 * REPLACES any client value, so it is trustworthy behind our nginx. The
 * fallback takes the LAST `X-Forwarded-For` entry — the one the nearest
 * trusted proxy appended — for the same reason.
 */
function clientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  const chain = forwarded?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];

  return chain[chain.length - 1] || 'unknown';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: 'تعداد دیدگاه‌های ارسالی زیاد است. کمی بعد دوباره تلاش کنید.' },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'درخواست نامعتبر است.' }, { status: 400 });
  }

  /*
    Honeypot. A field hidden from humans via CSS; only a bot fills it.
    Responds 200 with the normal pending message rather than an error — telling
    a bot it was detected just teaches it to adapt.
  */
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ status: 'pending' });
  }

  const articleId = String(body.articleId ?? '').trim();
  const authorName = String(body.authorName ?? '').trim();
  const authorEmail = String(body.authorEmail ?? '').trim();
  const content = String(body.content ?? '').trim();
  const parentId = body.parentId ? String(body.parentId) : null;

  if (!articleId) {
    return NextResponse.json({ error: 'مقاله مشخص نیست.' }, { status: 400 });
  }
  if (authorName.length < 2 || authorName.length > 60) {
    return NextResponse.json({ error: 'نام را وارد کنید.' }, { status: 400 });
  }
  if (!EMAIL.test(authorEmail)) {
    return NextResponse.json(
      { error: 'ایمیل معتبر نیست. آدرس را بررسی کنید.' },
      { status: 400 },
    );
  }
  if (content.length < 5) {
    return NextResponse.json({ error: 'متن دیدگاه خیلی کوتاه است.' }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json(
      { error: 'متن دیدگاه طولانی است. حداکثر ۲۰۰۰ نویسه.' },
      { status: 400 },
    );
  }

  const result = await submitComment({
    articleId,
    authorName,
    authorEmail,
    content,
    parentId,
  });

  if (result.status === 'error') {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ status: 'pending' });
}
