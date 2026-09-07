package com.serverhub.server;

import com.serverhub.common.page.PageRequest;
import com.serverhub.common.page.SortDirection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.seasar.doma.Dao;
import org.seasar.doma.Insert;
import org.seasar.doma.Select;
import org.seasar.doma.Update;
import org.seasar.doma.boot.ConfigAutowireable;
import org.seasar.doma.jdbc.Result;

/**
 * {@code servers} テーブルへのアクセス（詳細設計 03-server §3.1）。
 *
 * <p>一覧・検索・詳細の SQL はすべて {@code deleted_at IS NULL} を固定条件に持つ（BR-01）。
 */
@Dao
@ConfigAutowireable
public interface ServerDao {

  /** {@code deleted_at IS NULL} の 1 件（BR-01）。 */
  @Select
  Optional<Server> selectActiveById(Long id);

  /** ホスト名重複チェック（BR-02）。有効なサーバーに同名があればその ID。 */
  @Select
  Optional<Long> selectIdByActiveHostname(String hostname);

  /** 一覧・検索（FR-SRV-01/02）。{@code criteria} は Service が組み立てた内部条件。 */
  @Select
  List<Server> selectList(
      ServerSearchCriteria criteria,
      PageRequest pageRequest,
      ServerSortKey sort,
      SortDirection order);

  /** 一覧・検索の総件数。 */
  @Select
  long selectCount(ServerSearchCriteria criteria);

  /** 登録。{@code version} は呼び出し側で {@code 0} を設定、日時は {@link ServerEntityListener} が設定。 */
  @Insert
  Result<Server> insert(Server server);

  /**
   * 全項目更新。{@code @Version} 不一致で Doma が {@code OptimisticLockException}（BR-08）。
   *
   * <p>{@code createdAt} は不変、{@code deletedAt} は {@link #updateDeletedAt} 専用のため更新対象から除外する。
   */
  @Update(exclude = {"createdAt", "deletedAt"})
  Result<Server> update(Server server);

  /** 論理削除（FR-SRV-06）。{@code version} チェックはしない。 */
  @Update(sqlFile = true)
  int updateDeletedAt(Long id, LocalDateTime deletedAt);
}
