import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/common/Modal'
import { ERROR_CODES } from '@/types/api'
import { useSetCloudLinkMutation } from '@/hooks/cloud'
import {
  hasCloudLinkFieldErrors,
  toCloudLinkBody,
  validateCloudLinkForm,
  type CloudLinkFieldErrors,
} from '@/validation/cloudLink'
import { CLOUD_PROVIDER_LABELS, type CloudLink, type CloudLinkFormValues } from '@/types/cloud'
import { focusFirstInvalid } from '@/utils/a11y'

interface CloudLinkFormModalProps {
  serverId: number
  serverHostname: string
  /** 既存の紐付け（編集時）。未連携なら省略。 */
  current?: CloudLink | null
  onClose: () => void
  onSaved?: () => void
}

const DEFAULT_REGION = 'ap-northeast-1'

/**
 * SC-04 からの AWS 連携（紐付け）設定モーダル（FR-CLOUD-01、D-UI-02：URL 非同期）。
 *
 * 実行状態はここでは扱わない（AWS からの取得のみ）。provider は当面 `aws_ec2` 固定。
 */
export function CloudLinkFormModal({
  serverId,
  serverHostname,
  current,
  onClose,
  onSaved,
}: CloudLinkFormModalProps) {
  const isEdit = current != null
  const [values, setValues] = useState<CloudLinkFormValues>({
    externalId: current?.externalId ?? '',
    region: current?.region ?? DEFAULT_REGION,
  })
  const [clientErrors, setClientErrors] = useState<CloudLinkFieldErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  // バリデーション失敗時、最初の不正フィールドへフォーカスを移す（a11y、Phase 10 #6）
  useEffect(() => {
    if (hasCloudLinkFieldErrors(clientErrors)) focusFirstInvalid(formRef.current)
  }, [clientErrors])

  const mutation = useSetCloudLinkMutation(serverId)
  const submitting = mutation.isPending
  const error = mutation.error

  const serverFieldErrors = useMemo<CloudLinkFieldErrors>(() => {
    if (!error) return {}
    if (error.status === 409 && error.code === ERROR_CODES.CLOUD_LINK_CONFLICT) {
      return { externalId: 'このインスタンスは別のサーバーに連携済みです。' }
    }
    const out: CloudLinkFieldErrors = {}
    for (const fe of error.fieldErrors) {
      const key = fe.field as keyof CloudLinkFormValues
      if (!(key in out)) out[key] = fe.message
    }
    return out
  }, [error])

  const topError =
    error?.fieldErrors.length === 0 && error.code !== ERROR_CODES.CLOUD_LINK_CONFLICT
      ? error.message
      : undefined

  const fieldError = (key: keyof CloudLinkFormValues) => clientErrors[key] ?? serverFieldErrors[key]
  const set = <K extends keyof CloudLinkFormValues>(key: K, value: CloudLinkFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateCloudLinkForm(values)
    setClientErrors(errors)
    if (hasCloudLinkFieldErrors(errors)) return
    mutation.mutate(toCloudLinkBody(values), { onSuccess: () => onSaved?.() })
  }

  return (
    <Modal
      open
      title={isEdit ? 'AWS 連携を編集' : 'AWS 連携を設定'}
      onClose={onClose}
      disableClose={submitting}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="submit" form="cloud-link-form" variant="contained" loading={submitting}>
            {isEdit ? '更新' : '連携する'}
          </Button>
        </>
      }
    >
      <Box component="form" id="cloud-link-form" ref={formRef} onSubmit={handleSubmit} noValidate>
        {topError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {topError}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="対象サーバー"
            value={serverHostname}
            slotProps={{ input: { readOnly: true } }}
            disabled
            fullWidth
          />
          <TextField
            label="プロバイダ"
            value={CLOUD_PROVIDER_LABELS.aws_ec2}
            slotProps={{ input: { readOnly: true } }}
            disabled
            fullWidth
            helperText="現在は AWS EC2 のみ対応しています。"
          />
          <TextField
            label="EC2 インスタンス ID *"
            value={values.externalId}
            onChange={(e) => set('externalId', e.target.value.trim())}
            error={Boolean(fieldError('externalId'))}
            helperText={fieldError('externalId') ?? '例: i-0123456789abcdef0'}
            disabled={submitting}
            fullWidth
          />
          <TextField
            label="リージョン"
            value={values.region}
            onChange={(e) => set('region', e.target.value.trim())}
            error={Boolean(fieldError('region'))}
            helperText={fieldError('region') ?? '未入力なら既定リージョンを使用します。'}
            disabled={submitting}
            fullWidth
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          連携すると EC2 の<strong>実行状態を参照表示</strong>
          します（起動・停止などの操作はできません）。
          この設定はサーバーの管理ステータスには影響しません。
        </Typography>
      </Box>
    </Modal>
  )
}
