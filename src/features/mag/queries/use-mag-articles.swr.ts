'use client';

/**
 * Client-side article list.
 *
 * Prefer calling `mag.service` directly from a server component for anything
 * crawlers must see — SWR hands them an empty shell. Use this hook only for
 * client-interactive views.
 */

import useSWR from 'swr';

import { getArticles } from '../api/v1/mag.service';
import { magKeys } from './keys';
import type { ArticleListParams, ArticleSummary, Paginated } from '../types/mag.types';

export function useMagArticles(params: ArticleListParams = {}) {
  const { data, error, isLoading, mutate } = useSWR<Paginated<ArticleSummary>>(
    magKeys.articles(params),
    () => getArticles(params),
    { revalidateOnFocus: false },
  );

  return {
    articles: data?.items ?? [],
    pagination: data ?? null,
    isLoading,
    error: error as Error | undefined,
    isEmpty: !isLoading && !error && (data?.items.length ?? 0) === 0,
    refresh: mutate,
  };
}
