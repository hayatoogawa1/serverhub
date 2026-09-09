import { http, HttpResponse } from 'msw'
import type { ServerDetail, ServerSummary } from '@/types/server'
import type { MaintenanceHistoryDetail, MaintenanceHistorySummary } from '@/types/maintenance'
import type { CloudLink } from '@/types/cloud'

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
    // 管理ステータスは active（稼働中）だが AWS 実行状態は stopped（別概念）
    cloudState: 'stopped',
    cloudStateFetchedAt: '2026-09-08T10:32:00+09:00',
  },
  {
    id: 2,
    hostname: 'db-stg-01',
    environment: 'staging',
    status: 'maintenance',
    tags: ['db-postgres'],
    updatedAt: '2026-08-20T10:00:00+09:00',
    // AWS 未連携（cloudState 省略）
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

type MutationOutcome = 'success' | 'duplicate-hostname' | 'optimistic-lock' | 'validation' | 'error'

export const cloudLinkFixture: CloudLink = {
  provider: 'aws_ec2',
  externalId: 'i-0123456789abcdef0',
  region: 'ap-northeast-1',
  state: 'stopped',
  stateRaw: 'stopped',
  stateFetchedAt: '2026-09-08T10:32:00+09:00',
  stale: false,
  lastError: null,
}

interface ServerHandlerOptions {
  summaries?: ServerSummary[]
  detail?: ServerDetail
  histories?: MaintenanceHistoryDetail[]
  /** 指定すると `GET /servers/:id` レスポンスに `cloudLink` を含める。 */
  cloudLink?: CloudLink | null
  /** 詳細を 404 にする。 */
  detailNotFound?: boolean
  /** POST /servers の結果。 */
  createOutcome?: MutationOutcome
  /** PUT /servers/:id の結果。 */
  updateOutcome?: MutationOutcome
  /** DELETE /servers/:id の結果。 */
  deleteOutcome?: 'success' | 'not-found' | 'error'
  /** POST /servers/cloud-links/refresh の結果。 */
  bulkCloudRefreshOutcome?: 'success' | 'partial-failure' | 'provider-unavailable'
  /** POST / DELETE の呼び出しを記録する（テストで検証）。 */
  spy?: {
    create?: unknown
    update?: unknown
    deleteCalled?: boolean
    bulkCloudRefreshCalled?: boolean
  }
}

function mutationError(outcome: Exclude<MutationOutcome, 'success'>) {
  switch (outcome) {
    case 'duplicate-hostname':
      return HttpResponse.json(
        {
          code: 'DUPLICATE_HOSTNAME',
          message: '同じホスト名のサーバーが既に存在します。',
          traceId: 't',
        },
        { status: 409 },
      )
    case 'optimistic-lock':
      return HttpResponse.json(
        {
          code: 'OPTIMISTIC_LOCK_CONFLICT',
          message: '他の操作と競合しました。最新の内容を確認してください。',
          traceId: 't',
        },
        { status: 409 },
      )
    case 'validation':
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: '入力内容を確認してください。',
          traceId: 't',
          errors: [{ field: 'hostname', message: 'ホスト名の形式が正しくありません。' }],
        },
        { status: 400 },
      )
    default:
      return HttpResponse.json(
        { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
        { status: 500 },
      )
  }
}

