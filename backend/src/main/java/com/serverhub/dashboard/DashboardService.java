package com.serverhub.dashboard;

/** ダッシュボード集計の業務ロジック（詳細設計 05-dashboard §2・§5、FR-DASH-01）。 実装は {@link DashboardServiceImpl}。 */
public interface DashboardService {

  /** ダッシュボードの集計を組み立てる（各セクションちょうど 1 クエリ、計 5 クエリ）。 */
  DashboardSummaryResponse getSummary();
}
