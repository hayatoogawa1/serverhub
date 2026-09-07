import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { authenticatedHandlers } from '@/mocks/handlers'
import { maintenanceHandlers, serverHandlers } from '@/mocks/serverFixtures'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MaintenanceHistoryFormModal } from './MaintenanceHistoryFormModal'

/** サーバー詳細から起動した想定（対象サーバー固定）でフォームを埋める。 */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('実施日 *'), '2026-09-08')
  await user.click(screen.getByRole('radio', { name: 'パッチ適用' }))
  await user.type(screen.getByLabelText('作業者 *'), 'ops-a')
  await user.type(screen.getByLabelText('作業内容 *'), 'セキュリティパッチ適用')
}

describe('MaintenanceHistoryFormModal', () => {
  it('固定サーバー時はホスト名を読み取り専用で表示し、書き込み専用ポリシーの注記を出す', () => {
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers())
    renderWithProviders(
      <MaintenanceHistoryFormModal
        fixedServerId={1}
        fixedServerHostname="web-prod-01"
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('対象サーバー')).toHaveValue('web-prod-01')
    expect(screen.getByText(/登録後の編集・削除はできません/)).toBeInTheDocument()
  })

  it('必須未入力で送信するとバリデーションエラーを出し API を呼ばない', async () => {
    const spy = {}
    server.use(...authenticatedHandlers, ...serverHandlers(), ...maintenanceHandlers({ spy }))
    const user = userEvent.setup()
    renderWithProviders(
      <MaintenanceHistoryFormModal
        fixedServerId={1}
        fixedServerHostname="web-prod-01"
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '記録する' }))

    expect(await screen.findByText('実施日は必須です。')).toBeInTheDocument()
    expect(screen.getByText('種別を選択してください。')).toBeInTheDocument()
    expect(screen.getByText('作業者は必須です。')).toBeInTheDocument()
    expect(screen.getByText('作業内容は必須です。')).toBeInTheDocument()
    expect((spy as { create?: unknown }).create).toBeUndefined()
  })

  it('登録成功で onCreated を呼び、body に固定サーバー ID を含む', async () => {
    const spy: { create?: unknown } = {}
    const onCreated = vi.fn()
    server.use(
      ...authenticatedHandlers,
      ...serverHandlers(),
      ...maintenanceHandlers({ spy, createOutcome: 'success' }),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <MaintenanceHistoryFormModal
        fixedServerId={1}
        fixedServerHostname="web-prod-01"
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    )

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '記録する' }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1))
    expect(spy.create).toMatchObject({
      serverId: 1,
      performedDate: '2026-09-08',
      type: 'patch',
      worker: 'ops-a',
    })
  })

  it('対象サーバーが 404 なら上部にエラーを表示する', async () => {
    server.use(
      ...authenticatedHandlers,
      ...serverHandlers(),
      ...maintenanceHandlers({ createOutcome: 'server-not-found' }),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <MaintenanceHistoryFormModal
        fixedServerId={1}
        fixedServerHostname="web-prod-01"
        onClose={vi.fn()}
      />,
    )

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '記録する' }))

    expect(await screen.findByText('対象が見つかりません。')).toBeInTheDocument()
  })

  it('400 errors[] の field を該当フィールドへ反映する', async () => {
    server.use(
      ...authenticatedHandlers,
      ...serverHandlers(),
      ...maintenanceHandlers({ createOutcome: 'validation' }),
    )
    const user = userEvent.setup()
    renderWithProviders(
      <MaintenanceHistoryFormModal
        fixedServerId={1}
        fixedServerHostname="web-prod-01"
        onClose={vi.fn()}
      />,
    )

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: '記録する' }))

    expect(await screen.findByText('作業内容は必須です。')).toBeInTheDocument()
  })
})
