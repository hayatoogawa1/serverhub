import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'

export interface TagsApi {
  /** 既存タグ名の前方一致サジェスト（Backend `GET /tags/suggest`、最大 20 件、FR-TAG-02 / F3）。 */
  suggest(prefix: string): Promise<string[]>
}

class TagsApiImpl implements TagsApi {
  async suggest(prefix: string): Promise<string[]> {
    try {
      const { data } = await apiClient.get<string[]>('/tags/suggest', { params: { prefix } })
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const tagsApi: TagsApi = new TagsApiImpl()
