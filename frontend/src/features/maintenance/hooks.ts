import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { Page } from '@/types/api'
import { getServerMaintenanceHistories } from './api'
import type { MaintenanceHistoryDetail } from './types'

/** SC-04 内の履歴セクション。`enabled` は詳細が 404 でないときだけ呼ぶ用途で呼び出し側が制御。 */
export function useServerMaintenanceHistoriesQuery(
  serverId: number,
  page: number,
  size: number,
  enabled = true,
) {
  return useQuery<Page<MaintenanceHistoryDetail>, ApiError>({
    queryKey: [...queryKeys.servers.detailMaintenance(serverId), { page, size }],
    queryFn: () => getServerMaintenanceHistories(serverId, { page: page - 1, size }),
    enabled,
    placeholderData: (prev) => prev,
  })
}
