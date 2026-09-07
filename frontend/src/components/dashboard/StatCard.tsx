import type { ReactNode } from 'react'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

interface StatCardProps {
  label: string
  value: ReactNode
  unit?: string
  onClick?: () => void
}

/** ダッシュボードの大きな数値カード（Stitch §3.5「サーバー総数」）。 */
export function StatCard({ label, value, unit, onClick }: StatCardProps) {
  const body = (
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h3" component="p" sx={{ fontWeight: 700, mt: 0.5 }}>
        {value}
        {unit && (
          <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 0.5 }}>
            {unit}
          </Typography>
        )}
      </Typography>
    </CardContent>
  )

  return (
    <Card variant="outlined">
      {onClick ? <CardActionArea onClick={onClick}>{body}</CardActionArea> : body}
    </Card>
  )
}
