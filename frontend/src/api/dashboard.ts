import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { DashboardSummary } from '@/types/dashboard'

/** ダッシュボード集計 API（02-api §3.5、FR-DASH-01）。入力パラメータなし・読み取り専用。 */
export interface DashboardApi {
  /** サーバー総数 / 環境別 / ステータス別 / タグ別上位10+その他 / 直近メンテ10件。 */
  getSummary(): Promise<DashboardSummary>
}

class DashboardApiImpl implements DashboardApi {
  async getSummary(): Promise<DashboardSummary> {
    try {
      const { data } = await apiClient.get<DashboardSummary>('/dashboard/summary')
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const dashboardApi: DashboardApi = new DashboardApiImpl()
