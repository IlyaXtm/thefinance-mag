import type { Market } from '../types/mag.types';

type Variant = 'passive' | 'interactive' | 'selected';

/**
 * Market label.
 *
 * Background is transparent in every unselected state so the chip looks
 * identical on a card (over --surface-raised) and in a filter bar (over
 * --surface). One component, one appearance.
 *
 * Border weight is the only difference between passive and interactive:
 *   passive     → --border-subtle. A label, not a control. Exempt from the
 *                 3:1 requirement and from the 44px touch target.
 *   interactive → --border-interactive. A control whose border is its only
 *                 boundary, so it must clear 3:1. --border-subtle measures
 *                 1.28 in the light theme, which is why the extra token exists.
 */
export function MarketChip({
  market,
  variant = 'passive',
  className = '',
}: {
  market: Market;
  variant?: Variant;
  className?: string;
}) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-[1.6] whitespace-nowrap border';

  const variants: Record<Variant, string> = {
    passive: 'bg-transparent border-border-subtle text-text-secondary',
    interactive: 'bg-transparent border-border-interactive text-text-secondary',
    selected: 'bg-accent border-accent text-accent-contrast',
  };

  return <span className={`${base} ${variants[variant]} ${className}`}>{market.name}</span>;
}
