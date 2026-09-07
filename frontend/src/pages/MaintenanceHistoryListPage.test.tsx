import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { HttpResponse, http } from 'msw'
import { authenticatedHandlers } from '@/mocks/handlers'
import { maintenanceHandlers, serverHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MaintenanceHistoryListPage } from './MaintenanceHistoryListPage'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="loc">{location.pathname + location.search}</div>
}

function renderPage(entry = '/maintenance-histories') {
  return renderWithProviders(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/maintenance-histories" element={<MaintenanceHistoryListPage />} />
        <Route path="/servers/:id" element={<div>SERVER DETAIL</div>} />
      </Routes>
    </MemoryRouter>,
    { route: null },
  )
}

describe('MaintenanceHistoryListPage', () => {
  it('Summary の項目のみ表示（作業内容・結果の列は無い）', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers())
    renderPage()

    expect(await screen.findByText('web-prod-01')).toBeInTheDocument()
    expect(screen.getByText('legacy-db-99')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: '作業内容' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: '結果・備考' })).not.toBeInTheDocument()
  })

  it('削除済みサーバーの行は「削除済み」バッジ付きで、クリックしても遷移しない', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers())
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('legacy-db-99')
    expect(screen.getByText('削除済み')).toBeInTheDocument()
    await user.click(screen.getByText('legacy-db-99'))
    expect(screen.queryByText('SERVER DETAIL')).not.toBeInTheDocument()
  })

  it('通常サーバーの行クリックで詳細へ遷移する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers())
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByText('web-prod-01'))
    expect(await screen.findByText('SERVER DETAIL')).toBeInTheDocument()
  })

  it('0 件で空状態', async () => {
    server.use(
      ...authenticatedHandlers,
      ...serverHandlers(),
      ...maintenanceHandlers({ summaries: [] }),
    )
    renderPage()

    expect(await screen.findByText('メンテナンス履歴がまだ登録されていません')).toBeInTheDocument()
  })

  it('URL の serverId で絞り込まれ、API に serverId が渡る', async () => {
    let requested: string | null = null
    server.use(
      ...authenticatedHandlers,
      ...serverHandlers(),
      http.get('*/api/v1/maintenance-histories', ({ request }) => {
        requested = new URL(request.url).searchParams.get('serverId')
        return HttpResponse.json({
          content: [
            {
              id: 10,
              serverId: 1,
              serverHostname: 'web-prod-01',
              serverDeleted: false,
              performedDate: '2026-08-15',
              type: 'patch',
              worker: 'ops-a',
            },
          ],
          page: { number: 0, size: 20, totalElements: 1, totalPages: 1 },
        })
      }),
    )

    renderPage('/maintenance-histories?serverId=1')
    await screen.findByText('web-prod-01')

    await waitFor(() => expect(requested).toBe('1'))
  })

  it('ソートヘッダークリックで URL に sort/order が付く', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers())
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('web-prod-01')

    await user.click(screen.getByRole('button', { name: '実施日' }))
    await waitFor(() => {
      const loc = screen.getByTestId('loc').textContent ?? ''
      expect(loc).toContain('order=asc')
    })
  })
})
