import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import MuiPagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { PAGE_SIZE_OPTIONS } from '@/constants/pagination'

interface PaginationProps {
  /** 1 始まり（URL と同じ、02-api の API は 0 始まりなので呼び出し側で変換済み）。 */
  page: number
  size: number
  totalElements: number
  totalPages: number
  onPageChange: (page: number) => void
  onSizeChange?: (size: number) => void
  /** ページサイズ選択を隠す（固定サイズのセクション用）。 */
  hideSizeSelector?: boolean
}

/** 一覧のページネーション（ページ移動 + 1 ページ件数、B6：10/20/50/100・既定 20）。 */
export function Pagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  hideSizeSelector = false,
}: PaginationProps) {
  const from = totalElements === 0 ? 0 : (page - 1) * size + 1
  const to = Math.min(page * size, totalElements)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        mt: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {totalElements} 件中 {from}–{to} 件
        </Typography>
        {!hideSizeSelector && onSizeChange && (
          <Select
            size="small"
            value={size}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            aria-label="1 ページの表示件数"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt} 件
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>
      <MuiPagination
        page={page}
        count={Math.max(totalPages, 1)}
        onChange={(_e, value) => onPageChange(value)}
        shape="rounded"
        size="small"
      />
    </Box>
  )
}
