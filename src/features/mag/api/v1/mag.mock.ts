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
  type Market,
  type MarketSlug,
  type Paginated,
  type Report,
  type SearchParams,
  type SearchResult,
} from '../../types/mag.types';
import { DISCLAIMER_TEXT } from '../../types/mag-blocks.types';

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
    count: 24,
  },
  'gold-usd': {
    slug: 'gold-usd',
    name: 'طلا و دلار',
    description: 'روند طلا، سکه و ارز و عوامل مؤثر بر آن‌ها.',
    count: 18,
  },
  crypto: {
    slug: 'crypto',
    name: 'کریپتو',
    description: null, // exercises the "description absent" archive variant
    count: 31,
  },
  forex: {
    slug: 'forex',
    name: 'فارکس',
    description: 'مفاهیم، ابزارها و ساختار بازار جهانی ارز.',
    count: 12,
  },
  global: {
    slug: 'global',
    name: 'اقتصاد جهانی',
    description: 'داده‌ها و رویدادهای کلان و اثرشان بر بازارهای داخلی.',
    count: 9,
  },
  housing: {
    slug: 'housing',
    name: 'مسکن',
    description: 'داده‌های معاملات و تحلیل بازار مسکن.',
    count: 7,
  },
};

const TYPES = {
  analysis: { slug: 'analysis', name: 'تحلیل' },
  report: { slug: 'report', name: 'گزارش' },
  education: { slug: 'education', name: 'آموزش' },
} as const;

const AUTHOR: Author = {
  slug: 'maryam-rezaei',
  name: 'مریم رضایی',
  role: 'تحلیل‌گر بازار سرمایه',
  bio: 'پژوهشگر بازار سرمایه با تمرکز بر صورت‌های مالی و ارزش‌گذاری. پیش‌تر در حوزه تحلیل بنیادی صنایع بانکی و پتروشیمی فعالیت داشته است.',
  avatar: {
    url: '/mock/authors/maryam.jpg',
    alt: 'مریم رضایی',
    width: 160,
    height: 160,
  },
  articleCount: 12,
};

/** Second author without an avatar — exercises the initial-based fallback. */
const AUTHOR_NO_AVATAR: Author = {
  slug: 'ali-mohammadi',
  name: 'علی محمدی',
  role: 'تحلیل‌گر بازارهای جهانی',
  bio: 'تمرکز بر داده‌های کلان اقتصادی و اثر آن‌ها بر بازارهای نوظهور.',
  avatar: null,
  articleCount: 5,
};

function img(seed: string, alt: string): ArticleSummary['featuredImage'] {
  return { url: `/mock/covers/${seed}.jpg`, alt, width: 1200, height: 675 };
}

const SUMMARIES: ArticleSummary[] = [
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
    outline: [
      'چه چیزی در ترازنامه تغییر کرد',
      'سود تسهیلات و درآمد مشاع',
      'مقایسه با دوره مشابه سال قبل',
    ],
  },
  {
    id: 'a2',
    slug: 'us-rates-and-domestic-gold',
    title: 'رابطه نرخ بهره آمریکا با قیمت طلای داخلی',
    featuredImage: img('gold', 'شمش طلا روی سطح تیره'),
    market: MARKETS['gold-usd'],
    contentType: TYPES.analysis,
    readingTime: 7,
    publishedAt: '2026-08-17T11:30:00+03:30',
    modifiedAt: '2026-08-17T11:30:00+03:30',
    author: AUTHOR_NO_AVATAR,
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
    outline: ['نات کوین چگونه کار می‌کند', 'مکانیزم توزیع توکن', 'ریسک‌های پروژه'],
  },
  {
    id: 'a4',
    slug: 'zig-zag-indicator',
    title: 'اندیکاتور زیگ زاگ (Zig Zag) چیست؟',
    featuredImage: img('zigzag', 'نمودار با نوسانات پی‌درپی'),
    market: MARKETS.forex,
    contentType: TYPES.education,
    readingTime: 6,
    publishedAt: '2026-08-15T14:00:00+03:30',
    modifiedAt: '2026-08-15T14:00:00+03:30',
    author: AUTHOR_NO_AVATAR,
    outline: ['تعریف اندیکاتور', 'تنظیم درصد بازگشت'],
  },
  {
    id: 'a5',
    slug: 'dxy-and-emerging-markets',
    title: 'شاخص دلار (DXY) و اثر آن بر بازارهای نوظهور',
    featuredImage: img('dxy', 'نمودار شاخص دلار'),
    market: MARKETS.global,
    contentType: TYPES.analysis,
    readingTime: 8,
    publishedAt: '2026-08-14T10:00:00+03:30',
    modifiedAt: '2026-08-14T10:00:00+03:30',
    author: AUTHOR,
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
    market: MARKETS.housing,
    contentType: TYPES.report,
    readingTime: 11,
    publishedAt: '2026-08-13T09:45:00+03:30',
    modifiedAt: '2026-08-13T09:45:00+03:30',
    author: AUTHOR,
    // Single-entry outline — consumers must omit the block, not render one item.
    outline: ['روش‌شناسی داده‌ها'],
  },
];

