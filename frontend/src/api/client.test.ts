import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpResponse, http } from 'msw'
import { apiClient, setUnauthorizedHandler } from '@/api/client'
import { server } from '@/mocks/server'

const unauthorized = () =>
  HttpResponse.json({ code: 'AUTH_REQUIRED', message: 'x', traceId: 't' }, { status: 401 })

afterEach(() => setUnauthorizedHandler(vi.fn()))

describe('apiClient レスポンスインターセプタ（06-ui D-UI-03）', () => {
  it('保護リソースの 401 で unauthorizedHandler を呼ぶ', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    server.use(http.get('*/api/v1/servers', unauthorized))

    await expect(apiClient.get('/servers')).rejects.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('認証エンドポイント自身（/auth/me・/auth/login・/auth/logout）の 401 では呼ばない', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    server.use(
      http.get('*/api/v1/auth/me', unauthorized),
      http.post('*/api/v1/auth/login', unauthorized),
      http.post('*/api/v1/auth/logout', unauthorized),
    )

    await expect(apiClient.get('/auth/me')).rejects.toThrow()
    await expect(apiClient.post('/auth/login', {})).rejects.toThrow()
    await expect(apiClient.post('/auth/logout')).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it('401 以外では呼ばない', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    server.use(
      http.get('*/api/v1/servers', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'x', traceId: 't' }, { status: 500 }),
      ),
    )

    await expect(apiClient.get('/servers')).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })
})
