package com.serverhub.dashboard;

import com.serverhub.server.Status;
import org.seasar.doma.Entity;

/**
 * ステータスごとのサーバー数（詳細設計 05-dashboard §1・§4、D-DASH-04）。
 *
 * <p>{@link DashboardDao#selectServerCountByStatus()} の射影であり、{@link DashboardSummaryResponse} の
 * フィールド型も兼ねる。0 件区分の補完は {@link DashboardService}（D-DASH-01）。{@link EnvironmentCount} と同じ考え方。
 */
@Entity(immutable = true)
public record StatusCount(Status status, long count) {}
