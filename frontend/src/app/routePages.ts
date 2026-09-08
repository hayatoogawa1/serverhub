import { lazy } from 'react'

/**
 * ルートの画面コンポーネント（遅延ロード、Phase 10 #4）。
 *
 * ルート単位でチャンク分割し、初回に不要なコード（`recharts` を含む Dashboard など）を
 * 初期バンドルから外す。ページは名前付き export のため `default` に詰め替える。
 * `LoginPage` は未認証時の最初の描画なので `router.tsx` で即時ロードのまま扱う。
 *
 * lazy コンポーネントだけを export するファイルに分けているのは、`react-refresh` が
 * 「1 ファイル = コンポーネントのみ export」を要求するため（`router.tsx` は `routes`/`router` を export する）。
 */
export const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)

export const ServerListPage = lazy(() =>
  import('@/pages/ServerListPage').then((m) => ({ default: m.ServerListPage })),
)

export const ServerDetailPage = lazy(() =>
  import('@/pages/ServerDetailPage').then((m) => ({ default: m.ServerDetailPage })),
)

export const MaintenanceHistoryListPage = lazy(() =>
  import('@/pages/MaintenanceHistoryListPage').then((m) => ({
    default: m.MaintenanceHistoryListPage,
  })),
)

export const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
