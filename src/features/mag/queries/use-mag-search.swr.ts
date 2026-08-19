'use client';

import useSWR from 'swr';

import { searchArticles } from '../api/v1/mag.service';
import { magKeys } from './keys';
import type { SearchResult } from '../types/mag.types';

/**
 * Search is the one genuinely client-interactive view, so SWR is the right
 * tool here rather than a server component.
 *
 * An empty query is NOT an error — it's the "no query" state, and the hook
 * reports it distinctly so the page can render the prompt instead of a
 * "not found" message.
 */
export function useMagSearch(query: string, page = 1, perPage = 9) {
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const { data, error, isLoading } = useSWR<SearchResult>(
    hasQuery ? magKeys.search({ query: trimmed, page, perPage }) : null,
    () => searchArticles({ query: trimmed, page, perPage }),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  return {
    results: data?.items ?? [],
    pagination: data ?? null,
    query: trimmed,
    hasQuery,
    isLoading: hasQuery && isLoading,
    error: error as Error | undefined,
    isEmpty: hasQuery && !isLoading && !error && (data?.items.length ?? 0) === 0,
  };
}
