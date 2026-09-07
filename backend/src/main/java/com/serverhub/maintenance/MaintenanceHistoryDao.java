package com.serverhub.maintenance;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.SortDirection;
import java.util.List;
import org.seasar.doma.Dao;
import org.seasar.doma.Insert;
import org.seasar.doma.Select;
import org.seasar.doma.boot.ConfigAutowireable;
import org.seasar.doma.jdbc.Result;

/**
 * {@code maintenance_histories} テーブルへのアクセス（詳細設計 04-maintenance §2）。
 *
 * <p>履歴は追記・参照のみ（BR-06）。更新・削除メソッドは持たない。全体一覧（{@link #selectList}）は 対象サーバーの論理削除状態で絞り込まない（BR-09、F4）。
 */
@Dao
@ConfigAutowireable
public interface MaintenanceHistoryDao {

  /** 全サーバー横断の一覧（FR-MNT-01）。{@code servers} と JOIN しホスト名・削除有無を取得する。 */
  @Select
  List<MaintenanceHistoryListRow> selectList(
      MaintenanceHistorySearchCriteria criteria,
      PageRequest pageRequest,
      MaintenanceSortKey sort,
      SortDirection order);

  /** 全サーバー横断の一覧の総件数（ページング用）。 */
  @Select
  long selectCount(MaintenanceHistorySearchCriteria criteria);

  /**
   * 特定サーバーの履歴（FR-MNT-03、実施日降順）。
   *
   * <p>対象サーバーの存在（{@code deleted_at IS NULL}）は Service が事前確認済み（§4）のため SQL 側では確認しない。
   */
  @Select
  List<MaintenanceHistory> selectByServerId(Long serverId, PageRequest pageRequest);

  /** 特定サーバーの履歴件数（ページング用）。 */
  @Select
  long selectCountByServerId(Long serverId);

  /** 登録（FR-MNT-02）。日時は {@link MaintenanceEntityListener} が設定、{@code id} は IDENTITY 採番。 */
  @Insert
  Result<MaintenanceHistory> insert(MaintenanceHistory history);
}
