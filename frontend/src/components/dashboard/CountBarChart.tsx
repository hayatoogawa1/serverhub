import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export interface CountDatum {
  /** 一意キー（クリック時に返す。例: 'production' / 'web'）。 */
  key: string
  /** 軸に表示するラベル。 */
  label: string
  value: number
}

interface CountBarChartProps {
  data: CountDatum[]
  /** 棒クリックで絞り込み遷移する場合のハンドラ。 */
  onBarClick?: (key: string) => void
  height?: number
  ariaLabel: string
}

/**
 * 集計の水平棒グラフ（Recharts、D-UI-01）。環境別・タグ別で共用。
 * 時系列は扱わない（純粋な件数バーのみ、Stitch §4）。
 */
export function CountBarChart({ data, onBarClick, height = 220, ariaLabel }: CountBarChartProps) {
  const theme = useTheme()

  return (
    <Box sx={{ width: '100%', height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
          <CartesianGrid horizontal={false} stroke={theme.palette.divider} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 12 }} interval={0} />
          <Tooltip
            cursor={{ fill: theme.palette.action.hover }}
            formatter={(value) => [`${String(value)} 台`, '']}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            cursor={onBarClick ? 'pointer' : undefined}
            onClick={(_datum, index) => onBarClick?.(data[index].key)}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={theme.palette.primary.main} />
            ))}
            <LabelList dataKey="value" position="right" style={{ fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}
