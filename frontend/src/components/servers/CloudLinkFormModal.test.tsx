import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { authenticatedHandlers } from '@/mocks/handlers'
import { cloudLinkFixture, cloudLinkHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CloudLinkFormModal } from './CloudLinkFormModal'

const open = (extra?: Partial<Parameters<typeof CloudLinkFormModal>[0]>) =>
  renderWithProviders(
    <CloudLinkFormModal serverId={1} serverHostname="web-prod-01" onClose={vi.fn()} {...extra} />,
  )

describe('CloudLinkFormModal', () => {
  it('対象サーバーとプロバイダは読み取り専用', () => {
    server.use(...authenticatedHandlers, ...cloudLinkHandlers())
    open()
    expect(screen.getByLabelText('対象サーバー')).toHaveValue('web-prod-01')
    expect(screen.getByLabelText('プロバイダ')).toHaveValue('AWS EC2')
  })

  it('インスタンス ID 形式エラーを検出し API を呼ばない', async () => {
    const spy = {}
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ spy }))
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText('EC2 インスタンス ID *'), 'not-valid')
    await user.click(screen.getByRole('button', { name: '連携する' }))

    expect(await screen.findByText(/インスタンス ID の形式が正しくありません/)).toBeInTheDocument()
    expect((spy as { put?: unknown }).put).toBeUndefined()
  })

  it('登録成功で onSaved を呼び body に provider/externalId を含む', async () => {
    const spy: { put?: unknown } = {}
    const onSaved = vi.fn()
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ spy }))
    const user = userEvent.setup()
    open({ onSaved })

    await user.clear(screen.getByLabelText('EC2 インスタンス ID *'))
    await user.type(screen.getByLabelText('EC2 インスタンス ID *'), 'i-0123456789abcdef0')
    await user.click(screen.getByRole('button', { name: '連携する' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
    expect(spy.put).toMatchObject({ provider: 'aws_ec2', externalId: 'i-0123456789abcdef0' })
  })

  it('409 CLOUD_LINK_CONFLICT を externalId フィールドに表示する', async () => {
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ putOutcome: 'conflict' }))
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText('EC2 インスタンス ID *'), 'i-0123456789abcdef0')
    await user.click(screen.getByRole('button', { name: '連携する' }))

    expect(
      await screen.findByText('このインスタンスは別のサーバーに連携済みです。'),
    ).toBeInTheDocument()
  })

  it('400 errors[] の field を該当フィールドへ反映する', async () => {
    server.use(...authenticatedHandlers, ...cloudLinkHandlers({ putOutcome: 'validation' }))
    const user = userEvent.setup()
    open()

    await user.type(screen.getByLabelText('EC2 インスタンス ID *'), 'i-0123456789abcdef0')
    await user.click(screen.getByRole('button', { name: '連携する' }))

    expect(
      await screen.findByText('インスタンス ID の形式が正しくありません。'),
    ).toBeInTheDocument()
  })

  it('編集モードでは既存値を初期表示し「更新」ボタン', () => {
    server.use(...authenticatedHandlers, ...cloudLinkHandlers())
    open({ current: cloudLinkFixture })
    expect(screen.getByLabelText('EC2 インスタンス ID *')).toHaveValue(cloudLinkFixture.externalId)
    expect(screen.getByRole('button', { name: '更新' })).toBeInTheDocument()
  })
})
