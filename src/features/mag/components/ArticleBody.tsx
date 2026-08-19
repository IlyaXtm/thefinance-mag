/**
 * Article body.
 *
 * Renders the HTML Gutenberg produces. Persian long-form rules are applied via
 * the `article-body` class in globals.css rather than inline utilities, because
 * the markup comes from WordPress and we can't put classes on it.
 *
 * The content column is 700px, which measures 70–73 characters per line in
 * Persian — mid-range of the comfortable 65–75. 720px would push it to 74–76,
 * the upper edge.
 */
export function ArticleBody({ html }: { html: string }) {
  return (
    <div
      className="article-body max-w-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
