import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { ServerListTable } from '@/features/servers/components/ServerListTable'
import { useServersQuery } from '@/features/servers/hooks'
import {
  parseServerListParams,
  serializeServerListParams,
  type ServerListParams,
} from '@/features/servers/searchParams'
import { ServerSearchBar } from '@/features/servers/components/ServerSearchBar'

/** SC-03 サーバー一覧（検索・絞り込み・ソート・ページング、URL クエリ同期）。 */
export function ServerListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseServerListParams(searchParams), [searchParams])
  const query = useServersQuery(params)

  const hasFilters =
    params.q !== '' || params.env !== 'all' || params.status !== 'all' || params.tags.length > 0

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
          <Button variant="contained" disabled>
            新規登録
          </Button>
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
    </>
  )
}
