#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_API_ROOT = "https://thefinance.ir/mag/wp-json/wp/v2";
const apiRoot = (process.env.MAG_SOURCE_API_ROOT ?? DEFAULT_API_ROOT).replace(/\/$/, "");
const generatedAt = new Date().toISOString();
const snapshotDate = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: process.env.MAG_SOURCE_TIMEZONE ?? "Asia/Tehran",
  year: "numeric",
}).format(new Date());
const outputDirectory = resolve("artifacts", "production-inventory", snapshotDate);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableSort(records) {
  return [...records].sort((left, right) => Number(left.id) - Number(right.id));
}

async function fetchJson(path, parameters = {}) {
  const url = new URL(`${apiRoot}/${path}`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "thefinance-mag-read-only-inventory/1.0",
    },
    method: "GET",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`);
  }

  return {
    body: await response.json(),
    total: Number(response.headers.get("x-wp-total") ?? 0),
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 1),
    url: url.toString(),
  };
}

async function fetchCollectionAttempt(path, fields) {
  const firstPage = await fetchJson(path, {
    _fields: fields.join(","),
    context: "view",
    order: "asc",
    orderby: "id",
    page: 1,
    per_page: 100,
  });
  const records = Array.isArray(firstPage.body) ? [...firstPage.body] : [];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await fetchJson(path, {
      _fields: fields.join(","),
      context: "view",
      order: "asc",
      orderby: "id",
      page,
      per_page: 100,
    });
    records.push(...nextPage.body);
  }

  return {
    records: stableSort([...new Map(records.map((record) => [record.id, record])).values()]),
    reportedTotal: firstPage.total,
    sourceUrl: firstPage.url,
  };
}

async function fetchCollection(path, fields) {
  let result = await fetchCollectionAttempt(path, fields);
  if (result.records.length !== result.reportedTotal) {
    result = await fetchCollectionAttempt(path, fields);
  }
  return result;
}

function countBy(values) {
  return Object.fromEntries(
    [...values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) ?? 0) + 1);
      return counts;
    }, new Map())].sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

function findDuplicates(records, key) {
  const groups = new Map();
  for (const record of records) {
    const value = record[key];
    if (!value) continue;
    groups.set(value, [...(groups.get(value) ?? []), record.id]);
  }

  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }))
    .sort((left, right) => String(left.value).localeCompare(String(right.value)));
}

function normalizePost(post) {
  const content = post.content?.rendered ?? "";
  return {
    id: post.id,
    slug: post.slug,
    link: post.link,
    status: post.status,
    date: post.date,
    dateGmt: post.date_gmt,
    modified: post.modified,
    modifiedGmt: post.modified_gmt,
    authorId: post.author,
    featuredMediaId: post.featured_media,
    categoryIds: post.categories ?? [],
    tagIds: post.tags ?? [],
    titleHtml: post.title?.rendered ?? "",
    excerptHtml: post.excerpt?.rendered ?? "",
    contentHtml: content,
    contentSha256: sha256(content),
    rankMath: {
      title: post.meta?.rank_math_title ?? null,
      description: post.meta?.rank_math_description ?? null,
      focusKeyword: post.meta?.rank_math_focus_keyword ?? null,
      canonicalUrl: post.meta?.rank_math_canonical_url ?? null,
      robots: post.meta?.rank_math_robots ?? null,
    },
  };
}

function normalizeMedia(media) {
  return {
    id: media.id,
    slug: media.slug,
    date: media.date,
    modified: media.modified,
    attachedToPostId: media.post,
    sourceUrl: media.source_url,
    mediaType: media.media_type,
    mimeType: media.mime_type,
    altText: media.alt_text ?? "",
    captionHtml: media.caption?.rendered ?? "",
    width: media.media_details?.width ?? null,
    height: media.media_details?.height ?? null,
    file: media.media_details?.file ?? null,
    fileSize: media.media_details?.filesize ?? null,
  };
}

const postFields = [
  "id", "slug", "link", "status", "date", "date_gmt", "modified", "modified_gmt",
  "author", "featured_media", "categories", "tags", "title", "excerpt", "content", "meta",
];
const pageFields = [
  "id", "slug", "link", "status", "date", "date_gmt", "modified", "modified_gmt",
  "author", "featured_media", "title", "excerpt", "content", "meta",
];
const mediaFields = [
  "id", "slug", "date", "modified", "post", "source_url", "media_type", "mime_type",
  "alt_text", "caption", "media_details",
];
const termFields = ["id", "count", "name", "slug", "parent"];
const userFields = ["id", "name", "slug", "link"];

const [postsResult, pagesResult, mediaResult, categoriesResult, tagsResult, usersResult] =
  await Promise.all([
    fetchCollection("posts", postFields),
    fetchCollection("pages", pageFields),
    fetchCollection("media", mediaFields),
    fetchCollection("categories", termFields),
    fetchCollection("tags", termFields),
    fetchCollection("users", userFields),
  ]);

const posts = postsResult.records.map(normalizePost);
const pages = pagesResult.records.map(normalizePost);
const media = mediaResult.records.map(normalizeMedia);
const categories = categoriesResult.records;
const tags = tagsResult.records;
const users = usersResult.records;
const mediaById = new Map(media.map((item) => [item.id, item]));
const categoryById = new Map(categories.map((item) => [item.id, item]));

const featuredMediaIds = posts.map((post) => post.featuredMediaId).filter(Boolean);
const missingFeaturedMedia = featuredMediaIds.filter((id) => !mediaById.has(id));
const featuredWithoutAlt = featuredMediaIds.filter((id) => mediaById.get(id)?.altText === "");
const categorySlugs = posts.flatMap((post) =>
  post.categoryIds.map((id) => categoryById.get(id)?.slug ?? `missing:${id}`),
);

const checks = {
  collectionCountMatchesHeaders: {
    posts: posts.length === postsResult.reportedTotal,
    pages: pages.length === pagesResult.reportedTotal,
    media: media.length === mediaResult.reportedTotal,
    categories: categories.length === categoriesResult.reportedTotal,
    tags: tags.length === tagsResult.reportedTotal,
    users: users.length === usersResult.reportedTotal,
  },
  duplicatePostSlugs: findDuplicates(posts, "slug"),
  duplicateMediaUrls: findDuplicates(media, "sourceUrl"),
  missingFeaturedMediaIds: [...new Set(missingFeaturedMedia)].sort((a, b) => a - b),
  featuredMediaWithoutAltIds: [...new Set(featuredWithoutAlt)].sort((a, b) => a - b),
  postLinksOutsideMag: posts
    .filter((post) => !post.link.startsWith("https://thefinance.ir/mag/"))
    .map((post) => ({ id: post.id, link: post.link })),
  seoAvailability: {
    rankMathTitle: posts.filter((post) => Boolean(post.rankMath.title)).length,
    rankMathDescription: posts.filter((post) => Boolean(post.rankMath.description)).length,
    rankMathFocusKeyword: posts.filter((post) => Boolean(post.rankMath.focusKeyword)).length,
    rankMathCanonicalUrl: posts.filter((post) => Boolean(post.rankMath.canonicalUrl)).length,
    rankMathRobots: posts.filter((post) => Boolean(post.rankMath.robots)).length,
  },
};

const manifestWithoutHash = {
  schemaVersion: 1,
  generatedAt,
  sourceApiRoot: apiRoot,
  readOnlyMethod: "WordPress REST API GET requests only",
  counts: {
    posts: posts.length,
    pages: pages.length,
    media: media.length,
    categories: categories.length,
    tags: tags.length,
    users: users.length,
  },
  reportedTotals: {
    posts: postsResult.reportedTotal,
    pages: pagesResult.reportedTotal,
    media: mediaResult.reportedTotal,
    categories: categoriesResult.reportedTotal,
    tags: tagsResult.reportedTotal,
    users: usersResult.reportedTotal,
  },
  distributions: {
    postsByCategorySlug: countBy(categorySlugs),
    mediaByMimeType: countBy(media.map((item) => item.mimeType)),
    postsByAuthorId: countBy(posts.map((post) => post.authorId)),
  },
  checks,
  posts,
  pages,
  media,
  categories,
  tags,
  users,
};
const canonicalManifest = `${JSON.stringify(manifestWithoutHash, null, 2)}\n`;
const manifest = {
  ...manifestWithoutHash,
  manifestSha256: sha256(canonicalManifest),
};

const summary = `# Production inventory — ${snapshotDate}

Generated by \`npm run inventory:production\` using read-only HTTP GET requests.

## Counts

| Resource | Count |
|---|---:|
| Posts | ${posts.length} |
| Pages | ${pages.length} |
| Public media records retrieved | ${media.length} |
| Media total reported by REST headers | ${mediaResult.reportedTotal} |
| Categories | ${categories.length} |
| Tags | ${tags.length} |
| Public authors | ${users.length} |

## Reconciliation signals

- Duplicate post slugs: ${checks.duplicatePostSlugs.length}
- Missing featured-media records: ${checks.missingFeaturedMediaIds.length}
- Featured images without alt text: ${checks.featuredMediaWithoutAltIds.length}
- REST media count matches retrieved unique records: ${checks.collectionCountMatchesHeaders.media ? "yes" : "no — requires database reconciliation"}
- Post links outside \`/mag/\`: ${checks.postLinksOutsideMag.length}
- Rank Math title available through REST: ${checks.seoAvailability.rankMathTitle}/${posts.length}
- Rank Math description available through REST: ${checks.seoAvailability.rankMathDescription}/${posts.length}
- Rank Math canonical available through REST: ${checks.seoAvailability.rankMathCanonicalUrl}/${posts.length}
- Rank Math robots available through REST: ${checks.seoAvailability.rankMathRobots}/${posts.length}

Canonical and robots gaps require the database/server export before migration. They are not inferred.

Manifest SHA-256: \`${manifest.manifestSha256}\`
`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(resolve(outputDirectory, "summary.md"), summary),
]);

console.log(summary);
console.log(`Artifacts: ${outputDirectory}`);
