import axios, { type AxiosInstance } from 'axios'

/**
 * Backend への唯一の HTTP 入り口。
 *
 * - コンポーネントや hook から直接 axios を import しない（ESLint で禁止）。
 *   必ず `src/api/` 配下の関数を経由し、それらがこの client を使う。
 * - 認証はセッション + Cookie。`withCredentials: true` で Cookie を送受信する。
 * - `baseURL` は `/api`。開発時は Vite の proxy が Backend(8080) に転送する。
 *
 * 認証切れ（401）の共通ハンドリングやエラー正規化のためのインターセプタは
 * Phase 5（認証実装）で追加する。
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})
