import { useCallback, useMemo, useState, type ReactNode } from 'react'
import Alert, { type AlertColor } from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { FeedbackContext, type FeedbackApi } from './context'

interface FeedbackState {
  open: boolean
  message: string
  severity: AlertColor
}

const AUTO_HIDE_MS = 4000

/**
 * トースト通知（Stitch 実装仕様 §1.1 / §2 `FeedbackToast`、06-ui `Notification`）。
 * 同時表示は 1 件のみ（新しい通知が来たら差し替え、多重表示を抑制、FR-COM-03）。
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FeedbackState>({
    open: false,
    message: '',
    severity: 'success',
  })

  const show = useCallback((severity: AlertColor, message: string) => {
    setState({ open: true, message, severity })
  }, [])

  const api = useMemo<FeedbackApi>(
    () => ({
      showSuccess: (message) => show('success', message),
      showError: (message) => show('error', message),
      showInfo: (message) => show('info', message),
    }),
    [show],
  )

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }))
  }, [])

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={AUTO_HIDE_MS}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') close()
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={state.severity} variant="filled" onClose={close} sx={{ width: '100%' }}>
          {state.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  )
}
