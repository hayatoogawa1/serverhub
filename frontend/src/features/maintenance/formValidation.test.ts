import { describe, expect, it } from 'vitest'
import { toMaintenanceCreateBody, validateMaintenanceForm } from './formValidation'
import type { MaintenanceFormValues } from './types'

const base: MaintenanceFormValues = {
  serverId: 1,
  performedDate: '2026-09-08',
  type: 'patch',
  worker: 'ops',
  content: 'パッチ適用',
  impact: '',
  result: '',
}

describe('validateMaintenanceForm', () => {
  it('必須が揃っていればエラーなし', () => {
    expect(validateMaintenanceForm(base)).toEqual({})
  })

  it('serverId / performedDate / type / worker / content が必須', () => {
    const errors = validateMaintenanceForm({
      serverId: null,
      performedDate: '',
      type: '',
      worker: '',
      content: '',
      impact: '',
      result: '',
    })
    expect(errors.serverId).toBeDefined()
    expect(errors.performedDate).toBeDefined()
    expect(errors.type).toBeDefined()
    expect(errors.worker).toBeDefined()
    expect(errors.content).toBeDefined()
  })

  it('実施日は未来日も許容、形式不正は弾く', () => {
    expect(validateMaintenanceForm({ ...base, performedDate: '2099-12-31' })).toEqual({})
    expect(
      validateMaintenanceForm({ ...base, performedDate: '2026/09/08' }).performedDate,
    ).toBeDefined()
  })

  it('文字数上限は Backend と同じ（作業内容 2000 / 作業者 255）', () => {
    expect(validateMaintenanceForm({ ...base, content: 'x'.repeat(2000) })).toEqual({})
    expect(validateMaintenanceForm({ ...base, content: 'x'.repeat(2001) }).content).toBeDefined()
    expect(validateMaintenanceForm({ ...base, worker: 'x'.repeat(256) }).worker).toBeDefined()
  })
})

describe('toMaintenanceCreateBody', () => {
  it('空の任意項目は null', () => {
    expect(toMaintenanceCreateBody(base)).toEqual({
      serverId: 1,
      performedDate: '2026-09-08',
      type: 'patch',
      worker: 'ops',
      content: 'パッチ適用',
      impact: null,
      result: null,
    })
  })
})
