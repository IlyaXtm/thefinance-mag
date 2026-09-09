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
  /* `min-h-7`: the chip measured 20px, under WCAG 2.2 SC 2.5.8's 24px floor.
     On a card it is a passive label and exempt from the 44px rule, but in the
     article header it is a real link and the article's primary navigational
     claim — so the shared component takes the larger box and the cards get it
     too. Still short of 44; see the note in Breadcrumbs.tsx, which is the same
     open question. */
  const base =
    'inline-flex min-h-7 items-center rounded-full px-3 py-1 text-[12px] font-medium leading-none';
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