/** The full sample article, with a revision date that differs from publish. */
const FULL_ARTICLE: Article = {
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
  outline: [
    'تحلیل فاندامنتال چیست',
    'تفاوت آن با تحلیل تکنیکال',
    'صورت‌های مالی و نسبت‌های کلیدی',
    'محدودیت‌های این روش',
  ],
  secondaryMarkets: [MARKETS.global],
  content: [
    '<h2 id="s1">تحلیل فاندامنتال چیست</h2>',
    '<p>تحلیل فاندامنتال روشی است که با بررسی وضعیت مالی و عملیاتی یک شرکت می‌کوشد ارزش ذاتی آن را برآورد کند. در این روش قیمت بازار نقطه شروع نیست، بلکه چیزی است که در پایان با برآورد به‌دست‌آمده مقایسه می‌شود.</p>',
    `<div data-block="thefinance/callout"><strong>ارزش ذاتی</strong><p>برآوردی از ارزش یک دارایی بر پایه داده‌های بنیادی، مستقل از قیمتی که بازار در لحظه به آن می‌دهد.</p></div>`,
    '<h2 id="s2">تفاوت آن با تحلیل تکنیکال</h2>',
    '<p>تحلیل تکنیکال رفتار قیمت و حجم را بررسی می‌کند و به این پرسش نمی‌پردازد که شرکت چه می‌کند. تحلیل فاندامنتال دقیقاً از همان‌جا شروع می‌شود. این دو یکدیگر را نفی نمی‌کنند و بسیاری از سرمایه‌گذاران هر دو را به کار می‌برند.</p>',
    '<h2 id="s3">صورت‌های مالی و نسبت‌های کلیدی</h2>',
    '<p>سه صورت مالی پایه — ترازنامه، صورت سود و زیان و صورت جریان وجوه نقد — ورودی اصلی این تحلیل‌اند. نسبت‌هایی مانند <span dir="ltr">P/E</span> از دل همین صورت‌ها بیرون می‌آیند و به‌تنهایی معنا نمی‌دهند؛ باید با میانگین صنعت و تاریخچه خود شرکت سنجیده شوند.</p>',
    '<h3>نسبت قیمت به درآمد</h3>',
    '<p>این نسبت نشان می‌دهد بازار حاضر است بابت هر واحد سود چقدر بپردازد. عدد بالا لزوماً بد نیست و عدد پایین لزوماً فرصت نیست.</p>',
    '<h2 id="s4">محدودیت‌های این روش</h2>',
    '<p>برآورد ارزش ذاتی به مفروضات وابسته است و تغییر کوچکی در نرخ رشد فرض‌شده می‌تواند نتیجه را به‌کلی جابه‌جا کند. ضمناً این روش درباره زمان‌بندی چیزی نمی‌گوید؛ ممکن است سال‌ها طول بکشد تا قیمت به برآورد نزدیک شود.</p>',
    `<div data-block="thefinance/disclaimer"><p>${DISCLAIMER_TEXT}</p></div>`,
  ].join('\n'),
  seo: {
    title: 'تحلیل فاندامنتال چیست؟ راهنمای کاربردی | مگ فایننس',
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

function paginate<T>(items: T[], page: number, perPage: number): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    perPage,
    total,
    totalPages,
  };
}

/* ------------------------------------------------------------------ */
/* API surface                                                         */
/* ------------------------------------------------------------------ */

export async function getArticles(
  params: ArticleListParams = {},
): Promise<Paginated<ArticleSummary>> {
  const { page = 1, perPage = 9, market, contentType, authorSlug, excludeSlug } = params;

  const filtered = SUMMARIES.filter((a) => {
    if (market && a.market.slug !== market) return false;
    if (contentType && a.contentType.slug !== contentType) return false;
    if (authorSlug && a.author.slug !== authorSlug) return false;
    if (excludeSlug && a.slug === excludeSlug) return false;
    return true;
  });

  return simulate(paginate(filtered, page, perPage));
}

export async function getArticle(slug: string): Promise<Article> {
  if (slug === FULL_ARTICLE.slug) return simulate(FULL_ARTICLE);

  const summary = SUMMARIES.find((a) => a.slug === slug);
  if (!summary) throw new MagNotFoundError(slug);

  return simulate({
    ...summary,
    content: `<h2 id="s1">${summary.outline[0] ?? 'مقدمه'}</h2><p>متن نمونه.</p>`,
    secondaryMarkets: [],
    seo: { ...FULL_ARTICLE.seo, title: summary.title },
  });
}

export async function getMarkets(): Promise<Market[]> {
  return simulate(Object.values(MARKETS));
}

export async function getMarket(slug: MarketSlug): Promise<Market> {
  const market = MARKETS[slug];
  if (!market) throw new MagNotFoundError(slug);
  return simulate(market);
}

export async function getAuthor(slug: string): Promise<Author> {
  const author = [AUTHOR, AUTHOR_NO_AVATAR].find((a) => a.slug === slug);
  if (!author) throw new MagNotFoundError(slug);
  return simulate(author);
}

export async function getAuthors(): Promise<Author[]> {
  return simulate([AUTHOR, AUTHOR_NO_AVATAR]);
}

export async function getReports(page = 1, perPage = 12): Promise<Paginated<Report>> {
  return simulate(paginate(REPORTS, page, perPage));
}

export async function searchArticles(params: SearchParams): Promise<SearchResult> {
  const { query, page = 1, perPage = 9 } = params;
  const q = query.trim();

  const matched = q
    ? SUMMARIES.filter((a) => a.title.includes(q) || a.market.name.includes(q))
    : [];

  return simulate({ ...paginate(matched, page, perPage), query: q });
}
