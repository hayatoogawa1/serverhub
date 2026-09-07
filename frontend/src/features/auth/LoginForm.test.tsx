import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginHandler } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  const onSuccess = vi.fn()

  beforeEach(() => {
    onSuccess.mockReset()
  })

  it('未入力で送信するとクライアント側の必須エラーを出し、API を呼ばない', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('メールアドレスは必須です。')).toBeInTheDocument()
    expect(screen.getByText('パスワードは必須です。')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('資格情報が不正なら共通メッセージを上部に表示する', async () => {
    server.use(loginHandler('bad-credentials'))
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@serverhub.local')
    await user.type(screen.getByLabelText('パスワード'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(
      await screen.findByText('メールアドレスまたはパスワードが正しくありません。'),
    ).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('ログイン成功で onSuccess を呼ぶ', async () => {
    server.use(loginHandler('success'))
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@serverhub.local')
    await user.type(screen.getByLabelText('パスワード'), 'password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('サーバーの 400 フィールドエラー（errors[]）を該当フィールドに割り当てる', async () => {
    // クライアント検証は通る形式にして、サーバー側 400 の errors[] 反映を確認する
    server.use(loginHandler('validation'))
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByLabelText('メールアドレス'), 'admin@serverhub.local')
    await user.type(screen.getByLabelText('パスワード'), 'password')
    await user.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(
      await screen.findByText('メールアドレスの形式が正しくありません。'),
    ).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })
})
