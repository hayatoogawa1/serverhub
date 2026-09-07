import { AxiosError } from 'axios'
import type { ApiErrorBody, FieldError } from '@/types/api'

/**
 * Backend の統一エラーエンベロープ（02-api §2.4）を表す正規化済みエラー。
 *
 * API 関数はネットワーク層の例外（AxiosError）を握り、この型に正規化して投げ直す。
 * 画面側は `ApiError` だけを見ればよい（axios を意識しない）。
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly traceId?: string
  readonly fieldErrors: FieldError[]

  constructor(params: {
    status: number
    code: string
    message: string
    traceId?: string
    fieldErrors?: FieldError[]
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.traceId = params.traceId
    this.fieldErrors = params.fieldErrors ?? []
  }

  /** フィールド名 → 最初のエラーメッセージ。フォームのフィールドエラー表示に使う。 */
  fieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {}
    for (const fe of this.fieldErrors) {
      if (!(fe.field in map)) {
        map[fe.field] = fe.message
      }
    }
    return map
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  )
}

/** 任意の catch 値を `ApiError` に正規化する。 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  if (error instanceof AxiosError) {
    const body: unknown = error.response?.data
    if (isApiErrorBody(body)) {
      return new ApiError({
        status: error.response?.status ?? 0,
        code: body.code,
        message: body.message,
        traceId: body.traceId,
        fieldErrors: body.errors,
      })
    }
    // JSON エンベロープが取れないケース（ネットワーク断・502 等）
    return new ApiError({
      status: error.response?.status ?? 0,
      code: 'NETWORK_ERROR',
      message: 'サーバーに接続できませんでした。時間をおいて再試行してください。',
    })
  }

  return new ApiError({
    status: 0,
    code: 'UNKNOWN_ERROR',
    message: '予期しないエラーが発生しました。',
  })
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
