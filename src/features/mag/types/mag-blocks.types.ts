/**
 * In-body Gutenberg block attributes.
 *
 * Exactly three blocks. Chart embeds and product cards are deferred until
 * editors actually ask for them — the block library is a ceiling, not a
 * starting point.
 *
 * IMPORTANT: none of these render their title as a heading element. As <h3>
 * they would pollute the article's table of contents and break its heading
 * outline.
 */

export const MAG_BLOCK_NAMES = [
  'thefinance/callout',
  'thefinance/disclaimer',
  'thefinance/cta',
] as const;

export type MagBlockName = (typeof MAG_BLOCK_NAMES)[number];

/**
 * General editorial aside — a definition, a clarification, a worked example.
 *
 * Deliberately ONE variant. No info/warning/success/error severity set:
 * four options means an editor chooses correctly once and wrongly three times.
 */
export interface CalloutBlock {
  name: 'thefinance/callout';
  attributes: {
    /** Optional. Rendered as bold text, never as a heading element. */
    title: string | null;
    /** Inner HTML — supports paragraphs and lists. */
    content: string;
  };
}

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

export const DISCLAIMER_TEXT =
  'این مطلب صرفاً جنبه آموزشی و اطلاع‌رسانی دارد و توصیه به خرید یا فروش نیست. ' +
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

export type MagBlock = CalloutBlock | DisclaimerBlock | CtaBlock;

/** Narrowing helper for the block registry. */
export function isMagBlockName(name: string): name is MagBlockName {
  return (MAG_BLOCK_NAMES as readonly string[]).includes(name);
}
