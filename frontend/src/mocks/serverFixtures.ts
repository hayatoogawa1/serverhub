import { http, HttpResponse } from 'msw'
import type { ServerDetail, ServerSummary } from '@/types/server'
import type { MaintenanceHistoryDetail, MaintenanceHistorySummary } from '@/types/maintenance'

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

type MutationOutcome = 'success' | 'duplicate-hostname' | 'optimistic-lock' | 'validation' | 'error'

interface ServerHandlerOptions {
  summaries?: ServerSummary[]
  detail?: ServerDetail
  histories?: MaintenanceHistoryDetail[]
  /** 詳細を 404 にする。 */
  detailNotFound?: boolean
  /** POST /servers の結果。 */
  createOutcome?: MutationOutcome
  /** PUT /servers/:id の結果。 */
  updateOutcome?: MutationOutcome
  /** DELETE /servers/:id の結果。 */
  deleteOutcome?: 'success' | 'not-found' | 'error'
  /** POST / DELETE の呼び出しを記録する（テストで検証）。 */
  spy?: { create?: unknown; update?: unknown; deleteCalled?: boolean }
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
