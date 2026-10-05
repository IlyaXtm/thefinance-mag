import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardFootMeta, CardKicker } from './CardMeta';
import { cardDek } from '../lib/card';
import type { ArticleSummary } from '../types/mag.types';
import { bidiTitle } from '../lib/bidi-title';
import { heroAspectRatios } from '../lib/hero-ratio';

/**
 * The lead card: image on top at the artwork's own proportions, text below.
 *
 * ── THE TEXT USED TO SIT ON THE IMAGE, and the team asked for it off ────────
 *
 * Bottom-aligned over a scrim, which is a fine pattern for photography and the
 * wrong one for this archive: most featured images carry their headline baked
 * into the artwork, so the card printed the title twice, one on top of the
 * other, and the two collided (reported 2026-10-05 with a screenshot of
 * «توصیه‌های وارن بافت»). No scrim strength fixes two texts in one place.
 *
 * So the image gets its own box and the text gets the card surface. That also
 * retires the on-media token swap — the text is on the theme's own surface in
 * every theme now.
 *
 * ── The box takes the IMAGE'S ratio, not a chosen one ───────────────────────
 *
 * With nothing overlaid, cropping is the only way to lose the baked-in
 * headline, and the archive is two shapes — 1376×768 (1.79) and 1200×800
 * (1.50), 76 of 100 measured. Any fixed box crops one of them. The ratio comes
 * from `mediaDetails`, so it is known at render and CLS stays 0 — the same
 * guarantee the article hero gets from the same helper, with its mobile floor
 * (1.5) because this column is never the 1360px full-bleed that floor guards.
 *
 * THE LCP ELEMENT on the home page, so its image is the one `priority` request.
 *
 * One link wrapping the whole card, whose accessible name is the title. No
 * `aria-label` duplicating it, and the chip is a plain span, not a nested link.
 */
export function HeroFeature({ article }: { article: ArticleSummary }) {
  const dek = cardDek(article);
  const image = article.featuredImage;

  return (
    <article
      /* `data-hero-card`: MediaErrorGuard's hook. An image that 404s at
         runtime marks the card, and the stylesheet drops the media box — so a
         failed image reads exactly like an article that never had one. */
      data-hero-card=""
      className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none"
    >
      {image && (
        <div
          data-hero-media=""
          className="relative"
          style={{ aspectRatio: heroAspectRatios(image).mobile }}
        >
          <CardImage
            image={image}
            /* The 1.45fr column of the 1224px container is ~650px. */
            sizes="(max-width: 1023px) 100vw, 660px"
            priority
            rounded="rounded-t-card"
          />
        </div>
      )}

      {/* The team's card order (2026-10-05): badge → title → two-line
          summary → date · reading time, the title the only bold, heading-size
          thing on the card. No author on cards; it is on the article. */}
      {/*
        TIGHTER, AT THE TEAM'S REQUEST (2026-10-05): «ارتفاع اینو کم کن —
        بخشی که نوشته‌ها اومده کوچیکتر بشه». The text block was ~360px under
        the image — a 27px title over three lines, a two-line summary at 17px,
        32px padding. Now 24px (the h1 step, still the card's largest text),
        one summary line, 24px padding: about 130px shorter, and the side
        cards, which stretch to the lead, come down with it.
      */}
      <div className="flex flex-1 flex-col gap-2.5 p-5 md:p-6">
        <CardKicker article={article} variant="solid" />

        <h2 className="text-h1 font-bold tracking-[-0.3px] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h2>

        {dek && (
          <p className="line-clamp-1 max-w-[60ch] text-[15px] font-light leading-[1.85] text-text-secondary">
            {dek}
          </p>
        )}

        <CardFootMeta article={article} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

/**
 * The three cards beside the lead: a thumbnail and the title, as a row.
 *
 * Three, per the team's masthead brief (2026-10-05): «یک مقاله Featured بزرگ و
 * ۲ یا ۳ مطلب مهم کنار آن».
 *
 * ── A ROW AGAIN, AND NOT THE ROW THAT BROKE ─────────────────────────────────
 *
 * The first row version cropped the artwork into a sliver: its thumbnail was
 * a fixed WIDTH stretched to the card's full HEIGHT, so a 150px-wide box went
 * 330px tall and `object-cover` cut the landscape image to a strip. Here the
 * thumbnail has a fixed width and the ARTWORK'S OWN RATIO for its height
 * (`heroAspectRatios`), and it is centred in the card rather than stretched
 * by it. A taller card gains space around the thumbnail, never inside it, so
 * the baked-in headline is never cut.
 */
export function HeroSideCard({ article }: { article: ArticleSummary }) {
  const image = article.featuredImage;

  return (
    /* No overflow-hidden: the image clips itself, so the title link's focus
       ring is never cut by the card's corner radius. */
    <article className="group relative flex items-center gap-4 rounded-card border border-border-subtle bg-surface-raised p-4 transition-colors duration-150 hover:border-accent motion-reduce:transition-none">
      {image && (
        <div
          className="w-[120px] shrink-0 sm:w-[168px]"
          style={{ aspectRatio: heroAspectRatios(image).mobile }}
        >
          <CardImage image={image} sizes="168px" rounded="rounded-lg" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <CardKicker article={article} />

        <h3 className="text-[16px] font-bold leading-[1.65] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        <CardFootMeta article={article} />
      </div>
    </article>
  );
}
