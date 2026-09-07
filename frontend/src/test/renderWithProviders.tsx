import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { type ReactElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { theme } from '@/app/theme'
import { FeedbackProvider } from '@/components/feedback/FeedbackProvider'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** MemoryRouter の初期エントリ。null を渡すとルーターで包まない。 */
  route?: string | null
}

/**
 * コンポーネント / ページのテスト用レンダラ。
 * TanStack Query・MUI テーマ・FeedbackProvider・MemoryRouter で包む。
 * テストごとに独立した QueryClient を生成し、リトライは無効化する。
 */
export function renderWithProviders(ui: ReactElement, options: Options = {}): RenderResult {
  const { route = '/', ...renderOptions } = options

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  function Wrapper({ children }: { children: ReactNode }) {
    const tree = (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <FeedbackProvider>{children}</FeedbackProvider>
        </ThemeProvider>
      </QueryClientProvider>
    )
    return route === null ? tree : <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
