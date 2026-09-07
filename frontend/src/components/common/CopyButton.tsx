import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

interface CopyButtonProps {
  value: string
  ariaLabel?: string
}

/** クリップボードコピー（Stitch: IP / ホスト名のワンクリックコピー、コピー時「Copied!」）。 */
export function CopyButton({ value, ariaLabel = 'コピー' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // クリップボード API が使えない環境では何もしない（機能は必須ではない）
      })
  }

  return (
    <Tooltip title={copied ? 'Copied!' : ariaLabel} open={copied || undefined}>
      <IconButton size="small" aria-label={ariaLabel} onClick={handleCopy}>
        <ContentCopyIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Tooltip>
  )
}
