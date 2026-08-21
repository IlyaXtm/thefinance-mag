import type {
  Comment,
  CommentSubmission,
  CommentSubmitResult,
  CommentThread,
} from '../../types/mag-comments.types';

/**
 * Comments against WPGraphQL.
 *
 * READING is public and unauthenticated: WordPress only exposes approved
 * comments through the `comments` connection, so there is no filter to get
 * wrong here.
 *
 * WRITING goes through the Next.js route handler at /api/comments, never
 * directly from the browser. That handler owns rate limiting, the honeypot
 * check, and field validation — none of which can be enforced if the browser
 * talks to WordPress itself.
 *
 * Submitted comments are held for moderation by WordPress. The frontend never
 * shows an unapproved comment, so a spam submission is invisible rather than
 * something to clean up after.
 */

const ENDPOINT =
  process.env.WP_GRAPHQL_ENDPOINT ??
  process.env.NEXT_PUBLIC_WP_GRAPHQL_ENDPOINT ??
  '';

const COMMENTS_QUERY = `
  query ArticleComments($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      databaseId
      commentCount
      comments(first: 100, where: { order: ASC, parentIn: ["0"] }) {
        nodes {
          id
          content(format: RENDERED)
          date
          author { node { name } }
          replies: children(first: 50) {
            nodes {
              id
              content(format: RENDERED)
              date
              author { node { name } }
            }
          }
        }
      }
    }
  }
`;

const CREATE_COMMENT = `
  mutation CreateComment(
    $commentOn: Int!
    $author: String!
    $authorEmail: String!
    $content: String!
    $parent: ID
  ) {
    createComment(
      input: {
        commentOn: $commentOn
        author: $author
        authorEmail: $authorEmail
        content: $content
        parent: $parent
      }
    ) {
      success
    }
  }
`;

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  if (!ENDPOINT) throw new Error('WP GraphQL endpoint is not configured.');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    /*
      NOT `cache: 'no-store'`.
      
      A no-store fetch during render opts the WHOLE route into dynamic
      rendering. This runs inside the article page, so it was silently
      disabling that page's ISR: `export const revalidate = 300` never took
      effect, every article response carried
      `Cache-Control: private, no-cache, no-store, must-revalidate`, the CDN
      could not hold the HTML, and every single request re-ran the article,
      related and comment queries against a /graphql that nginx limits to
      10 r/s. On the highest-traffic, most SEO-critical page in the product.

      60 seconds is far fresher than the content needs: comments are held for
      moderation, so the delay before one can appear at all is human-scale.
    */
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error('GraphQL returned no data.');

  return json.data;
}

/**
 * WordPress returns comment content as rendered HTML wrapped in <p>.
 *
 * We strip it to plain text rather than injecting it. Comment bodies are the
 * one place on this site where an untrusted party controls the content, and
 * rendering their HTML is how a comment section becomes an XSS vector. Line
 * breaks are preserved; nothing else is.
 */
function toPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

interface WpComment {
  id: string;
  content: string;
  date: string;
  author: { node: { name: string } | null } | null;
  replies?: { nodes: WpComment[] };
}

function mapComment(node: WpComment): Comment {
  return {
    id: node.id,
    authorName: node.author?.node?.name?.trim() || 'کاربر مهمان',
    avatarUrl: null,
    content: toPlainText(node.content),
    createdAt: node.date,
    replies: (node.replies?.nodes ?? []).map((r) => ({ ...mapComment(r), replies: [] })),
  };
}

export async function getComments(slug: string): Promise<CommentThread> {
  const data = await gql<{
    post: { commentCount: number | null; comments: { nodes: WpComment[] } } | null;
  }>(COMMENTS_QUERY, { slug });

  if (!data.post) return { items: [], total: 0 };

  return {
    items: data.post.comments.nodes.map(mapComment),
    total: data.post.commentCount ?? 0,
  };
}

export async function submitComment(
  submission: CommentSubmission,
): Promise<CommentSubmitResult> {
  try {
    await gql(CREATE_COMMENT, {
      commentOn: Number(submission.articleId),
      author: submission.authorName,
      authorEmail: submission.authorEmail,
      content: submission.content,
      parent: submission.parentId,
    });

    /*
      Always 'pending'. WordPress holds new comments for moderation, and even
      if a future setting auto-approved them, telling the reader their comment
      is awaiting review is the honest default — better than promising it is
      live and having it disappear.
    */
    return { status: 'pending' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'ارسال دیدگاه انجام نشد.',
    };
  }
}
