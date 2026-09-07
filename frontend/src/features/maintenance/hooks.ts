import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { Page } from '@/types/api'
import {
  createMaintenanceHistory,
  getMaintenanceHistories,
  getServerMaintenanceHistories,
  type MaintenanceListApiParams,
} from './api'
import type {
  MaintenanceHistoryCreateBody,
  MaintenanceHistoryDetail,
  MaintenanceHistorySummary,
} from './types'

/** SC-04 内の履歴セクション。 */
export function useServerMaintenanceHistoriesQuery(serverId: number, page: number, size: number) {
  return useQuery<Page<MaintenanceHistoryDetail>, ApiError>({
    queryKey: [...queryKeys.servers.detailMaintenance(serverId), { page, size }],
    queryFn: () => getServerMaintenanceHistories(serverId, { page: page - 1, size }),
    placeholderData: (prev) => prev,
  })
}

/** SC-07 全サーバー横断の履歴一覧。 */
export function useMaintenanceHistoriesQuery(params: MaintenanceListApiParams) {
  return useQuery<Page<MaintenanceHistorySummary>, ApiError>({
    queryKey: queryKeys.maintenanceHistories.list(params),
    queryFn: () => getMaintenanceHistories(params),
    placeholderData: (prev) => prev,
  })
}

/** SC-08 履歴登録（登録のみ。編集・削除はない）。 */
export function useCreateMaintenanceHistoryMutation() {
  const queryClient = useQueryClient()
  return useMutation<MaintenanceHistoryDetail, ApiError, MaintenanceHistoryCreateBody>({
    mutationFn: createMaintenanceHistory,
    onSuccess: (_created, body) => {
      // 06-ui §5.2: 履歴一覧 / 該当サーバーの履歴 / ダッシュボード集計
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceHistories.all() })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.servers.detailMaintenance(body.serverId),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() })
    },
  })
}
