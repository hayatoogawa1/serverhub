import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { CloudLink, CloudLinkBody, CloudRefreshSummary } from '@/types/cloud'

/**
 * クラウド連携（cloud-link サブリソース）API（02-api §3.2、FR-CLOUD-01）。
 *
 * **FE は AWS を直接呼ばない。** 取得も設定もすべて Backend 経由。
 */
export interface CloudApi {
  /** 紐付けの作成 / 置換（`PUT /servers/{id}/cloud-link`）。200 + `CloudLink`。409 `CLOUD_LINK_CONFLICT`、404。 */
  setCloudLink(serverId: number, body: CloudLinkBody): Promise<CloudLink>
  /** 紐付けの解除（`DELETE /servers/{id}/cloud-link`）。204。冪等。404（サーバー不存在）。 */
  deleteCloudLink(serverId: number): Promise<void>
  /**
   * その 1 台だけ即時取得（`POST /servers/{id}/cloud-link/refresh`）。
   * **AWS 取得に失敗しても 200**（キャッシュ値 + `lastError`）。provider 未設定は 503 `CLOUD_PROVIDER_UNAVAILABLE`、
   * サーバー / 紐付けが無ければ 404。
   */
  refreshCloudState(serverId: number): Promise<CloudLink>
  /**
   * 紐付け済み全サーバーの実行状態をまとめて即時取得（`POST /servers/cloud-links/refresh`）。
   * 個別の AWS 失敗は 200 で `failed` に計上。provider 未設定は 503 `CLOUD_PROVIDER_UNAVAILABLE`。
   */
  refreshAllCloudStates(): Promise<CloudRefreshSummary>
}

class CloudApiImpl implements CloudApi {
  async setCloudLink(serverId: number, body: CloudLinkBody): Promise<CloudLink> {
    try {
      const { data } = await apiClient.put<CloudLink>(`/servers/${serverId}/cloud-link`, body)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async deleteCloudLink(serverId: number): Promise<void> {
    try {
      await apiClient.delete(`/servers/${serverId}/cloud-link`)
    } catch (error) {
      throw toApiError(error)
    }
  }

  async refreshCloudState(serverId: number): Promise<CloudLink> {
    try {
      const { data } = await apiClient.post<CloudLink>(`/servers/${serverId}/cloud-link/refresh`)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async refreshAllCloudStates(): Promise<CloudRefreshSummary> {
    try {
      const { data } = await apiClient.post<CloudRefreshSummary>('/servers/cloud-links/refresh')
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const cloudApi: CloudApi = new CloudApiImpl()
