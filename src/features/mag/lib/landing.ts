import type { ArticleSummary, ContentTypeSlug } from '../types/mag.types';

/**
 * Which article goes in which slot of the home page — one pure function, so
 * the page only lays sections out.
 *
 * ── NO ARTICLE APPEARS TWICE ON THE PAGE ────────────────────────────────────
 *
 * The landing grew from three slots to eight in one round (2026-10-05), and
 * every new section draws from the same archive. Without one shared `taken`
 * set the newest education piece would be the hero, the first «تازه‌ترین
 * مقالات» card AND the first «آموزش» card. So slots are filled IN PAGE ORDER
 * and each takes only what nothing above it has used; a section further down
 * shows older articles, which is the honest consequence of being further down.
 */

/**
 * The lead slot never carries news. An RSS automation files roughly two
 * «اخبار» a day, so leading with the newest article meant the hero was almost
 * always a three-minute translated headline.
 */
const LEAD_TYPES: ReadonlyArray<ContentTypeSlug> = ['education', 'report'];

/** Wide enough to outrun the automation — about ten days of it. */
const LEAD_WINDOW = 20;

/** Three beside the lead — «یک مقاله Featured بزرگ و ۲ یا ۳ مطلب مهم کنار آن». */
const HERO_SIDE_COUNT = 3;

/**
 * Editors' picks lead the featured section from this many. One pick is not a
 * selection, it is a second hero.
 */
const PICKS_MIN = 2;
/** The 2 large + 4 small shape of the reference the team sent. */
const FEATURED_COUNT = 6;

/** Two rows of three at full width. */
const LATEST_COUNT = 6;
const EDUCATION_COUNT = 6;
/** One row of three per market. */
const MARKET_COUNT = 3;

/**
 * ONE PURPOSE PER SECTION (team review, 2026-10-05: «هر سکشن باید هدف مستقل
 * داشته باشد»). The overlap they saw was in the data, not the code: «مقالات»
 * holds every non-news post and «آموزش» holds the same 57, so «تازه‌ترین
 * مقالات» and «آموزش» were two windows on one pool. Now:
 *
 *   تازه‌ترین‌ها   everything, by date — the only chronological section
 *   اخبار         news only
 *   آموزش         education only
 *   بازارها        one block per market — the only section cut by market
 *
 * and the shared `taken` set still guarantees no article twice.
 */
const MARKETS: ReadonlyArray<{ key: string; title: string; href: string; slug: string }> = [
  { key: 'forex', title: 'فارکس', href: '/market/forex', slug: 'forex' },
  { key: 'crypto', title: 'کریپتو', href: '/market/crypto', slug: 'crypto' },
  { key: 'gold-usd', title: 'طلا و دلار', href: '/market/gold-usd', slug: 'gold-usd' },
  { key: 'tse', title: 'بورس ایران', href: '/market/tse', slug: 'tse' },
];

export interface TopicBlock {
  key: string;
  title: string;
  href: string;
  items: ArticleSummary[];
}

export interface Landing {
  featured: ArticleSummary | null;
  heroSide: ArticleSummary[];
  /** The 2 + 4 section — editors' picks, or the stand-in below. */
  picks: ArticleSummary[];
  /**
   * Who chose `picks`. The title follows it: «پیشنهاد سردبیر» is a claim that
   * a person chose these, and it is only made when one did.
   */
  picksSource: 'editors' | 'recent';
  latest: ArticleSummary[];
  news: ArticleSummary[];
  education: ArticleSummary[];
  markets: TopicBlock[];
}

/** @param archive  the newest summaries, any order (sorted here) */
export function buildLanding(archive: ReadonlyArray<ArticleSummary>): Landing {
  const pool = [...archive].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const taken = new Set<string>();

  const take = (candidates: ReadonlyArray<ArticleSummary>, count: number) => {
    const out: ArticleSummary[] = [];
    for (const article of candidates) {
      if (out.length === count) break;
      if (taken.has(article.slug)) continue;
      taken.add(article.slug);
      out.push(article);
    }
    return out;
  };

  const featured =
    pool.slice(0, LEAD_WINDOW).find((a) => LEAD_TYPES.includes(a.contentType.slug)) ?? null;
  if (featured) taken.add(featured.slug);

  const heroSide = take(pool, HERO_SIDE_COUNT);

  /*
    EDITORS FIRST, A STAND-IN UNTIL THEY PICK (decided 2026-10-05).

    With no sticky posts the section used to hide, and the team — who had
    asked for exactly this shape — never saw it. Hiding was honest and it was
    also invisible. So below the threshold it shows the newest education and
    education instead, which are the archive's own «worth reading» pieces, and
    `picksSource` makes the heading stop saying «سردبیر».
  */
  const pickCandidates = pool.filter((a) => a.editorsPick && !taken.has(a.slug));
  const picksSource: Landing['picksSource'] =
    pickCandidates.length >= PICKS_MIN ? 'editors' : 'recent';
  const picks =
    picksSource === 'editors'
      ? take(pickCandidates, FEATURED_COUNT)
      : take(
          pool.filter((a) => LEAD_TYPES.includes(a.contentType.slug)),
          FEATURED_COUNT,
        );

  const latest = take(pool, LATEST_COUNT);
  const news = take(
    pool.filter((a) => a.contentType.slug === 'news'),
    LATEST_COUNT,
  );
  const education = take(
    pool.filter((a) => a.contentType.slug === 'education'),
    EDUCATION_COUNT,
  );

  const markets: TopicBlock[] = MARKETS.map(({ key, title, href, slug }) => ({
    key,
    title,
    href,
    items: take(
      pool.filter((a) => a.market?.slug === slug),
      MARKET_COUNT,
    ),
  })).filter((block) => block.items.length > 0);

  return { featured, heroSide, picks, picksSource, latest, news, education, markets };
}
