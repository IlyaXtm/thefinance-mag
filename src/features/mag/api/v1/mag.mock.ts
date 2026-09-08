/**
 * Mock implementation. Identical return shapes to mag.api.ts.
 *
 * Never imported by a page or component — only `mag.service.ts` imports this.
 *
 * Simulates latency and can be forced into failure so loading and error
 * states are actually testable before real data exists.
 */

import {
  MagNotFoundError,
  MagFetchError,
  type Article,
  type ArticleListParams,
  type ArticleSummary,
  type Author,
  type Category,
  type Market,
  type MarketSlug,
  type Paginated,
  type Report,
  type SearchParams,
  type SearchResult,
} from '../../types/mag.types';
import type { MagSeo } from '../../types/mag-seo.types';
import { DISCLAIMER_TEXT } from '../../types/mag-blocks.types';
import {
  addHeadingIds,
  extractHeadings,
  sanitizeArticleHtml,
  stripInjectedToc,
} from '../../lib/sanitize';

/**
 * The mock runs the SAME content pipeline as the real API.
 *
 * Without this the two diverge in exactly the way that hides bugs: the mock
 * had hardcoded heading ids (`s1`, `s2`) while production generates them from
 * the heading text, so the table of contents linked to anchors that existed
 * only in production. Nothing errored — the links simply did nothing, and only
 * in the environment nobody develops against.
 *
 * A mock that skips the transforms isn't testing the component, it's testing a
 * different component.
 */
function prepareContent(html: string): string {
  return addHeadingIds(sanitizeArticleHtml(stripInjectedToc(html)));
}

/* ------------------------------------------------------------------ */
/* Simulation controls                                                 */
/* ------------------------------------------------------------------ */

const LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 300);
/** Set NEXT_PUBLIC_MOCK_FAIL=1 to exercise error states. */
const FORCE_FAIL = process.env.NEXT_PUBLIC_MOCK_FAIL === '1';

