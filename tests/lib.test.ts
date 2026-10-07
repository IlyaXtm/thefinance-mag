/**
 * Behaviour tests for the pure selection logic in `src/features/mag/lib`.
 *
 * `npm test` compiles this file and what it imports to CommonJS
 * (tsconfig.test.json) and runs it with Node's built-in runner — no test
 * framework dependency. Only logic is tested here: which article lands in
 * which section, the news day headings, and where retired market URLs go.
 * Layout and copy are checked on the rendered page, not here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLanding } from '../src/features/mag/lib/landing';
import { dayHeading, placeBanner, tehranToday } from '../src/features/mag/lib/news';
import {
  emptyLessonsFallback,
  marketCounts,
  marketRedirectTarget,
  subcategoriesOf,
} from '../src/features/mag/lib/subcategories';
import { educationChips } from '../src/features/mag/lib/education';
import { cardAspect, imageFit } from '../src/features/mag/lib/card';
import type {
  ArticleSummary,
  ContentTypeSlug,
  Market,
  MarketSlug,
} from '../src/features/mag/types/mag.types';

const TYPE_NAMES: Record<ContentTypeSlug, string> = {
  news: 'اخبار',
  report: 'گزارش',
  education: 'آموزش',
};

let seq = 0;

function article(
  type: ContentTypeSlug,
  market: MarketSlug | null,
  overrides: Partial<ArticleSummary> = {},
): ArticleSummary {
  seq += 1;
  /* Newer articles get later timestamps, so `seq` order is publish order. */
  const minute = String(seq % 60).padStart(2, '0');
  const hour = String(Math.floor(seq / 60) % 24).padStart(2, '0');
  return {
    id: `a${seq}`,
    slug: `post-${seq}`,
    title: `مطلب ${seq}`,
    featuredImage: null,
    market: market
      ? { slug: market, name: market, description: null, count: null, byType: null }
      : null,
    contentType: { slug: type, name: TYPE_NAMES[type] },
    readingTime: 5,
    publishedAt: `2026-10-0${1 + (Math.floor(seq / 1440) % 9)}T${hour}:${minute}:00`,
    modifiedAt: null,
    author: { slug: 'x', name: 'x', role: null, bio: null, avatar: null, articleCount: null },
    excerpt: null,
    editorsPick: false,
    seoDescription: null,
    tags: [],
    outline: [],
    ...overrides,
  };
}

function market(slug: MarketSlug, archive: ArticleSummary[]): Market {
  return { slug, name: slug, description: null, ...marketCounts(archive, slug) };
}

/* ── Home page sections ───────────────────────────────────────────────── */

function archiveFixture(): ArticleSummary[] {
  const out: ArticleSummary[] = [];
  const markets: MarketSlug[] = ['forex', 'crypto', 'tse', 'global'];
  for (let i = 0; i < 40; i += 1) out.push(article('education', markets[i % 4]));
  for (let i = 0; i < 30; i += 1) out.push(article('news', markets[i % 4]));
  return out;
}

test('home: no article appears in two sections', () => {
  const landing = buildLanding(archiveFixture());
  const shown = [
    landing.featured,
    ...landing.heroSide,
    ...landing.picks,
    ...landing.articles,
    ...landing.news,
    ...landing.markets.flatMap((b) => b.items),
  ].filter((a): a is ArticleSummary => a !== null);

  assert.equal(new Set(shown.map((a) => a.id)).size, shown.length);
});

test('home: «تازه‌ترین مقالات» has no news, three rows; «تازه‌ترین اخبار» only news', () => {
  const landing = buildLanding(archiveFixture());
  assert.equal(landing.articles.length, 9);
  assert.ok(landing.articles.every((a) => a.contentType.slug !== 'news'));
  assert.ok(landing.news.length > 0);
  assert.ok(landing.news.every((a) => a.contentType.slug === 'news'));
});

test('home: articles are newest first', () => {
  const { articles } = buildLanding(archiveFixture());
  const times = articles.map((a) => a.publishedAt);
  assert.deepEqual([...times].sort().reverse(), times);
});

test('home: market blocks are lessons of that market, titled «آموزش …», linked to the lessons page', () => {
  const { markets } = buildLanding(archiveFixture());
  assert.ok(markets.length > 0);
  for (const block of markets) {
    assert.ok(block.items.every((a) => a.contentType.slug === 'education'));
    assert.ok(block.items.every((a) => a.market?.slug === block.key));
    assert.equal(block.title, `آموزش ${block.key}`);
    assert.equal(block.href, `/category/education/${block.key}`);
  }
});

test('home: editors’ picks lead when there are two or more; otherwise the heading does not claim them', () => {
  const archive = archiveFixture();
  assert.equal(buildLanding(archive).picksSource, 'recent');

  const picked = archive.map((a, i) => (i === 3 || i === 7 ? { ...a, editorsPick: true } : a));
  const landing = buildLanding(picked);
  assert.equal(landing.picksSource, 'editors');
  assert.ok(landing.picks.every((a) => a.editorsPick));
});

