import { useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Modal } from '@/components/Modal'
import { TagInput } from '@/components/TagInput'
import { queryKeys } from '@/api/queryKeys'
import { ERROR_CODES } from '@/types/api'
import {
  ENVIRONMENTS,
  ENVIRONMENT_LABELS,
  STATUSES,
  STATUS_LABELS,
  VIRTUALIZATION_TYPES,
  VIRTUALIZATION_TYPE_LABELS,
} from '@/types/domain'
import { useCreateServerMutation, useUpdateServerMutation } from '../hooks'
import {
  SERVER_FIELD_LIMITS,
  hasFieldErrors,
  toCreateBody,
  validateServerForm,
  type ServerFieldErrors,
} from '../formValidation'
import type { ServerDetail, ServerFormValues } from '../types'

interface ServerFormModalProps {
  mode: 'create' | 'edit'
  /** edit のとき必須。 */
  server?: ServerDetail
  onClose: () => void
  onCreated?: (server: ServerDetail) => void
  onUpdated?: () => void
}

const EMPTY_VALUES: ServerFormValues = {
  hostname: '',
  ipAddress: '',
  environment: '',
  status: 'active', // B3: 既定 active
  description: '',
  os: '',
  osVersion: '',
  virtualizationType: '',
  location: '',
  owner: '',
  tags: [],
}

function toFormValues(server: ServerDetail): ServerFormValues {
  return {
    hostname: server.hostname,
    ipAddress: server.ipAddress ?? '',
    environment: server.environment,
    status: server.status,
    description: server.description ?? '',
    os: server.os ?? '',
    osVersion: server.osVersion ?? '',
    virtualizationType: server.virtualizationType ?? '',
    location: server.location ?? '',
    owner: server.owner ?? '',
    tags: server.tags,
  }
}

/** 400 の errors[]（field は `tags[0]` 等になりうる）をフォームのフィールドキーへ寄せる。 */
function mapServerFieldErrors(map: Record<string, string>): ServerFieldErrors {
  const out: ServerFieldErrors = {}
  for (const [rawField, message] of Object.entries(map)) {
    const field = rawField.replace(/\[\d+\].*$/, '') as keyof ServerFormValues
    if (!(field in out)) out[field] = message
  }
  return out
}

/**
 * SC-05 サーバー登録 / SC-06 編集の共用モーダル（F6 / D-UI-02）。
 * - 必須は hostname / environment / status のみ（B3）。文字数上限は Backend と同じ（FE で厳しくしない）
 * - 400: `errors[]` を各フィールドへ。409 `DUPLICATE_HOSTNAME`: hostname にエラー
 * - 409 `OPTIMISTIC_LOCK_CONFLICT`（編集）: 再読み込み確認ダイアログ
 * - 送信中はフォームをロックし二重送信を防ぐ
 */
