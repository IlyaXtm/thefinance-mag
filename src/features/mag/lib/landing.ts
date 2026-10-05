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

/**
 * «پیشنهاد سردبیر» renders only from this many picks. One pick is not a
 * selection, it is a second hero — and a section at half its drawn size reads
 * as broken, which is the empty-section failure in a milder form.
 */
const PICKS_MIN = 2;
const PICKS_MAX = 6;

const LATEST_COUNT = 4;
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
  picks: ArticleSummary[];
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

  const heroSide = take(pool, 2);

  /* Below the threshold nothing is taken, so the articles stay available to
     the sections underneath instead of vanishing with an unrendered block. */
  const pickCandidates = pool.filter((a) => a.editorsPick && !taken.has(a.slug));
  const picks = pickCandidates.length >= PICKS_MIN ? take(pickCandidates, PICKS_MAX) : [];

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

  return { featured, heroSide, picks, latestArticles, latestNews, topics };
}
