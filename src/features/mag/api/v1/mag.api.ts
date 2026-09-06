/**
 * WPGraphQL implementation.
 *
 * Never imported by a page or component — only mag.service.ts imports this.
 *
 * ✅ Written against the schema VERIFIED on wp.thefinance.ir (2026-08-20):
 *   WPGraphQL 2.19 · Rank Math Pro · wp-graphql-rank-math
 *   seo.robots is [String]; seo.__typename is RankMathPostObjectSeo
 *   readingTime · modifiedAtIso · marketDescription come from the mu-plugin
 */

import {
  MagFetchError,
  MagNotFoundError,
  type Article,
  type ArticleListParams,
  type ArticleSummary,
  type Author,
  type MagImage,
  type Market,
  type MarketSlug,
  type Paginated,
  type Report,
  type SearchParams,
  type SearchResult,
} from '../../types/mag.types';
import type { MagSeo } from '../../types/mag-seo.types';
import { resolveContentType } from '../../lib/content-types';
import { addHeadingIds, extractHeadings, sanitizeArticleHtml } from '../../lib/sanitize';
import { SITE_ORIGIN } from '../../lib/site';

const ENDPOINT =
  process.env.WP_GRAPHQL_ENDPOINT ?? process.env.NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT ?? '';

async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
  revalidate: number | false = 300,
): Promise<T> {
  if (!ENDPOINT) {
    throw new MagFetchError(
      'WP GraphQL endpoint is not configured. Set WP_GRAPHQL_ENDPOINT.',
    );
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
      /*
        Next caches this so ISR regeneration doesn't re-hit WordPress on every
        request. That matters here: nginx rate-limits /graphql to 10 r/s on the
        CMS host, and an uncached listing would spend that budget fast.
      */
      next: revalidate === false ? undefined : { revalidate },
      ...(revalidate === false ? { cache: 'no-store' as const } : {}),
    });
  } catch (cause) {
    throw new MagFetchError(`GraphQL request failed: ${String(cause)}`);
  }

  if (!res.ok) throw new MagFetchError(`GraphQL responded ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors?.length) throw new MagFetchError(json.errors[0].message);
  if (!json.data) throw new MagFetchError('GraphQL returned no data.');

  return json.data;
}

/* ------------------------------------------------------------------ */

/*
  DEPLOY ORDER IS NOT OPTIONAL: the mu-plugin ships BEFORE this does.

  `outlineHeadings` is registered by `wordpress/mu-plugins/thefinance-mag.php`.
  GraphQL rejects an unknown field outright rather than returning null for it,
  so against a CMS without that plugin version every query built from these
  fields comes back as:

      Cannot query field "outlineHeadings" on type "Post".

  `gql()` turns that into a MagFetchError, which means the listing, the archive
  and search all fail — not degrade. Verified against a stub that returns
  exactly that error: /mag/search answered 500, and /mag/archive only answered
  200 because ISR was still holding a page from before the field existed, which
  is the worst kind of pass.

  Adding a field to a listing query is therefore a two-step deploy: WordPress
  first, frontend second.
*/
const SUMMARY_FIELDS = `
  databaseId
  slug
  title
  date
  readingTime
  modifiedAtIso
  # RAW, not RENDERED: only the hand-written field, never WordPress's
  # auto-truncated summary. Standard WPGraphQL — no plugin dependency, so
  # this line is safe to deploy ahead of the mu-plugin.
  excerpt(format: RAW)
  outlineHeadings
  categories { nodes { slug name } }
  markets { nodes { slug name } }
  author { node { name slug description } }
  featuredImage { node { sourceUrl altText mediaDetails { width height } } }
`;

const SEO_FIELDS = `
  seo {
    title
    description
    canonicalUrl
    robots
    openGraph { title description url type locale image { url } twitterMeta { card } }
  }
`;

interface WpTerm {
  slug: string;
  name: string;
}

interface WpSummary {
  databaseId: number;
  slug: string;
  title: string;
  date: string;
  readingTime: number | null;
  modifiedAtIso: string | null;
  excerpt: string | null;
  outlineHeadings: string[] | null;
  categories: { nodes: WpTerm[] } | null;
  markets: { nodes: WpTerm[] } | null;
  author: { node: { name: string; slug: string; description: string | null } | null } | null;
  featuredImage: {
    node: {
      sourceUrl: string;
      altText: string | null;
      mediaDetails: { width: number | null; height: number | null } | null;
    } | null;
  } | null;
}

/* ------------------------------------------------------------------ */

/**
 * Rewrite any CMS-host URL to the public origin.
 *
 * Rank Math derives canonicals from `siteurl`, which is currently
 * https://thefinance.ir/mag — so canonicals already come back correct. This is
 * a guard, not a transform: if `siteurl` ever moves to the CMS host, it catches
 * the regression instead of letting wp.thefinance.ir reach a
 * <link rel="canonical"> and split the index across two hosts.
 */
export function toPublicUrl(wpUrl: string | null): string | null {
  if (!wpUrl) return null;
  return wpUrl.replace(/^https?:\/\/wp\.thefinance\.ir/i, SITE_ORIGIN);
}

function mapImage(node: WpSummary['featuredImage']): MagImage | null {
  const image = node?.node;
  if (!image?.sourceUrl) return null;

  return {
    /* The CMS returns wp.thefinance.ir for media on some code paths. Serving
       an image from the CMS host would both leak the de-indexed host into the
       page and miss the `remotePatterns` entry the optimizer matches on, so it
       goes through the same host rewrite as every other URL. The `??` is only
       for the type — `sourceUrl` is already proven non-null above. */
    url: toPublicUrl(image.sourceUrl) ?? image.sourceUrl,
    /* An empty alt is surfaced as-is rather than invented. Fabricated alt text
       is worse than none — it misdescribes the image to the people who rely
       on it. */
    alt: image.altText ?? '',
    width: image.mediaDetails?.width ?? 1200,
    height: image.mediaDetails?.height ?? 675,
  };
}

/**
 * Author.
 *
 * Gravatar is deliberately dropped. WordPress returns a secure.gravatar.com URL
 * for every user, but it is a third-party request per author, it leaks a hash
 * of their email to a foreign service, and it is unreliable from Iran. `avatar`
 * stays null and the UI renders an initial.
 *
 * Every user currently has `description: null` — nobody has a bio. That weakens
 * E-E-A-T on financial content, where Google wants to know who wrote this and
 * why they're qualified. Filling four bios is a ten-minute job.
 */
function mapAuthor(node: WpSummary['author']): Author {
  const author = node?.node;

  if (!author) {
    return {
      slug: 'thefinance',
      name: 'تحریریه فایننس',
      role: null,
      bio: null,
      avatar: null,
      articleCount: null,
    };
  }

  return {
    slug: author.slug,
    name: author.name,
    role: null,
    bio: author.description?.trim() || null,
    avatar: null,
    articleCount: null,
  };
}

function mapMarket(term: WpTerm): Market {
  return { slug: term.slug as MarketSlug, name: term.name, description: null, count: null };
}

function mapSummary(node: WpSummary): ArticleSummary {
  const marketNodes = node.markets?.nodes ?? [];

  return {
    id: String(node.databaseId),
    slug: node.slug,
    title: node.title,
    featuredImage: mapImage(node.featuredImage),
    /* Most of the archive has no market — expected, not a failure. */
    market: marketNodes.length > 0 ? mapMarket(marketNodes[0]) : null,
    contentType: resolveContentType((node.categories?.nodes ?? []).map((c) => c.slug)),
    readingTime: node.readingTime ?? 1,
    publishedAt: node.date,
    modifiedAt: node.modifiedAtIso,
    author: mapAuthor(node.author),
    /*
      Server-derived, by `tf_mag_outline_headings()` in the mu-plugin.

      It cannot be derived here: the listing query deliberately does not fetch
      `content` — nine full article bodies on the page that carries LCP and
      ISR — and this used to be a hardcoded `[]`, which meant `cardDek()`
      returned null for every card in production while the mock filled the
      field in and hid it. The article and preview paths override this with
      `extractHeadings(content)`, which they can afford because they already
      have the body.
    */
    outline: node.outlineHeadings ?? [],

    /* Trimmed to null: WordPress returns '' for an unset excerpt, and an empty
       string would read as "present" at every call site. */
    excerpt: node.excerpt?.trim() || null,
  };
}

function mapSeo(raw: unknown): MagSeo {
  const seo = (raw ?? {}) as {
    title?: string | null;
    description?: string | null;
    canonicalUrl?: string | null;
    robots?: string[] | null;
    openGraph?: {
      title?: string | null;
      description?: string | null;
      url?: string | null;
      type?: string | null;
      locale?: string | null;
      image?: { url?: string | null } | null;
      twitterMeta?: { card?: string | null } | null;
    } | null;
  };

  return {
    title: seo.title ?? null,
    description: seo.description ?? null,
    canonicalUrl: toPublicUrl(seo.canonicalUrl ?? null),
    robots: seo.robots ?? [],
    breadcrumbs: [],
    /*
      Rank Math's own JSON-LD is fetched but NOT emitted. The schema layer
      builds its own — it knows which articles are news (NewsArticle) versus
      evergreen education (Article), which Rank Math cannot infer. Emitting
      both would put two conflicting Article blocks on one page.
    */
    jsonLdRaw: null,
    openGraph: seo.openGraph
      ? {
          title: seo.openGraph.title ?? null,
          description: seo.openGraph.description ?? null,
          url: toPublicUrl(seo.openGraph.url ?? null),
          type: seo.openGraph.type ?? null,
          locale: seo.openGraph.locale ?? null,
          imageUrl: seo.openGraph.image?.url ?? null,
          twitterCard: seo.openGraph.twitterMeta?.card ?? null,
        }
      : null,
  };
}

/* ------------------------------------------------------------------ */

/**
 * Cursor pagination.
 *
 * WPGraphQL core ships `first`/`after` cursors but NOT offset pagination —
 * that needs wp-graphql-offset-pagination, which is not in the WordPress
 * plugin repository. Installing from outside the repo means no automatic
 * updates and no review, and 91% of disclosed WordPress vulnerabilities are in
 * plugins. Not worth it for something solvable in code.
 *
 * So a numbered page is reached by walking cursors. Two things make that
 * cheap here:
 *   - the archive is ~32 posts, so at most a few hops
 *   - ISR caches the result, so the walk happens on regeneration, not per
 *     request
 *
 * It is also lighter on MySQL than a large OFFSET, which has to count and
 * discard rows. Irrelevant at 32 articles; not at 300.
 */
async function cursorForPage(
  page: number,
  perPage: number,
  filters: { category: string | null; author: string | null; search: string | null },
): Promise<string | null> {
  if (page <= 1) return null;

  let cursor: string | null = null;

  for (let hop = 1; hop < page; hop += 1) {
    const data: { posts: { pageInfo: { endCursor: string | null; hasNextPage: boolean } } } =
      await gql(
        `query Cursor($size: Int!, $after: String, $category: String, $author: String, $search: String) {
          posts(first: $size, after: $after, where: {
            status: PUBLISH
            categoryName: $category
            authorName: $author
            search: $search
          }) {
            pageInfo { endCursor hasNextPage }
          }
        }`,
        { size: perPage, after: cursor, ...filters },
      );

    if (!data.posts.pageInfo.hasNextPage) return null;
    cursor = data.posts.pageInfo.endCursor;
  }

  return cursor;
}

export async function getArticles(
  params: ArticleListParams = {},
): Promise<Paginated<ArticleSummary>> {
  const { page = 1, perPage = 9, market, contentType, authorSlug, excludeSlug } = params;

  const filters = {
    category: contentType ?? null,
    author: authorSlug ?? null,
    search: null,
  };

  const after = await cursorForPage(page, perPage, filters);

  const data = await gql<{
    posts: {
      nodes: WpSummary[];
      pageInfo: { hasNextPage: boolean };
    };
  }>(
    `query Articles($size: Int!, $after: String, $category: String, $author: String) {
      posts(first: $size, after: $after, where: {
        status: PUBLISH
        categoryName: $category
        authorName: $author
      }) {
        nodes { ${SUMMARY_FIELDS} }
        pageInfo { hasNextPage }
      }
    }`,
    { size: perPage, after, ...filters },
  );

  let items = data.posts.nodes.map(mapSummary);

  /*
    Market filtering happens here rather than in the query.

    A taxQuery would be cleaner, but `market` is a custom taxonomy and a wrong
    enum name would silently return nothing rather than erroring. Filtering a
    single page in JS is honest and can't fail quietly. Revisit if the archive
    outgrows a few hundred posts.
  */
  if (market) items = items.filter((a) => a.market?.slug === market);
  if (excludeSlug) items = items.filter((a) => a.slug !== excludeSlug);

  /*
    Total post count comes from a separate lightweight query rather than being
    inferred. Without offset pagination there is no `total` on the connection,
    and guessing it would break the pagination component.
  */
  const total = await countArticles(filters);

  return {
    items,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/**
 * Total published posts matching the filters.
 *
 * Walks the connection in large pages counting nodes. Cached for an hour: the
 * count changes only on publish, and the automation adds roughly two a day.
 */
async function countArticles(filters: {
  category: string | null;
  author: string | null;
  search: string | null;
}): Promise<number> {
  let total = 0;
  let cursor: string | null = null;
  /* Guard against an unbounded loop if the API misbehaves. */
  const MAX_HOPS = 20;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    const data: {
      posts: { nodes: Array<{ databaseId: number }>; pageInfo: { endCursor: string | null; hasNextPage: boolean } };
    } = await gql(
      `query CountArticles($after: String, $category: String, $author: String, $search: String) {
        posts(first: 100, after: $after, where: {
          status: PUBLISH
          categoryName: $category
          authorName: $author
          search: $search
        }) {
          nodes { databaseId }
          pageInfo { endCursor hasNextPage }
        }
      }`,
      { after: cursor, ...filters },
      3600,
    );

    total += data.posts.nodes.length;

    if (!data.posts.pageInfo.hasNextPage) break;
    cursor = data.posts.pageInfo.endCursor;
  }

  return total;
}

export async function getArticle(slug: string): Promise<Article> {
  const data = await gql<{
    post: (WpSummary & { content: string | null; seo: unknown }) | null;
  }>(
    `query Article($slug: ID!) {
      post(id: $slug, idType: SLUG) {
        ${SUMMARY_FIELDS}
        content
        ${SEO_FIELDS}
      }
    }`,
    { slug },
  );

  if (!data.post) throw new MagNotFoundError(slug);

  /* Strip inline `text-align: justify` before the body renders. The classic
     editor writes it, inline styles beat the stylesheet, and justified Persian
     produces rivers of whitespace without kashida support. */
  /* Sanitise first, then stamp heading ids — the ids must survive, so they
     go on after the style stripping. */
  const content = addHeadingIds(sanitizeArticleHtml(data.post.content ?? ''));
  const markets = (data.post.markets?.nodes ?? []).map(mapMarket);

  return {
    ...mapSummary(data.post),
    content,
    outline: extractHeadings(content),
    /* Secondary only — the first market is already the card chip. */
    secondaryMarkets: markets.slice(1),
    seo: mapSeo(data.post.seo),
  };
}

/**
 * Fetch an article for PREVIEW, by post ID, including unpublished revisions.
 *
 * `magPreview` is exposed by the mu-plugin rather than by WPGraphQL core:
 * previewing a draft requires authentication, and the alternative is an
 * authenticated WordPress session reaching the frontend — a much larger
 * surface than one secret on one field.
 *
 * It returns the newest AUTOSAVE, not the last saved revision, so an editor
 * sees what they just typed. A preview that shows the previous save looks like
 * the preview is broken, which is worse than not having one.
 *
 * `revalidate: false` — never cached. A cached preview is the same defect in a
 * different place.
 */
export async function getPreviewArticle(id: string, secret: string): Promise<Article> {
  const data = await gql<{
    magPreview: (WpSummary & { content: string | null; seo: unknown }) | null;
  }>(
    `query MagPreview($id: ID!, $secret: String!) {
      magPreview(id: $id, secret: $secret) {
        ${SUMMARY_FIELDS}
        content
        ${SEO_FIELDS}
      }
    }`,
    { id, secret },
    false,
  );

  if (!data.magPreview) throw new MagNotFoundError(id);

  const content = addHeadingIds(sanitizeArticleHtml(data.magPreview.content ?? ''));
  const markets = (data.magPreview.markets?.nodes ?? []).map(mapMarket);

  return {
    ...mapSummary(data.magPreview),
    content,
    outline: extractHeadings(content),
    secondaryMarkets: markets.slice(1),
    seo: mapSeo(data.magPreview.seo),
  };
}

export async function getMarkets(): Promise<Market[]> {
  const data = await gql<{
    markets: {
      nodes: Array<WpTerm & { count: number | null; marketDescription: string | null }>;
    };
  }>(
    `query Markets {
      markets(first: 20) { nodes { slug name count marketDescription } }
    }`,
    {},
    3600,
  );

  return data.markets.nodes.map((node) => ({
    slug: node.slug as MarketSlug,
    name: node.name,
    description: node.marketDescription,
    count: node.count ?? 0,
  }));
}

export async function getMarket(slug: MarketSlug): Promise<Market> {
  const market = (await getMarkets()).find((m) => m.slug === slug);
  if (!market) throw new MagNotFoundError(slug);
  return market;
}

/**
 * Author fields.
 *
 * The published count is derived by fetching ids rather than reading a total —
 * WPGraphQL core exposes no count on a connection without the offset-pagination
 * plugin. 100 is a safe ceiling per author for this archive; if an author ever
 * exceeds it the number under-reports rather than breaking, which is the right
 * failure direction for a display-only figure.
 */
const AUTHOR_FIELDS = `
  name
  slug
  description
  posts(first: 100, where: { status: PUBLISH }) {
    nodes { databaseId }
  }
`;

interface WpAuthor {
  name: string;
  slug: string;
  description: string | null;
  posts: { nodes: Array<{ databaseId: number }> } | null;
}

function mapFullAuthor(node: WpAuthor): Author {
  return {
    slug: node.slug,
    name: node.name,
    role: null,
    bio: node.description?.trim() || null,
    /* Gravatar deliberately dropped — see mapAuthor. */
    avatar: null,
    articleCount: node.posts?.nodes.length ?? 0,
  };
}

export async function getAuthor(slug: string): Promise<Author> {
  const data = await gql<{ user: WpAuthor | null }>(
    `query AuthorBySlug($slug: ID!) {
      user(id: $slug, idType: SLUG) { ${AUTHOR_FIELDS} }
    }`,
    { slug },
    3600,
  );

  if (!data.user) throw new MagNotFoundError(slug);
  return mapFullAuthor(data.user);
}

export async function getAuthors(): Promise<Author[]> {
  const data = await gql<{ users: { nodes: WpAuthor[] } }>(
    `query Authors {
      users(first: 50, where: { hasPublishedPosts: POST }) {
        nodes { ${AUTHOR_FIELDS} }
      }
    }`,
    {},
    3600,
  );

  return data.users.nodes
    .map(mapFullAuthor)
    /* An author with nothing published would be a dead page. */
    .filter((author) => (author.articleCount ?? 0) > 0);
}

/**
 * Reports and monthlies.
 *
 * No source exists — no CPT, no category, nothing published. Returns empty so
 * every consumer hides its section, which is the documented behaviour.
 *
 * Deliberately NOT faked with articles: an empty section is honest, a padded
 * one lies about what the publication produces.
 */
export async function getReports(page = 1, perPage = 12): Promise<Paginated<Report>> {
  return { items: [], page, perPage, total: 0, totalPages: 1 };
}

export async function searchArticles(params: SearchParams): Promise<SearchResult> {
  const { query, page = 1, perPage = 9 } = params;

  const filters = { category: null, author: null, search: query };
  const after = await cursorForPage(page, perPage, filters);

  const data = await gql<{ posts: { nodes: WpSummary[] } }>(
    `query Search($search: String!, $size: Int!, $after: String) {
      posts(first: $size, after: $after, where: {
        search: $search
        status: PUBLISH
      }) {
        nodes { ${SUMMARY_FIELDS} }
      }
    }`,
    { search: query, size: perPage, after },
    /* Search results are per-query and shouldn't be cached. */
    false,
  );

  const total = await countArticles(filters);

  return {
    items: data.posts.nodes.map(mapSummary),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    query,
  };
}
