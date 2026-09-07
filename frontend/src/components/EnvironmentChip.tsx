import Chip from '@mui/material/Chip'
import type { Environment } from '@/types/domain'
import { ENVIRONMENT_LABELS } from '@/types/domain'

type ChipColor = 'default' | 'primary' | 'info'

const CONFIG: Record<Environment, { color: ChipColor; variant: 'filled' | 'outlined' }> = {
  production: { color: 'primary', variant: 'filled' },
  staging: { color: 'info', variant: 'outlined' },
  development: { color: 'default', variant: 'outlined' },
}

/** サーバーの環境区分表示（Stitch 一覧仕様 §3.1 の環境バッジ）。 */
export function EnvironmentChip({ environment }: { environment: Environment }) {
  const { color, variant } = CONFIG[environment]
  return (
    <Chip size="small" color={color} variant={variant} label={ENVIRONMENT_LABELS[environment]} />
  )
}
