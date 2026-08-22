import { draftMode } from 'next/headers';
import { seeOther } from '@/features/mag/lib/redirect-response';
import { magPath } from '@/features/mag/lib/site';

/**
 * GET /mag/api/exit-draft
 *
 * WHY THIS HAS TO EXIST. Draft Mode is a cookie, and it persists. Without a way
 * out, an editor who previews once keeps getting uncached, unpublished renders
 * on every page for the rest of the session — then reports that the site is
 * broken, or worse, that an article they unpublished is still live.
 *
 * No secret: turning draft mode OFF is not a privileged action, and requiring
 * one would mean the escape hatch fails exactly when someone needs it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const draft = await draftMode();
  draft.disable();

  return seeOther(magPath('/'));
}
