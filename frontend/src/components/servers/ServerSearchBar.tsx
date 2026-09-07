import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import SearchIcon from '@mui/icons-material/Search'
import { TagInput } from '@/components/common/TagInput'
import { ENVIRONMENTS, ENVIRONMENT_LABELS, STATUSES, STATUS_LABELS } from '@/types/domain'
import type { ServerListParams } from '@/url/serverListParams'

interface ServerSearchBarProps {
  params: ServerListParams
  onChange: (patch: Partial<ServerListParams>) => void
  onReset: () => void
}

const KEYWORD_DEBOUNCE_MS = 400

const isDefault = (p: ServerListParams) =>
  p.q === '' && p.env === 'all' && p.status === 'all' && p.tags.length === 0

/** SC-03 の検索・絞り込みバー（keyword / environment / status / tags AND）。 */
export function ServerSearchBar({ params, onChange, onReset }: ServerSearchBarProps) {
  const [keyword, setKeyword] = useState(params.q)

  // 外部（URL 直打ち・リセット）で q が変わったら入力欄を追従（レンダー中の状態調整）
  const [syncedQ, setSyncedQ] = useState(params.q)
  if (params.q !== syncedQ) {
    setSyncedQ(params.q)
    setKeyword(params.q)
  }

  const timerRef = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleKeywordChange = (value: string) => {
    setKeyword(value)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => onChange({ q: value }), KEYWORD_DEBOUNCE_MS)
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: 2,
        alignItems: 'start',
        mb: 2,
      }}
    >
      <TextField
        size="small"
        label="キーワード検索（ホスト名 / IP / 用途）"
        value={keyword}
        onChange={(e) => handleKeywordChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      <TextField
        size="small"
        select
        label="環境"
        value={params.env}
        onChange={(e) => onChange({ env: e.target.value as ServerListParams['env'] })}
      >
        <MenuItem value="all">すべて</MenuItem>
        {ENVIRONMENTS.map((env) => (
          <MenuItem key={env} value={env}>
            {ENVIRONMENT_LABELS[env]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        select
        label="ステータス"
        value={params.status}
        onChange={(e) => onChange({ status: e.target.value as ServerListParams['status'] })}
      >
        <MenuItem value="all">すべて</MenuItem>
        {STATUSES.map((status) => (
          <MenuItem key={status} value={status}>
            {STATUS_LABELS[status]}
          </MenuItem>
        ))}
      </TextField>
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <TagInput
            value={params.tags}
            onChange={(tags) => onChange({ tags })}
            label="タグで絞り込み（すべて含む）"
            placeholder="タグ名を入力"
          />
        </Box>
        <Button
          variant="text"
          onClick={onReset}
          disabled={isDefault(params)}
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          条件をリセット
        </Button>
      </Box>
    </Box>
  )
}
