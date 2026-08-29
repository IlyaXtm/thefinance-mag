'use client';

import { useEffect, useState } from 'react';
import { headingId as tocId } from '../lib/sanitize';
import { toPersianDigits } from '../lib/format';

/**
 * The left rail on the post page: table of contents plus reading progress.
 *
 * ONE COMPONENT, not two, because they answer the same question from opposite
 * ends — "what is in this?" and "how much is left?" — and both derive from the
 * same scroll position, so splitting them would mean two scroll listeners.
 *
 * A client component only for that. The article body and everything indexable
 * stays server-rendered.
 *
 * The sticky rail is an xl-and-up thing. Between 1024 and 1279 the post page
 * is two columns and this becomes the `<details>` disclosure above the
 * article — a 260px rail there would leave the article ~299px wide.
 *
 * Ids come from `headingId()` in lib/sanitize, the same function that stamps
 * them onto the body. If the two ever derive ids differently the anchors go
 * nowhere and the highlight never fires — and nothing errors, which is why
 * they share the function rather than agreeing by convention.
 */
export function ArticleAside({ headings }: { headings: string[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const elements = headings
      .map((text, i) => document.getElementById(tocId(text, i)))
      .filter((el): el is HTMLElement => el !== null);

    /*
      rootMargin pulls the detection band to roughly the top third. Without it
      a heading only becomes active once it touches the very top, so the
      highlight lags a full section behind the reader.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -66% 0px', threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));

    /*
      Progress is measured against the ARTICLE BODY, not the document: the
      footer and the related grid are not part of the read, and counting them
      makes the bar stall at ~70% exactly when the reader finishes.

      `[data-article-body]` rather than `article` — cards are `<article>`
      elements, so the bare selector matched a related-post card and the bar
      tracked that card's geometry. It rendered perfectly and was simply
      wrong, which is why this is measured rather than eyeballed.

      rAF-throttled — a raw scroll handler runs far more often than a frame can
      paint, and this is the one piece of per-scroll work on the page.
    */
    const article = document.querySelector('[data-article-body]');
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!article) return;

      const { top, height } = article.getBoundingClientRect();
      const scrolled = -top;
      const readable = height - window.innerHeight;

      if (readable <= 0) {
        setProgress(scrolled >= 0 ? 100 : 0);
        return;
      }

      setProgress(Math.min(100, Math.max(0, Math.round((scrolled / readable) * 100))));
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [headings]);

  /* Fewer than two headings tells the reader nothing and takes the space of
     something that would. */
  if (headings.length < 2) return null;

  const links = headings.map((text, i) => {
    const id = tocId(text, i);
    const isActive = id === activeId;

    return (
      <li key={id}>
        <a
          href={`#${id}`}
          aria-current={isActive ? 'true' : undefined}
          className={`block rounded-lg px-3 py-2 text-[13.5px] leading-[1.7] transition-colors ${
            isActive
              ? 'bg-surface-hover text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {text}
        </a>
      </li>
    );
  });

  return (
    <>
      {/* Desktop rail. */}
      <nav
        aria-label="در این مطلب می‌خوانید"
        className="sticky top-[76px] hidden rounded-card border border-border-subtle bg-surface-raised p-5 xl:block"
      >
        <p className="mb-3.5 text-[14px] font-semibold text-text-primary">
          در این مطلب می‌خوانید
        </p>

        {/* Capped with internal scroll: a 41-minute read has enough headings to
            stretch past the viewport and defeat the sticky behaviour this
            exists for. */}
        <ul className="max-h-[calc(100vh-16rem)] space-y-0.5 overflow-y-auto">{links}</ul>

        <div className="mt-4 border-t border-border-subtle pt-4">
          <p className="text-[12.5px] leading-[1.7] text-text-muted">
            پیشرفت مطالعه {toPersianDigits(progress)}٪
          </p>
          <div
            aria-hidden="true"
            className="mt-2 h-1 overflow-hidden rounded-full bg-surface-hover"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </nav>

      {/* Mobile: native disclosure, closed by default, no custom JS. */}
      <details className="rounded-card border border-border-subtle bg-surface-raised px-4 py-3 xl:hidden">
        <summary className="cursor-pointer list-none text-[14px] font-semibold text-text-primary">
          در این مطلب می‌خوانید
        </summary>
        <ul className="mt-3 max-h-[50vh] space-y-0.5 overflow-y-auto">{links}</ul>
      </details>
    </>
  );
}
