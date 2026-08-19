/**
 * Site-level constants used by metadata and structured data.
 *
 * These values appear in JSON-LD, which Google uses for entity resolution —
 * they must stay identical across every page and must not drift from what the
 * site says elsewhere. That is why they live in one file rather than being
 * typed inline per page.
 */

export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'https://thefinance.ir';

/** The magazine section, not the whole platform. */
export const MAG_NAME = 'مجله فایننس';
export const MAG_PATH = '/mag';
export const MAG_URL = `${SITE_ORIGIN}${MAG_PATH}`;
export const MAG_DESCRIPTION = 'تحلیل، گزارش و آموزش برای بازارهای مالی';

/**
 * The publishing organisation.
 *
 * These exact strings appear in JSON-LD on every page. Google uses them for
 * entity resolution — deciding that "فایننس" the publisher is one consistent
 * thing across the web — so they must not drift between pages or from what the
 * site says elsewhere.
 *
 * `logo` is the mark alone (no wordmark), 512×512 with transparency. Google
 * asks for at least 112px in each dimension for the publisher logo.
 *
 * `sameAs` is how Google links this publisher to its known profiles. Each
 * entry strengthens the entity signal; add new official profiles here rather
 * than anywhere else.
 */
export const ORGANIZATION = {
  name: 'فایننس',
  legalName: 'TheFinance',
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/logo.png`,
  aboutPage: `${SITE_ORIGIN}/about-us`,
  sameAs: [
    'https://www.instagram.com/thefinance.ir/',
  ] as string[],
} as const;

/** Absolute URL for a Mag path. Canonicals must never point at the CMS host. */
export function magUrl(path = ''): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${MAG_URL}${clean === '/' ? '' : clean}`;
}
