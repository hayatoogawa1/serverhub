import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { setUnauthorizedHandler } from '@/api/apiClient'
import { queryKeys } from '@/api/queryKeys'
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider'
import { queryClient } from './queryClient'
import { router } from './router'
import { theme } from './theme'

/**
 * `/auth/login` 以外の 401 を検知したら認証クエリを invalidate する（06-ui D-UI-03）。
 * `AuthGuard` がその結果を見て宣言的に `/login` へリダイレクトする。
 * インターセプタから直接 `navigate()` はしない（命令的ルーティングの分散を避ける）。
 */
setUnauthorizedHandler(() => {
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() })
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <FeedbackProvider>
          <RouterProvider router={router} />
        </FeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
