/**
 * 表示用の整形ユーティリティ（日付ライブラリは導入しない、`Intl` / 標準 API のみ）。
 *
 * Backend は ISO 8601 を返す（02-api D-API-05）:
 * - timestamp: オフセット付き（例 `2026-09-01T18:20:00+09:00`）
 * - date（実施日）: `YYYY-MM-DD`
 */

const DATETIME_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Tokyo',
})

/** ISO 8601 timestamp → `YYYY-MM-DD HH:mm`（JST）。不正値はそのまま返す。 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  // ja-JP は "2026/09/01 18:20" を返すため区切りを整える
  return DATETIME_FORMATTER.format(date).replace(/\//g, '-').replace(' ', ' ')
}

/** `YYYY-MM-DD`（実施日）はそのまま表示する。不正値はそのまま返す。 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value
}

/** 空文字・null・undefined を「-」に。 */
export function orDash(value: string | null | undefined): string {
  return value != null && value !== '' ? value : '-'
}
