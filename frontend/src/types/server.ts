import type { Environment, Status, VirtualizationType } from '@/types/domain'
import type { SortOrder } from '@/types/api'

/** サーバー一覧の 1 行（Backend `ServerSummaryResponse`）。ipAddress / description は含まれない。 */
export interface ServerSummary {
  id: number
  hostname: string
  environment: Environment
  status: Status
  tags: string[]
  updatedAt: string
}

/** サーバー詳細（Backend `ServerDetailResponse`）。 */
export interface ServerDetail {
  id: number
  hostname: string
  ipAddress: string | null
  environment: Environment
  status: Status
  description: string | null
  os: string | null
  osVersion: string | null
  virtualizationType: VirtualizationType | null
  location: string | null
  owner: string | null
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
}

/**
 * サーバー登録リクエストボディ（Backend `ServerCreateRequest`）。
 * 必須は hostname / environment / status のみ（B3）。任意項目は未入力なら `null` を送る。
 */
export interface ServerCreateBody {
  hostname: string
  ipAddress: string | null
  environment: Environment
  status: Status
  description: string | null
  os: string | null
  osVersion: string | null
  virtualizationType: VirtualizationType | null
  location: string | null
  owner: string | null
  tags: string[]
}

/** サーバー編集リクエストボディ（Backend `ServerUpdateRequest` = Create + `version`）。 */
export interface ServerUpdateBody extends ServerCreateBody {
  version: number
}

/** フォームの編集中の値（enum は未選択を許すため空文字を含む）。 */
export interface ServerFormValues {
  hostname: string
  ipAddress: string
  environment: Environment | ''
  status: Status | ''
  description: string
  os: string
  osVersion: string
  virtualizationType: VirtualizationType | ''
  location: string
  owner: string
  tags: string[]
}

/** サーバー一覧のソート可能キー（Backend のホワイトリストと一致、F1）。 */
export const SERVER_SORT_KEYS = [
  'hostname',
  'environment',
  'status',
  'updatedAt',
  'createdAt',
] as const
export type ServerSortKey = (typeof SERVER_SORT_KEYS)[number]

export const SERVER_SORT_LABELS: Record<ServerSortKey, string> = {
  hostname: 'ホスト名',
  environment: '環境',
  status: 'ステータス',
  updatedAt: '更新日時',
  createdAt: '登録日時',
}

/** `GET /servers` に渡すクエリパラメータ（`page` は 0 始まり）。 */
export interface ServerListApiParams {
  keyword?: string
  environment?: Environment
  status?: Status
  tags?: string[]
  sort: ServerSortKey
  order: SortOrder
  page: number
  size: number
}
