import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { TagChip } from './TagChip'

interface TagListProps {
  tags: string[]
  /** これを超える分は「+N」に集約する（一覧では 3、詳細では未指定＝全件）。 */
  max?: number
  /** 各タグクリック（一覧でその タグの絞り込みを追加する用途）。 */
  onTagClick?: (tag: string) => void
}

/** タグ配列の表示。`max` 超過分は「+N」チップ（ホバーで残りをツールチップ表示）。 */
export function TagList({ tags, max, onTagClick }: TagListProps) {
  if (tags.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        -
      </Typography>
    )
  }

  const shown = max != null ? tags.slice(0, max) : tags
  const hidden = max != null ? tags.slice(max) : []

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, rowGap: 0.5 }}>
      {shown.map((tag) => (
        <TagChip key={tag} label={tag} onClick={onTagClick ? () => onTagClick(tag) : undefined} />
      ))}
      {hidden.length > 0 && (
        <Tooltip title={hidden.join(', ')}>
          <Chip size="small" label={`+${hidden.length}`} />
        </Tooltip>
      )}
    </Stack>
  )
}
