import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { ServerPicker } from '@/components/ServerPicker'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { useFeedback } from '@/components/feedback/context'
import { MaintenanceHistoryFormModal } from '@/features/maintenance/components/MaintenanceHistoryFormModal'
import { MaintenanceHistoryListTable } from '@/features/maintenance/components/MaintenanceHistoryListTable'
import { useMaintenanceHistoriesQuery } from '@/features/maintenance/hooks'
import {
  parseMaintenanceListParams,
  serializeMaintenanceListParams,
  toMaintenanceApiParams,
  type MaintenanceListParams,
} from '@/features/maintenance/searchParams'

/** SC-07 メンテナンス履歴一覧（全サーバー横断、サーバー絞り込み、URL クエリ同期）。 */
export function MaintenanceHistoryListPage() {
  const navigate = useNavigate()
  const feedback = useFeedback()
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseMaintenanceListParams(searchParams), [searchParams])
  const query = useMaintenanceHistoriesQuery(toMaintenanceApiParams(params))
  const [createOpen, setCreateOpen] = useState(false)

  const update = (patch: Partial<MaintenanceListParams>, resetPage = true) => {
    const next: MaintenanceListParams = { ...params, ...patch }
    if (resetPage && !('page' in patch)) next.page = 1
    setSearchParams(serializeMaintenanceListParams(next), { replace: true })
  }

  const handleSortChange = (sortKey: string) => {
    if (params.sort === sortKey) {
      update({ order: params.order === 'asc' ? 'desc' : 'asc' })
    } else {
      update({ sort: sortKey as MaintenanceListParams['sort'], order: 'desc' })
    }
  }

  return (
    <>
      <PageHeader
        title="メンテナンス履歴"
        breadcrumbs={[{ label: 'メンテナンス履歴' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            履歴を登録
          </Button>
        }
      />

      <Box sx={{ maxWidth: 360, mb: 2 }}>
        <ServerPicker
          label="対象サーバーで絞り込み"
          value={params.serverId}
          onChange={(serverId) => update({ serverId })}
        />
      </Box>

      <Box sx={{ position: 'relative' }}>
        {query.isFetching && !query.isPending && (
          <LinearProgress sx={{ position: 'absolute', top: -4, left: 0, right: 0 }} />
        )}

        {query.isError && query.error.status !== 401 ? (
          <StatePlaceholder
            type="error"
            title="メンテナンス履歴の取得に失敗しました"
            description={query.error.message}
            actionButton={
              <Button variant="outlined" onClick={() => void query.refetch()}>
                再読み込み
              </Button>
            }
          />
        ) : (
          <>
            <MaintenanceHistoryListTable
              rows={query.data?.content}
              loading={query.isPending}
              sort={params.sort}
              order={params.order}
              filtered={params.serverId != null}
              onSortChange={handleSortChange}
              onRowClick={(row) => void navigate(`/servers/${row.serverId}`)}
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
        <MaintenanceHistoryFormModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            feedback.showSuccess('メンテナンス履歴を記録しました')
          }}
        />
      )}
    </>
  )
}
