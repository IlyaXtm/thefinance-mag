import { Fragment, type ReactNode } from 'react';

/**
 * Isolate parenthesised Latin phrases inside Persian titles.
 *
 * ── The bug ─────────────────────────────────────────────────────────────
 *
 * «تحلیل فاندامنتال (Fundamental Analysis) چیست؟» rendered at 390px as:
 *
 *     تحلیل فاندامنتال
 *     Fundamental)
 *     (Analysis چیست؟
 *
 * The bracket pair is split and mirrored. Bidi reordering (UAX#9 rules L1–L2)
 * is applied **per visual line, after line breaking**, so when a parenthesised
 * LTR run wraps, each line resolves its own half of the pair against the
 * paragraph's RTL direction — and a lone `(` in an RTL context mirrors to `)`.
 * The same string is correct in the breadcrumb directly above, because there it
 * fits on one line and there is nothing to split.
 *
 * It is not a Chromium quirk and not a font issue. It reproduces in both themes
 * and on every title whose Latin phrase is long enough to break, which on this
 * archive is a large share of them: «هج فاند (Hedge Fund) چیست؟», «میکر و تیکر
 * (Maker & Taker)», «حجم معاملات (Volume) چیست؟». «نات کوین (Notcoin) چیست؟»
 * looks fine only because it happens to fit.
 *
 * ── The fix ─────────────────────────────────────────────────────────────
 *
 * Wrap the phrase — brackets included — in `dir="ltr"`. The `dir` attribute
 * makes the element a bidi isolate, so the pair resolves inside a strongly LTR
 * context: `(` stays before the text and `)` after it on whichever line each
 * lands. The phrase still wraps normally.
 *
 * NO `white-space: nowrap`. It would keep the pair together by pushing a long
 * phrase past the container instead — trading a broken bracket for horizontal
 * overflow, which is worse and which CLAUDE.md rules out at 390px anyway.
 *
 * ── What is deliberately NOT wrapped ────────────────────────────────────
 *
 * Parentheses containing Persian. «(به‌روزرسانی شد)» is RTL content in an RTL
 * paragraph and already correct; forcing it into an LTR isolate would break the
 * thing this function exists to fix. So the content must contain a Latin letter
 * and no Persian or Arabic letter to qualify.
 *
 * Nested or unbalanced parentheses are left alone too — `[^()]*` cannot match
 * across an inner pair, so a malformed title degrades to today's behaviour
 * rather than to something worse.
 */

/* Latin letter present, Arabic-script letter absent. The Arabic block
   ؀-ۿ covers Persian; ﭐ-﷿ and ﹰ-﻿ cover the
   presentation forms some CMS exports still carry. */
const LATIN = /[A-Za-z]/;
const ARABIC = /[؀-ۿﭐ-﷿ﹰ-﻿]/;

/** A parenthesised run with no nested parens. */
const PAREN_RUN = /\(([^()]+)\)/g;

/**
 * Split a title into text and isolated Latin phrases.
 *
 * Returns a ReactNode, so it is only usable where JSX is. Plain-string
 * contexts — `<title>`, `og:title`, the RSS feed — keep the raw string: they
 * are single-line or re-rendered by a consumer with its own bidi handling, so
 * the wrap that causes this defect cannot happen there.
 */
export function bidiTitle(title: string): ReactNode {
  if (!title.includes('(')) return title;

  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of title.matchAll(PAREN_RUN)) {
    const inner = match[1];
    if (!LATIN.test(inner) || ARABIC.test(inner)) continue;

    const at = match.index ?? 0;
    if (at > last) parts.push(title.slice(last, at));

    parts.push(
      <span key={`ltr-${key++}`} dir="ltr">
        {match[0]}
      </span>,
    );
    last = at + match[0].length;
  }

  if (parts.length === 0) return title;
  if (last < title.length) parts.push(title.slice(last));

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}
