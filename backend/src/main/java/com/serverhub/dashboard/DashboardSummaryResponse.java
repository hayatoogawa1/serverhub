package com.serverhub.dashboard;

import com.serverhub.maintenance.MaintenanceType;
import java.time.LocalDate;
import java.util.List;

/**
 * ダッシュボード集計のレスポンス（詳細設計 05-dashboard §4、基本設計 02-api §3.5、FR-DASH-01）。
 *
 * <p>数値とグラフ用の系列データ（Recharts、06-ui D-UI-01）をそのまま返す。データが 0 件でも各区分 0 埋めで {@code 200} が成立する（§6）。{@code
 * serversByEnvironment} / {@code serversByStatus} は常に全区分ぶん（宣言順・ 0 件補完済み、D-DASH-01）。{@code topTags}
 * は最大 10 件・件数降順、{@code otherTagsCount} は 11 位以降の合計。
 *
 * <p>{@link EnvironmentCount} / {@link StatusCount} / {@link TagCount} は DAO の射影と共用する（D-DASH-04）。
 */
public record DashboardSummaryResponse(
    long totalServers,
    List<EnvironmentCount> serversByEnvironment,
    List<StatusCount> serversByStatus,
    List<TagCount> topTags,
    long otherTagsCount,
    List<RecentMaintenanceItem> recentMaintenanceHistories) {

  /**
   * 「直近のメンテナンス」1 件（Q4：直近 10 件）。削除済みサーバーの履歴は含まれない（D-DASH-03）ため、 04-maintenance の {@code
   * MaintenanceHistorySummaryResponse} と違い「サーバー削除済み」フラグを持たない。
   */
  public record RecentMaintenanceItem(
      Long id,
      Long serverId,
      String serverHostname,
      LocalDate performedDate,
      MaintenanceType type) {

    static RecentMaintenanceItem from(RecentMaintenanceRow row) {
      return new RecentMaintenanceItem(
          row.id(), row.serverId(), row.serverHostname(), row.performedDate(), row.type());
    }
  }
}
