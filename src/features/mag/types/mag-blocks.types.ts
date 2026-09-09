/**
 * In-body Gutenberg block attributes.
 *
 * Four blocks. Chart embeds and product cards are still deferred until editors
 * actually ask for them — the block library is a ceiling, not a starting
 * point, and B7 says so.
 *
 * THREE THINGS THE RICH ARTICLE TEMPLATE ASKED FOR ARE NOT HERE, because
 * WordPress core already ships them and a house block that duplicates a core
 * one is a block editors have to be told to prefer:
 *
 *   - the pull quote is `core/pullquote`, styled in globals.css
 *   - the comparison table is `core/table`, wrapped for overflow in the body
 *     pipeline rather than re-implemented as structured attributes
 *   - the tags row is the post's own tag taxonomy, not in-body content at all
 *
 * IMPORTANT: none of these render their title as a heading element. As <h3>
 * they would pollute the article's table of contents and break its heading
 * outline. That is why the FAQ's questions are <summary>, not headings.
 */

export const MAG_BLOCK_NAMES = [
  'thefinance/callout',
  'thefinance/disclaimer',
  'thefinance/cta',
  'thefinance/faq',
] as const;

export type MagBlockName = (typeof MAG_BLOCK_NAMES)[number];

/**
 * General editorial aside — a definition, a clarification, a worked example.
 *
 * TWO VARIANTS, and the original note said one. That note ruled out an
 * info/warning/success/error severity SET, because four options means an
 * editor chooses correctly once and wrongly three times. The argument is about
 * four, and it holds: at four the choice is a taste test with no right answer.
 *
 * Two is a different question, and it has one: does skipping this cost the
 * reader money? The rich-article design draws exactly that block — «قبل از
 * پرداخت اشتراک بخوانید», a caution that the platforms compared in the article
 * do not carry official Tehran-exchange intraday data. Rendering it as an
 * ordinary aside is the failure the callout exists to prevent.
 *
 * `note` is the DEFAULT, so an editor who chooses nothing gets the right
 * block, and the variant is a deliberate act rather than a field to fill in.
 * The two share one component and one set of geometry — see globals.css, where
 * warn moves the stripe, the tint, the title colour and nothing else.
 *
 * A third variant needs a new argument, not a new colour.
 */
export interface CalloutBlock {
  name: 'thefinance/callout';
  attributes: {
    /** Optional. Rendered as bold text, never as a heading element. */
    title: string | null;
    /** Inner HTML — supports paragraphs and lists. */
    content: string;
    /**
     * `note` is the general aside. `warn` is for a consequence the reader
     * pays for by skipping it — cost, data gaps, an irreversible step.
     *
     * NEVER a risk warning about an investment outcome. Compliance copy is
     * the disclaimer block, whose text lives in code precisely so nobody
     * writes their own version of it in a callout.
     */
    variant: CalloutVariant;
  };
}

export const CALLOUT_VARIANTS = ['note', 'warn'] as const;

export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

/** Default when the attribute is absent — an old block predates the variant. */
export const DEFAULT_CALLOUT_VARIANT: CalloutVariant = 'note';

/**
 * Compliance block.
 *
 * Copy is FIXED and not editor-editable. Editors insert the block; they never
 * write its text. Signal-selling is prohibited under Iranian securities law,
 * so this is legal protection rather than brand voice — which is why the text
 * lives in code, not in the database.
 */
export interface DisclaimerBlock {
  name: 'thefinance/disclaimer';
  attributes: Record<string, never>;
}

/**
 * IN-ARTICLE form. «این مطلب» — "this article" — and it is only correct where
 * there is one.
 */
export const DISCLAIMER_TEXT =
  'این مطلب صرفاً جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست. ' +
  'مسئولیت هر تصمیم سرمایه‌گذاری بر عهده خود شماست.';

/**
 * SITE-WIDE form, for the footer.
 *
 * The footer renders on every route — the 404, the search page, the author
 * index — and was using the in-article text, so a page with no article told
 * the reader that «این مطلب» is educational only. This is compliance copy
 * under Iranian securities law, so the grammatical scope is not a nicety: a
 * disclaimer that names a thing which is not on the page is a disclaimer that
 * does not attach to anything.
 *
 * ONLY THE SCOPE CHANGES. The second sentence is byte-identical and the first
 * swaps «این مطلب» for «محتوای مجله». Anything beyond that is a legal review,
 * not a UI fix — flagged in the PR rather than done here.
 */
export const SITE_DISCLAIMER_TEXT =
  'محتوای مجله فایننس صرفاً جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست. ' +
  'مسئولیت هر تصمیم سرمایه‌گذاری بر عهده خود شماست.';

/**
 * Points readers at InChart or Academy.
 *
 * Copy must contain no profit, urgency, or scarcity language — the value
 * proposition is the tool's capability, never an outcome.
 */
export interface CtaBlock {
  name: 'thefinance/cta';
  attributes: {
    heading: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
  };
}

/**
 * Frequently-asked questions.
 *
 * ONE ENTRY PER QUESTION, structured — not a heading-and-paragraph run an
 * editor formats by hand. The structure is what lets the frontend render it as
 * <details>/<summary> without JavaScript, and what keeps the questions out of
 * the article's heading outline.
 *
 * NO FAQPage JSON-LD IS EMITTED FROM THIS, and that is a decision rather than
 * an omission — see decisions.md. Google restricted FAQ rich results to
 * well-known government and health sites in August 2023, so the markup buys no
 * result for a magazine and adds a surface that Search Console reports on.
 * The block is a reader feature.
 *
 * An empty `items` array renders nothing at all: no heading, no empty panel.
 */
export interface FaqBlock {
  name: 'thefinance/faq';
  attributes: {
    items: FaqItem[];
  };
}

export interface FaqItem {
  /** Plain text. Rendered in <summary>, never as a heading element. */
  question: string;
  /** Inner HTML — a paragraph, occasionally a short list. */
  answer: string;
}

export type MagBlock = CalloutBlock | DisclaimerBlock | CtaBlock | FaqBlock;

/** Narrowing helper for the block registry. */
export function isMagBlockName(name: string): name is MagBlockName {
  return (MAG_BLOCK_NAMES as readonly string[]).includes(name);
}
