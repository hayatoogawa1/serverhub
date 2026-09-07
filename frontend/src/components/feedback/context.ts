import { createContext, useContext } from 'react'

export interface FeedbackApi {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showInfo: (message: string) => void
}

export const FeedbackContext = createContext<FeedbackApi | null>(null)

/** トースト通知の起点。`FeedbackProvider` の内側で使う。 */
export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error('useFeedback は FeedbackProvider の内側で使用してください')
  }
  return ctx
}
