'use client';

import useSWR from 'swr';

import { getArticle } from '../api/v1/mag.service';
import { magKeys } from './keys';
import type { Article } from '../types/mag.types';

/** Pass a null slug to skip the request. */
export function useMagArticle(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Article>(
    slug ? magKeys.article(slug) : null,
    () => getArticle(slug as string),
    { revalidateOnFocus: false },
  );

  return {
    article: data ?? null,
    isLoading,
    error: error as Error | undefined,
    refresh: mutate,
  };
}
