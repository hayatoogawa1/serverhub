package com.serverhub.dashboard;

import com.serverhub.maintenance.MaintenanceType;
import java.time.LocalDate;
import org.seasar.doma.Entity;

/**
 * ダッシュボードの「直近のメンテナンス」1 行（詳細設計 05-dashboard §1・§3）。
 *
 * <p>{@link DashboardDao#selectRecentMaintenance(int)} の射影。削除済みサーバーの履歴は JOIN 条件で除外済み
 * （D-DASH-03、BR-09）のため、04-maintenance の一覧 DTO と違い「サーバー削除済み」フラグを持たない。 レスポンス型 {@link
 * DashboardSummaryResponse.RecentMaintenanceItem} とは D-DASH-03 のとおり分離する。
 */
@Entity(immutable = true)
public record RecentMaintenanceRow(
    Long id, Long serverId, String serverHostname, LocalDate performedDate, MaintenanceType type) {}
