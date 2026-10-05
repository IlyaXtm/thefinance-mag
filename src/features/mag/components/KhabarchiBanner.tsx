import { CardImage } from './CardImage';
import { KHABARCHI } from '../lib/site';

/**
 * «خبرچی؛ اخبار لحظه‌ای بازارهای مالی از منابع معتبر جهانی — مشاهده خبرچی ←»
 *
 * Asked for by the team (2026-10-05) for the news page: above the feed or
 * after its first five or six items, «چون User Intent دقیقاً News است» — a
 * reader on the news page is the one reader for whom a live news stream is
 * the next step, which is why this belongs here and not in an article body.
 *
 * The artwork is the team's own banner (see KHABARCHI in site.ts). Its alt is
 * empty on purpose: the banner's words are set beside it as real text, so the
 * link's accessible name is the copy once rather than the copy twice.
 *
 * WHAT IT LEAVES OUT FROM KHABARCHI'S OWN PAGE: the «پخش زنده» pill with its
 * green pulse. On Khabarchi that is the product; inside Mag it is an urgency
 * badge, which the brand list rules out. The banner carries the name, the
 * promise and a link — identity without alarm.
 *
 * One link over the whole block, stretched from the CTA, so it is a single tab
 * stop with a full-size target. Hover is the border colour only.
 */
export function KhabarchiBanner({ layout }: { layout: 'feed' | 'sidebar' }) {
  const image = { ...KHABARCHI.banner, alt: '' };
  const sidebar = layout === 'sidebar';

  return (
    <aside
      aria-label="خبرچی"
      className={`group relative rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none ${
        sidebar ? 'flex flex-col' : 'my-8 flex flex-col gap-4 p-4 sm:flex-row sm:items-center'
      }`}
    >
      <div
        className={sidebar ? '' : 'w-full shrink-0 sm:w-[220px]'}
        style={{ aspectRatio: `${KHABARCHI.banner.width} / ${KHABARCHI.banner.height}` }}
      >
        <CardImage
          image={image}
          sizes={sidebar ? '320px' : '(max-width: 639px) 100vw, 220px'}
          rounded={sidebar ? 'rounded-t-card' : 'rounded-lg'}
        />
      </div>

      <div className={`flex flex-col gap-2 ${sidebar ? 'p-5' : ''}`}>
        <p className="text-[15px] font-bold leading-[1.7] text-text-primary">
          خبرچی؛ اخبار لحظه‌ای بازارهای مالی از منابع معتبر جهانی
        </p>
        <a
          href={KHABARCHI.url}
          className="inline-flex min-h-11 items-center self-start text-[14px] text-accent transition-colors before:absolute before:inset-0 group-hover:text-text-primary"
        >
          مشاهده خبرچی
          <span aria-hidden="true" className="ms-1">
            ←
          </span>
        </a>
      </div>
    </aside>
  );
}
