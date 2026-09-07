import type { SortOrder } from '@/components/DataTable'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/pagination'
import type { MaintenanceListApiParams } from './api'
import { MAINTENANCE_SORT_KEYS, type MaintenanceSortKey } from './types'

/**
 * SC-07 履歴一覧の状態（URL クエリと双方向同期、06-ui D-UI-04）。`page` は 1 始まり。
 */
export interface MaintenanceListParams {
  serverId: number | null
  sort: MaintenanceSortKey
  order: SortOrder
  page: number
  size: number
}

export const DEFAULT_MAINTENANCE_LIST_PARAMS: MaintenanceListParams = {
  serverId: null,
  sort: 'performedDate',
  order: 'desc',
  page: 1,
  size: 20,
}

export function parseMaintenanceListParams(sp: URLSearchParams): MaintenanceListParams {
  const rawServerId = Number(sp.get('serverId'))
  const rawPage = Number(sp.get('page'))
  const rawSize = Number(sp.get('size'))
  return {
    serverId: Number.isInteger(rawServerId) && rawServerId > 0 ? rawServerId : null,
    sort: MAINTENANCE_SORT_KEYS.includes(sp.get('sort') as MaintenanceSortKey)
      ? (sp.get('sort') as MaintenanceSortKey)
      : 'performedDate',
    order: sp.get('order') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
    size: PAGE_SIZE_OPTIONS.includes(rawSize as (typeof PAGE_SIZE_OPTIONS)[number])
      ? rawSize
      : DEFAULT_PAGE_SIZE,
  }
}

export function serializeMaintenanceListParams(
  params: MaintenanceListParams,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (params.serverId != null) out.serverId = String(params.serverId)
  if (params.sort !== DEFAULT_MAINTENANCE_LIST_PARAMS.sort) out.sort = params.sort
  if (params.order !== DEFAULT_MAINTENANCE_LIST_PARAMS.order) out.order = params.order
  if (params.page !== 1) out.page = String(params.page)
  if (params.size !== DEFAULT_MAINTENANCE_LIST_PARAMS.size) out.size = String(params.size)
  return out
}

export function toMaintenanceApiParams(params: MaintenanceListParams): MaintenanceListApiParams {
  return {
    serverId: params.serverId ?? undefined,
    sort: params.sort,
    order: params.order,
    page: params.page - 1,
    size: params.size,
  }
}
