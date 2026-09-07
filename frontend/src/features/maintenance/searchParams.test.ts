import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAINTENANCE_LIST_PARAMS,
  parseMaintenanceListParams,
  serializeMaintenanceListParams,
  toMaintenanceApiParams,
} from './searchParams'

const parse = (qs: string) => parseMaintenanceListParams(new URLSearchParams(qs))

describe('parseMaintenanceListParams', () => {
  it('空クエリは既定値', () => {
    expect(parse('')).toEqual(DEFAULT_MAINTENANCE_LIST_PARAMS)
  })

  it('serverId / sort / order / page / size を読む', () => {
    expect(parse('serverId=5&sort=createdAt&order=asc&page=2&size=50')).toEqual({
      serverId: 5,
      sort: 'createdAt',
      order: 'asc',
      page: 2,
      size: 50,
    })
  })

  it('不正値は既定へ丸める', () => {
    const p = parse('serverId=abc&sort=worker&order=x&page=0&size=7')
    expect(p.serverId).toBeNull()
    expect(p.sort).toBe('performedDate')
    expect(p.order).toBe('desc')
    expect(p.page).toBe(1)
    expect(p.size).toBe(20)
  })
})

describe('serializeMaintenanceListParams', () => {
  it('既定値は出さない', () => {
    expect(serializeMaintenanceListParams(DEFAULT_MAINTENANCE_LIST_PARAMS)).toEqual({})
  })
  it('serverId / page を出す', () => {
    expect(
      serializeMaintenanceListParams({ ...DEFAULT_MAINTENANCE_LIST_PARAMS, serverId: 3, page: 4 }),
    ).toEqual({ serverId: '3', page: '4' })
  })
})

describe('toMaintenanceApiParams', () => {
  it('page を 0 始まりへ、serverId null は省く', () => {
    expect(toMaintenanceApiParams(DEFAULT_MAINTENANCE_LIST_PARAMS)).toEqual({
      serverId: undefined,
      sort: 'performedDate',
      order: 'desc',
      page: 0,
      size: 20,
    })
    expect(
      toMaintenanceApiParams({ ...DEFAULT_MAINTENANCE_LIST_PARAMS, serverId: 7, page: 3 }),
    ).toMatchObject({ serverId: 7, page: 2 })
  })
})
