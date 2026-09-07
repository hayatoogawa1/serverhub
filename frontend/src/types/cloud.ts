/**
 * クラウド連携（AWS EC2 等）の型（FR-CLOUD-01、Backend `CloudLinkResponse` / `CloudLinkRequest`）。
 *
 * **管理ステータス（`Status`）とは別概念。** `state` は「観測された実行状態」で、AWS からの取得でのみ
 * 設定される。ServerHub の `servers.status` を上書きすることはない。
 */

/** provider。当面 `aws_ec2` のみ（Backend `CloudProvider`）。将来 `gcp_gce` 等を足せる構造。 */
export const CLOUD_PROVIDERS = ['aws_ec2'] as const
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number]

export const CLOUD_PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws_ec2: 'AWS EC2',
}

/** 正規化された実行状態（Backend `CloudInstanceState`）。 */
export const CLOUD_INSTANCE_STATES = [
  'running',
  'stopped',
  'pending',
  'stopping',
  'terminated',
  'unknown',
  'gone',
] as const
export type CloudInstanceState = (typeof CLOUD_INSTANCE_STATES)[number]

export const CLOUD_STATE_LABELS: Record<CloudInstanceState, string> = {
  running: '稼働中',
  stopped: '停止中',
  pending: '起動処理中',
  stopping: '停止処理中',
  terminated: '終了済み',
  unknown: '不明',
  gone: '見つかりません',
}

/** 表示グルーピング（色・アイコンの出し分け）。UI の細部は実装側で決めてよい。 */
export type CloudStateTone = 'running' | 'stopped' | 'transitioning' | 'terminal' | 'unknown'

export const CLOUD_STATE_TONE: Record<CloudInstanceState, CloudStateTone> = {
  running: 'running',
  stopped: 'stopped',
  pending: 'transitioning',
  stopping: 'transitioning',
  terminated: 'terminal',
  gone: 'terminal',
  unknown: 'unknown',
}

/** 既知の状態文字列でなければ `unknown` 扱い（Backend が新値を返しても壊れないように）。 */
export function toCloudInstanceState(value: string | null | undefined): CloudInstanceState | null {
  if (value == null) return null
  return (CLOUD_INSTANCE_STATES as readonly string[]).includes(value)
    ? (value as CloudInstanceState)
    : 'unknown'
}

/** サーバー詳細に埋め込まれるクラウド連携情報（Backend `CloudLinkResponse`、`@JsonInclude(NON_NULL)`）。 */
export interface CloudLink {
  provider: CloudProvider
  externalId: string
  /** 未指定でも Backend が既定リージョンを補完するため通常は入る。 */
  region: string | null
  /** 未取得は `null`。 */
  state: CloudInstanceState | null
  stateRaw: string | null
  /** 最後に取得に成功した時刻（ISO 8601）。未取得は `null`。 */
  stateFetchedAt: string | null
  /** `stateFetchedAt` が鮮度閾値を超えている（情報が古い可能性）。 */
  stale: boolean
  /** 直近の取得失敗理由。成功していれば `null`。値があっても `state` は最後の成功値。 */
  lastError: string | null
}

/** 紐付けの作成 / 置換リクエスト（Backend `CloudLinkRequest`）。 */
export interface CloudLinkBody {
  provider: CloudProvider
  externalId: string
  /** 未指定なら Backend が既定リージョンを使う。 */
  region: string | null
}

/** 紐付けフォームの編集中の値。 */
export interface CloudLinkFormValues {
  externalId: string
  region: string
}
