import { apiClient } from '@/api/apiClient'
import { toApiError } from '@/api/errors'

/** 既存タグ名の前方一致サジェスト（Backend `GET /tags/suggest`、最大 20 件、FR-TAG-02 / F3）。 */
export async function suggestTags(prefix: string): Promise<string[]> {
  try {
    const { data } = await apiClient.get<string[]>('/tags/suggest', { params: { prefix } })
    return data
  } catch (error) {
    throw toApiError(error)
  }
}
