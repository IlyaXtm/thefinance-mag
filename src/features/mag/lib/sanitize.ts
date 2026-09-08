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

/* ------------------------------------------------------------------ */
/* The injected table of contents                                       */
/* ------------------------------------------------------------------ */

/**
 * `easy-table-of-contents` puts a SECOND table of contents in every article.
 *
 * The plugin hooks `the_content`, and WPGraphQL's `content` field runs
 * `the_content` filters — so the list it builds arrives inside the article body
 * and renders a few hundred pixels below the sidebar ToC that the design
 * actually specifies. Same headings, twice, on every article.
 *
 * The SEO review marked the sidebar one and asked "does this only pick up h2?".
 * The answer is that they were comparing two lists built by two systems that
 * have never agreed about anything: the plugin numbers its entries, nests h3s,
 * scrolls with the page, and knows nothing about reading position. The sidebar
 * ToC is sticky, tracks the reader, and is the one the design draws.
 *
 * ── Why this is stripped here and not by deactivating the plugin ────────
 *
 * Deactivating it on the CMS is the cleaner fix and it is RECOMMENDED as the
 * follow-up. It is not what this does, for two reasons:
 *
 *   1. It cannot be verified from here. Deactivating would break any article
 *     that places `[ez-toc]` explicitly rather than relying on auto-insert,
 *     and this environment cannot reach the CMS to audit for that shortcode.
 *     Turning off a plugin on the strength of an unchecked assumption is how
 *     an article loses a list it was written around.
 *   2. The frontend should not render CMS-injected navigation chrome even if
 *     the plugin stays on. A headless frontend owns its own layout; a plugin
 *     that decides where navigation goes is data the mapper should drop, the
 *     same way it drops `text-align: justify`.
 *
 * BE HONEST ABOUT THE LIMIT: this strips the SHORTCODE's output too, because
 * the plugin emits identical markup either way and nothing in the HTML says
 * which one produced it. So "keeps the plugin available for authors who want
 * an inline list" is NOT what this delivers. An author who wants an inline
 * contents list needs a Gutenberg block — backlog B7 — not this plugin.
 *
 * ── Matching ───────────────────────────────────────────────────────────
 *
 * The container is `ez-toc-container`, versioned classes and all
 * (`ez-toc-v2_0_74`), and the plugin also injects an empty anchor span before
 * or inside each heading. Both go. The patterns are deliberately loose about
 * attribute order and quoting because the exact markup varies by plugin
 * version and CANNOT BE CONFIRMED FROM HERE — which is why
 * `articleHasInjectedToc()` exists below and why /mag/health reports it. A
 * silent no-op is the failure mode this whole file exists to avoid.
 */

/**
 * Opening tags of blocks the plugin owns, matched case- and order-insensitively
 * because the exact attribute soup varies by plugin version.
 *
 * `ez-toc-container` is Easy Table of Contents; `toc_container` is Table of
 * Contents Plus, which behaves identically and may be what is actually
 * installed — nothing in the review says which.
 */
