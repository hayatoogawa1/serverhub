import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { HttpResponse, http } from 'msw'
import { setUnauthorizedHandler } from '@/api/client'
import { queryKeys } from '@/api/queryKeys'
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider'
import { authenticatedHandlers, mockUser } from '@/mocks/handlers'
import { serverHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { theme } from '@/app/theme'
import { routes } from '@/app/router'

/**
 * ルーター全体を通した画面遷移の確認（06-ui §2）。
 * - ブラウザの戻る / 進む（履歴 pop）で状態が URL から正しく復元されること
 * - 未認証・セッション切れで `/login` へ寄せられること
 * - 未定義ルートが NotFound になること
 *
 * 本物の `routes` を `createMemoryRouter` に載せ、`App.tsx` と同じ 401 ハンドラ配線を張る。
 */
function renderApp(initialEntries: string[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setUnauthorizedHandler(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() })
  })
  const router = createMemoryRouter(routes, { initialEntries })
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <FeedbackProvider>
          <RouterProvider router={router} />
        </FeedbackProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return router
}

afterEach(() => {
  // 次テストの renderApp が上書きするが、宙ぶらりんの client を指したままにしない
  setUnauthorizedHandler(vi.fn())
})

describe('アプリのルーティング', () => {
  it('未認証で保護ルートへアクセスすると /login に置き換わる', async () => {
    // 既定ハンドラ（/auth/me = 401）
    const router = renderApp(['/servers'])

    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })

  it('一覧 → 詳細 → 戻る で一覧の URL 状態が復元される', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    const router = renderApp(['/servers?env=staging'])

    // 一覧（staging 絞り込み）
    const row = await screen.findByText('db-stg-01')
    expect(router.state.location.search).toContain('env=staging')

    // 詳細へ
    await user.click(row)
    await waitFor(() => expect(router.state.location.pathname).toBe('/servers/2'))
    await screen.findByRole('heading', { level: 1, name: 'web-prod-01' })

    // 戻る → 一覧、クエリも元通り
    await act(() => router.navigate(-1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/servers'))
    expect(router.state.location.search).toContain('env=staging')
    expect(await screen.findByText('db-stg-01')).toBeInTheDocument()

    // 進む → 詳細へ復帰
    await act(() => router.navigate(1))
    await waitFor(() => expect(router.state.location.pathname).toBe('/servers/2'))
  })

  it('セッション切れ（保護 API が 401）で /login へ誘導される', async () => {
    let meCalls = 0
    const unauthorized = () =>
      HttpResponse.json(
        { code: 'AUTH_REQUIRED', message: '認証が必要です。', traceId: 't' },
        { status: 401 },
      )
    server.use(
      // 初回の /auth/me だけ成功。invalidate 後の再取得は 401（セッション失効）
      http.get('*/api/v1/auth/me', () => {
        meCalls += 1
        return meCalls === 1 ? HttpResponse.json(mockUser) : unauthorized()
      }),
      http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
      http.get('*/api/v1/servers', () => unauthorized()),
    )
    const router = renderApp(['/servers'])

    // 一覧 API 401 → client インターセプタが auth/me を invalidate → 401 → AuthGuard が /login へ
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'), { timeout: 3000 })
    expect(await screen.findByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('未定義ルートは NotFound を表示する', async () => {
    server.use(...authenticatedHandlers)
    renderApp(['/no-such-page'])

    expect(await screen.findByText(/ページが見つかりません/)).toBeInTheDocument()
  })
})
