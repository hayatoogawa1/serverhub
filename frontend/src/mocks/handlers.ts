import { http, HttpResponse, type RequestHandler } from 'msw'

/**
 * MSW の共通ハンドラ。feature 固有のハンドラは各テストで `server.use(...)` で上書きする。
 * ここには「どのテストでも成立していてほしい既定」を置く（未ログイン state を既定にする）。
 */

const API = '*/api/v1'

export const mockUser = { id: 1, email: 'admin@serverhub.local', displayName: 'デモ管理者' }

function apiError(code: string, message: string, status: number) {
  return HttpResponse.json({ code, message, traceId: 'test-trace' }, { status })
}

/** 既定: 未ログイン。ログイン系のハッピーパスが要るテストは `server.use(authenticatedHandlers)`。 */
export const handlers: RequestHandler[] = [
  http.get(`${API}/auth/me`, () => apiError('AUTH_REQUIRED', '認証が必要です。', 401)),
]

/** ログイン済みシナリオ用のハンドラ集合。 */
export const authenticatedHandlers: RequestHandler[] = [
  http.get(`${API}/auth/me`, () => HttpResponse.json(mockUser)),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
]

/** ログイン成功／失敗を制御するハンドラ。 */
export function loginHandler(outcome: 'success' | 'bad-credentials' | 'validation') {
  return http.post(`${API}/auth/login`, async ({ request }) => {
    if (outcome === 'success') {
      await request.json()
      return HttpResponse.json(mockUser)
    }
    if (outcome === 'validation') {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: '入力内容を確認してください。',
          traceId: 'test-trace',
          errors: [{ field: 'email', message: 'メールアドレスの形式が正しくありません。' }],
        },
        { status: 400 },
      )
    }
    return apiError(
      'AUTH_BAD_CREDENTIALS',
      'メールアドレスまたはパスワードが正しくありません。',
      401,
    )
  })
}
