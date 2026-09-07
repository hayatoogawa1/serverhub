import { http, HttpResponse } from 'msw'
import type { ServerDetail, ServerSummary } from '@/features/servers/types'
import type { MaintenanceHistoryDetail } from '@/features/maintenance/types'

const API = '*/api/v1'

export const serverDetailFixture: ServerDetail = {
  id: 1,
  hostname: 'web-prod-01',
  ipAddress: '10.0.1.11',
  environment: 'production',
  status: 'active',
  description: 'フロント Web サーバー\n2 台構成の 1 号機',
  os: 'Ubuntu',
  osVersion: '22.04 LTS',
  virtualizationType: 'virtual',
  location: 'tokyo-az1',
  owner: 'インフラチーム 佐藤',
  tags: ['web', 'payments', 'lb-behind'],
  version: 3,
  createdAt: '2026-08-01T09:00:00+09:00',
  updatedAt: '2026-09-01T18:20:00+09:00',
}

export const serverSummariesFixture: ServerSummary[] = [
  {
    id: 1,
    hostname: 'web-prod-01',
    environment: 'production',
    status: 'active',
    tags: ['web', 'payments', 'lb-behind', 'edge'],
    updatedAt: '2026-09-01T18:20:00+09:00',
  },
  {
    id: 2,
    hostname: 'db-stg-01',
    environment: 'staging',
    status: 'maintenance',
    tags: ['db-postgres'],
    updatedAt: '2026-08-20T10:00:00+09:00',
  },
]

export const maintenanceHistoriesFixture: MaintenanceHistoryDetail[] = [
  {
    id: 10,
    performedDate: '2026-08-15',
    type: 'patch',
    worker: 'ops-a',
    content: 'OS セキュリティパッチ適用',
    impact: 'ダウンタイム約 5 分',
    result: '正常完了',
    createdAt: '2026-08-15T21:00:00+09:00',
  },
]

interface ServerHandlerOptions {
  summaries?: ServerSummary[]
  detail?: ServerDetail
  histories?: MaintenanceHistoryDetail[]
  /** 詳細を 404 にする。 */
  detailNotFound?: boolean
}

/** サーバー一覧 / 詳細 / 履歴の MSW ハンドラ（テストで `server.use(...serverHandlers({...}))`）。 */
export function serverHandlers(opts: ServerHandlerOptions = {}) {
  const summaries = opts.summaries ?? serverSummariesFixture
  const detail = opts.detail ?? serverDetailFixture
  const histories = opts.histories ?? maintenanceHistoriesFixture

  return [
    http.get(`${API}/servers`, ({ request }) => {
      const url = new URL(request.url)
      const size = Number(url.searchParams.get('size') ?? '20')
      const page = Number(url.searchParams.get('page') ?? '0')
      const start = page * size
      const content = summaries.slice(start, start + size)
      return HttpResponse.json({
        content,
        page: {
          number: page,
          size,
          totalElements: summaries.length,
          totalPages: Math.max(1, Math.ceil(summaries.length / size)),
        },
      })
    }),
    http.get(`${API}/servers/:id`, () => {
      if (opts.detailNotFound) {
        return HttpResponse.json(
          { code: 'RESOURCE_NOT_FOUND', message: '対象が見つかりません。', traceId: 'test-trace' },
          { status: 404 },
        )
      }
      return HttpResponse.json(detail)
    }),
    http.get(`${API}/servers/:id/maintenance-histories`, ({ request }) => {
      const url = new URL(request.url)
      const size = Number(url.searchParams.get('size') ?? '10')
      return HttpResponse.json({
        content: histories,
        page: {
          number: 0,
          size,
          totalElements: histories.length,
          totalPages: Math.max(1, Math.ceil(histories.length / size)),
        },
      })
    }),
    http.get(`${API}/tags/suggest`, ({ request }) => {
      const prefix = new URL(request.url).searchParams.get('prefix') ?? ''
      const all = ['web', 'web-edge', 'payments', 'db-postgres']
      return HttpResponse.json(all.filter((t) => t.startsWith(prefix)))
    }),
  ]
}
