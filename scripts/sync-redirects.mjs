#!/usr/bin/env node
/**
 * Regenerate the compiled redirect fallback from the live CMS.
 *
 *   npm run redirects:sync            # writes src/features/mag/lib/redirects.ts
 *   npm run redirects:sync -- --check # exits 1 if the file is out of date
 *
 * WHY THIS EXISTS. `src/features/mag/lib/redirects.ts` is the floor under
 * middleware when `magRedirects` cannot be reached — which is exactly the
 * situation a cutover creates. It had nine rules while the CMS returned
 * nineteen, so the "fallback" would have dropped ten ranked URLs, several of
 * them historical Persian slugs, in the one moment it exists for. That gap was
 * invisible because nothing compared the two directions; `missingCompiled` on
 * /mag/health now names it, and this script closes it.
 *
 * Transcribing nineteen Persian slugs by hand is how a wrong destination gets
 * into the table, so it is generated rather than typed.
 *
 * TWO RULES ARE NEVER TAKEN FROM THE CMS. Their targets no longer exist as
 * redirect sources in the database, so the CMS cannot supply them and a stale
 * row must not be able to resurrect a 404. They are preserved from the current
 * file verbatim, comments and all, and always win.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ENDPOINT =
  process.env.WP_GRAPHQL_ENDPOINT ?? 'https://wp.thefinance.ir/mag/graphql';
const TARGET = 'src/features/mag/lib/redirects.ts';

/** Rules the CMS cannot supply. Must match CODE_ONLY in redirect-source.ts. */
const CODE_ONLY = [
  'low-risk-investment-funds',
  'introduction-to-persian-tradingview-inchart',
];

const check = process.argv.includes('--check');

function stripSlashes(value) {
  return String(value).replace(/^\/+/, '').replace(/\/+$/, '');
}

/** Persian slugs arrive percent-encoded from some clients; store them decoded. */
function normalise(value) {
  const bare = stripSlashes(value);
  try {
    return decodeURIComponent(bare);
  } catch {
    /* A lone % is not an encoding error worth failing the sync over. */
    return bare;
  }
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '{ magRedirects { from to status } }' }),
});

if (!res.ok) {
  console.error(`magRedirects responded ${res.status} — nothing written.`);
  process.exit(1);
}

const json = await res.json();
if (json.errors?.length) {
  console.error(`GraphQL error: ${json.errors[0].message} — nothing written.`);
  process.exit(1);
}

const nodes = json.data?.magRedirects;
if (!Array.isArray(nodes) || nodes.length === 0) {
  /* Empty is treated as failure for the same reason the runtime does: the
     table is known to be populated, so empty means misconfigured, and
     overwriting a good fallback with nothing is the worst outcome here. */
  console.error('magRedirects returned nothing — refusing to empty the table.');
  process.exit(1);
}

const source = readFileSync(TARGET, 'utf8');

/* Keep the code-only entries exactly as written — they carry the reasoning for
   the 302 on the biggest organic entry point, which must not be regenerated
   into a bare object literal. */
const kept = CODE_ONLY.map((slug) => {
  const at = source.indexOf(`from: '${slug}'`);
  if (at === -1) throw new Error(`code-only rule ${slug} not found in ${TARGET}`);
  const start = source.lastIndexOf('  {', at);
  const end = source.indexOf('\n  },', at) + '\n  },'.length;
  return source.slice(start, end);
});

const fetched = nodes
  .filter((n) => n?.from && n?.to)
  .map((n) => ({
    from: normalise(n.from),
    to: normalise(n.to),
    kind: n.status === 302 ? 'temporary' : 'permanent',
  }))
  .filter((r) => !CODE_ONLY.includes(r.from));

const body = fetched
  .map(
    (r) =>
      `  { from: '${r.from}', to: '${r.to}', kind: '${r.kind}' },`,
  )
  .join('\n');

/*
  Find the array's real boundaries by line, not by searching for `];`.
  The declaration ends with `] as const;` and the file contains other `];`
  sequences inside comments — an earlier version of this script matched one of
  those, kept the old rules in the tail and wrote a file with 28 entries
  instead of 19. Anchor on a line that is nothing but the terminator.
*/
const lines = source.split('\n');
const declAt = lines.findIndex((l) => l.startsWith('export const LEGACY_REDIRECTS'));
if (declAt === -1) throw new Error(`LEGACY_REDIRECTS declaration not found in ${TARGET}`);
const closeAt = lines.findIndex((l, i) => i > declAt && /^\]( as const)?;\s*$/.test(l));
if (closeAt === -1) throw new Error(`LEGACY_REDIRECTS terminator not found in ${TARGET}`);

const head = lines.slice(0, declAt).join('\n');
const declLine = lines[declAt];
const closeLine = lines[closeAt];          // preserves `as const` if present
const tail = lines.slice(closeAt + 1).join('\n');

const generated = `${head}
${declLine}
  /* ---- Generated from the live CMS by scripts/sync-redirects.mjs.
          Do not hand-edit: re-run \`npm run redirects:sync\` instead. ---- */
${body}

  /* ---- Code-only. The CMS cannot supply these; see each note. ---- */
${kept.join('\n')}
${closeLine}
${tail}`;

if (check) {
  if (generated !== source) {
    const live = fetched.length + CODE_ONLY.length;
    const have = (source.match(/from: '/g) ?? []).length;
    console.error(`redirects.ts is out of date: ${have} compiled, ${live} live.`);
    console.error('Run: npm run redirects:sync');
    process.exit(1);
  }
  console.log(`redirects.ts is current (${fetched.length + CODE_ONLY.length} rules).`);
  process.exit(0);
}

writeFileSync(TARGET, generated);
console.log(
  `Wrote ${fetched.length + CODE_ONLY.length} rules to ${TARGET} ` +
    `(${fetched.length} from the CMS, ${CODE_ONLY.length} code-only).`,
);
