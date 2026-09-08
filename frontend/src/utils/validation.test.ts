import { describe, expect, it } from 'vitest'
import { email, hostname, ipAddress, maxLength, required } from './validation'

describe('required', () => {
  it('空・空白は必須エラー', () => {
    expect(required('', 'ホスト名')).toBe('ホスト名は必須です。')
    expect(required('  ', 'ホスト名')).toBe('ホスト名は必須です。')
    expect(required(null, 'ホスト名')).toBe('ホスト名は必須です。')
  })
  it('値があれば undefined', () => {
    expect(required('web-01', 'ホスト名')).toBeUndefined()
  })
})

describe('maxLength', () => {
  it('上限以内は OK', () => {
    expect(maxLength('abc', 3, 'OS')).toBeUndefined()
    expect(maxLength(null, 3, 'OS')).toBeUndefined()
  })
  it('超過はエラー', () => {
    expect(maxLength('abcd', 3, 'OS')).toBe('OSは3文字以内で入力してください。')
  })
})

describe('email', () => {
  it.each(['a@b.co', 'admin@serverhub.local'])('%s は有効', (v) => {
    expect(email(v)).toBeUndefined()
  })
  it.each(['', 'abc', 'a@b', 'a b@c.d'])('%s は無効', (v) => {
    expect(email(v)).toBeDefined()
  })
})

describe('hostname', () => {
  it.each(['web-01', 'app.prod.internal', 'a'])('%s は有効', (v) => {
    expect(hostname(v)).toBeUndefined()
  })
  it.each(['-web', 'web_01', 'web..a', 'web 01'])('%s は無効', (v) => {
    expect(hostname(v)).toBeDefined()
  })
  it('空は任意扱い（undefined）', () => {
    expect(hostname('')).toBeUndefined()
  })

  it('使えない文字を名指しで指摘する', () => {
    expect(hostname('web_01')).toContain('「_」')
    expect(hostname('web@01')).toContain('「@」')
    expect(hostname('web 01')).toContain('スペース')
  })
  it('先頭・末尾のハイフン/ドットを指摘する', () => {
    expect(hostname('-web')).toContain('先頭・末尾')
    expect(hostname('web.')).toContain('先頭・末尾')
  })
  it('連続ドットを指摘する', () => {
    expect(hostname('web..a')).toContain('連続')
  })
  it('ラベル長超過を指摘する', () => {
    expect(hostname(`${'a'.repeat(64)}.example`)).toContain('63 文字以内')
  })
  it('どのメッセージにも入力例を含める', () => {
    expect(hostname('web_01')).toContain('web-prod-01')
  })
})

describe('ipAddress', () => {
  it.each(['10.0.0.1', '255.255.255.255', '::1', '2001:db8::1'])('%s は有効', (v) => {
    expect(ipAddress(v)).toBeUndefined()
  })
  it.each(['999.1.1.1', '10.0.0', 'abc', '10.0.0.1.1'])('%s は無効', (v) => {
    expect(ipAddress(v)).toBeDefined()
  })
  it('空は任意扱い（undefined）', () => {
    expect(ipAddress('')).toBeUndefined()
    expect(ipAddress(null)).toBeUndefined()
  })

  it('オクテット数の過不足を指摘する', () => {
    expect(ipAddress('10.0.0')).toContain('現在 3 組')
    expect(ipAddress('10.0.0.1.1')).toContain('現在 5 組')
  })
  it('範囲外のオクテットを名指しで指摘する', () => {
    expect(ipAddress('999.1.1.1')).toContain('「999」')
    expect(ipAddress('192.168.1.300')).toContain('「300」')
  })
  it('コロンを含む入力は IPv6 として扱う', () => {
    expect(ipAddress('2001:db8:::1')).toContain('IPv6')
  })
})
