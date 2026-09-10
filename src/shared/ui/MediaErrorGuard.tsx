'use client';

import { useEffect } from 'react';

/**
 * A missing image should leave no trace.
 *
 * ── The defect ─────────────────────────────────────────────────────────
 *
 * A live article rendered the browser's broken-image icon with the alt text
 * `cta_inchart` sitting beside it, and the reader learned that the site is
 * broken. It is not: one upload is missing. The alt text is doing exactly what
 * alt text is for and that is the problem — it is a description of an image for
 * someone who cannot see it, not a caption for a hole in the page.
 *
 * A reader who sees clean text learns nothing, which is correct, because the
 * missing image was never load-bearing.
 *
 * ── Why this is client-side and cannot be anything else ────────────────
 *
 * A 404 on an in-body image is only discoverable in the browser. The HTML is
 * `dangerouslySetInnerHTML` straight from the CMS, so the server never fetches
 * those URLs and cannot know which are dead. The hero goes through the
 * optimizer, which fails in the browser too. There is no server-side answer.
 *
 * ── One listener, at the document, in the CAPTURE phase ────────────────
 *
 * `error` DOES NOT BUBBLE. A listener on a container never sees an image
 * failing inside it — this is the whole reason the naive version of this
 * component does nothing and looks correct. Capture is the only phase that
 * reaches it, hence `true` as the third argument.
 *
 * One document-level listener rather than a wrapper per image: wrappers would
 * mean an extra element around the hero, around every card and inside the
 * article body, and the body's markup is not ours to wrap. It also means
 * listing pages get the same treatment for free.
 *
 * ── The sweep on mount is not optional ─────────────────────────────────
 *
 * Images usually fail BEFORE hydration — the request starts with the HTML and
 * the listener attaches after React takes over, so the `error` event is long
 * gone. A guard that only listens catches almost nothing on a cold load, which
 * is the load that matters. `complete && naturalWidth === 0` is how a finished
 * failure is detected after the fact, and the sweep runs it over everything
 * present at mount.
 *
 * ── Three responses, because the right answer differs by context ───────
 *
 * IN THE ARTICLE BODY → remove the whole figure, caption and all. A caption
 * describing an image nobody can see is worse than silence, and the body's
 * paragraphs close up as though the figure was never there.
 *
 * THE HERO → remove the figure. The article then starts where the hero would
 * have been, which is exactly what happens today when `featuredImage` is null,
 * so a dead image and a missing one look the same to a reader instead of one of
 * them looking like a fault. It is checked BEFORE the card case because the
 * hero renders through `CardImage` and carries its attribute too — see the
 * note at that branch.
 *
 * A CARD THUMBNAIL → fall back to the reserved placeholder, NOT removal. This
 * is the one case where the box must stay: a card in a grid whose neighbours
 * have images needs to keep its shape or the grid reflows, and the v4 review
 * settled that the placeholder is `--surface-hover` with an inset border. So
 * the image is hidden and the placeholder it already sits on becomes visible.
 */

/** Marks a failed card image; the styles live on the wrapper in CardImage. */
const FAILED_ATTR = 'data-image-failed';

function handleFailure(img: HTMLImageElement) {
  /* Idempotent: the sweep and the listener can both reach the same image, and
     on a slow connection an image can fail after a re-render re-runs this. */
  if (img.dataset.mediaHandled) return;
  img.dataset.mediaHandled = '1';

  /*
    THE HERO IS CHECKED FIRST AND THE ORDER IS THE WHOLE FIX.

    The hero renders through `CardImage` like every thumbnail does, so it
    carries `data-card-image` too. Checked in the other order it took the card
    branch, kept its box and painted the placeholder — which is precisely the
    "empty dark rectangle where a featured image would go" that was reported.
    Measured: with the card branch first, the hero figure was still on the page
    at full height with nothing in it.

    A card must keep its box because its neighbours in the grid have images. A
    hero has no neighbours, so there is nothing to hold the row for, and an
    empty full-bleed rectangle is the most conspicuous way to say "broken".
  */
  const hero = img.closest('[data-hero]');
  if (hero) {
    /*
      REMOVING THE FIGURE IS NO LONGER ENOUGH.

      The hero now sits in its own column of the article header's two-column
      grid. Deleting the figure leaves the column's 320px track open and holds
      it open — an empty third of the header, which is exactly the trace this
      guard exists to avoid, in a shape it did not have when the hero was a
      full-width block below the title.

      So the grid is told as well. `data-hero-missing` flips it back to the
      single-column form the no-image branch already renders server-side, and
      the two end up identical: an article whose image 404s looks like an
      article that never had one.
    */
    const grid = hero.closest('[data-hero-grid]');
    hero.remove();
    if (grid) grid.setAttribute('data-hero-missing', '');
    return;
  }

  /*
    THE LEAD CARD, BEFORE THE GENERIC CARD BRANCH — same precedence problem
    the hero had, in a second place.

    HeroFeature renders through CardImage, so without this it takes the card
    branch below: the image is hidden and the wrapper paints the empty-slot
    panel across the whole 812×472 card, under a scrim. That is a very large
    trace for "no image", and `575f922` says a missing image leaves none.

    Server-side the no-image case already renders as a plain text card. This
    makes the RUNTIME failure land in the same state: mark the card, and drop
    `data-on-media` so the white-on-media tokens go with the scrim. Leaving
    them would put white text on a light card surface at about 1.1:1 — the
    fix turning into a worse bug than the defect.
  */
  const heroCard = img.closest('[data-hero-card]');
  if (heroCard) {
    heroCard.setAttribute('data-media-missing', '');
    heroCard.querySelector('[data-on-media]')?.removeAttribute('data-on-media');
    return;
  }

  const card = img.closest('[data-card-image]');
  if (card) {
    img.style.display = 'none';
    card.setAttribute(FAILED_ATTR, '');
    return;
  }

  /* The article body: remove the figure so the caption goes with it. */
  const figure = img.closest('figure');
  if (figure) {
    figure.remove();
    return;
  }

  /* An unwrapped <img> in the body — WordPress emits these for images inserted
     without a caption. Nothing else to take with it. */
  img.remove();
}

export function MediaErrorGuard() {
  useEffect(() => {
    const onError = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement) handleFailure(target);
    };

    /* Capture — see above. Without `true` this listener never fires. */
    document.addEventListener('error', onError, true);

    /* Already-failed images, which on a cold load is most of them. */
    for (const img of document.querySelectorAll('img')) {
      if (img.complete && img.naturalWidth === 0) handleFailure(img);
    }

    return () => document.removeEventListener('error', onError, true);
  }, []);

  return null;
}
