import type { MaintenanceType } from '@/types/domain'

/**
 * サーバー詳細内の履歴 1 件（Backend `MaintenanceHistoryDetailResponse`）。
 * `GET /servers/{id}/maintenance-histories` と登録レスポンスで共通。作業内容など詳細項目を含む。
 */
export interface MaintenanceHistoryDetail {
  id: number
  performedDate: string
  type: MaintenanceType
  worker: string
  content: string
  impact: string | null
  result: string | null
  createdAt: string
}

/**
 * 全サーバー横断の履歴一覧 1 行（Backend `MaintenanceHistorySummaryResponse`）。
 * content / impact / result は含まれない。FE-4（SC-07）で使用。
 */
export interface MaintenanceHistorySummary {
  id: number
  serverId: number
  serverHostname: string
  serverDeleted: boolean
  performedDate: string
  type: MaintenanceType
  worker: string
}
