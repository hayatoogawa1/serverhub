/** ページサイズの選択肢（B6：10/20/50/100・既定 20。02-api §2.5 で上限 100）。 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

export const DEFAULT_PAGE_SIZE: PageSize = 20
