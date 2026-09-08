import Image from 'next/image';
import Link from 'next/link';
import type { Author } from '../types/mag.types';
import { imageSrc } from '../lib/site';

/**
 * Author box.
 *
 * ONE component, two sizes — `inline` after an article, `page` on the author
 * archive. Not two components: the difference is scale, and duplicating them
 * means they drift.
 *
 * No follower counts, no article-count boasting, no superlatives. The role is
 * factual («تحلیل‌گر بازار سرمایه»), never «بهترین تحلیل‌گر». Social proof is
 * exactly the mechanic the competitive category runs on and the brand doesn't.
 *
 * A missing avatar falls back to an initial and keeps the box height stable,
 * so a page of authors doesn't go ragged.
 *
 * On the author's own page the name is the page's <h1> and is NOT a link:
 * every page needs exactly one h1, and linking to the page you are already on
 * is a wasted tab stop — the same rule the breadcrumb trail applies to its
 * last item.
 */
export function AuthorBox({
  author,
  size = 'inline',
  isCurrentPage = false,
}: {
  author: Author;
  size?: 'inline' | 'page';
  /** True on /author/<slug> itself: renders the name as the page's h1. */
  isCurrentPage?: boolean;
}) {
  const px = size === 'page' ? 80 : 56;
  const pxMobile = size === 'page' ? 64 : 48;

  return (
    <div className="flex items-start gap-4 rounded-card border border-border-subtle bg-surface-raised p-4">
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-surface"
        style={{ width: pxMobile, height: pxMobile }}
      >
        {author.avatar ? (
          <Image
            src={imageSrc(author.avatar.url)}
            alt={author.avatar.alt}
            fill
            sizes={`${px}px`}
            className="object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-lg text-text-muted"
          >
            {author.name.trim().charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        {isCurrentPage ? (
          <h1 className="text-[24px] font-bold leading-[1.5] text-text-primary md:text-[28px]">
            {author.name}
          </h1>
        ) : (
          <Link
            href={`/author/${author.slug}`}
            className="font-semibold text-text-primary transition-colors hover:text-accent"
          >
            {author.name}
          </Link>
        )}
        {author.role && <p className="mt-0.5 text-[13px] text-text-muted">{author.role}</p>}
        {author.bio && (
          <p className="mt-2 line-clamp-3 text-[14px] leading-[1.8] text-text-secondary">
            {author.bio}
          </p>
        )}
      </div>
    </div>
  );
}
