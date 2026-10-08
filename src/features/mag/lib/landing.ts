import type { ArticleSummary, ContentTypeSlug, Market } from '../types/mag.types';
import { subcategoriesOf, subcategoryHref } from './subcategories';

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

/**
 * Four beside the lead, as a 2×2 — home v2 (handoff 2026-10-08), the team's
 * faraz.io/blog structure. It was three stacked rows. Lessons only (see
 * `heroSide` below).
 */
const HERO_SIDE_COUNT = 4;

/**
 * Editors' picks lead the featured section from this many. One pick is not a
 * selection, it is a second hero.
 */
const PICKS_MIN = 2;
/** The 2 large + 4 small shape of the reference the team sent. */
const FEATURED_COUNT = 6;

/**
 * «تازه‌ترین مقالات»: two rows of three at full width. It was nine — the
 * team's «سه ردیف مقاله» (2026-10-05, B05) — and home v2 (2026-10-08) set it
 * back to six now that the 2×2 hero and the market columns carry more
 * lessons above and below it.
 */
const ARTICLES_COUNT = 6;
/** «تازه‌ترین اخبار»: a text list, three rows of two at lg. */
const NEWS_COUNT = 6;
/** Up to three lessons per market column. */
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
 *
 * 2026-10-07, the team's earlier and explicit ask (4 Oct, «خبرها در تازه‌ترین
 * اخبار و مقاله‌ها در تازه‌ترین مقالات») applied without undoing the review:
 *
 *   تازه‌ترین مقالات   every non-news post, by date — three rows
 *   تازه‌ترین اخبار    news, by date
 *   آموزش <market>    one block per market, lessons only
 *
 * The generic «آموزش» block is gone: with every non-news post a lesson, it
 * and «تازه‌ترین مقالات» were the "two windows on one pool" the review
 * objected to. Lessons keep a purpose of their own through the market blocks.
 *
 * 2026-10-07: a market block is now the sub-category «آموزش › <market>» —
 * lessons only, «مشاهده همه» to `/category/education/<market>`, and the title
 * is the market's name as WordPress has it, so the team's renames («بازار
 * ایران», «بازار جهانی، فارکس و استاک امریکا») arrive without a deploy.
 * `gold-usd` stays in the order until its posts are merged into `tse`; an
 * empty block is dropped.
 */
const MARKET_ORDER: ReadonlyArray<string> = ['forex', 'crypto', 'gold-usd', 'tse'];

/** One market column of «آموزش بر اساس بازار». */
export interface TopicBlock {
  key: string;
  /** The market's name as WordPress has it — the team's renames arrive live. */
  name: string;
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
  /** Non-news, newest first. */
  articles: ArticleSummary[];
  news: ArticleSummary[];
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

  /* Same rule as the lead: no news beside it. Taking from the whole pool put
     three RSS items next to the lead on every live render (QA, 1405-07-16). */
  const heroSide = take(
    pool.filter((a) => LEAD_TYPES.includes(a.contentType.slug)),
    HERO_SIDE_COUNT,
  );

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

  const articles = take(
    pool.filter((a) => a.contentType.slug !== 'news'),
    ARTICLES_COUNT,
  );
  const news = take(
    pool.filter((a) => a.contentType.slug === 'news'),
    NEWS_COUNT,
  );

  const markets: TopicBlock[] = MARKET_ORDER.map((slug) => {
    const items = take(
      pool.filter((a) => a.market?.slug === slug && a.contentType.slug === 'education'),
      MARKET_COUNT,
    );
    return {
      key: slug,
      name: items[0]?.market?.name ?? '',
      href: subcategoryHref('education', slug),
      items,
    };
  /* One card is a half-empty row at every width — drop the block instead. */
  }).filter((block) => block.items.length >= 2);

  return { featured, heroSide, picks, picksSource, articles, news, markets };
}

/**
 * The «بازارها:» row beside the masthead (home v2): markets only — never
 * sections, a team comment on the handoff — and only those with lessons, in
 * the handoff's order. A market WordPress adds later goes at the end.
 */
const MASTHEAD_MARKET_ORDER: ReadonlyArray<string> = ['tse', 'crypto', 'forex', 'gold-usd', 'global'];

export function mastheadMarkets(markets: ReadonlyArray<Market>): Market[] {
  const rank = (slug: string) => {
    const i = MASTHEAD_MARKET_ORDER.indexOf(slug);
    return i === -1 ? MASTHEAD_MARKET_ORDER.length : i;
  };
  return subcategoriesOf(markets, 'education').sort((a, b) => rank(a.slug) - rank(b.slug));
}
