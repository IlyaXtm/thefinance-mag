#!/usr/bin/env node
/**
 * Assert the text/surface contrast floor, straight from tokens.css.
 *
 *   npm run check:contrast
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * A visual audit reported that secondary text "reads as faint in both themes,
 * and worse on the light surfaces", and said plainly that it had computed no
 * ratios. That is a lead, not a finding, and the only way to tell the two
 * apart is to measure. Every pair turned out to pass — the lowest anywhere is
 * 4.86 — which means the next person to look at a screenshot and think the
 * same thing needs a number to argue with, not another opinion.
 *
 * ── It parses tokens.css rather than restating the values ───────────────
 *
 * A table of hardcoded hexes here would be a second copy of the palette, and a
 * second copy passes forever while the real one drifts. This reads the file
 * the browser reads. If a token is renamed the parse finds nothing and the
 * check fails loudly, which is the correct response to "the thing I was
 * measuring no longer exists".
 *
 * ── What it does NOT cover ──────────────────────────────────────────────
 *
 * Text over photography. `--on-media-*` sits on a scrim over an arbitrary
 * image, so its worst case depends on the picture, not on a token pair. Those
 * values carry their own measured comments in tokens.css against the worst
 * case (a fully white image) and are asserted here against the scrim's
 * weakest point instead — the .72 mid-stop, not the .94 base, because a long
 * headline pushes the meta row up into the thinner part of the gradient.
 */

import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

/** WCAG 2.2 SC 1.4.3 — normal-size text. Nothing in this set qualifies as large. */
const FLOOR = 4.5;

const lin = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [hi, lo] = L(a) > L(b) ? [L(a), L(b)] : [L(b), L(a)];
  return (hi + 0.05) / (lo + 0.05);
};

/** `#rrggbb` or `rgba(r, g, b, a)` → [r,g,b,a]. */
function parseColor(value) {
  const v = value.trim();
  if (v.startsWith('#')) {
    const h = v.slice(1);
    const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).concat(1);
  }
  const nums = v.match(/[\d.]+/g);
  if (!nums) return null;
  return [+nums[0], +nums[1], +nums[2], nums[3] === undefined ? 1 : +nums[3]];
}

/** Alpha text over an opaque surface — v1's secondary and muted are rgba. */
const composite = ([r, g, b, a], bg) => [r, g, b].map((c, i) => c * a + bg[i] * (1 - a));

/**
 * Pull each theme's block out of the stylesheet.
 *
 * The selectors are matched literally, so a renamed theme drops out of the
 * table rather than silently inheriting the previous block's values.
 */
function themeBlock(selector) {
  const at = CSS.indexOf(selector);
  if (at === -1) return null;
  const open = CSS.indexOf('{', at);
  const close = CSS.indexOf('\n}', open);
  return CSS.slice(open, close);
}

function tokenIn(block, name) {
  const m = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? parseColor(m[1]) : null;
}

const THEMES = [
  ['v1', ":root,\n[data-theme='v1']"],
  ['v2-dark', "[data-theme='v2-dark']"],
  ['v2-light', "[data-theme='v2-light']"],
];

const TEXT = ['--text-secondary', '--text-muted'];
const SURFACES = ['--surface', '--surface-raised', '--surface-hover'];

const rows = [];
const problems = [];

for (const [theme, selector] of THEMES) {
  const block = themeBlock(selector);
  if (!block) {
    problems.push(`theme block not found: ${selector}`);
    continue;
  }
  for (const t of TEXT) {
    const fg = tokenIn(block, t);
    if (!fg) {
      problems.push(`${theme}: ${t} not found`);
      continue;
    }
    for (const s of SURFACES) {
      const bgc = tokenIn(block, s);
      if (!bgc) {
        problems.push(`${theme}: ${s} not found`);
        continue;
      }
      const bg = bgc.slice(0, 3);
      const r = ratio(fg[3] < 1 ? composite(fg, bg) : fg.slice(0, 3), bg);
      rows.push({ theme, text: t, surface: s, ratio: r });
    }
  }
}

/*
  The scrim, at its WEAKEST point rather than its strongest.

  --on-media-muted was set to .70 rather than .62 for exactly this reason: at
  the .94 base every value passes, and the meta row only sits there while the
  headline is short. A three-line headline pushes it up into the .72 band.
*/
const root = themeBlock(':root {\n  --scrim-from');
if (root) {
  const scrimMid = tokenIn(root, '--scrim-mid');
  for (const t of ['--on-media', '--on-media-secondary', '--on-media-muted']) {
    const fg = tokenIn(root, t);
    if (!fg || !scrimMid) continue;
    /* Worst case: the scrim's thin end over a fully white image. */
    const bg = composite(scrimMid, [255, 255, 255]);
    const eff = fg[3] < 1 ? composite(fg, bg) : fg.slice(0, 3);
    rows.push({ theme: 'over media', text: t, surface: '--scrim-mid on white', ratio: ratio(eff, bg) });
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nContrast — text tokens against every surface they are used on\n`);
console.log(pad('theme', 12), pad('text token', 22), pad('surface', 22), 'ratio   AA 4.5');
for (const r of rows) {
  const ok = r.ratio >= FLOOR;
  if (!ok) problems.push(`${r.theme}: ${r.text} on ${r.surface} = ${r.ratio.toFixed(2)}`);
  console.log(
    pad(r.theme, 12), pad(r.text, 22), pad(r.surface, 22),
    pad(r.ratio.toFixed(2), 7), ok ? 'PASS' : 'FAIL',
  );
}

if (rows.length === 0) problems.push('no pairs measured — the parse found nothing');

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('');
  process.exit(1);
}

const low = rows.reduce((a, b) => (a.ratio < b.ratio ? a : b));
console.log(
  `\n✓ all ${rows.length} pairs clear ${FLOOR}:1 — lowest is ` +
    `${low.ratio.toFixed(2)} (${low.theme}, ${low.text} on ${low.surface})\n`,
);
