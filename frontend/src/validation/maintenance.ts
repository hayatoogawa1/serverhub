import { maxLength, required } from '@/utils/validation'
import {
  MAINTENANCE_FIELD_LIMITS,
  type MaintenanceFormValues,
  type MaintenanceHistoryCreateBody,
} from '@/types/maintenance'

export type MaintenanceFieldErrors = Partial<Record<keyof MaintenanceFormValues, string>>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** 送信前のクライアント検証（UX 目的。最終防衛線は Backend、06-ui §6）。 */
export function validateMaintenanceForm(values: MaintenanceFormValues): MaintenanceFieldErrors {
  const errors: MaintenanceFieldErrors = {}

  if (values.serverId == null) errors.serverId = '対象サーバーを選択してください。'

  if (!values.performedDate) {
    errors.performedDate = '実施日は必須です。'
  } else if (
    !DATE_RE.test(values.performedDate) ||
    Number.isNaN(Date.parse(values.performedDate))
  ) {
    errors.performedDate = '実施日の形式が正しくありません。'
  }

  if (!values.type) errors.type = '種別を選択してください。'

  errors.worker =
    required(values.worker, '作業者') ??
    maxLength(values.worker, MAINTENANCE_FIELD_LIMITS.worker, '作業者')
  errors.content =
    required(values.content, '作業内容') ??
    maxLength(values.content, MAINTENANCE_FIELD_LIMITS.content, '作業内容')
  errors.impact = maxLength(values.impact, MAINTENANCE_FIELD_LIMITS.impact, '影響・ダウンタイム')
  errors.result = maxLength(values.result, MAINTENANCE_FIELD_LIMITS.result, '結果・備考')

  for (const key of Object.keys(errors) as (keyof MaintenanceFieldErrors)[]) {
    if (errors[key] == null) delete errors[key]
  }
  return errors
}

export function hasMaintenanceFieldErrors(errors: MaintenanceFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

/** フォーム値 → 登録リクエストボディ（空の任意項目は `null`）。 */
export function toMaintenanceCreateBody(
  values: MaintenanceFormValues,
): MaintenanceHistoryCreateBody {
  return {
    serverId: values.serverId ?? 0,
    performedDate: values.performedDate,
    type: values.type as MaintenanceHistoryCreateBody['type'],
    worker: values.worker.trim(),
    content: values.content,
    impact: values.impact.trim() === '' ? null : values.impact,
    result: values.result.trim() === '' ? null : values.result,
  }
}
