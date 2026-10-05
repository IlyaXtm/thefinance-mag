import { GuideCard } from '@/features/mag/components';
import { magPath } from '@/features/mag/lib/site';
import type { ArticleSummary } from '@/features/mag/types/mag.types';

/**
 * What sits above the chips on «آموزش بازارهای مالی»: the team's search
 * prompt, then the featured guides.
 *
 * «میخواهی چه چیزی یاد بگیری؟» is the input's real <label>, not a heading
 * above it — the question IS the field's name, so a screen reader announces
 * it on focus. The form is a plain GET to /search with `type=education`, so
 * it works without JavaScript and the results stay inside the lessons.
 */
export function EducationLead({ guides }: { guides: ArticleSummary[] }) {
  return (
    <div className="flex flex-col gap-8">
      <form action={magPath('/search')} method="get" className="max-w-[640px]">
        <label
          htmlFor="education-search"
          className="mb-3 block text-h3 font-bold text-text-primary"
        >
          میخواهی چه چیزی یاد بگیری؟
        </label>
        <input type="hidden" name="type" value="education" />
        <div className="flex items-center gap-2">
          <input
            id="education-search"
            name="q"
            type="search"
            placeholder="جستجو در آموزش‌ها..."
            className="min-h-11 w-full min-w-0 flex-1 rounded-full border border-border-interactive bg-surface-raised px-4 text-[15px] text-text-primary placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-full bg-accent px-5 text-[15px] font-semibold text-accent-contrast"
          >
            جستجو
          </button>
        </div>
      </form>

      {/* Only when an editor has tagged one — an empty «راهنماهای جامع»
          heading would promise something the page does not have. */}
      {guides.length > 0 && (
        <section aria-labelledby="guides-heading">
          <h2 id="guides-heading" className="mb-4 text-h2 font-bold text-text-primary">
            راهنماهای جامع
          </h2>
          <div className="flex flex-col gap-4">
            {guides.map((guide) => (
              <GuideCard key={guide.id} article={guide} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
