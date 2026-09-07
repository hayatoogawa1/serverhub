import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type {
  MaintenanceHistoryCreateBody,
  MaintenanceHistoryDetail,
  MaintenanceHistorySummary,
  MaintenanceListApiParams,
} from '@/types/maintenance'

interface ServerMaintenanceParams {
  page: number // 0 始まり
  size: number
}

/** メンテナンス履歴 API（02-api §3.4、FR-MNT-01〜03）。登録・参照のみ（編集・削除 API は無い）。 */
export interface MaintenanceApi {
  /** 特定サーバーの履歴（`GET /servers/{id}/maintenance-histories`、実施日降順）。対象が不存在・削除済みなら 404。 */
  getServerHistories(
    serverId: number,
    params: ServerMaintenanceParams,
  ): Promise<Page<MaintenanceHistoryDetail>>
  /** 全サーバー横断の履歴一覧（`GET /maintenance-histories`）。 */
  getHistories(params: MaintenanceListApiParams): Promise<Page<MaintenanceHistorySummary>>
  /** 登録（`POST /maintenance-histories`）。201 + 詳細。対象サーバーが不存在・削除済みなら 404。 */
  createHistory(body: MaintenanceHistoryCreateBody): Promise<MaintenanceHistoryDetail>
}

class MaintenanceApiImpl implements MaintenanceApi {
  async getServerHistories(
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

  async getHistories(params: MaintenanceListApiParams): Promise<Page<MaintenanceHistorySummary>> {
    try {
      const { data } = await apiClient.get<Page<MaintenanceHistorySummary>>(
        '/maintenance-histories',
        { params },
      )
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async createHistory(body: MaintenanceHistoryCreateBody): Promise<MaintenanceHistoryDetail> {
    try {
      const { data } = await apiClient.post<MaintenanceHistoryDetail>(
        '/maintenance-histories',
        body,
      )
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const maintenanceApi: MaintenanceApi = new MaintenanceApiImpl()
