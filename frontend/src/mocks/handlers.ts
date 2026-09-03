import { type RequestHandler } from 'msw'

/**
 * MSW のリクエストハンドラ。
 * 各機能の API モックは feature ごとに追加していく（Phase 6 以降）。
 */
export const handlers: RequestHandler[] = []
