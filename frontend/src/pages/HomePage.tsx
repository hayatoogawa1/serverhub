import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

/**
 * 暫定トップページ。ダッシュボード（Phase 6）に差し替える。
 */
export function HomePage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        ServerHub
      </Typography>
      <Typography variant="body1" color="text.secondary">
        インフラチーム向けのサーバー管理・運用支援ツール（開発中）
      </Typography>
    </Container>
  )
}
