import { apiClient } from '@/api/client'
import { toApiError } from '@/api/errors'
import type { LoginInput, User } from '@/types/auth'

/**
 * 認証 API（02-api §3.1）。ログイン・ログアウトはフィルタ/ハンドラ完結のため
 * REST リソースではなくアクション（`/auth/login` `/auth/logout`）。
 */
export interface AuthApi {
  /** 現在のログインユーザー。未ログインは 401（→ `ApiError`）。CSRF Cookie の発行も兼ねる。 */
  getMe(): Promise<User>
  /** ログイン。成功で 200 + ユーザー、失敗で 401 `AUTH_BAD_CREDENTIALS` / 400（形式）。 */
  login(input: LoginInput): Promise<User>
  /** ログアウト。成功で 204。 */
  logout(): Promise<void>
}

class AuthApiImpl implements AuthApi {
  async getMe(): Promise<User> {
    try {
      const { data } = await apiClient.get<User>('/auth/me')
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async login(input: LoginInput): Promise<User> {
    try {
      const { data } = await apiClient.post<User>('/auth/login', input)
      return data
    } catch (error) {
      throw toApiError(error)
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } catch (error) {
      throw toApiError(error)
    }
  }
}

export const authApi: AuthApi = new AuthApiImpl()