export function ServerFormModal({
  mode,
  server,
  onClose,
  onCreated,
  onUpdated,
}: ServerFormModalProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<ServerFormValues>(
    mode === 'edit' && server ? toFormValues(server) : EMPTY_VALUES,
  )
  const [clientErrors, setClientErrors] = useState<ServerFieldErrors>({})

  const createMutation = useCreateServerMutation()
  const updateMutation = useUpdateServerMutation(server?.id ?? 0)
  const mutation = mode === 'create' ? createMutation : updateMutation

  const submitting = mutation.isPending
  const error = mutation.error

  const conflict = error?.code === ERROR_CODES.OPTIMISTIC_LOCK_CONFLICT

  const serverFieldErrors = useMemo<ServerFieldErrors>(() => {
    if (!error) return {}
    if (error.code === ERROR_CODES.DUPLICATE_HOSTNAME) {
      return { hostname: `「${values.hostname}」は既に登録されています。` }
    }
    if (error.fieldErrors.length > 0) {
      return mapServerFieldErrors(error.fieldErrorMap())
    }
    return {}
  }, [error, values.hostname])

  const topError =
    error &&
    !conflict &&
    error.fieldErrors.length === 0 &&
    error.code !== ERROR_CODES.DUPLICATE_HOSTNAME
      ? error.message
      : undefined

  const fieldError = (key: keyof ServerFormValues) => clientErrors[key] ?? serverFieldErrors[key]

  const set = <K extends keyof ServerFormValues>(key: K, value: ServerFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateServerForm(values)
    setClientErrors(errors)
    if (hasFieldErrors(errors)) return

    const body = toCreateBody(values)
    if (mode === 'create') {
      createMutation.mutate(body, { onSuccess: (created) => onCreated?.(created) })
    } else if (server) {
      updateMutation.mutate(
        { ...body, version: server.version },
        { onSuccess: () => onUpdated?.() },
      )
    }
  }

  const handleReloadAfterConflict = () => {
    void queryClient.invalidateQueries({
      queryKey: server ? queryKeys.servers.detail(server.id) : queryKeys.servers.all(),
    })
    onClose()
  }

  return (
    <>
      <Modal
        open
        title={mode === 'create' ? 'サーバーを登録' : `サーバーを編集：${server?.hostname ?? ''}`}
        onClose={onClose}
        disableClose={submitting}
        maxWidth="md"
        actions={
          <>
            <Button onClick={onClose} disabled={submitting}>
              キャンセル
            </Button>
            <Button type="submit" form="server-form" variant="contained" loading={submitting}>
              {mode === 'create' ? '台帳に登録' : '保存'}
            </Button>
          </>
        }
      >
        <Box component="form" id="server-form" onSubmit={handleSubmit} noValidate>
          {topError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {topError}
            </Alert>
          )}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
            }}
          >
            <TextField
              label="ホスト名 *"
              value={values.hostname}
              onChange={(e) => set('hostname', e.target.value)}
              error={Boolean(fieldError('hostname'))}
              helperText={fieldError('hostname')}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.hostname } }}
              fullWidth
              autoFocus
            />
            <TextField
              label="IP アドレス"
              value={values.ipAddress}
              onChange={(e) => set('ipAddress', e.target.value)}
              error={Boolean(fieldError('ipAddress'))}
              helperText={fieldError('ipAddress') ?? 'IPv4 / IPv6（任意）'}
              disabled={submitting}
              fullWidth
            />
            <TextField
              select
              label="環境 *"
              value={values.environment}
              onChange={(e) =>
                set('environment', e.target.value as ServerFormValues['environment'])
              }
              error={Boolean(fieldError('environment'))}
              helperText={fieldError('environment')}
              disabled={submitting}
              fullWidth
            >
              {ENVIRONMENTS.map((env) => (
                <MenuItem key={env} value={env}>
                  {ENVIRONMENT_LABELS[env]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="ステータス *"
              value={values.status}
              onChange={(e) => set('status', e.target.value as ServerFormValues['status'])}
              error={Boolean(fieldError('status'))}
              helperText={fieldError('status')}
              disabled={submitting}
              fullWidth
            >
              {STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </MenuItem>
              ))}
            </TextField>
            <FormControl disabled={submitting}>
              <FormLabel sx={{ fontSize: 12, mb: 0.5 }}>物理 / 仮想</FormLabel>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={values.virtualizationType}
                onChange={(_e, next) =>
                  set('virtualizationType', (next ?? '') as ServerFormValues['virtualizationType'])
                }
              >
                {VIRTUALIZATION_TYPES.map((vt) => (
                  <ToggleButton key={vt} value={vt}>
                    {VIRTUALIZATION_TYPE_LABELS[vt]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <FormHelperText>任意</FormHelperText>
            </FormControl>
            <Box />
            <TextField
              label="OS"
              value={values.os}
              onChange={(e) => set('os', e.target.value)}
              error={Boolean(fieldError('os'))}
              helperText={fieldError('os')}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.os } }}
              fullWidth
            />
            <TextField
              label="OS バージョン"
              value={values.osVersion}
              onChange={(e) => set('osVersion', e.target.value)}
              error={Boolean(fieldError('osVersion'))}
              helperText={fieldError('osVersion')}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.osVersion } }}
              fullWidth
            />
            <TextField
              label="ロケーション"
              value={values.location}
              onChange={(e) => set('location', e.target.value)}
              error={Boolean(fieldError('location'))}
              helperText={fieldError('location')}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.location } }}
              fullWidth
            />
            <TextField
              label="担当者"
              value={values.owner}
              onChange={(e) => set('owner', e.target.value)}
              error={Boolean(fieldError('owner'))}
              helperText={fieldError('owner')}
              disabled={submitting}
              slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.owner } }}
              fullWidth
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TagInput
                value={values.tags}
                onChange={(tags) => set('tags', tags)}
                label="タグ"
                placeholder="タグ名を入力して Enter"
                error={Boolean(fieldError('tags'))}
                helperText={fieldError('tags') ?? '既存タグはサジェストされます（任意）'}
                size="medium"
              />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                label="用途・説明"
                value={values.description}
                onChange={(e) => set('description', e.target.value)}
                error={Boolean(fieldError('description'))}
                helperText={
                  fieldError('description') ??
                  `${values.description.length} / ${SERVER_FIELD_LIMITS.description}`
                }
                disabled={submitting}
                slotProps={{ htmlInput: { maxLength: SERVER_FIELD_LIMITS.description } }}
                multiline
                minRows={3}
                fullWidth
              />
            </Box>
          </Box>
        </Box>
      </Modal>

      <ConfirmDialog
        open={conflict}
        title="サーバー情報が更新されています"
        content="他のユーザーによってサーバー情報が更新されました。最新のデータを再読み込みしてください。"
        confirmLabel="再読み込み"
        cancelLabel="閉じる"
        onConfirm={handleReloadAfterConflict}
        onClose={onClose}
      />
    </>
  )
}
