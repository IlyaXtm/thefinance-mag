import { timingSafeEqual } from 'node:crypto';

/**
 * The shared secret between WordPress and this app.
 *
 * SERVER-ONLY. Never `NEXT_PUBLIC_`, or it is inlined into the client bundle
 * and anyone viewing source can enable draft mode and read unpublished
 * articles. Set in `wp-config.php` on the CMS side and in the container's env
 * file here — in `wp-config.php` rather than the database so it never appears
 * in a dump or an export.
 */
const SECRET =
  process.env.WP_PREVIEW_SECRET ?? process.env.TF_MAG_PREVIEW_SECRET ?? '';

export function hasPreviewSecret(): boolean {
  return SECRET.length > 0;
}

/** The secret, for forwarding to `magPreview`. Never send it to a client. */
export function previewSecret(): string {
  return SECRET;
}

/**
 * Constant-time comparison.
 *
 * `===` on secrets returns as soon as two bytes differ, so response time leaks
 * how many leading characters were right and the secret can be recovered a
 * character at a time. `timingSafeEqual` always reads both buffers fully.
 *
 * It THROWS on a length mismatch, which would leak the length through an
 * exception — so both sides are hashed to a fixed width first, and the
 * comparison is over the digests.
 */
export function matchesPreviewSecret(candidate: string | null): boolean {
  if (!SECRET || !candidate) return false;

  const a = sha256(candidate);
  const b = sha256(SECRET);

  return timingSafeEqual(a, b);
}

function sha256(value: string): Buffer {
  /* Required lazily so this module can be imported where crypto is present but
     the hash is not needed. */
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require('node:crypto') as typeof import('node:crypto');
  return createHash('sha256').update(value, 'utf8').digest();
}
