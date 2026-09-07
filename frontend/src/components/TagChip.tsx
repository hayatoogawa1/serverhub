import Chip from '@mui/material/Chip'

interface TagChipProps {
  label: string
  onClick?: () => void
  onDelete?: () => void
}

/** タグの表示チップ（Stitch `TagChip`、size small・ニュートラル枠線）。 */
export function TagChip({ label, onClick, onDelete }: TagChipProps) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={label}
      onClick={onClick}
      onDelete={onDelete}
      sx={{ maxWidth: 200 }}
    />
  )
}
