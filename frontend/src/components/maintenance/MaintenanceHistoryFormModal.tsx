import { useMemo, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/common/Modal'
import { ServerPicker } from '@/components/common/ServerPicker'
import { MAINTENANCE_TYPES, MAINTENANCE_TYPE_LABELS } from '@/types/domain'
import { useCreateMaintenanceHistoryMutation } from '@/hooks/maintenance'
import {
  hasMaintenanceFieldErrors,
  toMaintenanceCreateBody,
  validateMaintenanceForm,
  type MaintenanceFieldErrors,
} from '@/validation/maintenance'
import {
  MAINTENANCE_FIELD_LIMITS,
  type MaintenanceFormValues,
  type MaintenanceHistoryDetail,
} from '@/types/maintenance'

interface MaintenanceHistoryFormModalProps {
  /** サーバー詳細から起動した場合は固定・変更不可。 */
  fixedServerId?: number
  fixedServerHostname?: string
  onClose: () => void
  onCreated?: (detail: MaintenanceHistoryDetail) => void
}

const emptyValues = (fixedServerId?: number): MaintenanceFormValues => ({
  serverId: fixedServerId ?? null,
  performedDate: '',
  type: '',
  worker: '',
  content: '',
  impact: '',
  result: '',
})

/**
 * SC-08 メンテナンス履歴の登録モーダル（FR-MNT-02 / B4、書き込み専用＝登録後の編集・削除なし）。
 * 必須: 対象サーバー / 実施日 / 種別 / 作業者 / 作業内容。文字数上限は Backend と同一。
 */
export function MaintenanceHistoryFormModal({
  fixedServerId,
  fixedServerHostname,
  onClose,
  onCreated,
}: MaintenanceHistoryFormModalProps) {
  const [values, setValues] = useState<MaintenanceFormValues>(emptyValues(fixedServerId))
  const [clientErrors, setClientErrors] = useState<MaintenanceFieldErrors>({})
  const mutation = useCreateMaintenanceHistoryMutation()
  const submitting = mutation.isPending
  const error = mutation.error

  const serverFieldErrors = useMemo<MaintenanceFieldErrors>(() => {
    if (!error || error.fieldErrors.length === 0) return {}
    const out: MaintenanceFieldErrors = {}
    for (const fe of error.fieldErrors) {
      const key = fe.field as keyof MaintenanceFormValues
      if (!(key in out)) out[key] = fe.message
    }
    return out
  }, [error])

  const topError = error?.fieldErrors.length === 0 ? error.message : undefined

  const fieldError = (key: keyof MaintenanceFormValues) =>
    clientErrors[key] ?? serverFieldErrors[key]
  const set = <K extends keyof MaintenanceFormValues>(key: K, value: MaintenanceFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const errors = validateMaintenanceForm(values)
    setClientErrors(errors)
    if (hasMaintenanceFieldErrors(errors)) return
    mutation.mutate(toMaintenanceCreateBody(values), {
      onSuccess: (created) => onCreated?.(created),
    })
  }

  return (
    <Modal
      open
      title="メンテナンス履歴を登録"
      onClose={onClose}
      disableClose={submitting}
      maxWidth="sm"
      actions={
        <>
          <Button onClick={onClose} disabled={submitting}>
            キャンセル
          </Button>
          <Button type="submit" form="maintenance-form" variant="contained" loading={submitting}>
            記録する
          </Button>
        </>
      }
    >
      <Box component="form" id="maintenance-form" onSubmit={handleSubmit} noValidate>
        {topError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {topError}
          </Alert>
        )}
        <Box sx={{ display: 'grid', gap: 2 }}>
          {fixedServerId != null ? (
            <TextField
              label="対象サーバー"
              value={fixedServerHostname ?? `#${fixedServerId}`}
              slotProps={{ input: { readOnly: true } }}
              disabled
              fullWidth
            />
          ) : (
            <ServerPicker
              value={values.serverId}
              onChange={(serverId) => set('serverId', serverId)}
              disabled={submitting}
              error={Boolean(fieldError('serverId'))}
              helperText={fieldError('serverId')}
              size="medium"
            />
          )}

          <TextField
            label="実施日 *"
            type="date"
            value={values.performedDate}
            onChange={(e) => set('performedDate', e.target.value)}
            error={Boolean(fieldError('performedDate'))}
            helperText={fieldError('performedDate') ?? '未来日も登録できます'}
            disabled={submitting}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />

          <FormControl error={Boolean(fieldError('type'))} disabled={submitting}>
            <FormLabel sx={{ fontSize: 12 }}>種別 *</FormLabel>
            <RadioGroup
              row
              value={values.type}
              onChange={(e) => set('type', e.target.value as MaintenanceFormValues['type'])}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <FormControlLabel
                  key={t}
                  value={t}
                  control={<Radio size="small" />}
                  label={MAINTENANCE_TYPE_LABELS[t]}
                />
              ))}
            </RadioGroup>
            {fieldError('type') && <FormHelperText>{fieldError('type')}</FormHelperText>}
          </FormControl>

          <TextField
            label="作業者 *"
            value={values.worker}
            onChange={(e) => set('worker', e.target.value)}
            error={Boolean(fieldError('worker'))}
            helperText={fieldError('worker')}
            disabled={submitting}
            slotProps={{ htmlInput: { maxLength: MAINTENANCE_FIELD_LIMITS.worker } }}
            fullWidth
          />
          <TextField
            label="作業内容 *"
            value={values.content}
            onChange={(e) => set('content', e.target.value)}
            error={Boolean(fieldError('content'))}
            helperText={
              fieldError('content') ??
              `${values.content.length} / ${MAINTENANCE_FIELD_LIMITS.content}`
            }
            disabled={submitting}
            slotProps={{ htmlInput: { maxLength: MAINTENANCE_FIELD_LIMITS.content } }}
            multiline
            minRows={3}
            fullWidth
          />
          <TextField
            label="影響・ダウンタイム"
            value={values.impact}
            onChange={(e) => set('impact', e.target.value)}
            error={Boolean(fieldError('impact'))}
            helperText={fieldError('impact') ?? '例: サービス停止 約 15 分 / なし'}
            disabled={submitting}
            slotProps={{ htmlInput: { maxLength: MAINTENANCE_FIELD_LIMITS.impact } }}
            fullWidth
          />
          <TextField
            label="結果・備考"
            value={values.result}
            onChange={(e) => set('result', e.target.value)}
            error={Boolean(fieldError('result'))}
            helperText={fieldError('result')}
            disabled={submitting}
            slotProps={{ htmlInput: { maxLength: MAINTENANCE_FIELD_LIMITS.result } }}
            multiline
            minRows={2}
            fullWidth
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          台帳監査ポリシー: メンテナンス履歴は証跡性確保のため、登録後の編集・削除はできません。
        </Typography>
      </Box>
    </Modal>
  )
}
