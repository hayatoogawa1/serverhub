import { apiClient } from '@/api/apiClient'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type { SortOrder } from '@/components/DataTable'
import type {
  MaintenanceHistoryCreateBody,
  MaintenanceHistoryDetail,
  MaintenanceHistorySummary,
  MaintenanceSortKey,
} from './types'

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

export interface MaintenanceListApiParams {
  serverId?: number
  sort: MaintenanceSortKey
  order: SortOrder
  page: number // 0 始まり
  size: number
}

/** 全サーバー横断の履歴一覧（Backend `GET /maintenance-histories`、FR-MNT-01）。 */
export async function getMaintenanceHistories(
  params: MaintenanceListApiParams,
): Promise<Page<MaintenanceHistorySummary>> {
  try {
    const { data } = await apiClient.get<Page<MaintenanceHistorySummary>>(
      '/maintenance-histories',
      {
        params,
      },
    )
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/**
 * 履歴登録（Backend `POST /maintenance-histories`、FR-MNT-02）。201 + 詳細。
 * 対象サーバーが不存在・削除済みなら 404 `RESOURCE_NOT_FOUND`（BR-06）。編集・削除 API は無い。
 */
export async function createMaintenanceHistory(
  body: MaintenanceHistoryCreateBody,
): Promise<MaintenanceHistoryDetail> {
  try {
    const { data } = await apiClient.post<MaintenanceHistoryDetail>('/maintenance-histories', body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
