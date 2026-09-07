import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { DataTable, type Column } from '@/components/common/DataTable'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { MAINTENANCE_TYPE_LABELS } from '@/types/domain'
import { formatDate } from '@/utils/format'
import type { MaintenanceHistorySummary } from '@/types/maintenance'

interface MaintenanceHistoryListTableProps {
  rows: MaintenanceHistorySummary[] | undefined
  loading: boolean
  sort: string
  order: 'asc' | 'desc'
  filtered: boolean
  onSortChange: (sortKey: string) => void
  onRowClick: (row: MaintenanceHistorySummary) => void
}

/** SC-07 の全サーバー横断メンテナンス履歴テーブル（Summary の項目のみ）。 */
export function MaintenanceHistoryListTable({
  rows,
  loading,
  sort,
  order,
  filtered,
  onSortChange,
  onRowClick,
}: MaintenanceHistoryListTableProps) {
  const columns: Column<MaintenanceHistorySummary>[] = [
    {
      key: 'serverHostname',
      header: '対象サーバー',
      width: 260,
      render: (h) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography
            component="span"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 600,
              color: h.serverDeleted ? 'text.disabled' : 'text.primary',
            }}
          >
            {h.serverHostname}
          </Typography>
          {h.serverDeleted && <Chip size="small" color="default" label="削除済み" />}
        </Stack>
      ),
    },
    {
      key: 'performedDate',
      header: '実施日',
      sortKey: 'performedDate',
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
    { key: 'worker', header: '作業者', width: 160, render: (h) => h.worker },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(h) => h.id}
      loading={loading}
      sort={sort}
      order={order}
      onSortChange={onSortChange}
      onRowClick={(h) => {
        // 削除済みサーバーは詳細が 404 のため遷移しない（Stitch: リンク無効化）
        if (!h.serverDeleted) onRowClick(h)
      }}
      emptyState={
        <StatePlaceholder
          type="empty"
          title={
            filtered
              ? '条件に一致するメンテナンス履歴はありません'
              : 'メンテナンス履歴がまだ登録されていません'
          }
        />
      }
    />
  )
}
