import type { ReactNode } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ConfirmDialogProps {
  open: boolean
  title: string
  content: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'error' | 'primary'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * 破壊的操作の確認ダイアログ（FR-COM-04、Stitch `ConfirmDialog`）。
 * サーバー削除・楽観ロック競合時の再読み込み確認などに使う。
 */
export function ConfirmDialog({
  open,
  title,
  content,
  confirmLabel = 'OK',
  cancelLabel = 'キャンセル',
  confirmColor = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {typeof content === 'string' ? <DialogContentText>{content}</DialogContentText> : content}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
