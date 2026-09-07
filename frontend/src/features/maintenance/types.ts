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

/** 登録リクエストボディ（Backend `MaintenanceHistoryCreateRequest`、FR-MNT-02 / B4）。 */
export interface MaintenanceHistoryCreateBody {
  serverId: number
  performedDate: string // YYYY-MM-DD（未来日可）
  type: MaintenanceType
  worker: string
  content: string
  impact: string | null
  result: string | null
}

/** 登録フォームの編集中の値（enum は未選択を許すため空文字を含む）。 */
export interface MaintenanceFormValues {
  serverId: number | null
  performedDate: string
  type: MaintenanceType | ''
  worker: string
  content: string
  impact: string
  result: string
}

/** SC-07 一覧のソート可能キー（Backend のホワイトリストと一致、04-maintenance §2）。 */
export const MAINTENANCE_SORT_KEYS = ['performedDate', 'createdAt'] as const
export type MaintenanceSortKey = (typeof MAINTENANCE_SORT_KEYS)[number]

export const MAINTENANCE_SORT_LABELS: Record<MaintenanceSortKey, string> = {
  performedDate: '実施日',
  createdAt: '登録日時',
}

/** Backend の Bean Validation と同じ上限。FE でこれより厳しくしない。 */
export const MAINTENANCE_FIELD_LIMITS = {
  worker: 255,
  content: 2000,
  impact: 1000,
  result: 1000,
} as const
