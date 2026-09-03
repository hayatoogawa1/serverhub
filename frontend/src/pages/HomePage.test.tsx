import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('見出しに ServerHub を表示する', () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: 'ServerHub' })).toBeInTheDocument()
  })
})
