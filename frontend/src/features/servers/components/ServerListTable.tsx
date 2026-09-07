import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { DataTable, type Column } from '@/components/DataTable'
import { EnvironmentChip } from '@/components/EnvironmentChip'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { StatusChip } from '@/components/StatusChip'
import { TagList } from '@/components/TagList'
import { formatDateTime } from '@/utils/format'
import type { ServerSummary } from '../types'

interface ServerListTableProps {
  rows: ServerSummary[] | undefined
  loading: boolean
  sort: string
  order: 'asc' | 'desc'
  hasFilters: boolean
  onSortChange: (sortKey: string) => void
  onRowClick: (server: ServerSummary) => void
  onTagClick: (tag: string) => void
  onResetFilters: () => void
}

/** SC-03 のサーバー一覧テーブル（Backend `ServerSummaryResponse` の項目のみ）。 */
export function ServerListTable({
  rows,
  loading,
  sort,
  order,
  hasFilters,
  onSortChange,
  onRowClick,
  onTagClick,
  onResetFilters,
}: ServerListTableProps) {
  const columns: Column<ServerSummary>[] = [
    {
      key: 'hostname',
      header: 'ホスト名',
      sortKey: 'hostname',
      width: 240,
      render: (s) => (
        <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {s.hostname}
        </Typography>
      ),
    },
    {
      key: 'environment',
      header: '環境',
      sortKey: 'environment',
      width: 120,
      render: (s) => <EnvironmentChip environment={s.environment} />,
    },
    {
      key: 'status',
      header: 'ステータス',
      sortKey: 'status',
      width: 140,
      render: (s) => <StatusChip status={s.status} />,
    },
    {
      key: 'tags',
      header: 'タグ',
      width: 240,
      render: (s) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-block' }}>
          <TagList tags={s.tags} max={3} onTagClick={onTagClick} />
        </Box>
      ),
    },
    {
      key: 'updatedAt',
      header: '更新日時',
      sortKey: 'updatedAt',
      width: 160,
      render: (s) => (
        <Typography component="span" variant="body2" color="text.secondary">
          {formatDateTime(s.updatedAt)}
        </Typography>
      ),
    },
    {
      key: 'chevron',
      header: '',
      align: 'right',
      width: 48,
      render: () => <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(s) => s.id}
      loading={loading}
      sort={sort}
      order={order}
      onSortChange={onSortChange}
      onRowClick={onRowClick}
      emptyState={
        <StatePlaceholder
          type="empty"
          title={
            hasFilters
              ? '条件に一致するサーバーは見つかりませんでした'
              : 'サーバーがまだ登録されていません'
          }
          actionButton={
            hasFilters ? (
              <Button variant="outlined" onClick={onResetFilters}>
                検索条件をリセット
              </Button>
            ) : undefined
          }
        />
      }
    />
  )
}
