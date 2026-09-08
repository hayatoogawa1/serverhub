import { Suspense } from 'react'
import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'
import { LoginPage } from '@/pages/LoginPage'
import {
  DashboardPage,
  MaintenanceHistoryListPage,
  NotFoundPage,
  ServerDetailPage,
  ServerListPage,
} from './routePages'

/**
 * ルート定義（基本設計 06-ui §2.1）。
 * - `/login` は未認証専用（即時ロード。未認証時の最初の描画でスピナーを挟まない）
 * - それ以外は `AuthGuard` → `AppLayout`（共通ヘッダー/サイドナビ）配下
 * - モーダル画面（SC-05/06/08）は独立ルートを持たない（D-UI-02）
 * - 画面はルート単位で遅延ロード（`routePages.ts`、Phase 10 #4）。読み込み中は
 *   全体を 1 つの `Suspense` 境界でカバーする
 *
 * `router` とは別に配列を公開しておき、テストは同じ木を `createMemoryRouter` で使う。
 */
export const routes: RouteObject[] = [
  {
    element: (
      <Suspense fallback={<StatePlaceholder type="loading" title="読み込み中…" fullheight />}>
        <Outlet />
      </Suspense>
    ),
    children: [
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
    ],
  },
]

export const router = createBrowserRouter(routes)
