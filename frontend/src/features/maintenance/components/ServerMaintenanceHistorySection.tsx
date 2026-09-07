import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { useFeedback } from '@/components/feedback/context'
import { MAINTENANCE_TYPE_LABELS } from '@/types/domain'
import { formatDate, orDash } from '@/utils/format'
import { MaintenanceHistoryFormModal } from './MaintenanceHistoryFormModal'
import { useServerMaintenanceHistoriesQuery } from '../hooks'
import type { MaintenanceHistoryDetail } from '../types'

const SIZE = 10

interface ServerMaintenanceHistorySectionProps {
  serverId: number
  serverHostname: string
}

/**
 * SC-04 内のメンテナンス履歴セクション（FR-MNT-03、`GET /servers/{id}/maintenance-histories`）。
 * 表示 + このサーバーを対象にした履歴登録（SC-08）。
 */
export function ServerMaintenanceHistorySection({
  serverId,
  serverHostname,
}: ServerMaintenanceHistorySectionProps) {
  const feedback = useFeedback()
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const query = useServerMaintenanceHistoriesQuery(serverId, page, SIZE)

  const columns: Column<MaintenanceHistoryDetail>[] = [
    {
      key: 'performedDate',
      header: '実施日',
      width: 120,
      render: (h) => formatDate(h.performedDate),
    },
    {
      key: 'type',
      header: '種別',
      width: 120,
      render: (h) => (
        <Chip size="small" variant="outlined" label={MAINTENANCE_TYPE_LABELS[h.type]} />
      ),
    },
    { key: 'worker', header: '作業者', width: 140, render: (h) => h.worker },
    {
      key: 'content',
      header: '作業内容',
      render: (h) => (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {h.content}
        </Typography>
      ),
    },
    {
      key: 'impact',
      header: '影響・ダウンタイム',
      width: 180,
      render: (h) => orDash(h.impact),
    },
    { key: 'result', header: '結果・備考', width: 180, render: (h) => orDash(h.result) },
  ]

  const total = query.data?.page.totalElements ?? 0

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" component="h2">
          メンテナンス履歴
        </Typography>
        {query.data && <Chip size="small" label={`${total} 件`} />}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          履歴を登録
        </Button>
      </Stack>

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
          <DataTable
            columns={columns}
            rows={query.data?.content}
            getRowKey={(h) => h.id}
            loading={query.isPending}
            skeletonRows={3}
            emptyState={
              <StatePlaceholder type="empty" title="登録されたメンテナンス履歴はありません" />
            }
          />
          {total > SIZE && query.data && (
            <Pagination
              page={page}
              size={SIZE}
              totalElements={total}
              totalPages={query.data.page.totalPages}
              onPageChange={setPage}
              hideSizeSelector
            />
          )}
        </>
      )}

      {createOpen && (
        <MaintenanceHistoryFormModal
          fixedServerId={serverId}
          fixedServerHostname={serverHostname}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            feedback.showSuccess('メンテナンス履歴を記録しました')
          }}
        />
      )}
    </Box>
  )
}
