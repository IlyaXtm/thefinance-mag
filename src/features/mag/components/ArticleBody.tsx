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
      /* The hook the reading-progress bar measures against. NOT a bare
         `article` selector: cards are `<article>` elements too, so
         `querySelector('article')` on this page finds a related-post card and
         the progress bar tracks that card's geometry instead of the text. */
      data-article-body=""
      className="article-body max-w-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