async function simulate<T>(value: T): Promise<T> {
  await new Promise((r) => setTimeout(r, LATENCY_MS));
  if (FORCE_FAIL) {
    throw new MagFetchError('Simulated failure (NEXT_PUBLIC_MOCK_FAIL=1)');
  }
  return value;
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const MARKETS: Record<MarketSlug, Market> = {
  tse: {
    slug: 'tse',
    name: 'بورس ایران',
    description: 'تحلیل، گزارش و آموزش درباره بازار سهام تهران.',
    count: 2,
  },
  'gold-usd': {
    slug: 'gold-usd',
    name: 'طلا و دلار',
    description: 'روند طلا، سکه و ارز و عوامل مؤثر بر آن‌ها.',
    count: 1,
  },
  crypto: {
    slug: 'crypto',
    name: 'کریپتو',
    description: null, // exercises the "description absent" archive variant
    count: 5,
  },
  forex: {
    slug: 'forex',
    name: 'فارکس',
    description: 'مفاهیم، ابزارها و ساختار بازار جهانی ارز.',
    count: 3,
  },
  global: {
    slug: 'global',
    name: 'اقتصاد جهانی',
    description: 'داده‌ها و رویدادهای کلان و اثرشان بر بازارهای داخلی.',
    count: 3,
  },
  housing: {
    slug: 'housing',
    name: 'مسکن',
    description: 'داده‌های معاملات و تحلیل بازار مسکن.',
    /*
      ZERO — matching the real archive.
      Kept at zero deliberately so the "hide markets with no articles" rule is
      exercised in development. A mock where every bucket has data means the
      empty case is only ever discovered in production, which is exactly where
      it matters most.
    */
    count: 0,
  },
};

const TYPES = {
  /*
    `news` is here because production produces it: an RSS automation files
    roughly two items a day under «اخبار». It is also the ONE content type
    that gets NewsArticle rather than Article in the JSON-LD, so a mock
    without it can't exercise that branch — and that branch shipped
    unimplemented for exactly that reason.
  */
  news: { slug: 'news', name: 'اخبار' },
  analysis: { slug: 'analysis', name: 'تحلیل' },
  report: { slug: 'report', name: 'گزارش' },
  education: { slug: 'education', name: 'آموزش' },
} as const;

/*
  THE MOCK MUST NEVER OFFER MORE THAN THE SOURCE.

  That rule is here because breaking it cost a release. `outline` was populated
  on some mock summaries and hardcoded to `[]` in `mag.api.ts`, so the v4 card
  dek rendered perfectly in every review and would have rendered on nothing in
  production. The fix was a real server-side field; the lesson is this comment.

  Two fields are held at null for the same reason:

  - `role` has NO source. It is not in the content model (`CLAUDE.md`), WPGraphQL
    exposes nothing for it, and `mapAuthor` returns null unconditionally. A mock
    value here makes `AuthorBox`'s role line look implemented when it can never
    render. Backlog: either add an author-role field to the CMS or delete the
    line.
  - `avatar` is deliberately always null — Gravatar is dropped (see
    `decisions.md`): a third-party request per author, a hash of their email
    sent abroad, and unreliable from Iran. Every author renders an initial.

  `bio` is NOT held at null: `author.node.description` is a real field the API
  really fetches. It happens to be empty for all six current users, which is why
  AUTHOR_NO_BIO is the realistic case — but an editor filling it in tomorrow
  would show up, so the mock is allowed to exercise it.
*/
const AUTHOR: Author = {
  slug: 'maryam-rezaei',
  name: 'مریم رضایی',
  role: null,
  bio: 'پژوهشگر بازار سرمایه با تمرکز بر صورت‌های مالی و ارزش‌گذاری. پیش‌تر در حوزه تحلیل بنیادی صنایع بانکی و پتروشیمی فعالیت داشته است.',
  avatar: null,
  articleCount: 12,
};

/** Every one of the six real users has `description` null, so a bio-less
    author is the normal case, not the edge case. */
const AUTHOR_NO_BIO: Author = {
  slug: 'no-bio-author',
  name: 'سارا کاظمی',
  role: null,
  bio: null,
  avatar: null,
  articleCount: 3,
};

/**
 * Kept under its original name for the diff's sake, but no author has an avatar
 * any more — see the note on AUTHOR. The initial-based fallback is now the only
 * path, which is what production has always done.
 */
const AUTHOR_NO_AVATAR: Author = {
  slug: 'ali-mohammadi',
  name: 'علی محمدی',
  role: null,
  bio: 'تمرکز بر داده‌های کلان اقتصادی و اثر آن‌ها بر بازارهای نوظهور.',
  avatar: null,
  articleCount: 5,
};

function img(seed: string, alt: string): ArticleSummary['featuredImage'] {
  return { url: `/mock/covers/${seed}.jpg`, alt, width: 1200, height: 675 };
}

/**
 * A featured image at a stated size, for the hero-ratio stress fixtures.
 *
 * The ordinary covers are all 1200×675, which is the one shape the archive
 * does NOT have — so the fixed hero looked fine against the mock while
 * cropping 41% off every real image. These three carry the dimensions actually
 * measured on the live corpus, and the files themselves are drawn with an
 * inset frame and corner marks so a crop is visible rather than inferred.
 */
function sizedImg(
  seed: string,
  alt: string,
  width: number,
  height: number,
): ArticleSummary['featuredImage'] {
  return { url: `/mock/covers/${seed}.jpg`, alt, width, height };
}

const SUMMARIES: ArticleSummary[] = [
  {
    /*
      A translated news item — time-bound, no revision. Publication date is
      the only freshness signal it carries, which is what NewsArticle exists
      to say.
    */
    id: 'a0',
    slug: 'fed-holds-rates-august',
    title: 'فدرال‌رزرو نرخ بهره را بدون تغییر نگه داشت',
    featuredImage: img('fed', 'ساختمان فدرال‌رزرو'),
    market: MARKETS.global,
    contentType: TYPES.news,
    readingTime: 3,
    publishedAt: '2026-08-19T14:10:00+03:30',
    modifiedAt: '2026-08-19T14:10:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: ['تصمیم نشست', 'واکنش بازارها'],
  },
  {
    id: 'n1',
    slug: 'fed-holds-rates-august-followup',
    title: 'بازار سهام آسیا پس از تصمیم فدرال‌رزرو',
    featuredImage: img('fed', 'تصویر خبر'),
    market: MARKETS['global'],
    contentType: TYPES.news,
    readingTime: 3,
    publishedAt: '2026-08-19T16:40:00+03:30',
    modifiedAt: '2026-08-19T16:40:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: [],
  },
  {
    id: 'n2',
    slug: 'gold-ounce-daily-move',
    title: 'اونس طلا در معاملات امروز محدود ماند',
    featuredImage: img('gold', 'تصویر خبر'),
    market: MARKETS['gold-usd'],
    contentType: TYPES.news,
    readingTime: 2,
    publishedAt: '2026-08-19T11:05:00+03:30',
    modifiedAt: '2026-08-19T11:05:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: [],
  },
  {
    id: 'n3',
    slug: 'tse-index-daily-close',
    title: 'شاخص کل بورس تهران با رشد جزئی بسته شد',
    featuredImage: img('banks', 'تصویر خبر'),
    market: MARKETS['tse'],
    contentType: TYPES.news,
    readingTime: 3,
    publishedAt: '2026-08-18T15:20:00+03:30',
    modifiedAt: '2026-08-18T15:20:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: [],
  },
  {
    id: 'n4',
    slug: 'crypto-etf-flows-report',
    title: 'گزارش جریان ورودی صندوق‌های کریپتو منتشر شد',
    featuredImage: img('notcoin', 'تصویر خبر'),
    market: MARKETS['crypto'],
    contentType: TYPES.news,
    readingTime: 4,
    publishedAt: '2026-08-18T09:30:00+03:30',
    modifiedAt: '2026-08-18T09:30:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: [],
  },
  {
    id: 'n5',
    slug: 'dollar-index-weekly',
    title: 'شاخص دلار هفته را با افت به پایان برد',
    featuredImage: img('fed', 'تصویر خبر'),
    market: MARKETS['global'],
    contentType: TYPES.news,
    readingTime: 2,
    publishedAt: '2026-08-17T13:15:00+03:30',
    modifiedAt: '2026-08-17T13:15:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: [],
  },
  {
    id: 'a1',
    slug: 'bank-half-year-financials',
    title: 'صورت‌های مالی شش‌ماهه: چه چیزی در گزارش بانک‌ها تغییر کرد',
    featuredImage: img('banks', 'نمای ساختمان‌های بانکی'),
    market: MARKETS.tse,
    contentType: TYPES.report,
    readingTime: 9,
    publishedAt: '2026-08-18T09:00:00+03:30',
    modifiedAt: '2026-08-18T09:00:00+03:30',
    author: AUTHOR,
    excerpt: null,
    outline: [
      'چه چیزی در ترازنامه تغییر کرد',
      'سود تسهیلات و درآمد مشاع',
      'مقایسه با دوره مشابه سال قبل',
    ],
  },
  {
    id: 'a2',
    slug: 'us-rates-and-domestic-gold',
    title: 'هج فاند (Hedge Fund) چیست؟ ساختار، کارمزد و ریسک',
    featuredImage: img('gold', 'شمش طلا روی سطح تیره'),
    market: MARKETS['gold-usd'],
    contentType: TYPES.analysis,
    readingTime: 7,
    publishedAt: '2026-08-17T11:30:00+03:30',
    modifiedAt: '2026-08-17T11:30:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: 'رابطه‌ی نرخ بهره آمریکا با قیمت طلای داخلی مستقیم نیست؛ از مسیر دلار و انتظارات تورمی می‌گذرد.',
    outline: ['کانال اثرگذاری نرخ بهره', 'نقش نرخ ارز', 'محدودیت‌های این رابطه'],
  },
  {
    id: 'a3',
    slug: 'notcoin-guide',
    title: 'نات کوین (Notcoin) چیست؟ راهنمای کامل پروژه و مکانیزم توزیع توکن',
    featuredImage: img('notcoin', 'نماد پروژه نات کوین'),
    market: MARKETS.crypto,
    contentType: TYPES.education,
    readingTime: 10,
    publishedAt: '2026-08-16T08:15:00+03:30',
    modifiedAt: '2026-08-16T08:15:00+03:30',
    author: AUTHOR,
    excerpt: null,
    outline: ['نات کوین چگونه کار می‌کند', 'مکانیزم توزیع توکن', 'ریسک‌های پروژه'],
  },
  {
    id: 'a4',
    slug: 'zig-zag-indicator',
    /* One of the titles the bidi bracket defect was reported on — kept
       verbatim so the fix stays regression-testable at 390px. */
    title: 'اندیکاتور زیگ زاگ (Zig Zag) چیست؟',
    featuredImage: img('zigzag', 'نمودار با نوسانات پی‌درپی'),
    market: MARKETS.forex,
    contentType: TYPES.education,
    readingTime: 6,
    publishedAt: '2026-08-15T14:00:00+03:30',
    modifiedAt: '2026-08-15T14:00:00+03:30',
    author: AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: ['تعریف اندیکاتور', 'تنظیم درصد بازگشت'],
  },
  {
    id: 'a5',
    slug: 'dxy-and-emerging-markets',
    title: 'میکر و تیکر (Maker & Taker) چه تفاوتی دارند',
    featuredImage: img('dxy', 'نمودار شاخص دلار'),
    market: MARKETS.global,
    contentType: TYPES.analysis,
    readingTime: 8,
    publishedAt: '2026-08-14T10:00:00+03:30',
    modifiedAt: '2026-08-14T10:00:00+03:30',
    author: AUTHOR,
    /*
      A HAND-WRITTEN EXCERPT, on two fixtures out of nineteen.
      `cardDek` prefers this over the derived headings, so the branch has to be
      reachable in development or it is only ever exercised in production.

      Two, not most: what proportion of the real archive carries a manual
      excerpt has NOT been measured — the build environment cannot reach the
      CMS — so the mock must not imply an answer. If the measurement comes back
      high, this is the field the dek should rely on and `outlineHeadings` can
      leave the listing query entirely.
    */
    excerpt: 'دلار قوی‌تر پول را از بازارهای نوظهور بیرون می‌کشد. این گزارش سه دوره‌ی تاریخی را کنار هم می‌گذارد.',
    outline: [
      'شاخص دلار چه چیزی را می‌سنجد',
      'کانال انتقال به بازارهای نوظهور',
      'نمونه‌های تاریخی',
    ],
  },
  {
    id: 'a6',
    slug: 'tehran-housing-spring-1405',
    title: 'بازار مسکن تهران در بهار ۱۴۰۵: داده‌های معاملات',
    featuredImage: img('housing', 'نمای شهری تهران'),
    /*
      NULL. `housing` is documented as a zero-article market so the
      "hide empty markets" rule stays exercised, but this fixture was still
      pointing at it — so the filter bar hid housing while /market/housing
      rendered an article, and the empty archive could never be reached.
      Market-less is also the majority case in the real archive (18 of 32).
    */
    market: null,
    contentType: TYPES.report,
    readingTime: 11,
    publishedAt: '2026-08-13T09:45:00+03:30',
    modifiedAt: '2026-08-13T09:45:00+03:30',
    author: AUTHOR,
    // Single-entry outline — consumers must omit the block, not render one item.
    excerpt: null,
    outline: ['روش‌شناسی داده‌ها'],
  },
  {
    /*
      NO FEATURED IMAGE, IN THE GRID.

      A null-image article already existed as a stress fixture, but it was
      reachable only by slug — so `CardImage`'s placeholder branch had never
      once been rendered inside a card grid, which is the only place it can
      cause the failure worth checking: a card that collapses and reflows the
      row around it.

      v4 is image-led, so this is the state that reads as broken rather than as
      restraint. It belongs in the listing where it can be seen, not in a
      by-slug corner.
    */
    /* a8 — a7 is FULL_ARTICLE's id. */
    id: 'a8',
    slug: 'no-featured-image-report',
    title: 'گزارشی بدون تصویر شاخص — آزمون چیدمان کارت',
    featuredImage: null,
    market: null,
    contentType: TYPES.report,
    readingTime: 6,
    publishedAt: '2026-08-12T08:30:00+03:30',
    modifiedAt: '2026-08-12T08:30:00+03:30',
    author: AUTHOR_NO_BIO,
    excerpt: null,
    outline: ['چه چیزی اندازه‌گیری شد', 'محدودیت‌های داده'],
  },
];

/**
 * Filler, so pagination is reachable at all.
 *
 * The hand-written fixtures above number seven, and every listing shows nine
 * or fifteen per page — so before this existed there was never a page two in
 * development. Pagination now spans three route families with their own 404
 * edge cases (`/page/1`, past-the-end), and none of it could be seen locally.
 * That is exactly how the previous round of pagination bugs survived: links
 * pointing at routes that did not exist, and nobody could tell.
 *
 * Generated rather than hand-written because the content is not the point —
 * crossing the page boundary is. They carry a distinct title prefix so they
 * are never mistaken for designed fixtures.
 */
const FILLER: ArticleSummary[] = Array.from({ length: 14 }, (_, i) => {
  const n = i + 1;
  return {
    id: `f${n}`,
    slug: `filler-article-${n}`,
    title: `نمونه صفحه‌بندی ${toPersianDigitsLocal(n)} — مطلبی برای پر کردن فهرست`,
    featuredImage: img('filler', 'تصویر نمونه'),
    market: n % 2 === 0 ? MARKETS.crypto : null,
    contentType: n % 3 === 0 ? TYPES.analysis : TYPES.education,
    readingTime: 4 + (n % 7),
    /* Older than every designed fixture, so they sort to the back and never
       displace a real one from the hero or the top of a list. */
    publishedAt: `2026-0${1 + (n % 3)}-${String(10 + (n % 18)).padStart(2, '0')}T09:00:00+03:30`,
    modifiedAt: `2026-0${1 + (n % 3)}-${String(10 + (n % 18)).padStart(2, '0')}T09:00:00+03:30`,
    author: n % 2 === 0 ? AUTHOR : AUTHOR_NO_AVATAR,
    excerpt: null,
    outline: ['بخش نخست', 'بخش دوم'],
  };
});

/** Local digit helper — the shared one lives in lib/format, which the mock
    deliberately does not import so the fixture stays self-contained. */
function toPersianDigitsLocal(value: number): string {
  return String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

/** The full sample article, with a revision date that differs from publish. */
const FULL_ARTICLE: Article = {
  /* content is passed through prepareContent below, after the object literal,
     so the mock and the real API produce identical HTML. */
  id: 'a7',
  slug: 'fundamental-analysis',
  title: 'تحلیل فاندامنتال (Fundamental Analysis) چیست؟',
  featuredImage: img('fundamental', 'صورت مالی روی میز کار'),
  market: MARKETS.tse,
  contentType: TYPES.education,
  readingTime: 14,
  publishedAt: '2024-11-02T08:00:00+03:30',
  modifiedAt: '2026-08-18T16:20:00+03:30',
  author: AUTHOR,
  excerpt: null,
  outline: [
    'تحلیل فاندامنتال چیست',
    'تفاوت آن با تحلیل تکنیکال',
    'صورت‌های مالی و نسبت‌های کلیدی',
    'محدودیت‌های این روش',
  ],
  secondaryMarkets: [MARKETS.global],
  content: [
    '<h2>تحلیل فاندامنتال چیست</h2>',
    '<p>تحلیل فاندامنتال روشی است که با بررسی وضعیت مالی و عملیاتی یک شرکت می‌کوشد ارزش ذاتی آن را برآورد کند. در این روش قیمت بازار نقطه شروع نیست، بلکه چیزی است که در پایان با برآورد به‌دست‌آمده مقایسه می‌شود.</p>',
    `<div data-block="thefinance/callout"><strong>ارزش ذاتی</strong><p>برآوردی از ارزش یک دارایی بر پایه داده‌های بنیادی، مستقل از قیمتی که بازار در لحظه به آن می‌دهد.</p></div>`,
    '<h2>تفاوت آن با تحلیل تکنیکال</h2>',
    '<p>تحلیل تکنیکال رفتار قیمت و حجم را بررسی می‌کند و به این پرسش نمی‌پردازد که شرکت چه می‌کند. تحلیل فاندامنتال دقیقاً از همان‌جا شروع می‌شود. این دو یکدیگر را نفی نمی‌کنند و بسیاری از سرمایه‌گذاران هر دو را به کار می‌برند.</p>',
    '<h2>صورت‌های مالی و نسبت‌های کلیدی</h2>',
    '<p>سه صورت مالی پایه — ترازنامه، صورت سود و زیان و صورت جریان وجوه نقد — ورودی اصلی این تحلیل‌اند. نسبت‌هایی مانند <span dir="ltr">P/E</span> از دل همین صورت‌ها بیرون می‌آیند و به‌تنهایی معنا نمی‌دهند؛ باید با میانگین صنعت و تاریخچه خود شرکت سنجیده شوند.</p>',
    '<h3>نسبت قیمت به درآمد</h3>',
    '<p>این نسبت نشان می‌دهد بازار حاضر است بابت هر واحد سود چقدر بپردازد. عدد بالا لزوماً بد نیست و عدد پایین لزوماً فرصت نیست.</p>',
    '<h2>محدودیت‌های این روش</h2>',
    '<p>برآورد ارزش ذاتی به مفروضات وابسته است و تغییر کوچکی در نرخ رشد فرض‌شده می‌تواند نتیجه را به‌کلی جابه‌جا کند. ضمناً این روش درباره زمان‌بندی چیزی نمی‌گوید؛ ممکن است سال‌ها طول بکشد تا قیمت به برآورد نزدیک شود.</p>',
    `<div data-block="thefinance/disclaimer"><p>${DISCLAIMER_TEXT}</p></div>`,
  ].join('\n'),
  seo: {
    title: 'تحلیل فاندامنتال چیست؟ راهنمای کاربردی | مجله فایننس',
    description:
      'تحلیل فاندامنتال چگونه کار می‌کند، چه تفاوتی با تحلیل تکنیکال دارد و کجا محدود می‌شود.',
    canonicalUrl: 'https://thefinance.ir/mag/fundamental-analysis',
    robots: ['index', 'follow', 'max-image-preview:large'],
    breadcrumbs: [
      { text: 'مگ', url: 'https://thefinance.ir/mag', isHidden: false },
      {
        text: 'بورس ایران',
        url: 'https://thefinance.ir/mag/market/tse',
        isHidden: false,
      },
    ],
    jsonLdRaw: null,
    openGraph: {
      title: 'تحلیل فاندامنتال (Fundamental Analysis) چیست؟',
      description: 'راهنمای کاربردی تحلیل بنیادی برای بازار سهام.',
      url: 'https://thefinance.ir/mag/fundamental-analysis',
      type: 'article',
      locale: 'fa_IR',
      imageUrl: '/mock/covers/fundamental.jpg',
      twitterCard: 'summary_large_image',
    },
  },
};

/* The same transforms production applies. Doing it here rather than inline
   keeps the fixture readable while guaranteeing parity. */
FULL_ARTICLE.content = prepareContent(FULL_ARTICLE.content);

/* ------------------------------------------------------------------ */
/* Adversarial fixtures                                                */
/* ------------------------------------------------------------------ */
/*
 * Real archives contain all of these, and every one of them is a case the
 * happy-path fixture above cannot reach. They are SYNTHETIC — shaped to match
 * what Phase 0 measured about the real archive, not copied from it — so they
 * prove the components survive the shape, not that production content is fine.
 *
 * They are reachable by slug but deliberately absent from SUMMARIES, so they
 * never appear in a listing, a sitemap or a count.
 */

/* Minimal per-article SEO — enough for the metadata mapping to run, with no
   shared OpenGraph object that could leak one fixture's title onto another. */
function stressSeo(slug: string, title: string): MagSeo {
  return {
    title,
    description: null,
    canonicalUrl: `https://thefinance.ir/mag/${slug}`,
    robots: ['index', 'follow', 'max-image-preview:large'],
    breadcrumbs: [],
    jsonLdRaw: null,
    openGraph: null,
  };
}

const STRESS: Article[] = [
  {
    /*
      THE HEADLINE THE SEO REVIEW MARKED UP, VERBATIM.

      Live it broke after «خرید،» and stranded «انتقال و نگهداری BTC» on a line
      of its own. Persian headlines built with «؛» and «،» read as clauses, and
      a break inside the second clause reads as a mistake rather than as a line
      ending.

      It is a fixture because the mock had no title with this shape — every
      existing one either fits on a line or breaks somewhere harmless — so
      `text-wrap: balance` could have been added, shipped and measured against
      titles that never exhibited the defect. Same failure as the hero: the
      fixtures agreed with the code instead of testing it.
    */
    id: 'w1',
    slug: 'stress-headline-clause-break',
    title: 'خرید بیت کوین در ایران؛ آموزش کامل خرید، انتقال و نگهداری BTC',
    featuredImage: img('notcoin', 'نمودار قیمت بیت کوین'),
    market: MARKETS.crypto,
    contentType: TYPES.education,
    readingTime: 9,
    publishedAt: '2026-08-05T10:00:00+03:30',
    modifiedAt: null,
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>مقدمه</h2><p>متن نمونه.</p><h2>کیف پول</h2><p>متن نمونه.</p>',
    seo: stressSeo('stress-headline-clause-break', 'خرید بیت کوین در ایران'),
  },
  /* ── The three hero shapes, from the live corpus ─────────────────────── */
  {
    /* The widest: 2.50. Three published images are under 800px wide and this
       is their shape. The old fixed hero cropped 23% off it AND upscaled a
       680px file across 1360px of frame. */
    id: 'h1',
    slug: 'stress-hero-wide',
    title: 'تصویر پهن (۶۸۰×۲۷۲) — بررسی نسبت ابعاد قاب',
    featuredImage: sizedImg('stress-wide', 'قاب آزمایشی با نسبت ۲٫۵', 680, 272),
    market: null,
    contentType: TYPES.education,
    readingTime: 4,
    publishedAt: '2026-08-01T10:00:00+03:30',
    modifiedAt: null,
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>مقدمه</h2><p>متن نمونه.</p>',
    seo: stressSeo('stress-hero-wide', 'تصویر پهن (۶۸۰×۲۷۲)'),
  },
  {
    /* The tallest AND under 800px wide: 1.50. The clamp floor bites here and
       nowhere else — 21% cropped instead of the old 54%. */
    id: 'h2',
    slug: 'stress-hero-small',
    title: 'تصویر کوچک (۶۴۰×۴۲۷) — بررسی کف نسبت ابعاد',
    featuredImage: sizedImg('stress-small', 'قاب آزمایشی با نسبت ۱٫۵', 640, 427),
    market: null,
    contentType: TYPES.education,
    readingTime: 4,
    publishedAt: '2026-08-02T10:00:00+03:30',
    modifiedAt: null,
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>مقدمه</h2><p>متن نمونه.</p>',
    seo: stressSeo('stress-hero-small', 'تصویر کوچک (۶۴۰×۴۲۷)'),
  },
  {
    /* 1200×630 with the headline baked into the artwork, as much of the
       archive is. This is the case where a crop is not merely ugly: the old
       box cut the lower third, which is where the baked text sits. */
    id: 'h3',
    slug: 'stress-hero-baked',
    title: 'تیتر روی تصویر (۱۲۰۰×۶۳۰) — بررسی برش متن',
    featuredImage: sizedImg('stress-baked', 'قاب آزمایشی با تیتر روی تصویر', 1200, 630),
    market: null,
    contentType: TYPES.education,
    readingTime: 4,
    publishedAt: '2026-08-03T10:00:00+03:30',
    modifiedAt: null,
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>مقدمه</h2><p>متن نمونه.</p>',
    seo: stressSeo('stress-hero-baked', 'تیتر روی تصویر (۱۲۰۰×۶۳۰)'),
  },
  {
    /* The longest article in the archive is a 41-minute read. 24 headings is
       what makes the table of contents scroll rather than run off-screen. */
    id: 'x1',
    slug: 'stress-long-technical-analysis',
    title: 'تحلیل تکنیکال (Technical Analysis) چیست؟ راهنمای جامع ابزارها، الگوها و مدیریت ریسک برای بازارهای مالی',
    featuredImage: img('technical', 'نمودار تحلیل تکنیکال روی نمایشگر'),
    market: null,
    contentType: TYPES.education,
    readingTime: 41,
    publishedAt: '2025-03-11T10:00:00+03:30',
    modifiedAt: '2026-07-02T09:15:00+03:30',
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '__LONG__',
    seo: stressSeo('stress-long-technical-analysis', 'تحلیل تکنیکال (Technical Analysis) چیست؟ راهنمای جامع ابزارها، الگوها و مدیریت ریسک برای بازارهای مالی'),
  },
  {
    /*
      A percent-encoded Persian slug — the form most of the archive uses.
      The route param arrives decoded, so this fixture proves the decode and
      the lookup line up. The RE-encode that production needs on the way to
      WordPress lives in mag.api.ts and cannot be exercised from here.
    */
    id: 'x4',
    slug: 'تحلیل-تکنیکال-چیست',
    title: 'تحلیل تکنیکال چیست؟',
    featuredImage: img('technical', 'نمودار تحلیل تکنیکال'),
    market: null,
    contentType: TYPES.education,
    readingTime: 12,
    publishedAt: '2026-05-04T10:00:00+03:30',
    modifiedAt: '2026-05-04T10:00:00+03:30',
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>مقدمه</h2><p>متن نمونه.</p><h2>ابزارها</h2><p>متن نمونه.</p>',
    seo: stressSeo('تحلیل-تکنیکال-چیست', 'تحلیل تکنیکال چیست؟'),
  },
  {
    /* One heading — the ToC must be omitted, not rendered with a single row. */
    id: 'x2',
    slug: 'stress-one-heading',
    title: 'یک تیتر، بدون فهرست',
    featuredImage: img('single', 'تصویر شاهد'),
    market: MARKETS.forex,
    contentType: TYPES.analysis,
    readingTime: 4,
    publishedAt: '2026-06-01T10:00:00+03:30',
    modifiedAt: '2026-06-01T10:00:00+03:30',
    author: AUTHOR,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<h2>تنها تیتر مقاله</h2><p>متن نمونه برای حالتی که مقاله فقط یک تیتر دارد.</p>',
    seo: stressSeo('stress-one-heading', 'یک تیتر، بدون فهرست'),
  },
  {
    /* Zero headings, and no featured image either — so the hero block and the
       ToC both have to disappear without leaving a gap behind them. */
    id: 'x3',
    slug: 'stress-no-heading-no-image',
    title: 'بدون تیتر و بدون تصویر شاخص',
    featuredImage: null,
    market: null,
    contentType: TYPES.news,
    readingTime: 2,
    publishedAt: '2026-06-02T10:00:00+03:30',
    modifiedAt: '2026-06-02T10:00:00+03:30',
    author: AUTHOR_NO_BIO,
    excerpt: null,
    outline: [],
    secondaryMarkets: [],
    content: '<p>خبری کوتاه بدون هیچ تیتر داخلی و بدون تصویر شاخص.</p><p>پاراگراف دوم.</p>',
    seo: stressSeo('stress-no-heading-no-image', 'بدون تیتر و بدون تصویر شاخص'),
  },
];

/*
  POSITIONAL INDEXING BROKE THIS ONCE. This body used to be assigned as
  `STRESS[0].content`, and adding three hero fixtures to the front of the array
  silently moved the 24-heading article to index 3 — so the long-read fixture
  lost its content and its outline, and the ToC it exists to exercise stopped
  rendering entirely. Nothing failed; the page just quietly had no contents
  panel. Addressed by slug now, which cannot be reordered out from under it.
*/
const LONG_READ = STRESS.find((a) => a.slug === 'stress-long-technical-analysis');
if (!LONG_READ) throw new Error('stress-long-technical-analysis fixture is missing');

/*
  THE INJECTED TABLE OF CONTENTS, AS THE PLUGIN ACTUALLY EMITS IT.

  Prepended to the 24-heading article — the worst case the review named — so
  `stripInjectedToc` is exercised by the fixtures rather than trusted. Without
  this the mock renders one ToC, the strip is a no-op nothing notices, and the
  regression that matters (the container's nested title <div> swallowing a
  non-greedy match) is invisible until production.

  The nesting is the point: a <div> containing another <div> and then the list.
  Anything that stops at the first </div> deletes «فهرست مطالب», keeps the whole
  list, and leaves an orphaned closing tag in the article body.

  Live this arrives on the Persian slug تحلیل-تکنیکال-چیست; the fixture with 24
  headings is `stress-long-technical-analysis`, so that is where it goes.
*/
const INJECTED_TOC =
  '<div id="ez-toc-container" class="ez-toc-v2_0_74 counter-hierarchy ez-toc-counter ez-toc-grey">' +
  '<div class="ez-toc-title-container">' +
  '<p class="ez-toc-title">فهرست مطالب</p>' +
  '<span class="ez-toc-title-toggle"><a href="#" class="ez-toc-pull-right ez-toc-btn"></a></span>' +
  '</div>' +
  '<nav><ul class="ez-toc-list ez-toc-list-level-1">' +
  '<li class="ez-toc-heading-level-2"><a class="ez-toc-link" href="#Heading_1">تحلیل تکنیکال چیست</a></li>' +
  '<li class="ez-toc-heading-level-2"><a class="ez-toc-link" href="#Heading_2">فرض‌های بنیادی این روش</a>' +
  '<ul class="ez-toc-list-level-3"><li><a class="ez-toc-link" href="#Sub_1">زیربخش</a></li></ul></li>' +
  '</ul></nav></div>';

LONG_READ.content = INJECTED_TOC + '<span class="ez-toc-section" id="Heading_1"></span><h2>تحلیل تکنیکال چیست</h2>\n<p>در این بخش به «تحلیل تکنیکال چیست» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>فرض‌های بنیادی این روش</h2>\n<p>در این بخش به «فرض‌های بنیادی این روش» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>نمودار شمعی و خواندن آن</h2>\n<p>در این بخش به «نمودار شمعی و خواندن آن» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<figure><img src="/mag/mock/covers/chart.jpg" alt="نمودار شمعی نمونه" width="1200" height="675" /><figcaption>نمودار شمعی روزانه؛ هر شمع یک روز معاملاتی است.</figcaption></figure>\n<h2>خطوط روند</h2>\n<p>در این بخش به «خطوط روند» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>حمایت و مقاومت</h2>\n<p>در این بخش به «حمایت و مقاومت» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>میانگین متحرک ساده</h2>\n<p>در این بخش به «میانگین متحرک ساده» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<ul><li>میانگین کوتاه‌مدت<ul><li>۹ روزه</li><li>۲۱ روزه<ul><li>کاربرد در نوسان‌گیری</li></ul></li></ul></li><li>میانگین بلندمدت</li></ul>\n<h2>میانگین متحرک نمایی</h2>\n<p>در این بخش به «میانگین متحرک نمایی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>اندیکاتور مکدی</h2>\n<p>در این بخش به «اندیکاتور مکدی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>شاخص قدرت نسبی</h2>\n<p>در این بخش به «شاخص قدرت نسبی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<table><thead><tr><th>اندیکاتور</th><th>دوره پیش‌فرض</th><th>نوع</th><th>سیگنال اصلی</th><th>ضعف شناخته‌شده</th></tr></thead><tbody><tr><td><span dir="ltr">RSI</span></td><td>۱۴</td><td>نوسان‌نما</td><td>اشباع خرید و فروش</td><td>در روند قوی دیر برمی‌گردد</td></tr><tr><td><span dir="ltr">MACD</span></td><td>۱۲/۲۶/۹</td><td>روندنما</td><td>تقاطع خطوط</td><td>تأخیر ذاتی</td></tr><tr><td><span dir="ltr">ATR</span></td><td>۱۴</td><td>نوسان</td><td>اندازه حد ضرر</td><td>جهت نمی‌دهد</td></tr></tbody></table>\n<h2>باندهای بولینگر</h2>\n<p>در این بخش به «باندهای بولینگر» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>ایچیموکو</h2>\n<p>در این بخش به «ایچیموکو» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>حجم معاملات و تأیید روند</h2>\n<p>در این بخش به «حجم معاملات و تأیید روند» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>الگوهای بازگشتی</h2>\n<p>در این بخش به «الگوهای بازگشتی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<blockquote><p>بازار می‌تواند بیشتر از آنچه شما توان پرداخت دارید غیرمنطقی بماند.</p></blockquote>\n<h2>الگوهای ادامه‌دهنده</h2>\n<p>در این بخش به «الگوهای ادامه‌دهنده» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>فیبوناچی اصلاحی</h2>\n<p>در این بخش به «فیبوناچی اصلاحی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>امواج الیوت</h2>\n<p>در این بخش به «امواج الیوت» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>واگرایی و انواع آن</h2>\n<p>در این بخش به «واگرایی و انواع آن» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>تایم‌فریم و انتخاب آن</h2>\n<p>در این بخش به «تایم‌فریم و انتخاب آن» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<pre><code>ema(close, 21) &gt; ema(close, 55) and rsi(close, 14) &lt; 70 and volume &gt; sma(volume, 20) * 1.5</code></pre>\n<h2>مدیریت ریسک</h2>\n<p>در این بخش به «مدیریت ریسک» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>حد ضرر و حد سود</h2>\n<p>در این بخش به «حد ضرر و حد سود» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>خطاهای رایج</h2>\n<p>در این بخش به «خطاهای رایج» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<p>یک شناسه بسیار طولانی بدون فاصله برای آزمودن سرریز ستون: <code>ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789</code></p>\n<h2>ترکیب با تحلیل بنیادی</h2>\n<p>در این بخش به «ترکیب با تحلیل بنیادی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>محدودیت‌های تحلیل تکنیکال</h2>\n<p>در این بخش به «محدودیت‌های تحلیل تکنیکال» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>\n<h2>جمع‌بندی</h2>\n<p>در این بخش به «جمع‌بندی» می‌پردازیم و نشان می‌دهیم چگونه در عمل به کار می‌آید. نکته کلیدی این است که هیچ ابزاری به‌تنهایی سیگنال قطعی نمی‌دهد و باید در کنار بقیه سنجیده شود.</p>';

/* Same pipeline as everything else — a fixture that skips it is testing a
   different component. Outlines are derived, never hand-written, so they
   cannot drift from the ids the body actually carries. */
for (const article of STRESS) {
  article.content = prepareContent(article.content);
  article.outline = extractHeadings(article.content);
}



const REPORTS: Report[] = [
  {
    id: 'r1',
    slug: 'monthly-1405-05',
    title: 'ماهنامه بازارهای مالی — مرداد ۱۴۰۵',
    cover: { url: '/mock/reports/m12.jpg', alt: 'جلد ماهنامه شماره ۱۲', width: 600, height: 800 },
    issueLabel: 'شماره ۱۲',
    publishedAt: '2026-08-10T00:00:00+03:30',
    fileUrl: null,
  },
  {
    id: 'r2',
    slug: 'banking-q1-1405',
    title: 'گزارش فصلی صنعت بانکداری',
    cover: { url: '/mock/reports/banking.jpg', alt: 'جلد گزارش بانکداری', width: 600, height: 800 },
    issueLabel: 'بهار ۱۴۰۵',
    publishedAt: '2026-07-05T00:00:00+03:30',
    fileUrl: null,
  },
  {
    id: 'r3',
    slug: 'tehran-housing-review',
    title: 'مروری بر بازار مسکن تهران',
    cover: { url: '/mock/reports/housing.jpg', alt: 'جلد گزارش مسکن', width: 600, height: 800 },
    issueLabel: 'تیر ۱۴۰۵',
    publishedAt: '2026-06-28T00:00:00+03:30',
    fileUrl: null,
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/*
 * Mirrors the real API, including what it does when asked for a page past the
 * end: an EMPTY items array at the requested page number.
 *
 * This used to clamp `page` into range, which quietly made out-of-range pages
 * impossible to reach — so the `items.length === 0 → notFound()` guard in
 * /page/[n] could never fire locally, and /mag/page/999 answered 200 with
 * page-1 content in development while production would 404. Clamping in a
 * fixture doesn't make the app more robust; it just moves the discovery to
 * production.
 */
function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const requested = Math.max(1, page);
  const start = (requested - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: requested,
    perPage,
    total,
    totalPages,
  };
}

/* ------------------------------------------------------------------ */
/* API surface                                                         */
/* ------------------------------------------------------------------ */

/* Designed fixtures first, filler behind them — newest to oldest, the order a
   real listing arrives in. */
const ALL_SUMMARIES: ArticleSummary[] = [...SUMMARIES, ...FILLER];

/** Mirrors the real API: one source for a market's list, count and pages. */
export async function getMarketArticles(
  marketSlug: string,
  page: number,
  perPage: number,
): Promise<Paginated<ArticleSummary>> {
  const items = ALL_SUMMARIES.filter((a) => a.market?.slug === marketSlug);
  return simulate(paginate(items, page, perPage));
}

/** Mirrors the real API. Only used by the health probe. */
export function magArchiveOverflowed(): boolean {
  return false;
}

export async function getAllSummaries(): Promise<ArticleSummary[]> {
  return simulate([...ALL_SUMMARIES]);
}

export async function getArticles(
  params: ArticleListParams = {},
): Promise<Paginated<ArticleSummary>> {
  const { page = 1, perPage = 9, market, category, contentType, authorSlug, excludeSlug } =
    params;

  const filtered = ALL_SUMMARIES.filter((a) => {
    if (market && a.market?.slug !== market) return false;
    if (category && !inMockCategory(a, category)) return false;
    if (contentType && a.contentType.slug !== contentType) return false;
    if (authorSlug && a.author.slug !== authorSlug) return false;
    if (excludeSlug && a.slug === excludeSlug) return false;
    return true;
  });

  return simulate(paginate(filtered, page, perPage));
}

export async function getArticle(slug: string): Promise<Article> {
  if (slug === FULL_ARTICLE.slug) return simulate(FULL_ARTICLE);

  const stress = STRESS.find((a) => a.slug === slug);
  if (stress) return simulate(stress);

  const summary = ALL_SUMMARIES.find((a) => a.slug === slug);
  if (!summary) throw new MagNotFoundError(slug);

  return simulate({
    ...summary,
    content: prepareContent(`<h2>${summary.outline[0] ?? 'مقدمه'}</h2><p>متن نمونه.</p>`),
    secondaryMarkets: [],
    /*
      Per-article SEO. Spreading FULL_ARTICLE.seo wholesale leaked one
      article's OpenGraph title and description onto every other article —
      caught by inspecting the rendered <meta> tags, not by the type system,
      because the shape was valid the whole time.
    */
    seo: {
      ...FULL_ARTICLE.seo,
      title: summary.title,
      description: null,
      canonicalUrl: `https://thefinance.ir/mag/${summary.slug}`,
      openGraph: FULL_ARTICLE.seo.openGraph
        ? {
            ...FULL_ARTICLE.seo.openGraph,
            title: summary.title,
            description: null,
            url: `https://thefinance.ir/mag/${summary.slug}`,
            imageUrl: summary.featuredImage?.url ?? null,
          }
        : null,
    },
  });
}

/**
 * Preview by post ID.
 *
 * The mock resolves an ID to a fixture and marks the title, so a local preview
 * is visibly distinguishable from the published article — otherwise the whole
 * draft-mode path looks identical to the normal one and a broken preview
 * passes testing.
 *
 * The secret is checked at the route, not here; this mirrors the real API,
 * where it is WordPress that validates.
 */
export async function getPreviewArticle(id: string, _secret: string): Promise<Article> {
  const summary = ALL_SUMMARIES.find((a) => a.id === id || a.slug === id);
  const base = summary ? await getArticle(summary.slug) : FULL_ARTICLE;

  return simulate({
    ...base,
    title: `[پیش‌نمایش] ${base.title}`,
  });
}

/**
 * Categories, mocked with the shape the CMS returns.
 *
 * The fixtures carry one resolved `contentType` per article and no raw category
 * list — that is what `mapSummary` produces from the real API too, because the
 * frontend models one type per article. So the mock categories are derived from
 * the types present, plus «مقالات».
 *
 * «مقالات» IS INCLUDED DELIBERATELY, and it is the whole reason this mock is
 * not just CONTENT_TYPES. Live it is the second-largest category (39 of 53) and
 * it is not a content type at all — it has been used as a general tag, so most
 * educational pieces are filed under both. A mock that returned only the four
 * type slugs would let a category route ship untested against exactly the term
 * most likely to break it: a category with no `ContentType` behind it.
 */
function inMockCategory(article: ArticleSummary, slug: string): boolean {
  /* The catch-all tag, mirroring how «مقالات» is used: everything but news. */
  if (slug === 'articles') return article.contentType.slug !== 'news';
  return article.contentType.slug === slug;
}

const MOCK_CATEGORY_NAMES: Record<string, string> = {
  news: 'اخبار',
  analysis: 'تحلیل',
  report: 'گزارش',
  education: 'آموزش',
  articles: 'مقالات',
};

export async function getCategories(): Promise<Category[]> {
  const slugs = [...Object.keys(MOCK_CATEGORY_NAMES)];

  return simulate(
    slugs
      .map((slug) => ({
        slug,
        name: MOCK_CATEGORY_NAMES[slug],
        description: null,
        count: ALL_SUMMARIES.filter((a) => inMockCategory(a, slug)).length,
      }))
      /* Empty terms never reach the frontend from the real API either. */
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
  );
}

export async function getCategory(slug: string): Promise<Category> {
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) throw new MagNotFoundError(slug);
  return category;
}

/**
 * Never anything, here: the fixtures run the same strip and one of them is
 * written specifically to be caught by it, so a survivor would mean the strip
 * regressed rather than that the CMS moved. Present for source parity — the
 * service asserts both modules satisfy the same contract at compile time.
 */
export function magInjectedTocSurvivors(): string[] {
  return [];
}

export async function getMarkets(): Promise<Market[]> {
  /* Counts derived from the fixtures, exactly as the real API derives them
     from the posts — otherwise the mock hides the disagreement the real one
     had. MARKETS[].count is kept only as the declared shape. */
  const perMarket = new Map<string, number>();
  for (const a of ALL_SUMMARIES) {
    const slug = a.market?.slug;
    if (slug) perMarket.set(slug, (perMarket.get(slug) ?? 0) + 1);
  }

  return simulate(
    Object.values(MARKETS).map((m) => ({ ...m, count: perMarket.get(m.slug) ?? 0 })),
  );
}

export async function getMarket(slug: MarketSlug): Promise<Market> {
  const market = MARKETS[slug];
  if (!market) throw new MagNotFoundError(slug);
  return simulate(market);
}

export async function getAuthor(slug: string): Promise<Author> {
  const author = [AUTHOR, AUTHOR_NO_AVATAR, AUTHOR_NO_BIO].find((a) => a.slug === slug);
  if (!author) throw new MagNotFoundError(slug);
  return simulate(author);
}

export async function getAuthors(): Promise<Author[]> {
  return simulate([AUTHOR, AUTHOR_NO_AVATAR, AUTHOR_NO_BIO]);
}

export async function getReports(page = 1, perPage = 12): Promise<Paginated<Report>> {
  return simulate(paginate(REPORTS, page, perPage));
}

export async function searchArticles(params: SearchParams): Promise<SearchResult> {
  const { query, page = 1, perPage = 9 } = params;
  const q = query.trim();

  const matched = q
    ? SUMMARIES.filter((a) => a.title.includes(q) || Boolean(a.market?.name.includes(q)))
    : [];

  return simulate({ ...paginate(matched, page, perPage), query: q });
}
