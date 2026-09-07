import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/common/StatusChip'
import type { StatusCount } from '@/types/dashboard'

interface StatusBreakdownProps {
  data: StatusCount[]
  onSelect: (status: string) => void
}

/** ステータス別内訳（Stitch §3.5「リスト & バッジ」）。行クリックでフィルタ済み一覧へ。 */
export function StatusBreakdown({ data, onSelect }: StatusBreakdownProps) {
  return (
    <List disablePadding>
      {data.map((row) => (
        <ListItemButton
          key={row.status}
          onClick={() => onSelect(row.status)}
          sx={{ borderRadius: 1, justifyContent: 'space-between' }}
        >
          <StatusChip status={row.status} />
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
              {row.count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              台
            </Typography>
          </Box>
        </ListItemButton>
      ))}
    </List>
  )
}
