import { getArticles } from '@/features/mag/api/v1/mag.service';
import { MAG_DESCRIPTION, MAG_NAME, magUrl } from '@/features/mag/lib/site';
import { toPersianDigits } from '@/features/mag/lib/format';

/**
 * /mag/feed — RSS 2.0.
 *
 * WHY THIS EXISTS.
 *
 * WordPress generates `thefinance.ir/mag/feed` today. Readers, aggregators and
 * Telegram bots consume it. After the headless cutover the Next app has no such
 * route, so it 404s — and it breaks SILENTLY: a subscriber sees no error, just
 * no new articles. That can go unnoticed for months, by which point the
 * subscriber is gone. A 404 where content used to be is a regression whether or
 * not anyone is currently subscribed.
 *
 * The URL is the one WordPress used, so existing subscriptions keep working
 * with no action from anybody.
 *
 * Every link is built with `magUrl()`, so an item can never point at the CMS
 * host — the same rule the canonical and sitemap layers enforce.
 */

export const revalidate = 300;

/** Newest 20. A feed is a recent-items list, not an archive. */
const FEED_SIZE = 20;

/**
 * XML escaping.
 *
 * Not optional here: Mag titles routinely carry parenthesised Latin
 * («نات کوین (Notcoin) چیست؟»), and an unescaped `&` — common in Persian
 * transliterations and query-bearing URLs — makes the whole document
 * unparseable rather than merely wrong. `&` must be replaced first or it would
 * double-escape the entities the later rules introduce.
 */
function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RSS wants RFC-822. `toUTCString()` produces exactly that shape. */
function rfc822(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toUTCString() : date.toUTCString();
}

export async function GET() {
  const articles = await getArticles({ page: 1, perPage: FEED_SIZE });

  const items = articles.items
    .map((article) => {
      const url = magUrl(`/${article.slug}`);

      /*
        The content model has no excerpt — a deliberate decision, since the
        live site's excerpts are auto-truncated mid-sentence and the team does
        not write summaries. The article's own H2 headings are what «در این
        مقاله» shows for the same reason: derived from real content, always
        accurate, and descriptive rather than promotional.
      */
      const description = article.outline.length
        ? `${article.contentType.name} · ${toPersianDigits(article.readingTime)} دقیقه — ${article.outline.slice(0, 3).join(' · ')}`
        : `${article.contentType.name} · ${toPersianDigits(article.readingTime)} دقیقه`;

      return [
        '<item>',
        `<title>${xml(article.title)}</title>`,
        `<link>${xml(url)}</link>`,
        /* isPermaLink="true": the canonical article URL is a stable identity,
           so there is no need to mint a separate guid scheme. */
        `<guid isPermaLink="true">${xml(url)}</guid>`,
        `<pubDate>${rfc822(article.publishedAt)}</pubDate>`,
        `<description>${xml(description)}</description>`,
        `<dc:creator>${xml(article.author.name)}</dc:creator>`,
        `<category>${xml(article.contentType.name)}</category>`,
        ...(article.market ? [`<category>${xml(article.market.name)}</category>`] : []),
        '</item>',
      ].join('');
    })
    .join('');

  const newest = articles.items[0];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<channel>',
    `<title>${xml(MAG_NAME)}</title>`,
    `<link>${xml(magUrl('/'))}</link>`,
    `<description>${xml(MAG_DESCRIPTION)}</description>`,
    '<language>fa-IR</language>',
    `<lastBuildDate>${newest ? rfc822(newest.publishedAt) : new Date().toUTCString()}</lastBuildDate>`,
    /* Required by the spec for a self-referencing feed, and what a reader uses
       to recognise the feed after a move. */
    `<atom:link href="${xml(magUrl('/feed'))}" rel="self" type="application/rss+xml"/>`,
    items,
    '</channel>',
    '</rss>',
  ].join('');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      /* Cached like the index rather than rebuilt per request — a feed reader
         polls on a timer and there are aggregators behind this. */
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
    },
  });
}
