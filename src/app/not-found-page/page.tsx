import type { Metadata } from 'next';
import { NotFoundContent } from '@/features/mag/components/NotFoundContent';

/**
 * THE REWRITE TARGET. A reader never types this URL; middleware sends them
 * here, and the address bar keeps the URL they asked for.
 *
 * It exists because `notFound()` thrown at REQUEST time cannot render its
 * boundary into the initial HTML in Next 15.5 — see docs/decisions.md for the
 * six variants that were tested. A static page can, so middleware rewrites to
 * this one with an explicit 404 status and the reader gets a real document
 * with no JavaScript at all.
 *
 * `not-found-page`, not `not-found`: a route segment named `not-found` would
 * collide with the `not-found.tsx` convention in the same directory.
 *
 * NOINDEX AND OUT OF THE SITEMAP. The rewrite preserves the requested URL, so
 * a crawler only ever sees this body under the URL that 404'd. But the path is
 * reachable directly, and a directly-reachable copy of a 404 body returning
 * 200 is a soft 404 — so it carries `noindex` of its own.
 */
export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFoundContent />;
}
