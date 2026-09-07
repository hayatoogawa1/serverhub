import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import type { Status } from '@/types/domain'
import { STATUS_LABELS } from '@/types/domain'

const DOT_COLOR: Record<Status, string> = {
  active: '#2e7d32', // green
  maintenance: '#ed6c02', // orange
  retired: '#9e9e9e', // grey
}

/**
 * サーバーのステータス表示（Stitch `StatusChip`）。色ドット + ラベル。
 * enum → ラベル・色のマッピングのみを持つ（06-ui §7 `StatusBadge`）。
 */
export function StatusChip({ status }: { status: Status }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            component="span"
            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: DOT_COLOR[status] }}
          />
          {STATUS_LABELS[status]}
        </Box>
      }
    />
  )
}
