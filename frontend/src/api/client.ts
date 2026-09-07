import axios, { AxiosError, type AxiosInstance } from 'axios'

/**
 * Backend への唯一の HTTP 入り口。
 *
 * - コンポーネントや hook から直接 axios を import しない（ESLint で禁止）。
 *   必ず `src/features/<d>/api` の関数を経由し、それらがこの client を使う。
 * - 認証はセッション + Cookie。`withCredentials: true` で送受信する。
 * - CSRF: Backend は `XSRF-TOKEN` Cookie を発行し `X-XSRF-TOKEN` ヘッダを要求する。
 *   axios は既定でこの Cookie 名 / ヘッダ名を使って変更系リクエストに自動付与する
 *   （SPA 起動時に `GET /api/v1/auth/me` を呼んで Cookie を発行させておく、02-api §2.2）。
 * - `baseURL` は `/api/v1`（02-api D-API-01 / 01-architecture §2.4）。開発時は Vite proxy が
 *   `/api` を Backend(8080) に転送する。
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  // 配列パラメータは `tags=a&tags=b`（ブラケットなし・繰り返し）で送る。
  // Spring の `@RequestParam List<String>` が期待する形式（結合テストで実証済み）。
  paramsSerializer: { indexes: null },
})

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null

/**
 * 認証エンドポイント以外で 401 が返った（＝セッション切れ）ときに呼ばれるハンドラを
 * 登録する（App 起動時に 1 度だけ）。
 *
 * 06-ui D-UI-03: インターセプタから `navigate()` はせず、`['auth','me']` を invalidate して
 * `AuthGuard` に宣言的にリダイレクトさせる。ルーティングの命令的分散を避ける。
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      // 認証エンドポイント自身（/auth/me・/auth/login・/auth/logout）の 401 は
      // 呼び出し側（LoginForm / useAuthQuery）が扱う。ここで `['auth','me']` を
      // invalidate すると、未認証時に `/auth/me` が自分自身を無限に再取得してしまう。
      if (!url.includes('/auth/')) {
        unauthorizedHandler?.()
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error('request failed'))
  },
)
