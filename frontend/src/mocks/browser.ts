import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** 開発時にブラウザで API をモックする場合に使う（既定では無効）。 */
export const worker = setupWorker(...handlers)
