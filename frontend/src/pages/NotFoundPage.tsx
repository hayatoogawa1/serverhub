import Button from '@mui/material/Button'
import { Link as RouterLink } from 'react-router-dom'
import { StatePlaceholder } from '@/components/common/StatePlaceholder'

/** SC-404 Not Found（不正な URL）。 */
export function NotFoundPage() {
  return (
    <StatePlaceholder
      type="notfound"
      title="ページが見つかりません"
      description="指定されたページは存在しないか、移動しました。"
      fullheight
      actionButton={
        <Button component={RouterLink} to="/" variant="outlined">
          ダッシュボードへ戻る
        </Button>
      }
    />
  )
}
