/**
 * ドメイン enum。値は Backend / DB と同じ小文字リテラル（02-api D-API-04、詳細設計 03-server D-SRV-01）。
 * 表示ラベル・並び順はこのファイルに集約し、画面側でハードコードしない。
 */

export const ENVIRONMENTS = ['production', 'staging', 'development'] as const
export type Environment = (typeof ENVIRONMENTS)[number]

export const STATUSES = ['active', 'maintenance', 'retired'] as const
export type Status = (typeof STATUSES)[number]

export const VIRTUALIZATION_TYPES = ['physical', 'virtual'] as const
export type VirtualizationType = (typeof VIRTUALIZATION_TYPES)[number]

export const MAINTENANCE_TYPES = ['patch', 'config', 'hardware', 'other'] as const
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const ENVIRONMENT_LABELS: Record<Environment, string> = {
  production: '本番',
  staging: 'ステージング',
  development: '開発',
}

export const STATUS_LABELS: Record<Status, string> = {
  active: '稼働中',
  maintenance: 'メンテナンス中',
  retired: '廃止',
}

export const VIRTUALIZATION_TYPE_LABELS: Record<VirtualizationType, string> = {
  physical: '物理',
  virtual: '仮想',
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  patch: 'パッチ適用',
  config: '設定変更',
  hardware: 'ハード交換',
  other: 'その他',
}
