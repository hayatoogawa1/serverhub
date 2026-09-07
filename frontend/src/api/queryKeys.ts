/**
 * TanStack Query の queryKey 定義（基本設計 06-ui §5.1、CLAUDE.md §4）。
 * 階層構造で持ち、mutation 後の invalidate はプレフィックス指定で行う。
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  servers: {
    all: () => ['servers'] as const,
    list: (params: unknown) => ['servers', 'list', params] as const,
    detail: (id: number) => ['servers', 'detail', id] as const,
    detailMaintenance: (id: number) => ['servers', 'detail', id, 'maintenanceHistories'] as const,
  },
  maintenanceHistories: {
    all: () => ['maintenanceHistories'] as const,
    list: (params: unknown) => ['maintenanceHistories', 'list', params] as const,
  },
  tags: {
    suggest: (prefix: string) => ['tags', 'suggest', prefix] as const,
  },
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
  },
} as const
