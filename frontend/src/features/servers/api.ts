import { apiClient } from '@/api/apiClient'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type { ServerListApiParams } from './searchParams'
import type { ServerCreateBody, ServerDetail, ServerSummary, ServerUpdateBody } from './types'

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

/** サーバー登録（Backend `POST /servers`）。201 + 作成された詳細。409 `DUPLICATE_HOSTNAME`。 */
export async function createServer(body: ServerCreateBody): Promise<ServerDetail> {
  try {
    const { data } = await apiClient.post<ServerDetail>('/servers', body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/**
 * サーバー編集（Backend `PUT /servers/{id}`）。`version` による楽観ロック。
 * 409 `DUPLICATE_HOSTNAME` / `OPTIMISTIC_LOCK_CONFLICT`、404（削除済み）。
 */
export async function updateServer(id: number, body: ServerUpdateBody): Promise<ServerDetail> {
  try {
    const { data } = await apiClient.put<ServerDetail>(`/servers/${id}`, body)
    return data
  } catch (error) {
    throw toApiError(error)
  }
}

/** サーバー論理削除（Backend `DELETE /servers/{id}`）。204。不存在・既削除は 404。 */
export async function deleteServer(id: number): Promise<void> {
  try {
    await apiClient.delete(`/servers/${id}`)
  } catch (error) {
    throw toApiError(error)
  }
}
