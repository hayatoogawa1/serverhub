import { useState, type ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useFeedback } from '@/components/feedback/context'
import { CloudStateChip } from '@/components/servers/CloudStateChip'
import { CloudLinkFormModal } from '@/components/servers/CloudLinkFormModal'
import { useDeleteCloudLinkMutation, useRefreshCloudStateMutation } from '@/hooks/cloud'
import {
  CLOUD_PROVIDER_LABELS,
  maskInstanceId,
  toCloudInstanceState,
  type CloudLink,
} from '@/types/cloud'
import { formatDateTime } from '@/utils/format'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box
      sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '140px 1fr' }, columnGap: 2 }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ pt: 0.25 }}>
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  )
}

interface CloudLinkPanelProps {
  serverId: number
  serverHostname: string
  /** `ServerDetail.cloudLink`。**未連携は `null`/`undefined`**。 */
  cloudLink: CloudLink | null | undefined
}

/**
 * SC-04 の「AWS 連携」パネル（FR-CLOUD-01）。
 *
 * **管理ステータス（`ServerDetailView` 内の `StatusChip`）とは別セクション**として明確に分離する。
 * ここに出るのは「観測された AWS 実行状態」であり、`servers.status` には一切影響しない。
 */
export function CloudLinkPanel({ serverId, serverHostname, cloudLink }: CloudLinkPanelProps) {
  const feedback = useFeedback()
  const [formOpen, setFormOpen] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const refresh = useRefreshCloudStateMutation(serverId)
  const unlink = useDeleteCloudLinkMutation(serverId)

  const heading = (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
      <CloudOutlinedIcon fontSize="small" color="action" />
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        AWS 連携
      </Typography>
    </Stack>
  )

  if (!cloudLink) {
    return (
      <Paper variant="outlined" sx={{ p: 3 }}>
        {heading}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary">
            AWS 未連携です。EC2 インスタンスを紐付けると実行状態を参照できます。
          </Typography>
          <Button variant="outlined" size="small" onClick={() => setFormOpen(true)}>
            連携する
          </Button>
        </Stack>
        {formOpen && (
          <CloudLinkFormModal
            serverId={serverId}
            serverHostname={serverHostname}
            onClose={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false)
              feedback.showSuccess('AWS 連携を設定しました')
            }}
          />
        )}
      </Paper>
    )
  }

  const state = toCloudInstanceState(cloudLink.state)
  const fetchedAt = cloudLink.stateFetchedAt

  const handleRefresh = () => {
    refresh.mutate(undefined, {
      onSuccess: (updated) => {
        if (updated.lastError) {
          feedback.showError('AWS からの取得に失敗しました。表示は前回取得時点の状態です。')
        } else {
          feedback.showSuccess('AWS 実行状態を更新しました')
        }
      },
      onError: (error) => feedback.showError(error.message),
    })
  }

  const handleUnlink = () => {
    unlink.mutate(undefined, {
      onSuccess: () => {
        setUnlinkOpen(false)
        feedback.showSuccess('AWS 連携を解除しました')
      },
      onError: (error) => {
        setUnlinkOpen(false)
        feedback.showError(error.message)
      },
    })
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      {heading}
      <Stack spacing={2}>
        <Row label="プロバイダ">
          <Typography variant="body2">{CLOUD_PROVIDER_LABELS[cloudLink.provider]}</Typography>
        </Row>
        <Row label="インスタンス ID">
          {/* 公開環境で実 ID を晒さないため一部伏せ字。コピーも不可（生値は画面に出さない）。 */}
          <Typography
            sx={{ fontFamily: 'monospace' }}
            aria-label={`インスタンス ID（一部伏せ字）: ${maskInstanceId(cloudLink.externalId)}`}
          >
            {maskInstanceId(cloudLink.externalId)}
          </Typography>
        </Row>
        <Row label="リージョン">
          <Typography variant="body2">{cloudLink.region ?? '-'}</Typography>
        </Row>

        <Row label="AWS 実行状態">
          <Stack spacing={0.75}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              {state ? (
                <CloudStateChip state={state} />
              ) : (
                <Chip size="small" variant="outlined" label="未取得" />
              )}
              {cloudLink.stale && (
                <Chip size="small" color="warning" variant="outlined" label="情報が古い可能性" />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {fetchedAt ? `最終取得: ${formatDateTime(fetchedAt)}` : 'まだ取得していません'}
            </Typography>
            {cloudLink.lastError && (
              <Typography variant="caption" color="error" sx={{ wordBreak: 'break-word' }}>
                最新の取得に失敗しました（表示は{fetchedAt ? '前回取得時点' : '未取得'}の状態）:{' '}
                {cloudLink.lastError}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              これは AWS 上の実行状態です。サーバーの管理ステータスとは別の情報です。
            </Typography>
          </Stack>
        </Row>

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            loading={refresh.isPending}
          >
            今すぐ更新
          </Button>
          <Button size="small" variant="text" onClick={() => setFormOpen(true)}>
            連携を編集
          </Button>
          <Button size="small" variant="text" color="error" onClick={() => setUnlinkOpen(true)}>
            連携を解除
          </Button>
        </Stack>
      </Stack>

      {formOpen && (
        <CloudLinkFormModal
          serverId={serverId}
          serverHostname={serverHostname}
          current={cloudLink}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            feedback.showSuccess('AWS 連携を更新しました')
          }}
        />
      )}

      <ConfirmDialog
        open={unlinkOpen}
        title="AWS 連携を解除しますか？"
        content={
          <Alert severity="info" variant="outlined" sx={{ border: 0, p: 0 }}>
            解除しても EC2
            インスタンス自体には影響しません。サーバーの管理ステータスも変わりません。
          </Alert>
        }
        confirmLabel="連携を解除する"
        confirmColor="error"
        loading={unlink.isPending}
        onConfirm={handleUnlink}
        onClose={() => setUnlinkOpen(false)}
      />
    </Paper>
  )
}
