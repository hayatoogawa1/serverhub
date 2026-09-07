import type { SortOrder } from '@/components/DataTable'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/constants/pagination'
import { ENVIRONMENTS, STATUSES, type Environment, type Status } from '@/types/domain'
import { SERVER_SORT_KEYS, type ServerSortKey } from './types'

/**
 * サーバー一覧の状態（URL クエリと双方向同期、06-ui D-UI-04 / D-UI-08）。
 * URL は Stitch の短縮名（q / env / status / tags / sort / order / page / size）。
 * `page` は **1 始まり**（表示・共有向け）。API へは `toApiParams` で 0 始まりへ変換する。
 */
export interface ServerListParams {
  q: string
  env: Environment | 'all'
  status: Status | 'all'
  tags: string[]
  sort: ServerSortKey
  order: SortOrder
  page: number
  size: number
}

export const DEFAULT_SERVER_LIST_PARAMS: ServerListParams = {
  q: '',
  env: 'all',
  status: 'all',
  tags: [],
  sort: 'updatedAt',
  order: 'desc',
  page: 1,
  size: 20,
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** URLSearchParams → 型付きパラメータ（不正値は既定へ丸める）。 */
export function parseServerListParams(sp: URLSearchParams): ServerListParams {
  const rawPage = Number(sp.get('page'))
  const rawSize = Number(sp.get('size'))
  return {
    q: sp.get('q') ?? '',
    env: oneOf<Environment | 'all'>(sp.get('env'), ['all', ...ENVIRONMENTS], 'all'),
    status: oneOf<Status | 'all'>(sp.get('status'), ['all', ...STATUSES], 'all'),
    tags: (sp.get('tags') ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== ''),
    sort: oneOf<ServerSortKey>(sp.get('sort'), SERVER_SORT_KEYS, 'updatedAt'),
    order: sp.get('order') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
    size: PAGE_SIZE_OPTIONS.includes(rawSize as (typeof PAGE_SIZE_OPTIONS)[number])
      ? rawSize
      : DEFAULT_PAGE_SIZE,
  }
}

/** 型付きパラメータ → URLSearchParams 用の record（既定値は省いて URL を短く保つ）。 */
export function serializeServerListParams(params: ServerListParams): Record<string, string> {
  const out: Record<string, string> = {}
  if (params.q) out.q = params.q
  if (params.env !== 'all') out.env = params.env
  if (params.status !== 'all') out.status = params.status
  if (params.tags.length > 0) out.tags = params.tags.join(',')
  if (params.sort !== DEFAULT_SERVER_LIST_PARAMS.sort) out.sort = params.sort
  if (params.order !== DEFAULT_SERVER_LIST_PARAMS.order) out.order = params.order
  if (params.page !== 1) out.page = String(params.page)
  if (params.size !== DEFAULT_SERVER_LIST_PARAMS.size) out.size = String(params.size)
  return out
}

export interface ServerListApiParams {
  keyword?: string
  environment?: Environment
  status?: Status
  tags?: string[]
  sort: ServerSortKey
  order: SortOrder
  page: number // 0 始まり
  size: number
}

/** API 呼び出し用に変換（page を 0 始まりへ、'all' / 空はパラメータ自体を送らない）。 */
export function toApiParams(params: ServerListParams): ServerListApiParams {
  return {
    keyword: params.q || undefined,
    environment: params.env === 'all' ? undefined : params.env,
    status: params.status === 'all' ? undefined : params.status,
    tags: params.tags.length > 0 ? params.tags : undefined,
    sort: params.sort,
    order: params.order,
    page: params.page - 1,
    size: params.size,
  }
}
