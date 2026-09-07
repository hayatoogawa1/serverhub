import { apiClient } from '@/api/apiClient'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type { MaintenanceHistoryDetail } from './types'

interface ServerMaintenanceParams {
  page: number // 0 始まり
  size: number
}

/**
 * 特定サーバーの履歴（Backend `GET /servers/{id}/maintenance-histories`、実施日降順、FR-MNT-03）。
 * 対象サーバーが不存在・削除済みなら 404 `RESOURCE_NOT_FOUND`（D-MNT-02）。
 */
export async function getServerMaintenanceHistories(
  serverId: number,
  params: ServerMaintenanceParams,
): Promise<Page<MaintenanceHistoryDetail>> {
  try {
    const { data } = await apiClient.get<Page<MaintenanceHistoryDetail>>(
      `/servers/${serverId}/maintenance-histories`,
      { params },
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
