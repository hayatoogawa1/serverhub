import { hostname, ipAddress, maxLength, required } from '@/utils/validation'
import type { ServerCreateBody, ServerFormValues } from './types'

/** Backend の Bean Validation と同じ上限（ServerCreateRequest）。FE でこれより厳しくしない。 */
export const SERVER_FIELD_LIMITS = {
  hostname: 255,
  description: 1000,
  os: 100,
  osVersion: 100,
  location: 255,
  owner: 255,
  tag: 50,
  tagCount: 50,
} as const

export type ServerFieldErrors = Partial<Record<keyof ServerFormValues, string>>

/** 送信前のクライアント検証（UX 目的。最終防衛線は Backend、06-ui §6）。 */
export function validateServerForm(values: ServerFormValues): ServerFieldErrors {
  const errors: ServerFieldErrors = {}

  errors.hostname =
    required(values.hostname, 'ホスト名') ??
    maxLength(values.hostname, SERVER_FIELD_LIMITS.hostname, 'ホスト名') ??
    hostname(values.hostname)

  errors.ipAddress = ipAddress(values.ipAddress)

  if (!values.environment) errors.environment = '環境を選択してください。'
  if (!values.status) errors.status = 'ステータスを選択してください。'

  errors.description = maxLength(values.description, SERVER_FIELD_LIMITS.description, '用途・説明')
  errors.os = maxLength(values.os, SERVER_FIELD_LIMITS.os, 'OS')
  errors.osVersion = maxLength(values.osVersion, SERVER_FIELD_LIMITS.osVersion, 'OS バージョン')
  errors.location = maxLength(values.location, SERVER_FIELD_LIMITS.location, 'ロケーション')
  errors.owner = maxLength(values.owner, SERVER_FIELD_LIMITS.owner, '担当者')

  if (values.tags.length > SERVER_FIELD_LIMITS.tagCount) {
    errors.tags = `タグは ${SERVER_FIELD_LIMITS.tagCount} 件以内にしてください。`
  } else if (values.tags.some((t) => t.length > SERVER_FIELD_LIMITS.tag)) {
    errors.tags = `各タグは ${SERVER_FIELD_LIMITS.tag} 文字以内にしてください。`
  }

  // undefined のキーを落とす
  for (const key of Object.keys(errors) as (keyof ServerFieldErrors)[]) {
    if (errors[key] == null) delete errors[key]
  }
  return errors
}

export function hasFieldErrors(errors: ServerFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

/** フォーム値 → 登録リクエストボディ（空の任意項目は `null`、enum はそのまま）。 */
export function toCreateBody(values: ServerFormValues): ServerCreateBody {
  const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim())
  return {
    hostname: values.hostname.trim(),
    ipAddress: blankToNull(values.ipAddress),
    environment: values.environment as ServerCreateBody['environment'],
    status: values.status as ServerCreateBody['status'],
    description: values.description.trim() === '' ? null : values.description,
    os: blankToNull(values.os),
    osVersion: blankToNull(values.osVersion),
    virtualizationType: values.virtualizationType === '' ? null : values.virtualizationType,
    location: blankToNull(values.location),
    owner: blankToNull(values.owner),
    tags: values.tags,
  }
}
