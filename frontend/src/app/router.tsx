import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { MaintenanceHistoryListPage } from '@/pages/MaintenanceHistoryListPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ServerDetailPage } from '@/pages/ServerDetailPage'
import { ServerListPage } from '@/pages/ServerListPage'

/**
 * ルート定義（基本設計 06-ui §2.1）。
 * - `/login` は未認証専用
 * - それ以外は `AuthGuard` → `AppLayout`（共通ヘッダー/サイドナビ）配下
 * - モーダル画面（SC-05/06/08）は独立ルートを持たない（D-UI-02）
 *
 * `router` とは別に配列を公開しておき、テストは同じ木を `createMemoryRouter` で使う。
 */
export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'servers', element: <ServerListPage /> },
          { path: 'servers/:id', element: <ServerDetailPage /> },
          { path: 'maintenance-histories', element: <MaintenanceHistoryListPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
