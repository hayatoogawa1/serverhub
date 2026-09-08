import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Button from '@mui/material/Button'
import { FeedbackProvider } from './FeedbackProvider'
import { useFeedback } from './context'

function Harness() {
  const feedback = useFeedback()
  return (
    <>
      <Button onClick={() => feedback.showError('失敗しました')}>err</Button>
      <Button onClick={() => feedback.showSuccess('保存しました')}>ok</Button>
    </>
  )
}

const renderHarness = () =>
  render(
    <FeedbackProvider>
      <Harness />
    </FeedbackProvider>,
  )

describe('FeedbackProvider', () => {
  it('エラートーストは role="alert"（即時読み上げ）で表示される', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'err' }))

    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent('失敗しました')
  })

  it('成功トーストは role="status"（穏やかな読み上げ）で表示される', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'ok' }))

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('保存しました')
    // assertive な alert にはしない
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('新しい通知は前の通知を差し替える（同時表示は 1 件）', async () => {
    const user = userEvent.setup()
    renderHarness()

    await user.click(screen.getByRole('button', { name: 'ok' }))
    await screen.findByText('保存しました')
    await user.click(screen.getByRole('button', { name: 'err' }))

    expect(await screen.findByText('失敗しました')).toBeInTheDocument()
    expect(screen.queryByText('保存しました')).not.toBeInTheDocument()
  })
})