/* ── News feed ────────────────────────────────────────────────────────── */

test('news: today is computed in Tehran, not UTC', () => {
  /* 22:00 UTC on 6 Oct is 01:30 on 7 Oct in Tehran. */
  assert.equal(tehranToday(new Date('2026-10-06T22:00:00Z')), '2026-10-07');
  assert.equal(tehranToday(new Date('2026-10-06T20:00:00Z')), '2026-10-06');
});

test('news: only today’s heading says «امروز», and every heading keeps its real date', () => {
  const today = dayHeading('2026-10-07', '2026-10-07');
  const earlier = dayHeading('2026-10-06', '2026-10-07');
  assert.ok(today.startsWith('امروز، '));
  assert.ok(!earlier.includes('امروز'));
  assert.equal(today.replace('امروز، ', ''), dayHeading('2026-10-07', '2000-01-01'));
  assert.notEqual(earlier, dayHeading('2026-10-07', '2000-01-01'));
});

test('news: the Khabarchi banner lands after five or six items, splitting a day without losing any', () => {
  const day = (iso: string, n: number) => ({
    isoDate: iso,
    articles: Array.from({ length: n }, () => article('news', null)),
  });
  const { before, after } = placeBanner([day('2026-10-07', 4), day('2026-10-06', 4)]);
  const count = (blocks: typeof before) => blocks.reduce((n, b) => n + b.articles.length, 0);

  assert.ok(count(before) >= 5 && count(before) <= 6);
  assert.equal(count(before) + count(after), 8);
  /* The split day continues without a second date heading. */
  assert.equal(after[0].isoDate, '2026-10-06');
  assert.equal(after[0].continued, true);
});

/* ── Markets as sub-categories ────────────────────────────────────────── */

test('sub-categories: a market is offered under a section only when it has posts there', () => {
  const archive = [article('education', 'crypto'), article('news', 'forex')];
  const markets = [market('crypto', archive), market('forex', archive)];
  assert.deepEqual(subcategoriesOf(markets, 'education').map((m) => m.slug), ['crypto']);
  assert.deepEqual(subcategoriesOf(markets, 'news').map((m) => m.slug), ['forex']);
});

test('sub-categories: retired /market URLs go to their own lessons page — the merge waits for WordPress', () => {
  assert.equal(marketRedirectTarget('crypto'), '/category/education/crypto');
  /* Not tse yet: until gold-usd's posts are moved in wp-admin its lessons
     page is real, and only an EMPTY gold-usd forwards to tse (next test). */
  assert.equal(marketRedirectTarget('gold-usd'), '/category/education/gold-usd');
});

test('sub-categories: a market with no lessons forwards instead of 404ing', () => {
  const archive = [article('news', 'housing')];
  const markets = [market('housing', archive), market('global', [])];
  assert.equal(emptyLessonsFallback(markets, 'housing'), '/news/housing');
  assert.equal(emptyLessonsFallback(markets, 'global'), '/category/education');
  assert.equal(emptyLessonsFallback(markets, 'gold-usd'), '/category/education/tse');
  assert.equal(emptyLessonsFallback(markets, 'not-a-market'), null);
});

/* ── Education chips ──────────────────────────────────────────────────── */

test('education: chips only for topics with lessons, in the team’s order', () => {
  const archive = [
    article('education', 'crypto'),
    article('education', 'tse', { tags: ['شروع-از-صفر'] }),
    article('news', 'forex'),
  ];
  const markets = (['tse', 'forex', 'crypto'] as MarketSlug[]).map((m) => market(m, archive));
  assert.deepEqual(
    educationChips(archive, markets).map((c) => c.key),
    ['شروع-از-صفر', 'tse', 'crypto'],
  );
});

/* ── Card images ──────────────────────────────────────────────────────── */

test('cards: the image box matches the artwork, so a baked-in headline is not cropped', () => {
  const img = (width: number, height: number) => ({ url: '/x.jpg', alt: 'x', width, height });
  const news = article('news', null);
  const lesson = article('education', null);

  assert.equal(cardAspect(news), '16 / 9');
  assert.equal(cardAspect(lesson), '3 / 2');
  /* The archive's real shapes fill their box. */
  assert.equal(imageFit(img(1280, 716), cardAspect(news)), 'cover');
  assert.equal(imageFit(img(1200, 800), cardAspect(lesson)), 'cover');
  /* A wrong-shaped upload is shown whole, not cut. */
  assert.equal(imageFit(img(1000, 1000), cardAspect(lesson)), 'contain');
  assert.equal(imageFit(img(1200, 800), cardAspect(news)), 'contain');
});
