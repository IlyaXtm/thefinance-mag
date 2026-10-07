import type { ArticleSummary, ContentTypeSlug } from '../types/mag.types';
import { subcategoryHref } from './subcategories';

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
 *
 * 2026-10-07: a market block is now the sub-category «آموزش › <market>» —
 * lessons only, «مشاهده همه» to `/category/education/<market>`, and the title
 * is the market's name as WordPress has it, so the team's renames («بازار
 * ایران», «بازار جهانی، فارکس و استاک امریکا») arrive without a deploy.
 * `gold-usd` stays in the order until its posts are merged into `tse`; an
 * empty block is dropped.
 */
const MARKET_ORDER: ReadonlyArray<string> = ['forex', 'crypto', 'gold-usd', 'tse'];

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

  const markets: TopicBlock[] = MARKET_ORDER.map((slug) => {
    const items = take(
      pool.filter((a) => a.market?.slug === slug && a.contentType.slug === 'education'),
      MARKET_COUNT,
    );
    return {
      key: slug,
      title: items[0]?.market?.name ?? '',
      href: subcategoryHref('education', slug),
      items,
    };
  }).filter((block) => block.items.length > 0);

  return { featured, heroSide, picks, picksSource, latest, news, education, markets };
}
