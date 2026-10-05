import type { ArticleSummary, Market } from '../types/mag.types';

/**
 * The education page, «آموزش بازارهای مالی», and the WordPress TAGS it reads.
 *
 * Three things the team asked for had no field behind them on 2026-10-05:
 * featured guides, the topics «شروع از صفر» and «آپشن», and a level
 * («مقدماتی»). The owner chose WordPress tags — core, no plugin, editable by
 * the content team — over new taxonomies. The slugs below are the contract
 * with the content team (docs/content-team-tags.md); everything keyed on them
 * appears the moment a post is tagged, and stays invisible until then.
 */

export const EDUCATION_TITLE = 'آموزش بازارهای مالی';
export const EDUCATION_DESCRIPTION =
  'یادگیری مفاهیم بازار از پایه تا حرفه‌ای؛ از طلا و بورس تا فارکس، بازار جهانی، کریپتو و اختیار معامله (آپشن).';

/** «راهنمای جامع» — a pillar piece, shown large at the top of آموزش. */
export const GUIDE_TAG = 'راهنمای-جامع';

/** Topic chips that are not markets. Their position is set by CHIP_ORDER. */
export const TOPIC_TAGS: ReadonlyArray<{ slug: string; name: string }> = [
  { slug: 'شروع-از-صفر', name: 'شروع از صفر' },
  { slug: 'آپشن', name: 'آپشن' },
];

const LEVEL_TAGS: Readonly<Record<string, string>> = {
  'مقدماتی': 'مقدماتی',
  'متوسط': 'متوسط',
  'پیشرفته': 'پیشرفته',
};

const isEducation = (a: ArticleSummary) => a.contentType.slug === 'education';

export function isGuide(article: ArticleSummary): boolean {
  return article.tags.includes(GUIDE_TAG);
}

/** The level a post is tagged with, or null — shown only when it exists. */
export function levelOf(article: ArticleSummary): string | null {
  const tag = article.tags.find((t) => t in LEVEL_TAGS);
  return tag ? LEVEL_TAGS[tag] : null;
}

export interface EducationChip {
  key: string;
  name: string;
  count: number;
}

/**
 * The chip order the team wrote, exactly: «شروع از صفر · بورس ایران · طلا و
 * دلار · فارکس · کریپتو · آپشن · اقتصاد جهانی». Topics and markets
 * interleave, so the order is a list rather than "topics, then markets".
 */
const CHIP_ORDER = ['شروع-از-صفر', 'tse', 'gold-usd', 'forex', 'crypto', 'آپشن', 'global'];

/**
 * The chip row under the search box — each chip only if it has at least one
 * education post, because a chip that opens an empty list is the
 * empty-section failure. A market the CMS adds later goes at the end.
 */
export function educationChips(
  archive: ReadonlyArray<ArticleSummary>,
  markets: ReadonlyArray<Market>,
): EducationChip[] {
  const lessons = archive.filter(isEducation);

  const chips: EducationChip[] = [
    ...TOPIC_TAGS.map((t) => ({
      key: t.slug,
      name: t.name,
      count: lessons.filter((a) => a.tags.includes(t.slug)).length,
    })),
    ...markets.map((m) => ({
      key: m.slug as string,
      name: m.name,
      count: lessons.filter((a) => a.market?.slug === m.slug).length,
    })),
  ];

  const rank = (key: string) => {
    const i = CHIP_ORDER.indexOf(key);
    return i === -1 ? CHIP_ORDER.length : i;
  };

  return chips.filter((c) => c.count > 0).sort((a, b) => rank(a.key) - rank(b.key));
}

/** The lessons behind one chip — a market slug or a topic tag. */
export function educationFor(
  archive: ReadonlyArray<ArticleSummary>,
  key: string,
): ArticleSummary[] {
  return archive
    .filter((a) => isEducation(a) && (a.market?.slug === key || a.tags.includes(key)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** The guides, newest first. */
export function educationGuides(archive: ReadonlyArray<ArticleSummary>): ArticleSummary[] {
  return archive
    .filter((a) => isEducation(a) && isGuide(a))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
