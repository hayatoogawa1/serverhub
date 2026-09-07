import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined'
import FolderOffOutlinedIcon from '@mui/icons-material/FolderOffOutlined'
import SearchOffIcon from '@mui/icons-material/SearchOff'

export type PlaceholderType = 'loading' | 'empty' | 'error' | 'notfound'

interface StatePlaceholderProps {
  type: PlaceholderType
  title: string
  description?: string
  /** ボタン等のアクション（例: 「再試行」「一覧へ戻る」「検索条件をリセット」）。 */
  actionButton?: ReactNode
  /** ビューポート中央に大きく配置する（画面全体の状態表示）。 */
  fullheight?: boolean
}

const ICONS: Record<Exclude<PlaceholderType, 'loading'>, typeof ErrorOutlineIcon> = {
  empty: FolderOffOutlinedIcon,
  error: ErrorOutlineIcon,
  notfound: SearchOffIcon,
}

/**
 * ローディング / 0 件 / エラー / 404 の共通プレースホルダ（Stitch 実装仕様 §1.1 / §2）。
 * 独自のローディング状態変数を持たず、呼び出し側が TanStack Query の状態で出し分ける（06-ui §5.3）。
 */
export function StatePlaceholder({
  type,
  title,
  description,
  actionButton,
  fullheight = false,
}: StatePlaceholderProps) {
  const Icon = type === 'loading' ? null : ICONS[type]

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 2,
        py: fullheight ? 0 : 8,
        minHeight: fullheight ? '60vh' : undefined,
      }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        {type === 'loading' ? (
          <CircularProgress size={36} />
        ) : (
          Icon && <Icon sx={{ fontSize: 48, color: 'text.disabled' }} />
        )}
        <Typography variant="h6" component="p">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
            {description}
          </Typography>
        )}
        {actionButton}
      </Stack>
    </Box>
  )
}
