import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import type { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/queryKeys'
import type { DashboardSummary } from '@/types/dashboard'

/** SC-02 ダッシュボード集計。`refetchInterval` は持たない（S8）。 */
export function useDashboardSummaryQuery() {
  return useQuery<DashboardSummary, ApiError>({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => dashboardApi.getSummary(),
  })
}
