import { apiClient } from '@/api/apiClient'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type { ServerListApiParams } from './searchParams'
import type { ServerDetail, ServerSummary } from './types'

/** サーバー一覧・検索（Backend `GET /servers`、02-api §3.2）。 */
export async function getServers(params: ServerListApiParams): Promise<Page<ServerSummary>> {
  try {
    const { data } = await apiClient.get<Page<ServerSummary>>('/servers', { params })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** サーバー詳細（Backend `GET /servers/{id}`）。不存在・削除済みは 404 `RESOURCE_NOT_FOUND`。 */
export async function getServer(id: number): Promise<ServerDetail> {
  try {
    const { data } = await apiClient.get<ServerDetail>(`/servers/${id}`)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
