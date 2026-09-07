import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('編集ボタンでフォームモーダルが開く', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderDetail('/servers/1')
    await screen.findByRole('heading', { level: 1, name: serverDetailFixture.hostname })

    await user.click(screen.getByRole('button', { name: '編集' }))

    expect(await screen.findByRole('heading', { name: /サーバーを編集/ })).toBeInTheDocument()
  })

  it('削除は確認ダイアログ経由・成功で一覧へ遷移（「retired へ移行」表現を使わない）', async () => {
    const spy: { deleteCalled?: boolean } = {}
    server.use(...authenticatedHandlers, ...serverHandlers({ spy, deleteOutcome: 'success' }))
    const user = userEvent.setup()
    renderDetail('/servers/1')
    await screen.findByRole('heading', { level: 1, name: serverDetailFixture.hostname })

    await user.click(screen.getByRole('button', { name: '削除' }))
    const dialogText = await screen.findByText(
      /削除後は一覧・検索・ダッシュボード集計から除外されます/,
    )
    expect(dialogText).toBeInTheDocument()
    expect(screen.queryByText(/retired/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/除籍/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '台帳から削除する' }))

    expect(await screen.findByText('SERVER LIST')).toBeInTheDocument()
    await waitFor(() => expect(spy.deleteCalled).toBe(true))
  })

  it('削除の 404 はトースト表示（ダイアログは閉じる）', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ deleteOutcome: 'not-found' }))
    const user = userEvent.setup()
    renderDetail('/servers/1')
    await screen.findByRole('heading', { level: 1, name: serverDetailFixture.hostname })

    await user.click(screen.getByRole('button', { name: '削除' }))
    await user.click(await screen.findByRole('button', { name: '台帳から削除する' }))

    expect(await screen.findByText('対象が見つかりません。')).toBeInTheDocument()
  })
})
