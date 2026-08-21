import type { Metadata } from 'next';
import { getAuthors } from '@/features/mag/api/v1/mag.service';
import { breadcrumbJsonLd, JsonLdScript } from '@/features/mag/lib/schema';
import { toMetadata } from '@/features/mag/lib/seo';
import { magUrl, MAG_NAME } from '@/features/mag/lib/site';
import { AuthorBox, Breadcrumbs, Section } from '@/features/mag/components';

/** /mag/authors */

export const revalidate = 3600;

export const metadata: Metadata = toMetadata({
  seo: null,
  path: '/authors',
  fallbackTitle: 'نویسندگان',
  fallbackDescription: `نویسندگان ${MAG_NAME}`,
  ogTitle: `نویسندگان | ${MAG_NAME}`,
});

export default async function AuthorsPage() {
  const authors = await getAuthors();

  const crumbs = [
    { name: MAG_NAME, href: '/' },
    { name: 'نویسندگان', href: '/authors' },
  ];

  return (
    <main>
      <JsonLdScript
        data={breadcrumbJsonLd(crumbs.map((c) => ({ name: c.name, url: magUrl(c.href) })))}
      />

      <Section>
        <Breadcrumbs items={crumbs} />

        <h1 className="mt-4 text-[28px] font-bold leading-[1.5] text-text-primary md:text-[34px]">
          نویسندگان
        </h1>

        {/* Reuses AuthorBox at card scale rather than inventing a new component. */}
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {authors.map((author) => (
            <AuthorBox key={author.slug} author={author} />
          ))}
        </div>
      </Section>
    </main>
  );
}
