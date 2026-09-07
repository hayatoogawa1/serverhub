import type { CloudLinkFormValues } from '@/types/cloud'

/** Backend `CloudLinkRequest` の `@Pattern` と同一（`i-` + 8 桁 or 17 桁の 16 進）。 */
const INSTANCE_ID_RE = /^i-([0-9a-f]{8}|[0-9a-f]{17})$/

/** リージョンの緩い形式チェック（例 `ap-northeast-1`）。任意項目。Backend は `@Size(max=30)` のみ。 */
const REGION_RE = /^[a-z]{2}-[a-z]+-\d$/

export type CloudLinkFieldErrors = Partial<Record<keyof CloudLinkFormValues, string>>

/** 送信前のクライアント検証（UX 目的。最終防衛線は Backend、06-ui §6）。 */
export function validateCloudLinkForm(values: CloudLinkFormValues): CloudLinkFieldErrors {
  const errors: CloudLinkFieldErrors = {}

  const externalId = values.externalId.trim()
  if (externalId === '') {
    errors.externalId = 'インスタンス ID は必須です。'
  } else if (!INSTANCE_ID_RE.test(externalId)) {
    errors.externalId = 'インスタンス ID の形式が正しくありません（例: i-0123456789abcdef0）。'
  }

  const region = values.region.trim()
  if (region !== '' && !REGION_RE.test(region)) {
    errors.region = 'リージョンの形式が正しくありません（例: ap-northeast-1）。'
  }

  return errors
}

export function hasCloudLinkFieldErrors(errors: CloudLinkFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

/** フォーム値 → リクエストボディ。空のリージョンは `null`（Backend が既定リージョンを補完）。 */
export function toCloudLinkBody(values: CloudLinkFormValues) {
  const region = values.region.trim()
  return {
    provider: 'aws_ec2' as const,
    externalId: values.externalId.trim(),
    region: region === '' ? null : region,
  }
}
