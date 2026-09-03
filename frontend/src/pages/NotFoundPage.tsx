import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

export function NotFoundPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        ページが見つかりません
      </Typography>
      <Typography variant="body2" color="text.secondary">
        404 Not Found
      </Typography>
    </Container>
  )
}
