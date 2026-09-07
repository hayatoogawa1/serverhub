import Chip from '@mui/material/Chip'
import {
  CLOUD_STATE_LABELS,
  CLOUD_STATE_TONE,
  type CloudInstanceState,
  type CloudStateTone,
} from '@/types/cloud'

type ChipColor = 'default' | 'success' | 'warning' | 'error'

const TONE_STYLE: Record<CloudStateTone, { color: ChipColor; variant: 'filled' | 'outlined' }> = {
  running: { color: 'success', variant: 'filled' },
  stopped: { color: 'default', variant: 'filled' },
  transitioning: { color: 'warning', variant: 'filled' },
  terminal: { color: 'error', variant: 'filled' },
  unknown: { color: 'default', variant: 'outlined' },
}

/**
 * AWS 実行状態のチップ（FR-CLOUD-01）。
 *
 * **管理ステータスの `StatusChip`（枠線 + 色ドット）とは意図的に別デザイン**（塗りつぶし）にして、
 * 画面上で「管理ステータス」と「AWS 実行状態」が混同されないようにする。
 */
export function CloudStateChip({ state }: { state: CloudInstanceState }) {
  const { color, variant } = TONE_STYLE[CLOUD_STATE_TONE[state]]
  const label = CLOUD_STATE_LABELS[state]
  return (
    <Chip
      size="small"
      color={color}
      variant={variant}
      label={label}
      role="img"
      aria-label={`AWS 実行状態: ${label}`}
    />
  )
}
