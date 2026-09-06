package com.serverhub.server;

import java.util.List;
import org.seasar.doma.BatchInsert;
import org.seasar.doma.Dao;
import org.seasar.doma.Delete;
import org.seasar.doma.Select;
import org.seasar.doma.boot.ConfigAutowireable;
import org.seasar.doma.jdbc.BatchResult;

/**
 * {@code server_tags} 中間テーブルへのアクセス（詳細設計 03-server §3.3）。
 *
 * <p>タグの付け外しは「全削除 → 全再登録」（D-SRV-03）。
 */
@Dao
@ConfigAutowireable
public interface ServerTagDao {

  /** 一覧表示用にサーバー ID とタグ名をまとめて取得（N+1 回避）。 */
  @Select
  List<ServerTagNameRow> selectByServerIds(List<Long> serverIds);

  /** 詳細表示用（1 件分のタグ名）。 */
  @Select
  List<String> selectTagNamesByServerId(Long serverId);

  /** タグ付け。登録・編集の再登録で使う。 */
  @BatchInsert
  BatchResult<ServerTag> batchInsert(List<ServerTag> rows);

  /** 既存の付け外しを一旦全削除（D-SRV-03）。 */
  @Delete(sqlFile = true)
  int deleteByServerId(Long serverId);
}
