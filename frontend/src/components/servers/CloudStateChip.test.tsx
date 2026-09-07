import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CloudStateChip } from './CloudStateChip'
import { CLOUD_INSTANCE_STATES, CLOUD_STATE_LABELS } from '@/types/cloud'

describe('CloudStateChip', () => {
  it.each(CLOUD_INSTANCE_STATES)('%s の日本語ラベルと aria-label を出す', (state) => {
    render(<CloudStateChip state={state} />)
    const chip = screen.getByRole('img', { name: `AWS 実行状態: ${CLOUD_STATE_LABELS[state]}` })
    expect(chip).toHaveTextContent(CLOUD_STATE_LABELS[state])
  })

  it('「ステータス」という語を含まない（管理ステータスと混同させない）', () => {
    render(<CloudStateChip state="running" />)
    expect(screen.queryByText(/ステータス/)).not.toBeInTheDocument()
  })
})
