import Typography from '@mui/material/Typography'
import { PageHeader } from '@/components/PageHeader'

/** SC-07 メンテナンス履歴一覧。テーブル・絞り込み・登録モーダルは FE-4 で実装する。 */
export function MaintenanceHistoryListPage() {
  return (
    <>
      <PageHeader title="メンテナンス履歴" breadcrumbs={[{ label: 'メンテナンス履歴' }]} />
      <Typography variant="body2" color="text.secondary">
        履歴一覧・登録は実装予定です。
      </Typography>
    </>
  )
}
