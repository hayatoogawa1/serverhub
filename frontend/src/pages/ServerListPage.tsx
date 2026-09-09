import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import CloudSyncIcon from '@mui/icons-material/CloudSync'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/common/Pagination'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { useFeedback } from '@/components/feedback/context'
import { ServerFormModal } from '@/components/servers/ServerFormModal'
import { ServerListTable } from '@/components/servers/ServerListTable'
import { ERROR_CODES } from '@/types/api'
import { useRefreshAllCloudStatesMutation } from '@/hooks/cloud'
import { useServersQuery } from '@/hooks/servers'
import {
  parseServerListParams,
  serializeServerListParams,
  type ServerListParams,
} from '@/url/serverListParams'
import { ServerSearchBar } from '@/components/servers/ServerSearchBar'

/** SC-03 サーバー一覧（検索・絞り込み・ソート・ページング、URL クエリ同期）。 */
export function ServerListPage() {
  const navigate = useNavigate()
  const feedback = useFeedback()
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseServerListParams(searchParams), [searchParams])
  const query = useServersQuery(params)
  const [createOpen, setCreateOpen] = useState(false)
  const refreshAllCloud = useRefreshAllCloudStatesMutation()

  const hasFilters =
    params.q !== '' || params.env !== 'all' || params.status !== 'all' || params.tags.length > 0

  // AWS 実行状態の列に意味がある（＝リンク済みサーバーが表示されている）ときだけ一括更新ボタンを出す
  const showCloudRefresh = (query.data?.content ?? []).some(
    (s) => s.cloudState != null || s.cloudStateFetchedAt != null,
  )

  const handleRefreshAllCloud = () => {
    refreshAllCloud.mutate(undefined, {
      onSuccess: (summary) => {
        const base = `AWS 実行状態を更新しました（${summary.updated} 件`
        if (summary.failed > 0) {
          feedback.showError(`${base} / 失敗 ${summary.failed} 件）`)
        } else {
          feedback.showSuccess(`${base}）`)
        }
      },
      onError: (error) => {
        feedback.showError(
          error.code === ERROR_CODES.CLOUD_PROVIDER_UNAVAILABLE
            ? 'AWS 連携が有効になっていません。'
            : error.message,
        )
      },
    })
  }

  const update = (patch: Partial<ServerListParams>, resetPage = true) => {
    const next: ServerListParams = { ...params, ...patch }
    if (resetPage && !('page' in patch)) next.page = 1
    setSearchParams(serializeServerListParams(next), { replace: true })
  }

  const handleSortChange = (sortKey: string) => {
    if (params.sort === sortKey) {
      update({ order: params.order === 'asc' ? 'desc' : 'asc' })
    } else {
      update({ sort: sortKey as ServerListParams['sort'], order: 'asc' })
    }
  }

  const addTagFilter = (tag: string) => {
    if (!params.tags.includes(tag)) update({ tags: [...params.tags, tag] })
  }

  const resetFilters = () => setSearchParams({}, { replace: true })

  return (
    <>
      <PageHeader
        title="サーバー"
        breadcrumbs={[{ label: 'サーバー' }]}
        actions={
          <>
            {showCloudRefresh && (
              <Button
                variant="outlined"
                startIcon={<CloudSyncIcon />}
                onClick={handleRefreshAllCloud}
                loading={refreshAllCloud.isPending}
              >
                AWS 実行状態を更新
              </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              新規登録
            </Button>
          </>
        }
      />

      <ServerSearchBar params={params} onChange={update} onReset={resetFilters} />

      <Box sx={{ position: 'relative' }}>
        {query.isFetching && !query.isPending && (
          <LinearProgress sx={{ position: 'absolute', top: -4, left: 0, right: 0 }} />
        )}

        {query.isError && query.error.status !== 401 ? (
          <StatePlaceholder
            type="error"
            title="サーバー一覧の取得に失敗しました"
            description={query.error.message}
            actionButton={
              <Button variant="outlined" onClick={() => void query.refetch()}>
                再読み込み
              </Button>
            }
          />
        ) : (
          <>
            <ServerListTable
              rows={query.data?.content}
              loading={query.isPending}
              sort={params.sort}
              order={params.order}
              hasFilters={hasFilters}
              onSortChange={handleSortChange}
              onRowClick={(server) => void navigate(`/servers/${server.id}`)}
              onTagClick={addTagFilter}
              onResetFilters={resetFilters}
            />
            {query.data && query.data.page.totalElements > 0 && (
              <Pagination
                page={params.page}
                size={params.size}
                totalElements={query.data.page.totalElements}
                totalPages={query.data.page.totalPages}
                onPageChange={(page) => update({ page }, false)}
                onSizeChange={(size) => update({ size })}
              />
            )}
          </>
        )}
      </Box>

      {createOpen && (
        <ServerFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false)
            feedback.showSuccess(`サーバー「${created.hostname}」を登録しました`)
            void navigate(`/servers/${created.id}`)
          }}
        />
      )}
    </>
  )
}
