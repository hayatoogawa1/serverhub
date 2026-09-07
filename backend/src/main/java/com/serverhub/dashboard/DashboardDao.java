package com.serverhub.dashboard;

import java.util.List;
import org.seasar.doma.Dao;
import org.seasar.doma.Select;
import org.seasar.doma.boot.ConfigAutowireable;

/**
 * ダッシュボード集計のためのアクセス（詳細設計 05-dashboard §1）。
 *
 * <p>集計は「1 セクション 1 クエリ」（計 5 クエリ）で取得し、ループ内クエリを書かない（requirements §10.2.2、 N+1 回避）。全クエリが {@code
 * servers.deleted_at IS NULL} を固定条件に持つ（BR-01）。0 件区分の補完・ 上位 N 件の切り出しは Service 側（D-DASH-01）で行い、SQL
 * は素直な {@code GROUP BY} に保つ。
 */
@Dao
@ConfigAutowireable
public interface DashboardDao {

  /** 未削除サーバーの総数（BR-01）。 */
  @Select
  long selectTotalServers();

  /** 環境区分別のサーバー数。値が 0 件の区分は行が返らない（補完は Service、D-DASH-01）。 */
  @Select
  List<EnvironmentCount> selectServerCountByEnvironment();

  /** ステータス別のサーバー数。値が 0 件の区分は行が返らない（補完は Service、D-DASH-01）。 */
  @Select
  List<StatusCount> selectServerCountByStatus();

  /** タグ別のサーバー数。件数降順で<b>全件</b>返す（上位 10 件＋その他への分割は Service、D-DASH-01 / F5）。 0 件のタグは返らない。 */
  @Select
  List<TagCount> selectServerCountByTag();

  /**
   * 直近のメンテナンス（{@code performed_date} 降順）。{@code servers} と {@code INNER JOIN} し、かつ {@code
   * deleted_at IS NULL} を課すことで削除済みサーバーの履歴を除外する（D-DASH-03、BR-09）。
   *
   * @param limit 取得件数（Q4：Controller/Service が 10 を固定で渡す。クエリパラメータ化しない）
   */
  @Select
  List<RecentMaintenanceRow> selectRecentMaintenance(int limit);
}
