import { useQuery } from '@tanstack/react-query'
import { tagsApi } from '@/api/tags'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'

/**
 * タグ名の前方一致サジェスト。空・空白の `prefix` では API を呼ばない（Backend も空リストを返すが
 * 無駄なリクエストを避ける）。絞り込み（SC-03）とフォーム（SC-05/06）で共用。
 */
export function useTagSuggestQuery(prefix: string) {
  const trimmed = prefix.trim()
  return useQuery<string[], ApiError>({
    queryKey: queryKeys.tags.suggest(trimmed),
    queryFn: () => tagsApi.suggest(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 60_000,
  })
}
