import { describe, expect, it } from 'vitest'
import { toServerCreateBody, validateServerForm } from './server'
import type { ServerFormValues } from '@/types/server'

const base: ServerFormValues = {
  hostname: 'web-01',
  ipAddress: '',
  environment: 'production',
  status: 'active',
  description: '',
  os: '',
  osVersion: '',
  virtualizationType: '',
  location: '',
  owner: '',
  tags: [],
}

describe('validateServerForm', () => {
  it('必須 3 項目が揃っていればエラーなし', () => {
    expect(validateServerForm(base)).toEqual({})
  })

  it('hostname / environment / status が必須', () => {
    const errors = validateServerForm({ ...base, hostname: '  ', environment: '', status: '' })
    expect(errors.hostname).toBeDefined()
    expect(errors.environment).toBeDefined()
    expect(errors.status).toBeDefined()
  })

  it('hostname は RFC 1123（ドット区切り FQDN 可、アンダースコア不可）', () => {
    expect(validateServerForm({ ...base, hostname: 'app.prod.internal' })).toEqual({})
    expect(validateServerForm({ ...base, hostname: 'bad_host' }).hostname).toBeDefined()
  })

  it('IP は任意・空は OK・IPv4/IPv6 を許容', () => {
    expect(validateServerForm({ ...base, ipAddress: '' })).toEqual({})
    expect(validateServerForm({ ...base, ipAddress: '10.0.0.1' })).toEqual({})
    expect(validateServerForm({ ...base, ipAddress: '2001:db8::1' })).toEqual({})
    expect(validateServerForm({ ...base, ipAddress: '999.1.1.1' }).ipAddress).toBeDefined()
  })

  it('文字数上限は Backend と同じ（hostname 255 / 説明 1000 / OS 100）', () => {
    // 255 文字ちょうどの有効な FQDN（63 文字ラベル × 4 + ドット 3）
    const label63 = 'a'.repeat(63)
    const host255 = [label63, label63, label63, label63].join('.')
    expect(host255).toHaveLength(255)
    expect(validateServerForm({ ...base, hostname: host255 })).toEqual({})
    expect(validateServerForm({ ...base, hostname: `${host255}z` }).hostname).toBeDefined()

    expect(validateServerForm({ ...base, description: 'x'.repeat(1000) })).toEqual({})
    expect(validateServerForm({ ...base, description: 'x'.repeat(1001) }).description).toBeDefined()
    expect(validateServerForm({ ...base, os: 'x'.repeat(100) })).toEqual({})
    expect(validateServerForm({ ...base, os: 'x'.repeat(101) }).os).toBeDefined()
  })

  it('タグは 50 件・各 50 文字まで', () => {
    const tooMany = Array.from({ length: 51 }, () => 't')
    expect(validateServerForm({ ...base, tags: tooMany }).tags).toBeDefined()
    expect(validateServerForm({ ...base, tags: ['x'.repeat(51)] }).tags).toBeDefined()
  })
})

describe('toServerCreateBody', () => {
  it('空の任意項目は null、enum はそのまま', () => {
    expect(toServerCreateBody(base)).toEqual({
      hostname: 'web-01',
      ipAddress: null,
      environment: 'production',
      status: 'active',
      description: null,
      os: null,
      osVersion: null,
      virtualizationType: null,
      location: null,
      owner: null,
      tags: [],
    })
  })

  it('入力された任意項目は保持、virtualizationType も送る', () => {
    const body = toServerCreateBody({
      ...base,
      ipAddress: '10.0.0.2',
      virtualizationType: 'virtual',
      owner: 'ops',
      tags: ['web'],
    })
    expect(body.ipAddress).toBe('10.0.0.2')
    expect(body.virtualizationType).toBe('virtual')
    expect(body.owner).toBe('ops')
    expect(body.tags).toEqual(['web'])
  })
})
