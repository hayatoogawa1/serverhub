import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query のグローバル設定。
 *
 * - queryKey は階層構造で持つ（例: ['servers', 'list', params] / ['servers', 'detail', id]）。
 * - staleTime / gcTime やリトライ方針は機能実装時に必要に応じて個別調整する。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
