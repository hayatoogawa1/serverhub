package com.serverhub.dashboard;

import com.serverhub.server.Environment;
import org.seasar.doma.Entity;

/**
 * 環境区分ごとのサーバー数（詳細設計 05-dashboard §1・§4、D-DASH-04）。
 *
 * <p>{@link DashboardDao#selectServerCountByEnvironment()} の射影であり、{@link DashboardSummaryResponse}
 * のフィールド型も兼ねる（2 フィールドの値型を二重管理しない）。{@code count} は常に 1 以上（{@code GROUP BY} の結果行のため）。0 件区分の補完は {@link
 * DashboardService}（D-DASH-01）。{@code @Entity} は Doma の射影 マッピング用で、テーブルに対応する Entity ではない（03-server
 * §3.3 の {@code ServerTagNameRow} と同じ）。
 */
@Entity(immutable = true)
public record EnvironmentCount(Environment environment, long count) {}
