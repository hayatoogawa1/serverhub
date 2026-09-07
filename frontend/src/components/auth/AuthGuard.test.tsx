import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { authenticatedHandlers } from '@/mocks/handlers'
import { server } from '@/mocks/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthGuard } from './AuthGuard'

function renderGuardAt(path: string) {
  return renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AuthGuard />}>
          <Route path="/servers" element={<div>PROTECTED</div>} />
        </Route>
        <Route path="/login" element={<div>LOGIN SCREEN</div>} />
      </Routes>
    </MemoryRouter>,
    { route: null },
  )
}

describe('AuthGuard', () => {
  it('未ログイン（401）なら /login へリダイレクトする', async () => {
    // 既定ハンドラが 401
    renderGuardAt('/servers')

    expect(await screen.findByText('LOGIN SCREEN')).toBeInTheDocument()
    expect(screen.queryByText('PROTECTED')).not.toBeInTheDocument()
  })

  it('ログイン済みなら子ルートを描画する', async () => {
    server.use(...authenticatedHandlers)
    renderGuardAt('/servers')

    expect(await screen.findByText('PROTECTED')).toBeInTheDocument()
  })
})
