import Link from 'next/link';

/**
 * The category pill.
 *
 * Two fills, both from the design:
 *   `soft` — `--accent-soft` background with accent text. The card default.
 *   `solid` — accent fill with `--accent-contrast` text. The hero, where it
 *             sits on an image and needs to hold its own.
 *
 * The soft variant's background is decorative: the accent TEXT carries the
 * contrast (6.84 on surface), so the fill never has to clear a ratio itself.
 */
export function CategoryChip({
  name,
  href,
  variant = 'soft',
  className = '',
}: {
  name: string;
  href?: string;
  variant?: 'soft' | 'solid';
  className?: string;
}) {
  const base =
    'inline-flex items-center rounded-full px-3 py-1 text-[12px] font-medium leading-none';
  const fill =
    variant === 'solid'
      ? 'bg-accent text-accent-contrast'
      : 'bg-accent-soft text-accent';
  const classes = `${base} ${fill} ${className}`;

  /* Inside the hero the whole card is already one link, so the chip is a
     label rather than a nested anchor — nesting them is invalid HTML and
     gives the card two accessible names. */
  if (!href) return <span className={classes}>{name}</span>;

  return (
    <Link href={href} className={`${classes} transition-colors hover:brightness-110`}>
      {name}
    </Link>
  );
}
