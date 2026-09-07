import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { authenticatedHandlers } from '@/mocks/handlers'
import { serverHandlers, serverDetailFixture } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ServerDetailPage } from './ServerDetailPage'

function renderDetail(path: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/servers" element={<div>SERVER LIST</div>} />
        <Route path="/servers/:id" element={<ServerDetailPage />} />
      </Routes>
    </MemoryRouter>,
    { route: null },
  )
}

describe('ServerDetailPage', () => {
  it('詳細 API の全項目を表示する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    renderDetail('/servers/1')

    expect(
      await screen.findByRole('heading', { level: 1, name: serverDetailFixture.hostname }),
    ).toBeInTheDocument()
    expect(screen.getByText('10.0.1.11')).toBeInTheDocument()
    expect(screen.getByText('Ubuntu')).toBeInTheDocument()
    expect(screen.getByText('22.04 LTS')).toBeInTheDocument()
    expect(screen.getByText('tokyo-az1')).toBeInTheDocument()
    expect(screen.getByText('インフラチーム 佐藤')).toBeInTheDocument()
    expect(screen.getByText(/フロント Web サーバー/)).toBeInTheDocument()
    // メンテナンス履歴セクション
    expect(await screen.findByText('メンテナンス履歴')).toBeInTheDocument()
    expect(screen.getByText('OS セキュリティパッチ適用')).toBeInTheDocument()
  })

  it('404 のとき専用の Not Found 表示と一覧への導線を出す', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ detailNotFound: true }))
    renderDetail('/servers/999')

    expect(await screen.findByText('サーバーが見つかりません')).toBeInTheDocument()
    expect(
      screen.getByText(/指定されたサーバー（ID: 999）は存在しないか、既に削除されています/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'サーバー一覧に戻る' })).toBeInTheDocument()
  })

  it('不正な ID（数値でない）でも Not Found 表示', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    renderDetail('/servers/abc')

    expect(await screen.findByText('サーバーが見つかりません')).toBeInTheDocument()
  })

  it('履歴が 0 件なら空表示', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ histories: [] }))
    renderDetail('/servers/1')

    expect(await screen.findByText('登録されたメンテナンス履歴はありません')).toBeInTheDocument()
  })
})
