import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuthQuery } from '@/hooks/auth'

interface LocationState {
  from?: { pathname: string; search: string }
}

/**
 * SC-01 ログイン。未認証専用（認証済みでアクセスしたら元の遷移先 or "/" へ）。
 * `useAuthQuery` の実行が SPA 起動時の `GET /auth/me`（CSRF Cookie 発行）を兼ねる（02-api §2.2）。
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const auth = useAuthQuery()

  const from = (location.state as LocationState | null)?.from
  const redirectTo = from ? `${from.pathname}${from.search}` : '/'

  if (auth.isPending) {
    return <StatePlaceholder type="loading" title="読み込み中" fullheight />
  }

  if (auth.isSuccess) {
    return <Navigate to={redirectTo} replace />
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card sx={{ width: 400, maxWidth: '100%' }} variant="outlined">
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                ServerHub
              </Typography>
              <Typography variant="body2" color="text.secondary">
                サーバー管理台帳にログイン
              </Typography>
            </Box>
            <LoginForm onSuccess={() => void navigate(redirectTo, { replace: true })} />
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
