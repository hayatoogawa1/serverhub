/**
 * API 共通のレスポンス型（基本設計 02-api §2.3 / §2.4）。
 */

/** ページング一覧のエンベロープ `{ content, page }`。`page.number` は 0 始まり。 */
export interface Page<T> {
  content: T[]
  page: PageMeta
}

export interface PageMeta {
  number: number
  size: number
  totalElements: number
  totalPages: number
}

/** 一覧のソート方向（02-api §2.5）。 */
export type SortOrder = 'asc' | 'desc'

/** 統一エラーエンベロープ。`errors` は 400（バリデーション）のときのみ。 */
export interface ApiErrorBody {
  code: string
  message: string
  traceId: string
  errors?: FieldError[]
}

export interface FieldError {
  field: string
  message: string
}

/** エラーコード（Backend の ErrorCode と一致、詳細設計 01-common §3）。 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_HOSTNAME: 'DUPLICATE_HOSTNAME',
  OPTIMISTIC_LOCK_CONFLICT: 'OPTIMISTIC_LOCK_CONFLICT',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_BAD_CREDENTIALS: 'AUTH_BAD_CREDENTIALS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CLOUD_LINK_CONFLICT: 'CLOUD_LINK_CONFLICT',
  CLOUD_PROVIDER_UNAVAILABLE: 'CLOUD_PROVIDER_UNAVAILABLE',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
