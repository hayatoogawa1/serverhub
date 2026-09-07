import type { Environment, MaintenanceType, Status } from '@/types/domain'

/** ダッシュボード集計（Backend `DashboardSummaryResponse`、FR-DASH-01 / 05-dashboard §4）。 */
export interface DashboardSummary {
  totalServers: number
  /** 常に 3 件（宣言順・0 件補完済み）。 */
  serversByEnvironment: EnvironmentCount[]
  /** 常に 3 件（宣言順・0 件補完済み）。 */
  serversByStatus: StatusCount[]
  /** 最大 10 件・件数降順。 */
  topTags: TagCount[]
  /** 11 位以降の件数合計。 */
  otherTagsCount: number
  /** 直近 10 件（Q4）。削除済みサーバー分は含まれない（D-DASH-03）。 */
  recentMaintenanceHistories: RecentMaintenanceItem[]
}

export interface EnvironmentCount {
  environment: Environment
  count: number
}

export interface StatusCount {
  status: Status
  count: number
}

export interface TagCount {
  tagName: string
  count: number
}

export interface RecentMaintenanceItem {
  id: number
  serverId: number
  serverHostname: string
  performedDate: string
  type: MaintenanceType
}
