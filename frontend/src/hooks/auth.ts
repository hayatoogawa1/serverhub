import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { LoginInput, User } from '@/types/auth'

/**
 * 認証状態。`AuthGuard` とヘッダーのユーザー表示が参照する（06-ui §2.2 / §5.1）。
 *
 * - 401（未ログイン）はリトライしない。`isError` かつ `error.status === 401` を「未ログイン」とみなす。
 * - `staleTime: Infinity`：認証状態はログイン/ログアウト mutation で明示更新するため、
 *   バックグラウンド再取得しない（`refetchInterval` も持たない、S8）。
 */
export function useAuthQuery() {
  return useQuery<User, ApiError>({
    queryKey: queryKeys.auth.me(),
    queryFn: () => authApi.getMe(),
    retry: false,
    staleTime: Infinity,
  })
}

export function useLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation<User, ApiError, LoginInput>({
    mutationFn: (input) => authApi.login(input),
    onSuccess: (user) => {
      // 成功レスポンスでキャッシュを更新（再フェッチ不要、06-ui §5.2）
      queryClient.setQueryData(queryKeys.auth.me(), user)
    },
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation<void, ApiError, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // 全キャッシュ破棄（次ユーザーへの残留を避ける、06-ui §5.2）
      queryClient.clear()
    },
  })
}