const INJECTED_TOC_OPENERS: RegExp[] = [
  /<div[^>]*\b(?:id|class)\s*=\s*["'][^"']*\bez-toc-container\b[^"']*["'][^>]*>/gi,
  /<div[^>]*\bid\s*=\s*["']toc_container["'][^>]*>/gi,
];

/** The plugin's own <nav>, for versions that emit it without the container. */
const INJECTED_TOC_NAV = /<nav[^>]*\bclass\s*=\s*["'][^"']*\bez-toc\b[^"']*["'][^>]*>/gi;

/** The empty anchor spans the plugin scatters through the body. */
const INJECTED_ANCHOR =
  /<span[^>]*\bclass\s*=\s*["'][^"']*\bez-toc-section\b[^"']*["'][^>]*>\s*<\/span>/gi;

/** Anything at all that still smells of the plugin — the diagnostic, not the fix. */
const INJECTED_TOC_MARKER = /ez-toc|toc_container/i;

/**
 * Remove one element and everything nested inside it, counting depth.
 *
 * A REGEX CANNOT DO THIS AND THE FIRST VERSION OF THIS FILE TRIED. The
 * plugin's container holds a title <div> and then the list:
 *
 *   <div id="ez-toc-container"> <div class="ez-toc-title-container">…</div>
 *     <nav><ul>…</ul></nav> </div>
 *
 * A non-greedy `<div…>[\s\S]*?<\/div>` stops at the FIRST `</div>`, which
 * closes the title — so it would delete the heading «فهرست مطالب» and leave the
 * entire list behind, plus an orphaned `</div>` to unbalance the article body.
 * The result looks like a partial fix in a diff and is worse than no fix on the
 * page. So this scans forward with a depth counter instead.
 *
 * Unclosed input is left alone rather than truncated: if the depth never
 * returns to zero the source is malformed, and deleting to the end of the
 * document would take the article with it.
 */
function removeBalancedElement(html: string, opener: RegExp, tag: string): string {
  const open = new RegExp(`<${tag}\\b`, 'gi');
  const close = new RegExp(`</${tag}\\s*>`, 'gi');

  let out = html;
  /* Re-scan from the start after each removal: indices shift, and there are at
     most one or two of these in a document. */
  for (;;) {
    opener.lastIndex = 0;
    const match = opener.exec(out);
    if (!match) return out;

    const from = match.index;
    let cursor = from + match[0].length;
    let depth = 1;

    while (depth > 0) {
      open.lastIndex = cursor;
      close.lastIndex = cursor;
      const nextOpen = open.exec(out);
      const nextClose = close.exec(out);

      /* Unbalanced — leave the document untouched and let the diagnostic
         report it rather than cutting the article short. */
      if (!nextClose) return out;

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth += 1;
        cursor = nextOpen.index + nextOpen[0].length;
      } else {
        depth -= 1;
        cursor = nextClose.index + nextClose[0].length;
      }
    }

    out = out.slice(0, from) + out.slice(cursor);
  }
}

/**
 * Remove a table of contents the CMS injected into the body.
 *
 * Runs before `addHeadingIds`, so the ids the sidebar links to are stamped on
 * the body that actually ships — not on a copy that still contains the list.
 */
export function stripInjectedToc(html: string): string {
  let out = html;
  for (const opener of INJECTED_TOC_OPENERS) out = removeBalancedElement(out, opener, 'div');
  out = removeBalancedElement(out, INJECTED_TOC_NAV, 'nav');
  return out.replace(INJECTED_ANCHOR, '');
}

/**
 * Did an injected ToC survive the strip?
 *
 * The patterns above are written against documented markup that this session
 * could not verify against the live CMS. If the plugin's shape has moved, the
 * strip becomes a silent no-op and the double ToC comes back with nothing to
 * show for it. `/mag/health` reports this, so the answer is a number rather
 * than an assumption.
 */
export function articleHasInjectedToc(html: string): boolean {
  return INJECTED_TOC_MARKER.test(html);
}

/* ------------------------------------------------------------------ */

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
 *
 * ── H2 ONLY, AND THAT IS THE ANSWER TO THE REVIEW'S QUESTION ───────────
 *
 * The SEO review asked whether the sidebar ToC "only picks up h2". It does,
 * everywhere and by design:
 *
 *   this function                 h2 only, uncapped — feeds the article ToC
 *   `outlineHeadings` (mu-plugin) h2 only, CAPPED AT 8 — feeds the card dek
 *                                 and the RSS description, never the ToC
 *
 * The cap is on the wrong field to matter here: the article page derives its
 * contents from the body it already has, so a 24-heading article gets all 24.
 *
 * H2 stays the granularity. A three-level list on a 41-minute read is a wall,
 * and the panel is height-capped with internal scrolling precisely because 24
 * entries already fill it — adding h3s would triple that to navigate a
 * document the reader has not started. If a nested ToC is ever wanted it is a
 * design change with a scroll and a density problem attached, not a regex
 * edit.
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
