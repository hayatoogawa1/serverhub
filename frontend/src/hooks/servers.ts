import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serversApi } from '@/api/servers'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { Page } from '@/types/api'
import type {
  ServerCreateBody,
  ServerDetail,
  ServerSummary,
  ServerUpdateBody,
} from '@/types/server'
import { toServerListApiParams, type ServerListParams } from '@/url/serverListParams'

/** SC-03 一覧。`params` はそのまま queryKey に含める（06-ui §5.1）。 */
export function useServersQuery(params: ServerListParams) {
  const apiParams = toServerListApiParams(params)
  return useQuery<Page<ServerSummary>, ApiError>({
    queryKey: queryKeys.servers.list(apiParams),
    queryFn: () => serversApi.getServers(apiParams),
    placeholderData: (prev) => prev, // ページ送り・絞り込み時に一覧をちらつかせない
  })
}

/** SC-04 詳細。`version` を含み、編集フォームの初期値にも使う。 */
export function useServerQuery(id: number, enabled = true) {
  return useQuery<ServerDetail, ApiError>({
    queryKey: queryKeys.servers.detail(id),
    queryFn: () => serversApi.getServer(id),
    enabled: enabled && id > 0,
    retry: (failureCount, error) => error.status !== 404 && failureCount < 1,
  })
}

/** サーバー登録・編集・削除の後に無効化するキー（06-ui §5.2）。 */
function invalidateAfterServerMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: number,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() })
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() })
  void queryClient.invalidateQueries({ queryKey: ['tags', 'suggest'] })
  if (id != null) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.servers.detail(id) })
  }
}

/** SC-05 登録。成功で作成された詳細を返す（呼び出し側が詳細へ遷移）。 */
export function useCreateServerMutation() {
  const queryClient = useQueryClient()
  return useMutation<ServerDetail, ApiError, ServerCreateBody>({
    mutationFn: (body) => serversApi.createServer(body),
    onSuccess: (server) => {
      queryClient.setQueryData(queryKeys.servers.detail(server.id), server)
      invalidateAfterServerMutation(queryClient)
    },
  })
}

/** SC-06 編集。`version` は body に含める（楽観ロック、BR-08）。 */
export function useUpdateServerMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation<ServerDetail, ApiError, ServerUpdateBody>({
    mutationFn: (body) => serversApi.updateServer(id, body),
    onSuccess: (server) => {
      queryClient.setQueryData(queryKeys.servers.detail(id), server)
      invalidateAfterServerMutation(queryClient, id)
    },
  })
}

/** SC-04 からの論理削除。成功で一覧へ遷移（呼び出し側）。 */
export function useDeleteServerMutation(id: number) {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () => serversApi.deleteServer(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.servers.detail(id) })
      invalidateAfterServerMutation(queryClient)
    },
  })
}
