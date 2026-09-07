import { useState } from 'react'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageHeader } from '@/components/PageHeader'
import { StatePlaceholder } from '@/components/StatePlaceholder'
import { useFeedback } from '@/components/feedback/context'
import { ServerDetailView } from '@/features/servers/components/ServerDetailView'
import { ServerFormModal } from '@/features/servers/components/ServerFormModal'
import { useDeleteServerMutation, useServerQuery } from '@/features/servers/hooks'
import { ServerMaintenanceHistorySection } from '@/features/maintenance/components/ServerMaintenanceHistorySection'

/** SC-04 サーバー詳細（属性表示 + 編集 + 論理削除 + メンテナンス履歴セクション表示）。 */
export function ServerDetailPage() {
  const navigate = useNavigate()
  const feedback = useFeedback()
  const { id: rawId } = useParams()
  const id = Number(rawId)
  const isValidId = Number.isInteger(id) && id > 0
  const query = useServerQuery(isValidId ? id : 0)
  const deleteMutation = useDeleteServerMutation(isValidId ? id : 0)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

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

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteOpen(false)
        feedback.showSuccess(`サーバー「${server.hostname}」を台帳から削除しました`)
        void navigate('/servers')
      },
      onError: (error) => {
        setDeleteOpen(false)
        feedback.showError(error.message)
      },
    })
  }

  return (
    <>
      <PageHeader
        title={server.hostname}
        breadcrumbs={[{ label: 'サーバー', to: '/servers' }, { label: server.hostname }]}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => void navigate('/servers')}
            >
              一覧
            </Button>
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => setEditOpen(true)}
            >
              編集
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => setDeleteOpen(true)}
            >
              削除
            </Button>
          </>
        }
      />
      <Stack spacing={4}>
        <ServerDetailView server={server} />
        <ServerMaintenanceHistorySection serverId={server.id} />
      </Stack>

      {editOpen && (
        <ServerFormModal
          mode="edit"
          server={server}
          onClose={() => setEditOpen(false)}
          onUpdated={() => {
            setEditOpen(false)
            feedback.showSuccess('サーバー情報を更新しました')
          }}
        />
      )}

      <ConfirmDialog
        open={deleteOpen}
        title={`サーバー「${server.hostname}」を台帳から削除しますか？`}
        content="削除後は一覧・検索・ダッシュボード集計から除外されます。データはシステムに保持され、メンテナンス履歴も残ります。"
        confirmLabel="台帳から削除する"
        confirmColor="error"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </>
  )
}
