import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** テスト（Node 環境）用の MSW サーバー。 */
export const server = setupServer(...handlers)
