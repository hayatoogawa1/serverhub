import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloudApi } from '@/api/cloud'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { CloudLink, CloudLinkBody, CloudRefreshSummary } from '@/types/cloud'
import type { ServerDetail } from '@/types/server'

/**
 * cloud-link は独立クエリを持たず、`servers.detail(id)` レスポンスの `cloudLink` フィールドに含まれる。
 * mutation 後は詳細を更新し、一覧のバッジ（`cloudState`）のために `servers` も invalidate する。
 */
function applyCloudLink(
  queryClient: ReturnType<typeof useQueryClient>,
  serverId: number,
  cloudLink: CloudLink | null,
) {
  queryClient.setQueryData<ServerDetail>(queryKeys.servers.detail(serverId), (old) =>
    old ? { ...old, cloudLink } : old,
  )
  void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() })
}

/** 紐付けの作成 / 置換。 */
export function useSetCloudLinkMutation(serverId: number) {
  const queryClient = useQueryClient()
  return useMutation<CloudLink, ApiError, CloudLinkBody>({
    mutationFn: (body) => cloudApi.setCloudLink(serverId, body),
    onSuccess: (cloudLink) => applyCloudLink(queryClient, serverId, cloudLink),
  })
}

/** 紐付けの解除。 */
export function useDeleteCloudLinkMutation(serverId: number) {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () => cloudApi.deleteCloudLink(serverId),
    onSuccess: () => applyCloudLink(queryClient, serverId, null),
  })
}

/**
 * 「今すぐ更新」。AWS 取得失敗でも 200 でキャッシュ値 + `lastError` が返るので `onSuccess` で扱う。
 * `mutation.isPending` を見て二重送信を防ぐのは呼び出し側の責務。
 */
export function useRefreshCloudStateMutation(serverId: number) {
  const queryClient = useQueryClient()
  return useMutation<CloudLink, ApiError, void>({
    mutationFn: () => cloudApi.refreshCloudState(serverId),
    onSuccess: (cloudLink) => applyCloudLink(queryClient, serverId, cloudLink),
  })
}

/**
 * 一覧からの一括更新。成功後は一覧を invalidate してチップ（`cloudState`）を最新化する。
 * 個別の AWS 失敗でも 200（`failed` に計上）なので `onSuccess` で扱う。provider 未設定は 503。
 * 二重送信の防止（`isPending`）は呼び出し側の責務。
 */
export function useRefreshAllCloudStatesMutation() {
  const queryClient = useQueryClient()
  return useMutation<CloudRefreshSummary, ApiError, void>({
    mutationFn: () => cloudApi.refreshAllCloudStates(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.all() })
    },
  })
}
