import Typography from '@mui/material/Typography'
import { PageHeader } from '@/components/PageHeader'

/** SC-02 ダッシュボード。集計カード・グラフは FE-5 で実装する。 */
export function DashboardPage() {
  return (
    <>
      <PageHeader title="ダッシュボード" />
      <Typography variant="body2" color="text.secondary">
        集計・グラフは実装予定です。
      </Typography>
    </>
  )
}
