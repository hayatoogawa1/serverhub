import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { email as validateEmail, required } from '@/utils/validation'
import { useLoginMutation } from '@/hooks/auth'

interface LoginFormProps {
  onSuccess: () => void
}

/**
 * ログインフォーム（SC-01 / FR-AUTH-01）。入力チェックは UX のみ。
 * - 400（形式）: `errors[]` をフィールドに反映
 * - 401（資格情報不正）: 上部 Alert に共通メッセージ（ユーザーの存在を示さない）
 */
export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({})
  const login = useLoginMutation()

  const serverFieldErrors = login.error?.fieldErrorMap() ?? {}
  // フィールド単位のエラーが無いもの（401 資格情報不正・500・形式不明の 400）は上部に表示
  const topError = login.error?.fieldErrors.length === 0 ? login.error.message : undefined

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const next = {
      email: required(email, 'メールアドレス') ?? validateEmail(email),
      password: required(password, 'パスワード'),
    }
    setClientErrors(next)
    if (next.email || next.password) return

    login.mutate({ email, password }, { onSuccess })
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2.5}>
        {topError && <Alert severity="error">{topError}</Alert>}
        <TextField
          label="メールアドレス"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={Boolean(clientErrors.email ?? serverFieldErrors.email)}
          helperText={clientErrors.email ?? serverFieldErrors.email}
          autoComplete="username"
          autoFocus
          fullWidth
        />
        <TextField
          label="パスワード"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={Boolean(clientErrors.password ?? serverFieldErrors.password)}
          helperText={clientErrors.password ?? serverFieldErrors.password}
          autoComplete="current-password"
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" loading={login.isPending} fullWidth>
          ログイン
        </Button>
      </Stack>
    </Box>
  )
}
