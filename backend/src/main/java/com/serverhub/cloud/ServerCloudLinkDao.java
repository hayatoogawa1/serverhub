package com.serverhub.cloud;

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
 * <p>紐付け CRUD（{@link #insert}/{@link #update}/{@link #deleteByServerId}）と、レスポンス組み立て用の 参照（{@link
 * #selectByServerId} 詳細、{@link #selectByServerIds} 一覧の N+1 回避）を提供する。 ポーラー用の参照・状態更新は 9-2 で追加する。
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
}
