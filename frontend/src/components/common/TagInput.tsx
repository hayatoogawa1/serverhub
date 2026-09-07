import { useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useTagSuggestQuery } from '@/hooks/tags'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  label?: string
  placeholder?: string
  helperText?: string
  error?: boolean
  size?: 'small' | 'medium'
}

/**
 * タグ入力（サジェスト付き、Autocomplete freeSolo multiple）。
 * 絞り込み（SC-03）とフォーム（SC-05/06）で共用（06-ui §3 / §7）。
 * 正規化（前後空白除去・重複排除）は最小限だけ行い、最終的な検証は Backend（BR-07 / Q8）。
 */
export function TagInput({
  value,
  onChange,
  label = 'タグ',
  placeholder,
  helperText,
  error,
  size = 'small',
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const debouncedPrefix = useDebouncedValue(inputValue)
  const suggest = useTagSuggestQuery(debouncedPrefix)

  const options = (suggest.data ?? []).filter((tag) => !value.includes(tag))

  const commit = (tags: string[]) => {
    const normalized: string[] = []
    for (const raw of tags) {
      const trimmed = raw.trim()
      if (trimmed !== '' && !normalized.includes(trimmed)) normalized.push(trimmed)
    }
    onChange(normalized)
  }

  return (
    <Autocomplete
      multiple
      freeSolo
      size={size}
      value={value}
      onChange={(_e, next) => commit(next)}
      inputValue={inputValue}
      onInputChange={(_e, next) => setInputValue(next)}
      options={options}
      loading={suggest.isFetching}
      filterOptions={(opts) => opts}
      slotProps={{ chip: { size: 'small', variant: 'outlined' } }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={value.length === 0 ? placeholder : undefined}
          helperText={helperText}
          error={error}
        />
      )}
    />
  )
}
