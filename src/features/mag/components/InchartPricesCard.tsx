import { SidebarCard } from './SidebarCard';

const INCHART_URL = 'https://inchart.thefinance.ir';

/**
 * Where the live prices are — a link, not a price.
 *
 * WHY THIS IS NOT THE PRICE STRIP THAT WAS ASKED FOR (2026-10-05, «مهم‌ترین
 * قیمت اضافه شود», with a screenshot of dollar / gold / coin / BTC tiles and
 * percentage changes). CLAUDE.md's never-build list names it outright: no live
 * price tickers anywhere in Mag. A publication that sells no signals does not
 * print a moving number with a red or green arrow beside its analysis — that
 * is the signal-channel reading the brand book exists to avoid, and
 * `decisions.md` puts market data in InChart for that reason. The team chose
 * this card over the strip when the conflict was put to them.
 *
 * So the reader who wants a price is sent to the product that has them, and
 * the card names what they will find there without showing any of it: no
 * number, no arrow, no colour, no «زنده» badge, no timestamp.
 */
export function InchartPricesCard() {
  return (
    <SidebarCard title="قیمت‌ها و نمودارها">
      <p className="text-[14px] font-light leading-[1.85] text-text-secondary">
        نمودار دلار، طلا، سکه، بیت‌کوین و سایر بازارها را در اینچارت ببینید.
      </p>

      <a
        href={INCHART_URL}
        rel="noopener noreferrer"
        target="_blank"
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-border-interactive px-5 text-[14px] text-text-primary transition-colors hover:border-accent hover:bg-accent-soft"
      >
        رفتن به اینچارت
        <span aria-hidden="true" className="ms-1.5">
          ←
        </span>
      </a>
    </SidebarCard>
  );
}
