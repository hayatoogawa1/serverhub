import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { Page } from '@/types/api'
import type {
  ServerCreateBody,
  ServerDetail,
  ServerListApiParams,
  ServerSummary,
  ServerUpdateBody,
} from '@/types/server'

/** サーバー・タグ API（02-api §3.2）。タグの付与/解除はサーバーの登録・編集に内包される。 */
export interface ServersApi {
  /** 一覧・検索（`GET /servers`）。 */
  getServers(params: ServerListApiParams): Promise<Page<ServerSummary>>
  /** 詳細（`GET /servers/{id}`）。不存在・削除済みは 404 `RESOURCE_NOT_FOUND`。 */
  getServer(id: number): Promise<ServerDetail>
  /** 登録（`POST /servers`）。201 + 作成された詳細。409 `DUPLICATE_HOSTNAME`。 */
  createServer(body: ServerCreateBody): Promise<ServerDetail>
  /** 編集（`PUT /servers/{id}`）。`version` による楽観ロック。409 `DUPLICATE_HOSTNAME` / `OPTIMISTIC_LOCK_CONFLICT`、404。 */
  updateServer(id: number, body: ServerUpdateBody): Promise<ServerDetail>
  /** 論理削除（`DELETE /servers/{id}`）。204。不存在・既削除は 404。 */
  deleteServer(id: number): Promise<void>
}

class ServersApiImpl implements ServersApi {
  async getServers(params: ServerListApiParams): Promise<Page<ServerSummary>> {
    try {
      const { data } = await apiClient.get<Page<ServerSummary>>('/servers', { params })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async getServer(id: number): Promise<ServerDetail> {
    try {
      const { data } = await apiClient.get<ServerDetail>(`/servers/${id}`)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async createServer(body: ServerCreateBody): Promise<ServerDetail> {
    try {
      const { data } = await apiClient.post<ServerDetail>('/servers', body)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async updateServer(id: number, body: ServerUpdateBody): Promise<ServerDetail> {
    try {
      const { data } = await apiClient.put<ServerDetail>(`/servers/${id}`, body)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async deleteServer(id: number): Promise<void> {
    try {
      await apiClient.delete(`/servers/${id}`)
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const serversApi: ServersApi = new ServersApiImpl()
