import type { ContentType } from '../types/mag.types';

/**
 * The content type taxonomy, as a constant.
 *
 * These are fixed and known — three values that don't change without a code
 * change — so fetching them would be a network round trip for data we already
 * have. Markets are different: their terms and counts come from WordPress and
 * grow as content is tagged.
 *
 * `news` (اخبار) is deliberately absent. The Mag/Khabarchi ownership boundary
 * is unresolved, and shipping it would create two parallel paths for the same
 * content. Three articles currently sit in that category, so the decision is
 * cheap either way — but it should be a decision, not a default.
 */
export const CONTENT_TYPES: ContentType[] = [
  { slug: 'analysis', name: 'تحلیل' },
  { slug: 'report', name: 'گزارش' },
  { slug: 'education', name: 'آموزش' },
];

export function findContentType(slug: string): ContentType | undefined {
  return CONTENT_TYPES.find((t) => t.slug === slug);
}
