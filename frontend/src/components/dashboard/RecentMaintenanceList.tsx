import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Link as RouterLink } from 'react-router-dom'
import { MAINTENANCE_TYPE_LABELS } from '@/types/domain'
import type { RecentMaintenanceItem } from '@/types/dashboard'
import { formatDate } from '@/utils/format'

interface RecentMaintenanceListProps {
  items: RecentMaintenanceItem[]
  onRowClick: (serverId: number) => void
}

/**
 * 直近のメンテナンス（Q4：10 件）。Backend の集計に含まれる項目のみ
 * （実施日 / 対象サーバー / 種別）。作業者・概要は集計に無いため表示しない。
 */
export function RecentMaintenanceList({ items, onRowClick }: RecentMaintenanceListProps) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        直近のメンテナンス履歴はありません
      </Typography>
    )
  }

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>実施日</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>対象サーバー</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>種別</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              hover
              onClick={() => onRowClick(item.serverId)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.performedDate)}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace' }}>{item.serverHostname}</TableCell>
              <TableCell>
                <Chip size="small" variant="outlined" label={MAINTENANCE_TYPE_LABELS[item.type]} />
              </TableCell>
              <TableCell align="right">
                <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{ textAlign: 'right', mt: 1 }}>
        <Button component={RouterLink} to="/maintenance-histories" size="small">
          メンテナンス履歴を全件表示
        </Button>
      </Box>
    </Box>
  )
}
