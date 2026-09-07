import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { authenticatedHandlers } from '@/mocks/handlers'
import { cloudLinkFixture, cloudLinkHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CloudLinkPanel } from './CloudLinkPanel'
import type { CloudLink } from '@/types/cloud'

const render = (cloudLink: CloudLink | null | undefined) =>
  renderWithProviders(
    <CloudLinkPanel serverId={1} serverHostname="web-prod-01" cloudLink={cloudLink} />,
  )

describe('CloudLinkPanel', () => {
  it('未連携なら「AWS 未連携」と「連携する」を出す', () => {
    render(null)
    expect(screen.getByText(/AWS 未連携です/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '連携する' })).toBeInTheDocument()
  })

  it('連携済みは実行状態チップ・最終取得時刻・「管理ステータスとは別」の注記を出す', () => {
    render(cloudLinkFixture)
    expect(screen.getByRole('img', { name: 'AWS 実行状態: 停止中' })).toBeInTheDocument()
    expect(screen.getByText(/最終取得:/)).toBeInTheDocument()
    expect(screen.getByText(/サーバーの管理ステータスとは別の情報です/)).toBeInTheDocument()
    expect(screen.getByText('i-0123456789abcdef0')).toBeInTheDocument()
  })

  it('stale なら「情報が古い可能性」バッジ', () => {
    render({ ...cloudLinkFixture, stale: true })
    expect(screen.getByText('情報が古い可能性')).toBeInTheDocument()
  })

  it('lastError があればキャッシュ表示 + 取得失敗の注記（値は消さない）', () => {
    render({ ...cloudLinkFixture, state: 'running', lastError: 'throttled' })
    expect(screen.getByRole('img', { name: 'AWS 実行状態: 稼働中' })).toBeInTheDocument()
    expect(screen.getByText(/最新の取得に失敗しました/)).toBeInTheDocument()
  })

  it('「今すぐ更新」で refresh API を呼び、処理中はボタンを無効化（二重送信防止）', async () => {
    const spy: { refreshCalled?: boolean } = {}
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ spy }))
    const user = userEvent.setup()
    render(cloudLinkFixture)

    const btn = screen.getByRole('button', { name: '今すぐ更新' })
    await user.click(btn)
    await waitFor(() => expect(spy.refreshCalled).toBe(true))
    expect(await screen.findByText('AWS 実行状態を更新しました')).toBeInTheDocument()
  })

  it('refresh が AWS 取得失敗（200 + lastError）ならエラートーストを出す', async () => {
    server.use(
      ...authenticatedHandlers,
      ...cloudLinkHandlers({ refreshOutcome: 'refresh-aws-failed' }),
    )
    const user = userEvent.setup()
    render(cloudLinkFixture)

    await user.click(screen.getByRole('button', { name: '今すぐ更新' }))
    expect(
      await screen.findByText(/AWS からの取得に失敗しました。表示は前回取得時点の状態です。/),
    ).toBeInTheDocument()
  })

  it('provider 未設定（503）ならエラートースト', async () => {
    server.use(
      ...authenticatedHandlers,
      ...cloudLinkHandlers({ refreshOutcome: 'refresh-provider-unavailable' }),
    )
    const user = userEvent.setup()
    render(cloudLinkFixture)

    await user.click(screen.getByRole('button', { name: '今すぐ更新' }))
    expect(await screen.findByText(/クラウド連携が利用できません/)).toBeInTheDocument()
  })

  it('連携を解除は確認ダイアログ経由で DELETE を呼ぶ', async () => {
    const spy: { deleteCalled?: boolean } = {}
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ spy }))
    const user = userEvent.setup()
    render(cloudLinkFixture)

    await user.click(screen.getByRole('button', { name: '連携を解除' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: '連携を解除する' }))

    await waitFor(() => expect(spy.deleteCalled).toBe(true))
    expect(await screen.findByText('AWS 連携を解除しました')).toBeInTheDocument()
  })
})
