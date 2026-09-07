import { useMemo, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useServerQuery, useServersQuery } from '@/features/servers/hooks'
import { DEFAULT_SERVER_LIST_PARAMS } from '@/features/servers/searchParams'

interface ServerOption {
  id: number
  hostname: string
}

interface ServerPickerProps {
  value: number | null
  onChange: (serverId: number | null) => void
  label?: string
  disabled?: boolean
  error?: boolean
  helperText?: string
  size?: 'small' | 'medium'
}

/**
 * サーバーを 1 件選ぶ Autocomplete（`GET /servers?keyword=` によるインクリメンタル検索）。
 * SC-07 の絞り込みと SC-08 の対象サーバー選択で共用する。
 */
export function ServerPicker({
  value,
  onChange,
  label = '対象サーバー',
  disabled = false,
  error = false,
  helperText,
  size = 'small',
}: ServerPickerProps) {
  const [input, setInput] = useState('')
  const keyword = useDebouncedValue(input, 300)

  const listQuery = useServersQuery({
    ...DEFAULT_SERVER_LIST_PARAMS,
    q: keyword,
    sort: 'hostname',
    order: 'asc',
    size: 20,
  })

  // 選択済み ID がリストに無いときのラベル解決
  const selectedQuery = useServerQuery(value ?? 0, value != null)

  const options = useMemo<ServerOption[]>(() => {
    const fromList = (listQuery.data?.content ?? []).map((s) => ({
      id: s.id,
      hostname: s.hostname,
    }))
    if (value != null && selectedQuery.data && !fromList.some((o) => o.id === value)) {
      return [{ id: selectedQuery.data.id, hostname: selectedQuery.data.hostname }, ...fromList]
    }
    return fromList
  }, [listQuery.data, selectedQuery.data, value])

  const selected = options.find((o) => o.id === value) ?? null

  return (
    <Autocomplete<ServerOption>
      size={size}
      disabled={disabled}
      value={selected}
      onChange={(_e, next) => onChange(next?.id ?? null)}
      inputValue={input}
      onInputChange={(_e, next) => setInput(next)}
      options={options}
      getOptionLabel={(o) => o.hostname}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={(opts) => opts}
      loading={listQuery.isFetching}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  )
}
