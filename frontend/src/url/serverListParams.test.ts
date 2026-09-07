import { describe, expect, it } from 'vitest'
import {
  parseServerListParams,
  serializeServerListParams,
  toServerListApiParams,
  DEFAULT_SERVER_LIST_PARAMS,
} from './serverListParams'

const parse = (qs: string) => parseServerListParams(new URLSearchParams(qs))

describe('parseServerListParams', () => {
  it('空クエリは既定値', () => {
    expect(parse('')).toEqual(DEFAULT_SERVER_LIST_PARAMS)
  })

  it('有効な値をそのまま読む', () => {
    expect(
      parse('q=web&env=production&status=active&tags=a,b&sort=hostname&order=asc&page=3&size=50'),
    ).toEqual({
      q: 'web',
      env: 'production',
      status: 'active',
      tags: ['a', 'b'],
      sort: 'hostname',
      order: 'asc',
      page: 3,
      size: 50,
    })
  })

  it('不正な enum / sort / size / page は既定へ丸める', () => {
    const p = parse('env=prod&status=x&sort=env&order=up&page=0&size=7')
    expect(p.env).toBe('all')
    expect(p.status).toBe('all')
    expect(p.sort).toBe('updatedAt')
    expect(p.order).toBe('desc')
    expect(p.page).toBe(1)
    expect(p.size).toBe(20)
  })

  it('tags は空要素・空白を除去', () => {
    expect(parse('tags=a,,%20,b').tags).toEqual(['a', 'b'])
  })
})

describe('serializeServerListParams', () => {
  it('既定値は URL に出さない', () => {
    expect(serializeServerListParams(DEFAULT_SERVER_LIST_PARAMS)).toEqual({})
  })

  it('非既定値のみ出力（tags はカンマ結合、page は文字列）', () => {
    expect(
      serializeServerListParams({
        ...DEFAULT_SERVER_LIST_PARAMS,
        q: 'db',
        env: 'staging',
        tags: ['x', 'y'],
        page: 2,
      }),
    ).toEqual({ q: 'db', env: 'staging', tags: 'x,y', page: '2' })
  })
})

describe('toServerListApiParams', () => {
  it('page を 0 始まりへ、all / 空はパラメータを省く', () => {
    expect(toServerListApiParams(DEFAULT_SERVER_LIST_PARAMS)).toEqual({
      keyword: undefined,
      environment: undefined,
      status: undefined,
      tags: undefined,
      sort: 'updatedAt',
      order: 'desc',
      page: 0,
      size: 20,
    })
  })

  it('URL の page=1 は API の page=0', () => {
    expect(toServerListApiParams({ ...DEFAULT_SERVER_LIST_PARAMS, page: 1 }).page).toBe(0)
    expect(toServerListApiParams({ ...DEFAULT_SERVER_LIST_PARAMS, page: 5 }).page).toBe(4)
  })

  it('環境フィルタは environment として渡す（env ではない）', () => {
    const api = toServerListApiParams({ ...DEFAULT_SERVER_LIST_PARAMS, env: 'production' })
    expect(api.environment).toBe('production')
  })
})
