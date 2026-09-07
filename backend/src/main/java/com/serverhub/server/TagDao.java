package com.serverhub.server;

import java.util.List;
import org.seasar.doma.Dao;
import org.seasar.doma.Insert;
import org.seasar.doma.Select;
import org.seasar.doma.boot.ConfigAutowireable;

/**
 * {@code tags} テーブルへのアクセス（詳細設計 03-server §3.2）。
 *
 * <p>タグは単独の CRUD API を持たない。作成は「なければ作る」の upsert（D-SRV-02）。
 */
@Dao
@ConfigAutowireable
public interface TagDao {

  /** 既存タグの解決（FR-TAG-01）。大文字小文字は区別する（BR-07）。 */
  @Select
  List<Tag> selectByNames(List<String> names);

  /** 前方一致サジェスト（FR-TAG-02、F3）。{@code prefix} は呼び出し側で LIKE エスケープ済み。 */
  @Select
  List<String> selectSuggest(String prefix, int limit);

  /**
   * 新規タグ作成。{@code INSERT ... ON CONFLICT (name) DO NOTHING}（D-SRV-02）。
   *
   * <p>競合時は 0 を返すだけで失敗しない。Service は後続の {@link #selectByNames} で最終的な ID を得る。
   */
  @Insert(sqlFile = true)
  int insertIgnoreConflict(String name);
}
