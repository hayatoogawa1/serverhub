import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { Page } from '@/types/api'
import { getServer, getServers } from './api'
import { toApiParams, type ServerListParams } from './searchParams'
import type { ServerDetail, ServerSummary } from './types'

/** SC-03 一覧。`params` はそのまま queryKey に含める（06-ui §5.1）。 */
export function useServersQuery(params: ServerListParams) {
  const apiParams = toApiParams(params)
  return useQuery<Page<ServerSummary>, ApiError>({
    queryKey: queryKeys.servers.list(apiParams),
    queryFn: () => getServers(apiParams),
    placeholderData: (prev) => prev, // ページ送り・絞り込み時に一覧をちらつかせない
  })
}

/** SC-04 詳細。`version` を含み、FE-3 の編集フォーム初期値にも使う。 */
export function useServerQuery(id: number) {
  return useQuery<ServerDetail, ApiError>({
    queryKey: queryKeys.servers.detail(id),
    queryFn: () => getServer(id),
    retry: (failureCount, error) => error.status !== 404 && failureCount < 1,
  })
}