/** サーバー一覧 / 詳細 / 履歴 / 登録 / 編集 / 削除の MSW ハンドラ。 */
export function serverHandlers(opts: ServerHandlerOptions = {}) {
  const summaries = opts.summaries ?? serverSummariesFixture
  const detail = opts.detail ?? serverDetailFixture
  const histories = opts.histories ?? maintenanceHistoriesFixture

  return [
    http.post(`${API}/servers/cloud-links/refresh`, () => {
      if (opts.spy) opts.spy.bulkCloudRefreshCalled = true
      switch (opts.bulkCloudRefreshOutcome) {
        case 'provider-unavailable':
          return HttpResponse.json(
            {
              code: 'CLOUD_PROVIDER_UNAVAILABLE',
              message: 'クラウド連携が利用できません。時間をおいて再度お試しください。',
              traceId: 't',
            },
            { status: 503 },
          )
        case 'partial-failure':
          return HttpResponse.json({ total: 3, updated: 2, notFound: 0, failed: 1 })
        default:
          return HttpResponse.json({ total: 2, updated: 2, notFound: 0, failed: 0 })
      }
    }),
    http.post(`${API}/servers`, async ({ request }) => {
      const body = await request.json()
      if (opts.spy) opts.spy.create = body
      if (opts.createOutcome && opts.createOutcome !== 'success') {
        return mutationError(opts.createOutcome)
      }
      return HttpResponse.json({ ...detail, ...(body as object), id: 99 }, { status: 201 })
    }),
    http.put(`${API}/servers/:id`, async ({ request }) => {
      const body = await request.json()
      if (opts.spy) opts.spy.update = body
      if (opts.updateOutcome && opts.updateOutcome !== 'success') {
        return mutationError(opts.updateOutcome)
      }
      return HttpResponse.json({ ...detail, ...(body as object) })
    }),
    http.delete(`${API}/servers/:id`, () => {
      if (opts.spy) opts.spy.deleteCalled = true
      if (opts.deleteOutcome === 'not-found') {
        return HttpResponse.json(
          { code: 'RESOURCE_NOT_FOUND', message: '対象が見つかりません。', traceId: 't' },
          { status: 404 },
        )
      }
      if (opts.deleteOutcome === 'error') {
        return HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
          { status: 500 },
        )
      }
      return new HttpResponse(null, { status: 204 })
    }),
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
      const withCloud = 'cloudLink' in opts ? { ...detail, cloudLink: opts.cloudLink } : detail
      return HttpResponse.json(withCloud)
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

type CloudLinkOutcome =
  | 'success'
  | 'conflict'
  | 'validation'
  | 'server-not-found'
  | 'refresh-aws-failed'
  | 'refresh-provider-unavailable'

interface CloudLinkHandlerOptions {
  /** `PUT` / `refresh` が返す cloudLink（`success` 時）。 */
  cloudLink?: CloudLink
  putOutcome?: CloudLinkOutcome
  refreshOutcome?: CloudLinkOutcome
  spy?: { put?: unknown; deleteCalled?: boolean; refreshCalled?: boolean }
}

/** SC-04 の cloud-link サブリソース（`PUT` / `DELETE` / `POST refresh`）の MSW ハンドラ。 */
export function cloudLinkHandlers(opts: CloudLinkHandlerOptions = {}) {
  const link = opts.cloudLink ?? cloudLinkFixture

  const errorFor = (outcome: CloudLinkOutcome) => {
    switch (outcome) {
      case 'conflict':
        return HttpResponse.json(
          {
            code: 'CLOUD_LINK_CONFLICT',
            message: 'このインスタンスは別のサーバーに連携済みです。',
            traceId: 't',
          },
          { status: 409 },
        )
      case 'validation':
        return HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: '入力内容を確認してください。',
            traceId: 't',
            errors: [
              { field: 'externalId', message: 'インスタンス ID の形式が正しくありません。' },
            ],
          },
          { status: 400 },
        )
      case 'server-not-found':
        return HttpResponse.json(
          { code: 'RESOURCE_NOT_FOUND', message: '対象が見つかりません。', traceId: 't' },
          { status: 404 },
        )
      case 'refresh-provider-unavailable':
        return HttpResponse.json(
          {
            code: 'CLOUD_PROVIDER_UNAVAILABLE',
            message: 'クラウド連携が利用できません。時間をおいて再度お試しください。',
            traceId: 't',
          },
          { status: 503 },
        )
      default:
        return HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
          { status: 500 },
        )
    }
  }

  return [
    http.put(`${API}/servers/:id/cloud-link`, async ({ request }) => {
      if (opts.spy) opts.spy.put = await request.json()
      if (opts.putOutcome && opts.putOutcome !== 'success') return errorFor(opts.putOutcome)
      return HttpResponse.json(link)
    }),
    http.delete(`${API}/servers/:id/cloud-link`, () => {
      if (opts.spy) opts.spy.deleteCalled = true
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(`${API}/servers/:id/cloud-link/refresh`, () => {
      if (opts.spy) opts.spy.refreshCalled = true
      if (opts.refreshOutcome === 'refresh-provider-unavailable') {
        return errorFor('refresh-provider-unavailable')
      }
      if (opts.refreshOutcome === 'server-not-found') return errorFor('server-not-found')
      if (opts.refreshOutcome === 'refresh-aws-failed') {
        // AWS 取得失敗でも 200: キャッシュ値 + lastError（P8）
        return HttpResponse.json({
          ...link,
          lastError: 'EC2 DescribeInstances failed: throttled',
        })
      }
      return HttpResponse.json({ ...link, state: 'running', stateRaw: 'running' })
    }),
  ]
}

export const maintenanceSummariesFixture: MaintenanceHistorySummary[] = [
  {
    id: 10,
    serverId: 1,
    serverHostname: 'web-prod-01',
    serverDeleted: false,
    performedDate: '2026-08-15',
    type: 'patch',
    worker: 'ops-a',
  },
  {
    id: 11,
    serverId: 5,
    serverHostname: 'legacy-db-99',
    serverDeleted: true,
    performedDate: '2026-07-01',
    type: 'hardware',
    worker: 'ops-b',
  },
]

interface MaintenanceHandlerOptions {
  summaries?: MaintenanceHistorySummary[]
  createOutcome?: 'success' | 'server-not-found' | 'validation' | 'error'
  spy?: { create?: unknown }
}

/** SC-07 一覧 / SC-08 登録の MSW ハンドラ。 */
export function maintenanceHandlers(opts: MaintenanceHandlerOptions = {}) {
  const summaries = opts.summaries ?? maintenanceSummariesFixture
  return [
    http.get(`${API}/maintenance-histories`, ({ request }) => {
      const url = new URL(request.url)
      const size = Number(url.searchParams.get('size') ?? '20')
      const page = Number(url.searchParams.get('page') ?? '0')
      const serverId = url.searchParams.get('serverId')
      const filtered = serverId
        ? summaries.filter((s) => s.serverId === Number(serverId))
        : summaries
      return HttpResponse.json({
        content: filtered.slice(page * size, page * size + size),
        page: {
          number: page,
          size,
          totalElements: filtered.length,
          totalPages: Math.max(1, Math.ceil(filtered.length / size)),
        },
      })
    }),
    http.post(`${API}/maintenance-histories`, async ({ request }) => {
      const body = await request.json()
      if (opts.spy) opts.spy.create = body
      switch (opts.createOutcome) {
        case 'server-not-found':
          return HttpResponse.json(
            { code: 'RESOURCE_NOT_FOUND', message: '対象が見つかりません。', traceId: 't' },
            { status: 404 },
          )
        case 'validation':
          return HttpResponse.json(
            {
              code: 'VALIDATION_ERROR',
              message: '入力内容を確認してください。',
              traceId: 't',
              errors: [{ field: 'content', message: '作業内容は必須です。' }],
            },
            { status: 400 },
          )
        case 'error':
          return HttpResponse.json(
            { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
            { status: 500 },
          )
        default:
          return HttpResponse.json(
            {
              id: 99,
              performedDate: (body as { performedDate: string }).performedDate,
              type: (body as { type: string }).type,
              worker: (body as { worker: string }).worker,
              content: (body as { content: string }).content,
              impact: null,
              result: null,
              createdAt: '2026-09-08T10:00:00+09:00',
            },
            { status: 201 },
          )
      }
    }),
  ]
}

export const dashboardSummaryFixture = {
  totalServers: 42,
  serversByEnvironment: [
    { environment: 'production', count: 20 },
    { environment: 'staging', count: 15 },
    { environment: 'development', count: 7 },
  ],
  serversByStatus: [
    { status: 'active', count: 30 },
    { status: 'maintenance', count: 8 },
    { status: 'retired', count: 4 },
  ],
  topTags: [
    { tagName: 'web', count: 12 },
    { tagName: 'db-postgres', count: 6 },
  ],
  otherTagsCount: 3,
  recentMaintenanceHistories: [
    {
      id: 10,
      serverId: 1,
      serverHostname: 'web-prod-01',
      performedDate: '2026-08-15',
      type: 'patch',
    },
  ],
}

/** SC-02 ダッシュボードの MSW ハンドラ。 */
export function dashboardHandlers(opts: { summary?: unknown; error?: boolean } = {}) {
  return [
    http.get(`${API}/dashboard/summary`, () => {
      if (opts.error) {
        return HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'システムエラーが発生しました。', traceId: 't' },
          { status: 500 },
        )
      }
      return HttpResponse.json(opts.summary ?? dashboardSummaryFixture)
    }),
  ]
}
