#!/usr/bin/env node
/**
 * Unit-check the two SCANNERS in the article-body pipeline — `stripInjectedToc`
 * and `wrapBodyTables`. Both walk the document with a depth counter, both were
 * written against markup this environment cannot fetch, and both fail silently
 * when they get it wrong.
 *
 *   npm run check:toc
 *
 * ── Why this is a script and not a comment claiming it works ────────────
 *
 * The strip is written against `easy-table-of-contents` markup that THIS BUILD
 * ENVIRONMENT COULD NOT VERIFY AGAINST THE LIVE CMS — the CMS is unreachable
 * from here. So the shapes below are the documented ones, and this asserts the
 * scanner handles each of them rather than the file asserting it in prose.
 *
 * The case that matters most is the first. The plugin's container holds a
 * title <div> and THEN the list, so a non-greedy `<div…>[\s\S]*?</div>` — the
 * obvious implementation, and the one written first — stops at the title's
 * closing tag: it deletes the words «فهرست مطالب», keeps the entire list, and
 * leaves an orphaned `</div>` in the article body. That is worse than not
 * fixing it, and it looks correct in a diff.
 *
 * Malformed input is expected to come back UNCHANGED with the survivor flag
 * set. Deleting to the end of the document would take the article with it, so
 * an unbalanced container is reported (via /mag/health) rather than guessed at.
 *
 * Transpiles the source itself rather than importing from a build, so it can
 * run before `next build` and cannot pass against a stale bundle.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const out = mkdtempSync(join(tmpdir(), 'toc-'));
execFileSync(
  'npx',
  ['tsc', 'src/features/mag/lib/sanitize.ts', '--module', 'esnext', '--target', 'es2022',
   '--outDir', out, '--skipLibCheck'],
  { stdio: 'inherit' },
);

const { stripInjectedToc, articleHasInjectedToc, wrapBodyTables } = await import(
  pathToFileURL(join(out, 'sanitize.js')).href
);

const TOC = '<div id="ez-toc-container" class="ez-toc-v2_0_74 counter-hierarchy"><div class="ez-toc-title-container"><p class="ez-toc-title">فهرست مطالب</p></div><nav><ul class="ez-toc-list ez-toc-list-level-1"><li><a class="ez-toc-link" href="#H1">یک</a><ul class="ez-toc-list-level-3"><li><a href="#S1">زیر</a></li></ul></li></ul></nav></div>';
const BODY = '<h2>یک</h2><p>متن.</p><h2>دو</h2><p>متن.</p>';
const cases = [
  ['container + nested title + nested ul', TOC + '<span class="ez-toc-section" id="H1"></span>' + BODY],
  ['no toc at all', BODY],
  ['toc_container variant', '<div id="toc_container" class="toc_container"><p class="toc_title">فهرست</p><ul class="toc_list"><li><a href="#a">یک</a></li></ul></div>' + BODY],
  ['bare nav variant', '<nav class="ez-toc"><ul><li><a href="#a">یک</a></li></ul></nav>' + BODY],
  ['single-quoted attrs', TOC.replace(/"/g, "'") + BODY],
  ['unclosed container (malformed)', '<div id="ez-toc-container"><ul><li>x</li></ul>' + BODY],
  ['two containers', TOC + BODY + TOC],
];
let fail = 0;
for (const [name, html] of cases) {
  const out = stripInjectedToc(html);
  const bodyIntact = out.includes('<h2>یک</h2>') && out.includes('<h2>دو</h2>');
  const balanced = (out.match(/<div/g) || []).length === (out.match(/<\/div>/g) || []).length;
  const survivor = articleHasInjectedToc(out);
  const expectSurvivor = name.includes('malformed');
  /* Malformed input is deliberately left untouched — unbalanced divs are the
     INPUT's, and truncating to the end of the document would eat the article.
     What must happen there is that the diagnostic reports it. */
  const ok = expectSurvivor
    ? bodyIntact && survivor && out === html
    : bodyIntact && balanced && !survivor;
  if (!ok) fail++;
  console.log(
    (ok ? 'PASS ' : 'FAIL ') + name.padEnd(36),
    'survivor=' + String(survivor).padEnd(6),
    'bodyIntact=' + String(bodyIntact).padEnd(6),
    'divsBalanced=' + String(balanced).padEnd(6),
    'len ' + html.length + '->' + out.length,
  );
}
if (fail) {
  console.error(`\n\u2717 ${fail} of ${cases.length} scanner cases failed\n`);
  process.exit(1);
}
console.log(`\n\u2713 all ${cases.length} injected-ToC cases pass\n`);

/*
  ── wrapBodyTables ───────────────────────────────────────────────────────

  The case that matters is the nested one. A non-greedy
  `<table[\s\S]*?</table>` closes the OUTER table at the INNER closing tag, so
  the wrapper's `</div>` lands in the middle of the outer table — inside a
  <td>, where the parser moves it out and leaves the rest of the table
  unwrapped. Nested tables are not hypothetical in a WordPress edited since
  2019: a pasted email signature and a classic-editor layout column both
  produce one.

  Table counts have to be preserved exactly. A scanner that drops or
  duplicates a table is worse than one that wraps nothing, and both failures
  render as "a table looks slightly wrong" rather than as an error.
*/
const TABLE = '<table><thead><tr><th>الف</th><th>ب</th></tr></thead><tbody><tr><td>۱</td><td>۲</td></tr></tbody></table>';
const NESTED = '<table><tbody><tr><td>' + TABLE + '</td></tr></tbody></table>';

const tableCases = [
  ['no table at all', '<p>متن.</p>', 0, 0],
  ['one bare table', '<p>پیش</p>' + TABLE + '<p>پس</p>', 1, 1],
  ['two tables', TABLE + '<p>میان</p>' + TABLE, 2, 2],
  ['nested table wraps once, at the outside', NESTED, 2, 1],
  ['core/table figure wrapper', '<figure class="wp-block-table">' + TABLE + '</figure>', 1, 1],
  ['uppercase tag', TABLE.replace(/table/g, 'TABLE'), 1, 1],
  ['attributes on the tag', TABLE.replace('<table>', '<table class="x" style="width:900px">'), 1, 1],
  ['unclosed table (malformed)', '<table><tr><td>۱</td></tr>' + '<p>ادامه</p>', 1, 0],
];

let tableFail = 0;
for (const [name, html, expectTables, expectWraps] of tableCases) {
  const out = wrapBodyTables(html);
  const tables = (out.match(/<table/gi) || []).length;
  const wraps = (out.match(/data-table-scroll/g) || []).length;
  const closes = (out.match(/<\/div>/g) || []).length;
  const malformed = name.includes('malformed');

  /* Malformed input comes back byte-identical: an unbalanced table is the
     INPUT's problem, and wrapping to the end of the document would put the
     rest of the article inside a scroll box. */
  const ok = malformed
    ? out === html
    : tables === expectTables && wraps === expectWraps && closes === expectWraps;

  if (!ok) tableFail++;
  console.log(
    (ok ? 'PASS ' : 'FAIL ') + name.padEnd(38),
    'tables=' + String(tables).padEnd(4),
    'wraps=' + String(wraps).padEnd(4),
    'closingDivs=' + String(closes).padEnd(4),
  );
}

if (tableFail) {
  console.error(`\n\u2717 ${tableFail} of ${tableCases.length} table-wrap cases failed\n`);
  process.exit(1);
}
console.log(`\n\u2713 all ${tableCases.length} table-wrap cases pass\n`);
