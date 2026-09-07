import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, orDash } from './format'

describe('formatDateTime', () => {
  it('ISO 8601（オフセット付き）を JST の YYYY-MM-DD HH:mm にする', () => {
    expect(formatDateTime('2026-09-01T18:20:00+09:00')).toBe('2026-09-01 18:20')
  })

  it('UTC 表記も JST に変換する', () => {
    expect(formatDateTime('2026-09-01T00:00:00Z')).toBe('2026-09-01 09:00')
  })

  it('null / 空は - を返す', () => {
    expect(formatDateTime(null)).toBe('-')
    expect(formatDateTime(undefined)).toBe('-')
  })

  it('不正な文字列はそのまま返す', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })
})

describe('formatDate', () => {
  it('YYYY-MM-DD はそのまま', () => {
    expect(formatDate('2026-09-01')).toBe('2026-09-01')
  })
  it('null は -', () => {
    expect(formatDate(null)).toBe('-')
  })
})

describe('orDash', () => {
  it.each([
    ['値', '値'],
    ['', '-'],
    [null, '-'],
    [undefined, '-'],
  ])('%s -> %s', (input, expected) => {
    expect(orDash(input)).toBe(expected)
  })
})
