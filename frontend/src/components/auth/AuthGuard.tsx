import Button from '@mui/material/Button'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { useAuthQuery } from '@/hooks/auth'

/**
 * 認証ガード（06-ui §2.2）。Frontend のルートガードは UX 目的、実体は Backend（§10.1.5）。
 *
 * - 判定中: 全画面ローディング（ちらつき防止）
 * - 未ログイン（401）: `/login` へ replace。遷移先を `location` に積み、ログイン後に戻す
 * - それ以外の取得失敗: エラー表示（再試行可）
 * - ログイン済み: 子ルートを描画
 */
export function AuthGuard() {
  const location = useLocation()
  const auth = useAuthQuery()

  if (auth.isPending) {
    return <StatePlaceholder type="loading" title="読み込み中" fullheight />
  }

  if (auth.isError) {
    if (auth.error.status === 401) {
      return <Navigate to="/login" replace state={{ from: location }} />
    }
    return (
      <StatePlaceholder
        type="error"
        title="認証状態を確認できませんでした"
        description={auth.error.message}
        fullheight
        actionButton={
          <Button variant="outlined" onClick={() => void auth.refetch()}>
            再試行
          </Button>
        }
      />
    )
  }

  return <Outlet />
}
