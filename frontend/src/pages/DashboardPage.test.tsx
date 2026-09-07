import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { authenticatedHandlers } from '@/mocks/handlers'
import { dashboardHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { DashboardPage } from './DashboardPage'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="loc">{location.pathname + location.search}</div>
}

function renderDashboard() {
  return renderWithProviders(
    <MemoryRouter initialEntries={['/']}>
      <LocationProbe />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/servers" element={<div>SERVER LIST</div>} />
        <Route path="/servers/:id" element={<div>SERVER DETAIL</div>} />
        <Route path="/maintenance-histories" element={<div>MAINTENANCE LIST</div>} />
      </Routes>
    </MemoryRouter>,
    { route: null },
  )
}

describe('DashboardPage', () => {
  it('集計を表示する（総数・環境別・ステータス別・タグ別・直近メンテ）', async () => {
    server.use(...authenticatedHandlers, ...dashboardHandlers())
    renderDashboard()

    const totalCard = await screen.findByRole('button', { name: /サーバー総数/ })
    expect(totalCard.textContent).toContain('42')
    expect(screen.getByRole('img', { name: '環境区分別のサーバー数' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'タグ別のサーバー数' })).toBeInTheDocument()
    expect(screen.getByText('web-prod-01')).toBeInTheDocument()
    expect(screen.getByText('パッチ適用')).toBeInTheDocument()
  })

  it('総数カードのクリックでサーバー一覧へ遷移する', async () => {
    server.use(...authenticatedHandlers, ...dashboardHandlers())
    const user = userEvent.setup()
    renderDashboard()

    await user.click(await screen.findByRole('button', { name: /サーバー総数/ }))
    expect(await screen.findByText('SERVER LIST')).toBeInTheDocument()
  })

  it('ステータス行クリックで status 絞り込み一覧へ遷移する', async () => {
    server.use(...authenticatedHandlers, ...dashboardHandlers())
    const user = userEvent.setup()
    renderDashboard()

    await screen.findByRole('button', { name: /サーバー総数/ })
    await user.click(screen.getByText('稼働中'))
    await waitFor(() =>
      expect(screen.getByTestId('loc').textContent).toBe('/servers?status=active'),
    )
  })

  it('直近メンテの行クリックで対象サーバー詳細へ遷移する', async () => {
    server.use(...authenticatedHandlers, ...dashboardHandlers())
    const user = userEvent.setup()
    renderDashboard()

    await user.click(await screen.findByText('web-prod-01'))
    expect(await screen.findByText('SERVER DETAIL')).toBeInTheDocument()
  })

  it('API エラー時にエラー表示と再読み込みを出す', async () => {
    server.use(...authenticatedHandlers, ...dashboardHandlers({ error: true }))
    renderDashboard()

    expect(await screen.findByText('ダッシュボードの取得に失敗しました')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })

  it('データ 0 件でも 0 埋めで表示が成立する', async () => {
    server.use(
      ...authenticatedHandlers,
      ...dashboardHandlers({
        summary: {
          totalServers: 0,
          serversByEnvironment: [
            { environment: 'production', count: 0 },
            { environment: 'staging', count: 0 },
            { environment: 'development', count: 0 },
          ],
          serversByStatus: [
            { status: 'active', count: 0 },
            { status: 'maintenance', count: 0 },
            { status: 'retired', count: 0 },
          ],
          topTags: [],
          otherTagsCount: 0,
          recentMaintenanceHistories: [],
        },
      }),
    )
    renderDashboard()

    const zeroCard = await screen.findByRole('button', { name: /サーバー総数/ })
    expect(zeroCard.textContent).toContain('0')
    expect(screen.getByText('タグの付いたサーバーはありません')).toBeInTheDocument()
    expect(screen.getByText('直近のメンテナンス履歴はありません')).toBeInTheDocument()
  })
})
