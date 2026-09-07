import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/Logout'
import { useNavigate } from 'react-router-dom'
import { useFeedback } from '@/components/feedback/context'
import { useAuthQuery, useLogoutMutation } from '@/features/auth/hooks'

/** 共通ヘッダー（requirements §13.3、Stitch `AppHeader`）。ユーザー表示は displayName（role は無い）。 */
export function AppHeader() {
  const navigate = useNavigate()
  const feedback = useFeedback()
  const auth = useAuthQuery()
  const logout = useLogoutMutation()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate('/login', { replace: true })
      },
      onError: (error) => {
        feedback.showError(error.message)
      },
    })
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', zIndex: (t) => t.zIndex.drawer + 1 }}
    >
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
          ServerHub
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {auth.data && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {auth.data.displayName}（{auth.data.email}）
          </Typography>
        )}
        <Button
          size="small"
          color="inherit"
          startIcon={<LogoutIcon fontSize="small" />}
          onClick={handleLogout}
          loading={logout.isPending}
        >
          ログアウト
        </Button>
      </Toolbar>
    </AppBar>
  )
}
