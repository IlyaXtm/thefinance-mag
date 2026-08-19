'use client';

import useSWR from 'swr';

import { getMarkets } from '../api/v1/mag.service';
import { magKeys } from './keys';
import type { Market } from '../types/mag.types';

/** Markets change rarely — cached hard so the filter bar never refetches. */
export function useMagMarkets() {
  const { data, error, isLoading } = useSWR<Market[]>(
    magKeys.markets(),
    () => getMarkets(),
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 300_000 },
  );

  return {
    markets: data ?? [],
    isLoading,
    error: error as Error | undefined,
  };
}
