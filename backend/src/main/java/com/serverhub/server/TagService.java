package com.serverhub.server;

import java.util.List;

/**
 * タグのサジェスト（詳細設計 03-server §3.2、FR-TAG-02 / F3）。実装は {@link TagServiceImpl}。
 *
 * <p>タグの付与・解除は {@link ServerService} 側（サーバー登録・編集）に含める。単独 CRUD は持たない。
 */
public interface TagService {

  /** 既存タグ名の前方一致サジェスト。空・空白のみの {@code prefix} は空リスト。 */
  List<String> suggest(String prefix);
}
