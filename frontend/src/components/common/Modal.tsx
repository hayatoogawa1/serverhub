import type { ReactNode } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** フッター（保存 / キャンセル等）。 */
  actions?: ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg'
  /** 送信中などで閉じさせたくないとき。 */
  disableClose?: boolean
}

/**
 * モーダルの共通ラッパー（06-ui §7 `Modal`、D-UI-02：URL に反映しない）。
 * ヘッダー（タイトル + 閉じる）とフッターの型を統一する。SC-05/06/08 で共用。
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
  maxWidth = 'sm',
  disableClose = false,
}: ModalProps) {
  return (
    <Dialog open={open} onClose={disableClose ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        {title}
        {!disableClose && (
          <IconButton
            aria-label="閉じる"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>}
    </Dialog>
  )
}
