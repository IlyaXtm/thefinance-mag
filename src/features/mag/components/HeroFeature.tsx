import Link from 'next/link';
import { CardImage } from './CardImage';
import { CardFootMeta, CardKicker } from './CardMeta';
import { cardAspect, cardCategory, imageFit } from '../lib/card';
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
            /* The 1.25fr column of the 1224px container is ~600px. */
            sizes="(max-width: 1023px) 100vw, 620px"
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

        Home v2 (2026-10-08): no summary at all — badge, title, meta — and
        tighter padding, so the lead and the 2×2 beside it end level.
      */}
      <div className="flex flex-1 flex-col gap-2 px-6 py-5">
        <CardKicker article={article} variant="solid" />

        <h2 className="text-h1 font-bold tracking-[-0.3px] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h2>

        <CardFootMeta article={article} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

/**
 * One of the four beside the lead — home v2's 2×2 (handoff 2026-10-08).
 *
 * Image on top, then a plain category label (not a pill: four pills beside
 * the lead's solid one read as a row of buttons), a three-line title and the
 * meta. EVERY card carries all three: a title-only card stretched by
 * `auto-rows-fr` left ~60px of empty space under it (the handoff's verified
 * defect).
 *
 * The image box is the artwork's own shape (`cardAspect`), not the handoff's
 * 16:9: these are lessons, which are 3:2, and a 16:9 box would put every one of
 * them on the blurred-margin branch of `imageFit`.
 */
export function HeroQuadCard({ article }: { article: ArticleSummary }) {
  const aspect = cardAspect(article);

  return (
    <article className="group relative flex flex-col rounded-card border border-border-subtle bg-surface-raised transition-colors duration-150 hover:border-accent motion-reduce:transition-none">
      <div style={{ aspectRatio: aspect }}>
        <CardImage
          image={article.featuredImage}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 270px"
          rounded="rounded-t-card"
          fit={imageFit(article.featuredImage, aspect)}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-3.5 py-3">
        <span className="text-[12px] font-medium text-accent">{cardCategory(article).name}</span>

        <h3 className="line-clamp-3 text-[14.5px] font-bold leading-[1.65] text-text-primary [text-wrap:pretty]">
          <Link href={`/${article.slug}`} className="before:absolute before:inset-0">
            {bidiTitle(article.title)}
          </Link>
        </h3>

        <CardFootMeta article={article} className="mt-auto pt-1" />
      </div>
    </article>
  );
}
