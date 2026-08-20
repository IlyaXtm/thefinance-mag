/**
 * Cleaning WordPress content before it reaches the article body.
 *
 * WHY THIS EXISTS.
 *
 * The content coming back from WPGraphQL is clean Gutenberg HTML — plain <p>,
 * no shortcodes, no Jannah theme classes — with one exception:
 *
 *   <p style="text-align: justify">
 *
 * The classic editor's justify button writes that inline, and inline styles
 * beat stylesheets. Persian must never be justified: without kashida support
 * the browser stretches word spacing instead of letterforms, producing rivers
 * of whitespace down the column.
 *
 * Fixing it in CSS would need `!important` on every affected property, which
 * papers over bad data. Stripping it here fixes the data on the way in, and
 * the rule stays enforceable everywhere else.
 */

/** Inline style declarations that must never survive into the article body. */
const BANNED_DECLARATIONS = [
  /text-align\s*:\s*justify\s*;?/gi,
  /font-style\s*:\s*italic\s*;?/gi,
  /direction\s*:\s*ltr\s*;?/gi,
];

export function sanitizeArticleHtml(html: string): string {
  /* The leading \s is part of the match so the attribute can be removed
     cleanly, without leaving a double space behind. */
  return html.replace(/\sstyle="([^"]*)"/gi, (_whole, declarations: string) => {
    let cleaned = declarations;

    for (const pattern of BANNED_DECLARATIONS) {
      cleaned = cleaned.replace(pattern, '');
    }

    cleaned = cleaned.replace(/;\s*;/g, ';').trim().replace(/^;|;$/g, '').trim();

    /* Drop the attribute entirely when nothing survives, rather than leaving
       an empty style="" behind. Other declarations are preserved. */
    return cleaned ? ` style="${cleaned}"` : '';
  });
}

/**
 * Extract H2 headings for the table of contents and the «در این مقاله» block.
 *
 * Derived from the body rather than stored as a field: one source, two
 * consumers, so the contents preview and the ToC can never disagree.
 */
export function extractHeadings(html: string): string[] {
  const matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gis);

  return [...matches]
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

/**
 * The id an H2 gets, shared by the body and the table of contents.
 *
 * Both sides MUST derive ids the same way. The ToC links to `#id` and the
 * scroll-spy observes elements by id — if the body's ids come from WordPress
 * and the ToC generates its own, the anchors go nowhere and the highlight
 * never fires. Nothing errors; the feature just silently does nothing.
 */
export function headingId(text: string, index: number): string {
  return `s${index + 1}-${text.trim().slice(0, 24).replace(/\s+/g, '-')}`;
}

/**
 * Stamp ids onto the body's H2 elements.
 *
 * WordPress may or may not emit ids, and when it does they don't match what
 * the ToC generates. Any existing id is replaced so there is exactly one
 * source of truth.
 *
 * Indexing must match extractHeadings() — same regex, same order — or the
 * links point at the wrong sections.
 */
export function addHeadingIds(html: string): string {
  let index = 0;

  return html.replace(/<h2([^>]*)>(.*?)<\/h2>/gis, (_whole, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (!text) return `<h2${attrs}>${inner}</h2>`;

    const id = headingId(text, index);
    index += 1;

    const withoutId = attrs.replace(/\sid="[^"]*"/gi, '');
    /* scroll-margin-top keeps a jumped-to heading clear of the sticky header
       instead of landing flush against the top edge. */
    return `<h2${withoutId} id="${id}" style="scroll-margin-top:96px">${inner}</h2>`;
  });
}
