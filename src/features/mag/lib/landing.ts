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
const LEAD_TYPES: ReadonlyArray<ContentTypeSlug> = ['analysis', 'education', 'report'];

/** Wide enough to outrun the automation — about ten days of it. */
const LEAD_WINDOW = 20;

/** Four beside the lead: the 2×2 the team's Faraz reference opens with. */
const HERO_SIDE_COUNT = 4;

/**
 * Editors' picks lead the featured section from this many. One pick is not a
 * selection, it is a second hero.
 */
const PICKS_MIN = 2;
/** The 2 large + 4 small shape of the reference the team sent. */
const FEATURED_COUNT = 6;

/** Two rows of three at full width. */
const LATEST_COUNT = 6;
const TOPIC_COUNT = 3;

/**
 * The Zoomit-style sections the team asked for. آموزش is a content type;
 * فارکس and کریپتو are markets — the two axes, used as what they are. اینچارت
 * is neither (a raw category), so its articles arrive separately: see the
 * `inchart` argument below.
 */
const TOPICS: ReadonlyArray<{
  key: string;
  title: string;
  href: string;
  match: (a: ArticleSummary) => boolean;
}> = [
  { key: 'education', title: 'آموزش', href: '/category/education', match: (a) => a.contentType.slug === 'education' },
  { key: 'forex', title: 'فارکس', href: '/market/forex', match: (a) => a.market?.slug === 'forex' },
  { key: 'crypto', title: 'کریپتو', href: '/market/crypto', match: (a) => a.market?.slug === 'crypto' },
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
  latestArticles: ArticleSummary[];
  latestNews: ArticleSummary[];
  topics: TopicBlock[];
}

/**
 * @param archive  the newest summaries, any order (sorted here)
 * @param inchart  the «اینچارت» category's articles. Fetched on their own
 *                 because the category is not on the summary, and because the
 *                 archive fetch is capped at the newest 100 — three older
 *                 InChart pieces would otherwise never be found.
 */
export function buildLanding(
  archive: ReadonlyArray<ArticleSummary>,
  inchart: ReadonlyArray<ArticleSummary>,
): Landing {
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
    also invisible. So below the threshold it shows the newest analysis and
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

  const latestArticles = take(
    pool.filter((a) => a.contentType.slug !== 'news'),
    LATEST_COUNT,
  );
  const latestNews = take(
    pool.filter((a) => a.contentType.slug === 'news'),
    LATEST_COUNT,
  );

  const topics: TopicBlock[] = [
    ...TOPICS.map(({ key, title, href, match }) => ({
      key,
      title,
      href,
      items: take(pool.filter(match), TOPIC_COUNT),
    })),
    {
      key: 'inchart',
      title: 'اینچارت',
      href: '/category/inchart',
      items: take(
        [...inchart].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
        TOPIC_COUNT,
      ),
    },
  ].filter((topic) => topic.items.length > 0);

  return { featured, heroSide, picks, picksSource, latestArticles, latestNews, topics };
}
