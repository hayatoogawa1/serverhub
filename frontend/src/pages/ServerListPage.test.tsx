import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { HttpResponse, http } from 'msw'
import { authenticatedHandlers } from '@/mocks/handlers'
import { serverHandlers, serverSummariesFixture } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ServerListPage } from './ServerListPage'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-search">{location.search}</div>
}

function renderList(initialEntry = '/servers') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/servers" element={<ServerListPage />} />
        <Route path="/servers/:id" element={<div>DETAIL PAGE</div>} />
      </Routes>
    </MemoryRouter>,
    { route: null },
  )
}

describe('ServerListPage', () => {
  it('API の行を表示する（ipAddress / description 列は無い）', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    renderList()

    expect(await screen.findByText('web-prod-01')).toBeInTheDocument()
    expect(screen.getByText('db-stg-01')).toBeInTheDocument()
    // 一覧 API に無い項目は列見出しに出さない
    expect(screen.queryByRole('columnheader', { name: 'IP アドレス' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: '用途・説明' })).not.toBeInTheDocument()
  })

  it('行クリックで詳細へ遷移する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderList()

    await user.click(await screen.findByText('web-prod-01'))
    expect(await screen.findByText('DETAIL PAGE')).toBeInTheDocument()
  })

  it('0 件のとき空状態を表示する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ summaries: [] }))
    renderList()

    expect(await screen.findByText('サーバーがまだ登録されていません')).toBeInTheDocument()
  })

  it('API エラー時にエラー表示と再読み込みを出す', async () => {
    server.use(
      ...authenticatedHandlers,
      http.get('*/api/v1/servers', () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
          { status: 500 },
        ),
      ),
    )
    renderList()

    expect(await screen.findByText('サーバー一覧の取得に失敗しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('環境フィルタを変えると URL に env= が付く', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderList()
    await screen.findByText('web-prod-01')

    await user.click(screen.getByLabelText('環境'))
    await user.click(await screen.findByRole('option', { name: '本番' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-search').textContent).toContain('env=production'),
    )
  })

  it('ソートヘッダークリックで URL の sort / order が変わる', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderList()
    await screen.findByText('web-prod-01')

    await user.click(screen.getByRole('button', { name: 'ホスト名' }))
    await waitFor(() => {
      const search = screen.getByTestId('location-search').textContent ?? ''
      expect(search).toContain('sort=hostname')
      expect(search).toContain('order=asc')
    })
  })

  it('URL の page は 1 始まりで、API へ 0 始まりで渡る', async () => {
    let requestedPage: string | null = null
    server.use(
      ...authenticatedHandlers,
      http.get('*/api/v1/servers', ({ request }) => {
        requestedPage = new URL(request.url).searchParams.get('page')
        return HttpResponse.json({
          content: serverSummariesFixture,
          page: { number: 1, size: 20, totalElements: 40, totalPages: 2 },
        })
      }),
    )
    renderList('/servers?page=2')
    await screen.findByText('web-prod-01')

    await waitFor(() => expect(requestedPage).toBe('1'))
  })
})
