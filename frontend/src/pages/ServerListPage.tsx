import Typography from '@mui/material/Typography'
import { PageHeader } from '@/components/PageHeader'

/** SC-03 サーバー一覧。検索・絞り込み・テーブルは FE-2 で実装する。 */
export function ServerListPage() {
  return (
    <>
      <PageHeader title="サーバー" breadcrumbs={[{ label: 'サーバー' }]} />
      <Typography variant="body2" color="text.secondary">
        一覧・検索・絞り込みは実装予定です。
      </Typography>
    </>
  )
}
