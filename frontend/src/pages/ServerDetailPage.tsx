import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { ServerDetailView } from '@/features/servers/components/ServerDetailView'
import { useServerQuery } from '@/features/servers/hooks'
import { ServerMaintenanceHistorySection } from '@/features/maintenance/components/ServerMaintenanceHistorySection'

/** SC-04 サーバー詳細（属性表示 + メンテナンス履歴セクション）。編集/削除/履歴登録は FE-3 / FE-4。 */
export function ServerDetailPage() {
  const navigate = useNavigate()
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const isValidId = Number.isInteger(id) && id > 0
  const query = useServerQuery(isValidId ? id : 0)

  const backToList = (
    <Button component={RouterLink} to="/servers" variant="outlined" startIcon={<ArrowBackIcon />}>
      サーバー一覧に戻る
    </Button>
  )

  if (!isValidId || (query.isError && query.error.status === 404)) {
    return (
      <StatePlaceholder
        type="notfound"
        title="サーバーが見つかりません"
        description={`指定されたサーバー（ID: ${rawId ?? ''}）は存在しないか、既に削除されています。`}
        fullheight
        actionButton={backToList}
      />
    )
  }

  if (query.isError && query.error.status !== 401) {
    return (
      <StatePlaceholder
        type="error"
        title="サーバー詳細の取得に失敗しました"
        description={query.error.message}
        fullheight
        actionButton={
          <Button variant="outlined" onClick={() => void query.refetch()}>
            再読み込み
          </Button>
        }
      />
    )
  }

  if (query.isPending || !query.data) {
    return <StatePlaceholder type="loading" title="読み込み中" fullheight />
  }

  const server = query.data

  return (
    <>
      <PageHeader
        title={server.hostname}
        breadcrumbs={[{ label: 'サーバー', to: '/servers' }, { label: server.hostname }]}
        actions={
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => void navigate('/servers')}
          >
            一覧に戻る
          </Button>
        }
      />
      <Stack spacing={4}>
        <ServerDetailView server={server} />
        <ServerMaintenanceHistorySection serverId={server.id} />
      </Stack>
    </>
  )
}
