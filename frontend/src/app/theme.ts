import { createTheme } from '@mui/material/styles'

/**
 * MUI テーマ。PC 専用（F7、1280px 以上想定）。配色は控えめの light。
 * enum → 色のマッピングは各コンポーネント（StatusChip 等）に閉じる。
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#f6f7f9',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: [
      'system-ui',
      '-apple-system',
      '"Segoe UI"',
      'Roboto',
      '"Hiragino Kaku Gothic ProN"',
      '"Noto Sans JP"',
      'Meiryo',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
})
