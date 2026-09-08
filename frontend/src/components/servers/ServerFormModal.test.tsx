import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { authenticatedHandlers } from '@/mocks/handlers'
import { serverDetailFixture, serverHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ServerFormModal } from './ServerFormModal'

const typeInto = async (user: ReturnType<typeof userEvent.setup>, label: string, value: string) => {
  const field = screen.getByLabelText(label)
  await user.clear(field)
  await user.type(field, value)
}

/** 必須の環境を選択（ステータスは既定 active）。 */
const selectEnvironment = async (user: ReturnType<typeof userEvent.setup>, label = '本番') => {
  await user.click(screen.getByLabelText('環境 *'))
  await user.click(await screen.findByRole('option', { name: label }))
}

describe('ServerFormModal (create)', () => {
  it('必須未入力で送信するとバリデーションエラーを出し API を呼ばない', async () => {
    const spy = {}
    server.use(...authenticatedHandlers, ...serverHandlers({ spy }))
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    expect(await screen.findByText('ホスト名は必須です。')).toBeInTheDocument()
    expect(screen.getByText('環境を選択してください。')).toBeInTheDocument()
    expect((spy as { create?: unknown }).create).toBeUndefined()
  })

  it('hostname 形式エラー（アンダースコア）を検出する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} />)

    await typeInto(user, 'ホスト名 *', 'bad_host')
    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    expect(
      await screen.findByText(/ホスト名に使えない文字 「_」 が含まれています/),
    ).toBeInTheDocument()
  })

  it('IP 形式エラーを検出する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers())
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} />)

    await typeInto(user, 'ホスト名 *', 'web-01')
    await typeInto(user, 'IP アドレス', '999.1.1.1')
    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    expect(
      await screen.findByText(/IPv4 の各組は 0〜255 の数字です（「999」が 0〜255 の範囲外です）/),
    ).toBeInTheDocument()
    // a11y: ホスト名は有効なので、フォーカスは最初の不正フィールド（IP アドレス）へ移る
    await waitFor(() => expect(screen.getByLabelText('IP アドレス')).toHaveFocus())
  })

  it('登録成功で onCreated を呼ぶ（body は環境/ステータスを含む）', async () => {
    const spy: { create?: unknown } = {}
    const onCreated = vi.fn()
    server.use(...authenticatedHandlers, ...serverHandlers({ spy, createOutcome: 'success' }))
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} onCreated={onCreated} />)

    await typeInto(user, 'ホスト名 *', 'web-99')
    await selectEnvironment(user)
    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(spy.create).toMatchObject({
      hostname: 'web-99',
      environment: 'production',
      status: 'active',
    })
  })

  it('409 DUPLICATE_HOSTNAME を hostname フィールドに表示する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ createOutcome: 'duplicate-hostname' }))
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} />)

    await typeInto(user, 'ホスト名 *', 'dup-host')
    await selectEnvironment(user)
    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    expect(await screen.findByText('「dup-host」は既に登録されています。')).toBeInTheDocument()
  })

  it('400 errors[] の field を該当フィールドへ反映する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ createOutcome: 'validation' }))
    const user = userEvent.setup()
    renderWithProviders(<ServerFormModal mode="create" onClose={vi.fn()} />)

    await typeInto(user, 'ホスト名 *', 'web-01')
    await selectEnvironment(user)
    await user.click(screen.getByRole('button', { name: '台帳に登録' }))

    expect(await screen.findByText('ホスト名の形式が正しくありません。')).toBeInTheDocument()
  })
})

describe('ServerFormModal (edit)', () => {
  it('既存値が初期表示され、version を保持して更新する', async () => {
    const spy: { update?: unknown } = {}
    const onUpdated = vi.fn()
    server.use(...authenticatedHandlers, ...serverHandlers({ spy, updateOutcome: 'success' }))
    const user = userEvent.setup()
    renderWithProviders(
      <ServerFormModal
        mode="edit"
        server={serverDetailFixture}
        onClose={vi.fn()}
        onUpdated={onUpdated}
      />,
    )

    expect(screen.getByLabelText('ホスト名 *')).toHaveValue(serverDetailFixture.hostname)
    await typeInto(user, '担当者', 'new-owner')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onUpdated).toHaveBeenCalledTimes(1))
    expect(spy.update).toMatchObject({ version: serverDetailFixture.version, owner: 'new-owner' })
  })

  it('409 OPTIMISTIC_LOCK_CONFLICT で再読み込み確認ダイアログを表示する', async () => {
    server.use(...authenticatedHandlers, ...serverHandlers({ updateOutcome: 'optimistic-lock' }))
    const user = userEvent.setup()
    renderWithProviders(
      <ServerFormModal mode="edit" server={serverDetailFixture} onClose={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(
      await screen.findByText(
        '他のユーザーによってサーバー情報が更新されました。最新のデータを再読み込みしてください。',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })
})
