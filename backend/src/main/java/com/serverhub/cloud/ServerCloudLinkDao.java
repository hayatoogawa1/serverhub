package com.serverhub.cloud;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.seasar.doma.Dao;
import org.seasar.doma.Delete;
import org.seasar.doma.Insert;
import org.seasar.doma.Select;
import org.seasar.doma.Update;
import org.seasar.doma.boot.ConfigAutowireable;
import org.seasar.doma.jdbc.Result;

/**
 * {@code server_cloud_links} テーブルへのアクセス（FR-CLOUD-01、設計 07-aws-ec2-integration §6.2）。
 *
 * <p>紐付け CRUD（{@link #insert}/{@link #update}/{@link #deleteByServerId}）、レスポンス組み立て用の 参照（{@link
 * #selectByServerId} 詳細、{@link #selectByServerIds} 一覧の N+1 回避）、ポーラー用（{@link
 * #selectLinkedToActiveServers} / {@link #updateState} / {@link #updateStateError}）を提供する。
 */
@Dao
@ConfigAutowireable
public interface ServerCloudLinkDao {

  /** サーバー詳細の enrichment 用（1 件）。 */
  @Select
  Optional<ServerCloudLink> selectByServerId(Long serverId);

  /** サーバー一覧の enrichment 用。サーバー ID をまとめて渡し 1 クエリで取得する（N+1 回避）。 */
  @Select
  List<ServerCloudLink> selectByServerIds(List<Long> serverIds);

  /** 紐付けの新規作成。日時は {@link ServerCloudLinkEntityListener}、{@code id} は IDENTITY 採番。 */
  @Insert
  Result<ServerCloudLink> insert(ServerCloudLink link);

  /**
   * 紐付けの置換（provider / externalId / region / accountId の更新）。
   *
   * <p>{@code createdAt} は不変。状態列（{@code state} 等）もこのメソッドの対象に含むが、置換時は Service が明示的に {@code null}
   * を渡して観測状態をリセットする（別インスタンスに繋ぎ替えたため）。
   */
  @Update(exclude = {"createdAt"})
  Result<ServerCloudLink> update(ServerCloudLink link);

  /** 紐付けの解除。サーバー論理削除では消さない（設計 P10）。ユーザーが明示的に解除したときのみ。 */
  @Delete(sqlFile = true)
  int deleteByServerId(Long serverId);

  /**
   * ポーラー対象の紐付け一覧。<b>論理削除されていないサーバー</b>の紐付けのみ（P10：削除済みは残すが対象外）。 {@code state_fetched_at} 昇順（未取得 =
   * NULL を先に）で、古いものから処理できるようにする。
   */
  @Select
  List<ServerCloudLink> selectLinkedToActiveServers();

  /**
   * 取得成功時の状態更新。ポーラー・「今すぐ更新」から呼ぶ。
   *
   * <p>状態列と {@code state_fetched_at} を更新し、{@code last_error} をクリアする。{@code updated_at} も更新。
   * <b>{@code servers} には触れない。</b>楽観ロックなし（last-write-wins）。
   */
  @Update(sqlFile = true)
  int updateState(Long id, CloudInstanceState state, String stateRaw, LocalDateTime stateFetchedAt);

  /**
   * 取得失敗時。{@code state} 系は<b>据え置き</b>（最後に成功した値を保持、C5）、{@code last_error} / {@code last_error_at}
   * のみ記録する。{@code updated_at} も更新。
   */
  @Update(sqlFile = true)
  int updateStateError(Long id, String lastError, LocalDateTime lastErrorAt);
}
