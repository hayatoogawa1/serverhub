import Typography from '@mui/material/Typography'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'

/** SC-04 サーバー詳細。属性表示・履歴セクション・編集/削除は FE-2 / FE-3 / FE-4 で実装する。 */
export function ServerDetailPage() {
  const { id } = useParams()
  return (
    <>
      <PageHeader
        title={`サーバー #${id ?? ''}`}
        breadcrumbs={[{ label: 'サーバー', to: '/servers' }, { label: `#${id ?? ''}` }]}
      />
      <Typography variant="body2" color="text.secondary">
        詳細表示は実装予定です。
      </Typography>
    </>
  )
}
