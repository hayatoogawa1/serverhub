import type { ReactNode } from 'react'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import Paper from '@mui/material/Paper'

export type SortOrder = 'asc' | 'desc'

export interface Column<T> {
  /** セルの一意キー。 */
  key: string
  header: ReactNode
  /** 指定するとソート可能。クリックで `onSortChange(sortKey)` を発火。 */
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  width?: number | string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[] | undefined
  getRowKey: (row: T) => string | number
  loading?: boolean
  onRowClick?: (row: T) => void
  sort?: string
  order?: SortOrder
  /** ソート列ヘッダークリック時。同じ列なら order を反転、別の列なら asc 起点にするのは呼び出し側の責務。 */
  onSortChange?: (sortKey: string) => void
  emptyState?: ReactNode
  skeletonRows?: number
}

/**
 * 一覧テーブルの共通部品（06-ui §7）。列定義でデータ列を可変にする。
 * ローディングは骨格を保った Skeleton 行（Stitch §1.1 / §3.1、CLS 防止）。
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading = false,
  onRowClick,
  sort,
  order = 'desc',
  onSortChange,
  emptyState,
  skeletonRows = 10,
}: DataTableProps<T>) {
  const showSkeleton = loading || rows == null
  const isEmpty = !showSkeleton && rows.length === 0

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                align={col.align}
                sx={{ width: col.width, fontWeight: 600, whiteSpace: 'nowrap' }}
                sortDirection={col.sortKey && sort === col.sortKey ? order : false}
              >
                {col.sortKey && onSortChange ? (
                  <TableSortLabel
                    active={sort === col.sortKey}
                    direction={sort === col.sortKey ? order : 'asc'}
                    onClick={() => onSortChange(col.sortKey!)}
                  >
                    {col.header}
                  </TableSortLabel>
                ) : (
                  col.header
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <Skeleton variant="text" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {isEmpty && (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ border: 0 }}>
                {emptyState}
              </TableCell>
            </TableRow>
          )}

          {!showSkeleton &&
            rows.map((row) => (
              <TableRow
                key={getRowKey(row)}
                hover={Boolean(onRowClick)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} align={col.align} sx={{ whiteSpace: 'nowrap' }}>
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
