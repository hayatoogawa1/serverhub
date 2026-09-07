import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CopyButton } from '@/components/CopyButton'
import { EnvironmentChip } from '@/components/EnvironmentChip'
import { StatusChip } from '@/components/StatusChip'
import { TagList } from '@/components/TagList'
import { VIRTUALIZATION_TYPE_LABELS } from '@/types/domain'
import { formatDateTime, orDash } from '@/utils/format'
import type { ServerDetail } from '../types'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Box component="dd" sx={{ m: 0, mt: 0.25 }}>
        {typeof children === 'string' || typeof children === 'number' ? (
          <Typography variant="body2">{children}</Typography>
        ) : (
          children
        )}
      </Box>
    </Box>
  )
}

/** SC-04 の台帳基本情報パネル（Backend `ServerDetailResponse` の全項目）。 */
export function ServerDetailView({ server }: { server: ServerDetail }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box
        component="dl"
        sx={{
          m: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          rowGap: 2.5,
          columnGap: 4,
        }}
      >
        <Field label="ホスト名">
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {server.hostname}
            </Typography>
            <CopyButton value={server.hostname} ariaLabel="ホスト名をコピー" />
          </Stack>
        </Field>
        <Field label="IP アドレス">
          {server.ipAddress ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontFamily: 'monospace' }}>{server.ipAddress}</Typography>
              <CopyButton value={server.ipAddress} ariaLabel="IP アドレスをコピー" />
            </Stack>
          ) : (
            '-'
          )}
        </Field>
        <Field label="環境">
          <EnvironmentChip environment={server.environment} />
        </Field>
        <Field label="ステータス">
          <StatusChip status={server.status} />
        </Field>
        <Field label="物理 / 仮想">
          {server.virtualizationType
            ? VIRTUALIZATION_TYPE_LABELS[server.virtualizationType]
            : '-'}
        </Field>
        <Field label="OS">{orDash(server.os)}</Field>
        <Field label="OS バージョン">{orDash(server.osVersion)}</Field>
        <Field label="ロケーション">{orDash(server.location)}</Field>
        <Field label="担当者">{orDash(server.owner)}</Field>
        <Field label="タグ">
          <TagList tags={server.tags} />
        </Field>
        <Field label="登録日時">{formatDateTime(server.createdAt)}</Field>
        <Field label="更新日時">{formatDateTime(server.updatedAt)}</Field>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Field label="用途・説明">
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {orDash(server.description)}
            </Typography>
          </Field>
        </Box>
      </Box>
    </Paper>
  )
}
